r"""
Build a library of Matchering reference presets from well-mastered commercial
podcasts. Downloads via the public Apple Podcasts search API, trims a
representative 5-minute window, loudness-normalizes to -14 LUFS, and writes
a 128 kbps MP3 per show into backend/references/.

The script also (re)writes backend/references/manifest.json, which modal_app.py
reads at import time to expand REFERENCE_TEMPLATES automatically — so no
follow-up code change is required to expose the new presets in /templates.

USAGE (locally, NOT in Modal):
    cd backend
    pip install requests feedparser librosa pyloudnorm pedalboard pydub numpy
    # ffmpeg must be on PATH for pydub's MP3 encode.  On Windows:
    #     winget install Gyan.FFmpeg
    python scripts/build_preset_library.py

    # then redeploy Modal so the new references + manifest get baked in:
    modal deploy modal_app.py

LEGAL POSTURE: the reference files are stored only inside the Modal container
and are never returned to users; the mastering output contains a spectral
fingerprint of the reference, not its audio. Used internally for level/EQ
matching only. If a show owner objects, delete that one file from references/
and remove its entry from manifest.json.
"""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import quote

REFS_DIR = Path(__file__).resolve().parent.parent / "references"
MANIFEST_PATH = REFS_DIR / "manifest.json"
TARGET_LUFS = -14.0
TRUE_PEAK_DB = -1.0
SAMPLE_OFFSET_S = 120      # skip first 2 minutes (intros / sponsor reads)
SAMPLE_DURATION_S = 300    # take 5 minutes of representative audio
MIN_USABLE_DURATION_S = 180  # if episode is shorter than 3 min, skip


# --- The curated list ---------------------------------------------------------
# Shows known for above-average audio production. Order in this list is the
# order they'll appear in the template dropdown. Comment out entries you don't
# want, or add more (any term that Apple Podcasts can match works).
PODCASTS: list[str] = [
    # NPR / public radio (industry-standard mastering)
    "This American Life",
    "Radiolab",
    "Hidden Brain",
    "Planet Money",
    "Code Switch",
    "Throughline",
    "Fresh Air",
    "Wait Wait Don't Tell Me",
    "Invisibilia",
    "Snap Judgment",

    # Pushkin (built around audio craft)
    "Revisionist History",
    "The Happiness Lab",
    "Cautionary Tales with Tim Harford",

    # Gimlet / Spotify originals
    "Heavyweight",
    "Science Vs",
    "Reply All",

    # NYT
    "The Daily",
    "Hard Fork",
    "The Ezra Klein Show",

    # Vox
    "Today Explained",
    "The Weeds",

    # Interview / talk (interview audio is usually well treated)
    "Lex Fridman Podcast",
    "The Tim Ferriss Show",
    "Conan O'Brien Needs a Friend",
    "SmartLess",
    "Armchair Expert with Dax Shepard",
    "WTF with Marc Maron Podcast",

    # Tech / business
    "Acquired",
    "All-In Podcast",
    "The Vergecast",
    "Pivot",

    # Storytelling / craft
    "99% Invisible",
    "Criminal",
    "The Memory Palace",
    "The Moth Radio Hour",
    "Serial",

    # Comedy / chat
    "Office Ladies",
    "My Brother My Brother and Me",
    "Stuff You Should Know",

    # BBC (different mastering tradition — useful for variety)
    "In Our Time: Philosophy",
    "Desert Island Discs",

    # Long-form
    "Hardcore History",
]


def slugify(name: str) -> str:
    s = name.lower()
    s = re.sub(r"['’]", "", s)            # strip apostrophes (smart + straight)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s[:60] or "unnamed"


def fetch_feed_url(name: str, session) -> str | None:
    """Look up the show's RSS feed via the public iTunes Search API."""
    url = (
        "https://itunes.apple.com/search"
        f"?term={quote(name)}&entity=podcast&limit=1&country=US"
    )
    r = session.get(url, timeout=15)
    r.raise_for_status()
    data = r.json()
    if not data.get("results"):
        return None
    return data["results"][0].get("feedUrl")


def fetch_latest_episode_mp3(feed_url: str) -> tuple[str | None, str | None]:
    """Return (mp3_url, episode_title) for the most recent episode."""
    import feedparser
    feed = feedparser.parse(feed_url)
    for entry in feed.entries[:5]:  # check up to 5 most recent in case the latest is non-audio
        # feedparser exposes enclosures as `links` with rel='enclosure'
        for link in entry.get("links", []):
            if link.get("rel") == "enclosure":
                t = (link.get("type") or "").lower()
                if "audio" in t or link.get("href", "").endswith((".mp3", ".m4a")):
                    return link["href"], entry.get("title", "")
        # Some feeds put it in `enclosures` directly
        for enc in entry.get("enclosures", []):
            t = (enc.get("type") or "").lower()
            if "audio" in t or enc.get("href", "").endswith((".mp3", ".m4a")):
                return enc["href"], entry.get("title", "")
    return None, None


def download_to(url: str, dest: Path, session, max_bytes: int = 200 * 1024 * 1024) -> None:
    """Stream-download with a sane size cap. Some podcasts are 2hr+ files; we
    cap so a runaway download can't fill the disk."""
    with session.get(url, stream=True, timeout=120, allow_redirects=True) as r:
        r.raise_for_status()
        n = 0
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=64 * 1024):
                if not chunk:
                    continue
                n += len(chunk)
                if n > max_bytes:
                    raise RuntimeError(
                        f"download exceeded {max_bytes // (1024 * 1024)} MB"
                    )
                f.write(chunk)


def process_to_preset(src_mp3: Path, dst_mp3: Path) -> tuple[float, float]:
    """Load → trim → loudness-normalize → re-encode as 128k MP3.

    Returns (source_lufs, final_lufs) for logging.
    """
    import numpy as np
    import librosa
    import pyloudnorm as pyln
    from pedalboard import Pedalboard, Gain, Limiter
    from pydub import AudioSegment

    # Load (librosa handles MP3/M4A via audioread / soundfile / ffmpeg).
    audio_mono_or_stereo, sr = librosa.load(str(src_mp3), sr=None, mono=False)
    if audio_mono_or_stereo.ndim == 1:
        audio = audio_mono_or_stereo[None, :]   # (1, samples)
    else:
        audio = audio_mono_or_stereo            # (channels, samples)
    n_samples = audio.shape[1]
    total_s = n_samples / sr

    if total_s < MIN_USABLE_DURATION_S:
        raise RuntimeError(f"episode too short ({total_s:.0f}s)")

    # Trim: prefer [2 min, 7 min). Fall back gracefully if the episode is shorter.
    start = int(SAMPLE_OFFSET_S * sr)
    end   = int((SAMPLE_OFFSET_S + SAMPLE_DURATION_S) * sr)
    if end > n_samples:
        end = n_samples
    if start >= end:
        # Episode shorter than 2 min — use whole thing (won't happen given the
        # min-usable check above, but defensive).
        start, end = 0, n_samples
    audio = audio[:, start:end].astype("float32")

    # Measure source loudness (pyloudnorm expects (samples, channels))
    audio_for_meter = audio.T
    meter = pyln.Meter(sr)
    try:
        source_lufs = float(meter.integrated_loudness(audio_for_meter))
    except Exception:
        source_lufs = -23.0
    if not np.isfinite(source_lufs) or source_lufs < -70:
        source_lufs = -40.0

    # Iterative LUFS targeting (same convergence loop as the main pipeline).
    audio_pb = np.ascontiguousarray(audio)  # (channels, samples) for pedalboard
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
    # Convert (channels, samples) float32 → int16 interleaved (samples, channels)
    int16 = (out.T * 32767.0).astype("int16")
    channels = int16.shape[1] if int16.ndim == 2 else 1

    segment = AudioSegment(
        int16.tobytes(),
        frame_rate=sr,
        sample_width=2,
        channels=channels,
    )
    # 128 kbps mono-or-stereo MP3 — Modal-friendly file size (~5 MB / 5 min)
    segment.export(str(dst_mp3), format="mp3", bitrate="128k")

    return source_lufs, final_lufs


def short_description(name: str) -> str:
    return f"Spectrally matched to the production sound of {name}."


def main() -> int:
    import requests
    REFS_DIR.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers.update({
        "User-Agent": "PodcastMaster preset builder/1.0 (+freepodcastmastering.com)",
    })

    # Load existing manifest (so re-runs are incremental — skip what we have).
    existing: dict[str, dict] = {}
    if MANIFEST_PATH.exists():
        try:
            for entry in json.loads(MANIFEST_PATH.read_text(encoding="utf-8")):
                existing[entry["id"]] = entry
        except Exception:
            existing = {}

    print(f"Building preset library: {len(PODCASTS)} shows -> {REFS_DIR}")
    print(f"Target: {TARGET_LUFS:.1f} LUFS, true-peak {TRUE_PEAK_DB:.1f} dB")
    print(f"Trim window: [{SAMPLE_OFFSET_S}s, {SAMPLE_OFFSET_S + SAMPLE_DURATION_S}s]")
    print(f"Existing manifest entries: {len(existing)}\n")

    new_manifest: list[dict] = []
    ok = 0
    skipped = 0
    failed: list[tuple[str, str]] = []

    for name in PODCASTS:
        slug = slugify(name)
        preset_id = f"podcast-{slug}"
        dst_mp3 = REFS_DIR / f"podcast-{slug}.mp3"

        # If we already have it AND the file exists, keep it.
        if preset_id in existing and dst_mp3.exists():
            new_manifest.append(existing[preset_id])
            print(f"  KEEP : {name}")
            skipped += 1
            continue

        try:
            feed_url = fetch_feed_url(name, session)
            if not feed_url:
                raise RuntimeError("no feed URL from iTunes search")

            mp3_url, episode_title = fetch_latest_episode_mp3(feed_url)
            if not mp3_url:
                raise RuntimeError("no audio enclosure in feed")

            tmp_mp3 = REFS_DIR / f"_tmp_{slug}.mp3"
            try:
                download_to(mp3_url, tmp_mp3, session)
                src_lufs, dst_lufs = process_to_preset(tmp_mp3, dst_mp3)
            finally:
                if tmp_mp3.exists():
                    tmp_mp3.unlink()

            entry = {
                "id": preset_id,
                "name": name,
                "description": short_description(name),
                "file": dst_mp3.name,
                "source_feed": feed_url,
                "source_episode": episode_title or "",
                "built_lufs": round(dst_lufs, 2),
            }
            new_manifest.append(entry)
            ok += 1
            print(
                f"  OK   : {name:<45} "
                f"src {src_lufs:+.2f} -> dst {dst_lufs:+.2f} LUFS"
            )

            # Tiny pause to be polite to the iTunes Search API + podcast CDNs.
            time.sleep(0.5)

        except KeyboardInterrupt:
            print("\nInterrupted — writing partial manifest.")
            break
        except Exception as e:
            failed.append((name, str(e)))
            print(f"  FAIL : {name:<45} ({e})")

    # Persist the manifest (even partial — we want to keep what worked)
    MANIFEST_PATH.write_text(json.dumps(new_manifest, indent=2), encoding="utf-8")

    print(
        f"\nDone. ok={ok}  kept-existing={skipped}  failed={len(failed)}  "
        f"total-presets={len(new_manifest)}"
    )
    if failed:
        print("\nFailed shows (you can comment them out of PODCASTS):")
        for name, err in failed:
            print(f"  - {name}: {err}")

    print(f"\nManifest: {MANIFEST_PATH}")
    print("Next: `modal deploy modal_app.py` to bake the new references into the image.")
    return 0 if ok or skipped else 1


if __name__ == "__main__":
    sys.exit(main())
