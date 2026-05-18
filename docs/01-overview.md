# 01 — Product Overview

## What it is

**Free Podcast Mastering** ([freepodcastmastering.com](https://freepodcastmastering.com)) is a web app that does two jobs:

1. **AI podcast mastering** — upload a raw podcast audio file (WAV / MP3 / FLAC / M4A), get back a broadcast-ready master. Uses [Matchering 2.0](https://github.com/sergree/matchering) (reference-based mastering) tuned for spoken voice.
2. **AI video generation** — take the mastered audio and render a YouTube / Shorts video with animated visualizations (waveform, audiogram, bars, particles, pulse), AI-generated captions (OpenAI Whisper), and customizable backgrounds. Rendered server-side via [Remotion](https://www.remotion.dev/).

Both products are **free with no signup required** for the basic tier. A $10/month Unlimited plan removes rate limits, adds 24-bit output, and gives 5 GB of permanent cloud storage. A $1 one-time "HQ Export" credit lets non-subscribers buy a single 24-bit master.

## Production stats (as of late 2025 / early 2026)

- Live and stable for ~6+ months.
- #1 Google result for "free podcast mastering".
- ~500 daily active users.
- 24-hour automatic deletion of free-tier files (privacy-by-default).

## User tiers

| | Free (no signup) | Free (signed in) | Unlimited ($10/mo) | HQ Export ($1 one-time) |
|---|---|---|---|---|
| Masters per week | 2 (IP-rate-limited) | 2 (user-rate-limited) | Unlimited | Buys 1 master credit (24-bit) |
| Output bit depth | 16-bit | 16-bit | 24-bit | 24-bit (1 file) |
| File retention | 24 hours (R2) | 24 hours (R2) | Permanent (Vercel Blob, 5 GB cap) | 24 hours |
| Cloud storage | none | none | 5 GB | none |
| Video generation | yes | yes | yes | yes |
| Email notifications | yes (optional) | yes | yes | yes |

The boundary is enforced by a mix of:
- **Stackframe Stack auth** for user identity (`userId`).
- **`Subscription.status = "active"`** in Postgres for paid features.
- **`HQPurchase.creditsRemaining > 0`** for one-time 24-bit exports.
- **`UsageLog` row counts** in the last 7 days for the 2/week cap (keyed by userId or hashed IP).

See [12-rate-limiting.md](12-rate-limiting.md) for the rate-limit logic and [08-payments.md](08-payments.md) for the payment flow.

## Core user journey — Mastering

1. User lands on `/` (the home page — [src/app/page.tsx](../src/app/page.tsx)).
2. [HomeClient](../src/components/HomeClient.tsx) renders the interactive tool. Static hero / "How it works" / SEO sections render server-side around it.
3. User drops an audio file into [FileDropzone](../src/components/FileDropzone.tsx).
4. Client picks a template (voice-optimized / male-podcast / female-podcast / news-broadcast), output quality (16/24-bit), limiter mode (gentle/normal/loud).
5. Client requests a presigned upload URL from the **Modal backend** (`POST {NEXT_PUBLIC_API_URL}/master`), uploads the file directly to **Cloudflare R2**.
6. Modal kicks off Matchering in a background task, updates a `processing_jobs[jobId]` status dict.
7. Client polls `GET {NEXT_PUBLIC_API_URL}/status/{jobId}` every 1 second.
8. On completion, Modal:
   - For free users: keeps the mastered output in R2 (auto-deleted after 24h).
   - For premium users: uploads the output to **Vercel Blob** under `subscribers/{userId}/...` and POSTs to [`/api/webhooks/job-complete`](../src/app/api/webhooks/job-complete/route.tsx) so the Next.js app records a `SubscriberFile` row.
9. Optional: user enters an email → [`/api/notifications/subscribe`](../src/app/api/notifications/subscribe/route.ts) creates a `JobNotification`. When Modal finishes it triggers the webhook, which sends a Resend email using the [MasteringComplete](../src/emails/MasteringComplete.tsx) template.
10. User downloads the mastered file.

## Core user journey — Video generation

1. After mastering completes (or from the dashboard), user clicks "Generate Video".
2. [VideoGenerator](../src/components/video/VideoGenerator.tsx) opens — preview tab (Remotion Player) + settings tab.
3. Optional caption generation: client calls `POST {NEXT_PUBLIC_API_URL}/transcribe`. Modal runs Whisper, returns segments `[{id,start,end,text}]`.
4. User picks template (waveform / audiogram / bars / particles / pulse), aspect ratio (16:9 / 9:16), background (solid / gradient / image), caption style.
5. Client calls `POST /api/video/render` (which proxies to Modal `/render-video`).
6. Modal spins up a container with Node.js + Chromium + ffmpeg, runs Remotion server-side rendering, uploads MP4 to R2.
7. Same notification pattern: optional email via `VideoJobNotification` + [`/api/webhooks/video-complete`](../src/app/api/webhooks/video-complete/route.tsx) + [VideoComplete](../src/emails/VideoComplete.tsx) template.

## Privacy story (load-bearing for the brand)

The product's marketing leans hard on "we don't train on your audio, we don't keep it". Code must keep that true:
- Free-tier R2 files are deleted nightly via a Modal `@modal.Cron("0 0 * * *")` schedule (see [backend/modal_app.py](../backend/modal_app.py)).
- The webhook → email path passes only `downloadUrl` and metadata; the audio bytes never go through Next.js.
- No ML training pipeline exists. Don't add one.

## What the app explicitly is NOT

- Not a multi-track DAW. There's no editor — input audio in, mastered audio out.
- Not a podcast host. We don't generate RSS, we don't distribute episodes.
- Not a transcription service standalone — Whisper runs only as a precursor to video captions.
- Not voice cloning. Hard "no" — see Terms ([src/app/terms/page.tsx](../src/app/terms/page.tsx)).
