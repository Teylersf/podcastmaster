r"""
One-shot helper: take the .mp3 reference templates in backend/references/ and
emit cleaner .wav versions next to them, loudness-normalized to -14 LUFS with
peaks at -1 dBTP.

When the WAV files exist, modal_app.py's `_pick_reference_path()` will prefer
them automatically. The script is idempotent — re-running just overwrites.

Run locally (NOT in Modal):
    cd backend
    pip install soundfile pyloudnorm pedalboard numpy librosa
    python scripts/remaster_references.py
    # Then `modal deploy modal_app.py` (references/ is gitignored — it's
    # uploaded directly to Modal at deploy time via add_local_dir).

WARNING: file size
------------------
The current reference MP3s decode to multi-hour WAVs (the voice-optimized.mp3
is ~145 MB but expands to ~2.7 GB as 24-bit WAV). Don't run this script
without first checking durations and trimming if needed — multi-GB references
make the Modal image rebuild painfully slow.

Recommended: trim source references to ~5 minutes each before running this
script. 5 min stereo @ 44.1 kHz/24-bit ≈ ~80 MB WAV. Matchering's spectral
matching plateaus well before that duration anyway.

Why bother
----------
Matchering uses the reference for spectral and dynamic matching. Cleaner
inputs (WAV, no MP3 artifacts) make the spectral analysis tighter. Reference
loudness does NOT directly set output loudness anymore — the main pipeline
LUFS-normalizes after Matchering — but consistent references are still nice.
"""

from __future__ import annotations

import sys
from pathlib import Path

REFS_DIR = Path(__file__).resolve().parent.parent / "references"
TARGET_LUFS = -14.0
TRUE_PEAK_DB = -1.0

REFERENCE_FILES = [
    "voice-optimized.mp3",
    "femalepodcast.mp3",
    "maleonlyvoicesfullproduction.mp3",
    "maleandfemalenewssounds.mp3",
]


def remaster_one(src: Path, dst: Path) -> None:
    import numpy as np
    import soundfile as sf
    import pyloudnorm as pyln
    from pedalboard import Pedalboard, Gain, Limiter

    # soundfile can't read MP3 on all platforms; use librosa for decode.
    if src.suffix.lower() == ".mp3":
        import librosa
        audio_mono_or_stereo, sr = librosa.load(str(src), sr=None, mono=False)
        # librosa returns (channels, samples) for stereo or (samples,) for mono
        if audio_mono_or_stereo.ndim == 1:
            audio = audio_mono_or_stereo[:, None]  # (samples, 1)
        else:
            audio = audio_mono_or_stereo.T          # (samples, channels)
    else:
        audio, sr = sf.read(str(src), always_2d=True, dtype="float32")

    audio = audio.astype("float32")

    # Measure loudness
    meter = pyln.Meter(sr)
    try:
        current_lufs = float(meter.integrated_loudness(audio))
    except Exception:
        current_lufs = -23.0
    if not np.isfinite(current_lufs):
        current_lufs = -23.0

    # 2-pass iterative gain to actually hit the target. BS.1770's gating
    # makes single-pass `target - measured` overshoot by 1-3 dB on dynamic
    # content. Iterate up to 3 times with corrective gains.
    audio_pb = np.ascontiguousarray(audio.T)
    applied_gain_db = 0.0
    delta_db = TARGET_LUFS - current_lufs + 0.3

    final_lufs = float("nan")
    for _ in range(3):
        delta_db = float(np.clip(delta_db, -24.0, 24.0))
        chain = Pedalboard([
            Gain(gain_db=delta_db),
            Limiter(threshold_db=TRUE_PEAK_DB, release_ms=100.0),
        ])
        audio_pb = chain(audio_pb, sr)
        applied_gain_db += delta_db
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

    out = audio_pb.T
    out = np.nan_to_num(out, nan=0.0, posinf=1.0, neginf=-1.0)
    out = np.clip(out, -1.0, 1.0)

    # Write 24-bit WAV
    sf.write(str(dst), out, sr, subtype="PCM_24")

    print(
        f"  {src.name:<45} "
        f"{current_lufs:+.2f} LUFS  ->  "
        f"gain {applied_gain_db:+5.2f} dB  ->  "
        f"final {final_lufs:+.2f} LUFS  ({dst.name})"
    )


def main() -> int:
    if not REFS_DIR.exists():
        print(f"References dir not found: {REFS_DIR}", file=sys.stderr)
        return 1

    print(f"Target: {TARGET_LUFS} LUFS  |  true-peak ceiling: {TRUE_PEAK_DB} dB")
    print(f"Output dir: {REFS_DIR}\n")

    missing = []
    for name in REFERENCE_FILES:
        src = REFS_DIR / name
        if not src.exists():
            missing.append(name)
            continue
        dst = src.with_suffix(".wav")
        remaster_one(src, dst)

    if missing:
        print("\nWARNING: missing source MP3s (skipped):")
        for m in missing:
            print(f"  - {m}")
        return 2

    print("\nDone. Commit the new .wav files and run `modal deploy modal_app.py`.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
