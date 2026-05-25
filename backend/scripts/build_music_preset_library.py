r"""
Build a small library of Matchering reference presets for MUSIC mastering.

Unlike podcasts (where the legal posture leans on transformative/internal use
of commercial recordings), we use only Creative Commons-licensed tracks here.
Sources: Internet Archive's opensource_audio collection, filtered to CC-BY
(no NC, no ND).

Each preset becomes a manifest entry tagged `kind: "music"` so the frontend's
music page can filter for them.

USAGE (locally, NOT in Modal):
    cd backend
    pip install requests librosa pyloudnorm pedalboard pydub numpy
    python scripts/build_music_preset_library.py

    # then redeploy Modal so the new references + manifest get baked in:
    modal deploy modal_app.py
"""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import quote

import requests

REFS_DIR = Path(__file__).resolve().parent.parent / "references"
MANIFEST_PATH = REFS_DIR / "manifest.json"
TARGET_LUFS = -14.0
TRUE_PEAK_DB = -1.0
SAMPLE_OFFSET_S = 30        # music intros are shorter than podcast intros
SAMPLE_DURATION_S = 180     # 3 min is plenty for spectral matching
MIN_USABLE_DURATION_S = 120
MAX_BYTES = 80 * 1024 * 1024   # cap per-track download (most music tracks are 5-15 MB)


# Each query targets a genre. We take the top CC-BY audio result, prefer
# items with descriptive titles, and bundle as a music preset.
GENRE_QUERIES: list[tuple[str, str, str]] = [
    # (preset slug, display name, IA query — keep specific to genre)
    ("music-electronic", "Electronic & EDM",
     'collection:opensource_audio AND mediatype:audio AND licenseurl:("http://creativecommons.org/licenses/by/3.0/" OR "http://creativecommons.org/licenses/by/4.0/") AND subject:electronic'),

    ("music-rock-pop", "Rock & Pop",
     'collection:opensource_audio AND mediatype:audio AND licenseurl:("http://creativecommons.org/licenses/by/3.0/" OR "http://creativecommons.org/licenses/by/4.0/") AND (subject:rock OR subject:pop)'),

    ("music-acoustic-folk", "Acoustic & Folk",
     'collection:opensource_audio AND mediatype:audio AND licenseurl:("http://creativecommons.org/licenses/by/3.0/" OR "http://creativecommons.org/licenses/by/4.0/") AND (subject:folk OR subject:acoustic)'),

    ("music-hip-hop", "Hip-Hop & R&B",
     'collection:opensource_audio AND mediatype:audio AND licenseurl:("http://creativecommons.org/licenses/by/3.0/" OR "http://creativecommons.org/licenses/by/4.0/") AND (subject:"hip hop" OR subject:hiphop OR subject:rap)'),

    ("music-jazz", "Jazz",
     'collection:opensource_audio AND mediatype:audio AND licenseurl:("http://creativecommons.org/licenses/by/3.0/" OR "http://creativecommons.org/licenses/by/4.0/") AND subject:jazz'),

    ("music-cinematic", "Cinematic & Orchestral",
     'collection:opensource_audio AND mediatype:audio AND licenseurl:("http://creativecommons.org/licenses/by/3.0/" OR "http://creativecommons.org/licenses/by/4.0/") AND (subject:orchestral OR subject:cinematic OR subject:soundtrack)'),

    ("music-classical", "Classical",
     'collection:opensource_audio AND mediatype:audio AND licenseurl:("http://creativecommons.org/licenses/by/3.0/" OR "http://creativecommons.org/licenses/by/4.0/") AND subject:classical'),

    ("music-ambient", "Ambient & Chill",
     'collection:opensource_audio AND mediatype:audio AND licenseurl:("http://creativecommons.org/licenses/by/3.0/" OR "http://creativecommons.org/licenses/by/4.0/") AND (subject:ambient OR subject:chillout OR subject:downtempo)'),
]


def find_track_for_query(query: str, session: requests.Session) -> tuple[str, str, str] | None:
    """Return (identifier, title, creator) for the top match, or None."""
    url = (
        "https://archive.org/advancedsearch.php"
        f"?q={quote(query)}"
        "&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=downloads"
        "&sort[]=downloads+desc"
        "&rows=10&page=1&output=json"
    )
    r = session.get(url, timeout=30)
    r.raise_for_status()
    docs = r.json().get("response", {}).get("docs", [])
    for d in docs:
        if d.get("identifier"):
            title = (
                d.get("title")
                if isinstance(d.get("title"), str)
                else (d.get("title", [""]) or [""])[0]
                if d.get("title")
                else ""
            )
            creator = (
                d.get("creator")
                if isinstance(d.get("creator"), str)
                else (d.get("creator", [""]) or [""])[0]
                if d.get("creator")
                else "Unknown"
            )
            return d["identifier"], title or d["identifier"], creator
    return None


def pick_audio_file(identifier: str, session: requests.Session) -> str | None:
    """From the item's metadata, find the best audio file to download.
    Preference order: VBR MP3, then MP3, then OGG. Returns the file name
    (not the full URL)."""
    url = f"https://archive.org/metadata/{identifier}"
    r = session.get(url, timeout=30)
    r.raise_for_status()
    files = r.json().get("files", [])

    def is_audio(f):
        n = (f.get("name") or "").lower()
        fmt = (f.get("format") or "").lower()
        return (
            n.endswith((".mp3", ".ogg", ".flac"))
            or "mp3" in fmt
            or "ogg" in fmt
            or "flac" in fmt
        )

    audios = [f for f in files if is_audio(f)]
    if not audios:
        return None

    # Prefer "VBR MP3" or first MP3 in the list (Internet Archive often has
    # multiple derivatives of the same source).
    for preferred in ("vbr mp3", "mp3"):
        for f in audios:
            if preferred in (f.get("format") or "").lower():
                return f.get("name")
    return audios[0].get("name")


def download_to(url: str, dest: Path, session: requests.Session, max_bytes: int = MAX_BYTES) -> None:
    with session.get(url, stream=True, timeout=180, allow_redirects=True) as r:
        r.raise_for_status()
        n = 0
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=64 * 1024):
                if not chunk:
                    continue
                n += len(chunk)
                if n > max_bytes:
                    raise RuntimeError(f"download exceeded {max_bytes // (1024 * 1024)} MB")
                f.write(chunk)


def process_to_preset(src: Path, dst: Path) -> tuple[float, float]:
    import numpy as np
    import librosa
    import pyloudnorm as pyln
    from pedalboard import Pedalboard, Gain, Limiter
    from pydub import AudioSegment

    audio_arr, sr = librosa.load(str(src), sr=None, mono=False)
    if audio_arr.ndim == 1:
        audio = audio_arr[None, :]
    else:
        audio = audio_arr
    n_samples = audio.shape[1]
    total_s = n_samples / sr
    if total_s < MIN_USABLE_DURATION_S:
        raise RuntimeError(f"track too short ({total_s:.0f}s)")

    start = int(SAMPLE_OFFSET_S * sr)
    end = int((SAMPLE_OFFSET_S + SAMPLE_DURATION_S) * sr)
    if end > n_samples:
        end = n_samples
    if start >= end:
        start, end = 0, n_samples
    audio = audio[:, start:end].astype("float32")

    audio_for_meter = audio.T
    meter = pyln.Meter(sr)
    try:
        source_lufs = float(meter.integrated_loudness(audio_for_meter))
    except Exception:
        source_lufs = -23.0
    if not np.isfinite(source_lufs) or source_lufs < -70:
        source_lufs = -40.0

    audio_pb = np.ascontiguousarray(audio)
    delta_db = (TARGET_LUFS - source_lufs) + 0.3
    final_lufs = source_lufs
    for _ in range(3):
        delta_db = float(np.clip(delta_db, -24.0, 24.0))
        chain = Pedalboard([
            Gain(gain_db=delta_db),
            Limiter(threshold_db=TRUE_PEAK_DB, release_ms=100.0),
        ])
        audio_pb = chain(audio_pb, sr)
        try:
            measured = float(meter.integrated_loudness(audio_pb.T))
        except Exception:
            break
        if not np.isfinite(measured):
            break
        final_lufs = measured
        diff = TARGET_LUFS - measured
        if abs(diff) < 0.3:
            break
        delta_db = diff

    out = np.clip(audio_pb, -1.0, 1.0)
    int16 = (out.T * 32767.0).astype("int16")
    channels = int16.shape[1] if int16.ndim == 2 else 1

    segment = AudioSegment(int16.tobytes(), frame_rate=sr, sample_width=2, channels=channels)
    segment.export(str(dst), format="mp3", bitrate="128k")
    return source_lufs, final_lufs


def main() -> int:
    REFS_DIR.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update({
        "User-Agent": "PodcastMaster music-preset builder/1.0 (+freepodcastmastering.com)",
    })

    # Load existing manifest
    existing: dict[str, dict] = {}
    if MANIFEST_PATH.exists():
        try:
            for entry in json.loads(MANIFEST_PATH.read_text(encoding="utf-8")):
                existing[entry["id"]] = entry
        except Exception:
            pass

    print(f"Building music preset library -> {REFS_DIR}")
    print(f"Target: {TARGET_LUFS:.1f} LUFS, true-peak {TRUE_PEAK_DB:.1f} dB\n")

    new_entries: list[dict] = []
    failed: list[tuple[str, str]] = []

    for slug, display_name, query in GENRE_QUERIES:
        dst = REFS_DIR / f"{slug}.mp3"

        if slug in existing and dst.exists():
            new_entries.append(existing[slug])
            print(f"  KEEP : {display_name}")
            continue

        try:
            hit = find_track_for_query(query, session)
            if not hit:
                raise RuntimeError("no IA results for query")
            identifier, title, creator = hit

            audio_filename = pick_audio_file(identifier, session)
            if not audio_filename:
                raise RuntimeError(f"no audio file in {identifier}")

            download_url = f"https://archive.org/download/{identifier}/{quote(audio_filename)}"
            tmp = REFS_DIR / f"_tmp_{slug}.mp3"
            try:
                download_to(download_url, tmp, session)
                src_lufs, dst_lufs = process_to_preset(tmp, dst)
            finally:
                if tmp.exists():
                    tmp.unlink()

            attribution = f"\"{title}\" by {creator} (CC-BY, archive.org/details/{identifier})"
            entry = {
                "id": slug,
                "name": display_name,
                "description": f"Music mastering reference — matched to a {display_name.lower()} track. Source: {attribution}",
                "file": dst.name,
                "source_url": f"https://archive.org/details/{identifier}",
                "source_track": title,
                "source_creator": creator,
                "built_lufs": round(dst_lufs, 2),
                "kind": "music",
                "license": "CC-BY",
            }
            new_entries.append(entry)
            print(f"  OK   : {display_name:<28} -> {title[:40]:<40} ({creator[:25]}) src {src_lufs:+.2f} dst {dst_lufs:+.2f} LUFS")

            time.sleep(0.5)

        except Exception as e:
            failed.append((display_name, str(e)))
            print(f"  FAIL : {display_name:<28} ({e})")

    # Merge with existing manifest: keep non-music entries (podcasts) as-is,
    # replace music entries with what we just built.
    merged: list[dict] = []
    for e in existing.values():
        if e.get("kind") != "music":
            merged.append(e)
    merged.extend(new_entries)

    MANIFEST_PATH.write_text(json.dumps(merged, indent=2), encoding="utf-8")
    print(
        f"\nDone. music presets built={len(new_entries)}  failed={len(failed)}  "
        f"total in manifest={len(merged)}"
    )
    print("Next: `modal deploy modal_app.py`")
    return 0 if new_entries else 1


if __name__ == "__main__":
    sys.exit(main())
