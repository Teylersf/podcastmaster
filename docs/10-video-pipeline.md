# 10 — Video Generation Pipeline

Turns a mastered audio file into a YouTube or Shorts-format MP4 with animated visualizations, optional AI captions, custom backgrounds, and a title.

## Players

| Component | Role |
|---|---|
| Browser ([VideoGenerator](../src/components/video/VideoGenerator.tsx)) | Settings UI, Remotion Player live preview |
| Modal — `transcribe` function | OpenAI Whisper for captions |
| Modal — `render_video_job` function ([backend/remotion_ssr.py](../backend/remotion_ssr.py)) | Node.js + Chromium + Remotion CLI to render MP4 |
| R2 | Stores the final MP4 (free + paid both; videos are large) |
| Next.js webhook ([`/api/webhooks/video-complete`](../src/app/api/webhooks/video-complete/route.tsx)) | Email + DB updates |

The audio source for the video is **already mastered** — it's a URL the client has (from R2 download or Vercel Blob).

## Stage 1 — Open the generator

Triggered from:
- After a mastering job completes in [HomeClient](../src/components/HomeClient.tsx) → "Generate Video" button
- From the dashboard's file list → "Make Video"

`<VideoGenerator audioUrl={url} audioDuration={seconds} fileName={name} onClose={...} />` opens as a modal.

## Stage 2 — Optional transcription (Whisper)

User clicks "Add captions" → client `POST {NEXT_PUBLIC_API_URL}/transcribe` with `{ audio_url }` or `{ audio_r2_key }`.

Modal's [backend/transcription.py](../backend/transcription.py):
1. Downloads audio from R2 (or HTTP URL).
2. Loads Whisper `"base"` model (balance of speed + quality).
3. Runs `model.transcribe(audio_path, word_timestamps=True)`.
4. Returns segments: `[{ id, start, end, text }]`.

Container resources: 2 CPU, 4 GB RAM, 600s timeout.

Client polls `GET /transcribe/{jobId}` until `status === "completed"`, then stores `captions` in state.

## Stage 3 — Configure the video

The settings tab in [VideoGenerator](../src/components/video/VideoGenerator.tsx) lets the user pick:

- **Title** / **Subtitle**
- **Aspect Ratio**: `16:9` (YouTube) or `9:16` (Shorts)
- **Background**:
  - `solid` (color picker)
  - `gradient` (from + to colors; 6 presets: podcast, ocean, sunset, forest, minimal, fire)
  - `image` (uploaded image URL)
- **Visualization template**:
  - `waveform` — 48 animated bars
  - `audiogram` — 5 concentric rings of bars, radial
  - `bars` — 32 frequency bars (bass left, treble right)
  - `circles` — pulse circles
  - `particles` — particle effect
- **Accent color** — picks the visualization color
- **Caption style**: `highlight` | `karaoke` | `simple`
- **Logo URL** (optional)
- **Quality preset**: Web (30fps), HD (60fps), 4K (60fps)
- **Show progress bar** toggle

These are all driven by props to the Remotion composition. The same component renders live in the browser (Remotion Player) and on the server (Remotion CLI rendering via Chromium) — pixel-identical.

## Stage 4 — Live preview

The preview tab embeds `<Player>` from `@remotion/player`. It mounts the same [PodcastVideo](../src/remotion/PodcastVideo.tsx) composition with the user's current props. Updates are real-time as the user changes settings.

This means the video the user sees in preview is exactly what the server will render — no surprises on download.

## Stage 5 — Server render

User clicks "Render Video":
1. Client `POST /api/video/render` (Next.js) → proxies to `POST {NEXT_PUBLIC_API_URL}/render-video` (Modal) with the full props payload.
2. Modal returns `{ jobId }`.
3. Client polls `GET {NEXT_PUBLIC_API_URL}/video/status/{jobId}`.

Inside Modal ([backend/remotion_ssr.py](../backend/remotion_ssr.py)):
- Container image is Debian + Node 20 + Chromium + ffmpeg + fonts (preinstalled).
- `npm install` of `remotion`, `@remotion/renderer`, `@remotion/bundler` happens at image build time.
- The composition source ([src/remotion/](../src/remotion/)) is baked into the container.
- `render_video_job()` invokes `npx remotion render` with the user's props serialized as `--props='{...}'`.
- Chromium renders each frame; ffmpeg muxes them with the audio track.
- Resources: 4 CPU, 8 GB RAM, 1800s (30min) timeout.

For an average ~30-minute podcast at 1080p 30fps, render takes 5–15 minutes.

## Stage 6 — Output + webhook

When the render completes, Modal uploads the MP4 to R2 at `videos/{jobId}/{filename}.mp4`. Then POSTs `/api/webhooks/video-complete` with:
```json
{ "jobId": "...", "status": "completed", "downloadUrl": "...", "videoTitle": "..." }
```

The webhook:
1. Verifies Bearer auth.
2. Looks up `VideoJobNotification` by `jobId`.
3. If found and not yet sent: render [VideoComplete](../src/emails/VideoComplete.tsx), send via Resend, set `emailSentAt`.

## Remotion compositions

[src/remotion/Root.tsx](../src/remotion/Root.tsx) registers three compositions:

```tsx
<Composition
  id="PodcastVideo-YouTube"
  component={PodcastVideo}
  width={1920} height={1080} fps={30} durationInFrames={3000}  // 100s
  schema={podcastVideoSchema}
  defaultProps={{ ... glassmorphism colors ... }}
/>
<Composition id="PodcastVideo-Vertical"     width={1080} height={1920} fps={30} ... />
<Composition id="PodcastVideo-YouTube-60fps" width={1920} height={1080} fps={60} ... />
```

`durationInFrames` is a default — the actual render duration is overridden per-job to match the audio length.

### Props schema (zod)

[src/remotion/PodcastVideo.tsx](../src/remotion/PodcastVideo.tsx) defines `podcastVideoSchema`:
```ts
{
  audioUrl: string,
  title: string,
  subtitle?: string,
  captions?: { id, start, end, text }[],
  backgroundType?: "solid" | "gradient" | "image",
  backgroundColor?, gradientFrom?, gradientTo?, accentColor?: string,
  showWaveform?, showProgressBar?: boolean,
  logoUrl?: string | null,
  aspectRatio?: "16:9" | "9:16",
  template?: "waveform" | "audiogram" | "circles" | "bars" | "particles",
  backgroundImageUrl?: string | null,
  captionStyle?: "highlight" | "karaoke" | "simple",
}
```

### Visualization components

All live in [src/remotion/PodcastVideo.tsx](../src/remotion/PodcastVideo.tsx) as inner components:
- **WaveformVisualizer** — 48 bars driven by `Math.sin(frame * 0.1 + i)` with a glow filter
- **CircularAudiogram** — 5 concentric rings × 24 bars, rotating
- **FrequencyBars** — 32 bars in a row, bass/mid/treble bands behave slightly differently
- **PulseCircles** — concentric pulsing rings
- **ParticleEffect** — moving particles

All read `useCurrentFrame()` and `useVideoConfig()` to animate at the correct fps. They render purely from frame math — they don't actually FFT the audio (would be too slow).

### Audio track

`<Audio src={audioUrl} />` from `remotion`. Remotion auto-handles syncing it to the timeline.

### Progress bar + captions

If `showProgressBar`, a thin bar at the bottom fills based on `frame / durationInFrames`.

Captions are rendered with `interpolate` to fade in/out around each segment's `start`/`end`. The three styles:
- **highlight** — current segment full opacity, others 0
- **karaoke** — current segment with a horizontal fill animation
- **simple** — bottom-third lower-thirds style, no animation

## Remotion config

[remotion.config.ts](../remotion.config.ts):
```ts
import { Config } from "@remotion/cli/config";
Config.overrideWebpackConfig((current) => ({
  ...current,
  module: { ...current.module, rules: [
    ...current.module.rules,
    { test: /\.css$/, use: ["style-loader", "css-loader"] },
  ]},
}));
```
Only override is enabling CSS imports inside Remotion (so we can use Tailwind classes in compositions if we want).

## Failure modes

| Symptom | Cause | What happens |
|---|---|---|
| Render times out (>30min) | Very long audio + high fps | Modal returns failed; client shows error |
| Browser CORS error loading audioUrl in `<Audio>` | R2 bucket CORS rules | Fix in R2 console — allow `*` origin for GET |
| Caption alignment looks off in render but right in preview | Player and renderer use different Chromium versions | Pin `@remotion/*` packages to same version; rebuild Modal image |
| Custom fonts don't render server-side | Missing font in container | Install via apt-get in the Modal image |
| Audio doesn't play in render | `audioUrl` not directly accessible from Modal | Use a public R2/Blob URL, not a presigned one |

## Why server-side rendering?

Browser rendering with `@remotion/player` is preview-only — Chromium-in-a-browser can't reliably produce frame-accurate MP4 of a 30-minute podcast. Server render uses a dedicated headless Chromium that processes each frame deterministically.

## Cost considerations

Video rendering is the most expensive thing the product does:
- ~10–15 min of compute per video at 1080p 30fps
- Modal charges per second of CPU/memory; budget ~$0.05–$0.15 per video

If video generation grows, consider:
- Lower-default quality (e.g. 1080p 30fps as default, 60fps + 4K as paid upsells)
- Caching: don't currently cache renders even if the user requests an identical second render
- Spot-instance / preemptible compute on Modal
