# 02 — Architecture

## High-level diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                                    │
│  (Next.js 16 client components, React 19, Tailwind 4, Remotion Player)  │
└────────────┬───────────────────────────────────────────────┬─────────────┘
             │ HTTPS                                          │
             │                                                │ presigned-URL
             ▼                                                │ direct upload
  ┌────────────────────────────┐                             ▼
  │   Next.js on Vercel        │              ┌──────────────────────────┐
  │   (freepodcastmastering    │              │  Cloudflare R2 (S3-API)  │
  │    .com)                   │              │  • raw uploads           │
  │                            │              │  • mastered outputs      │
  │  • App Router pages        │              │  • rendered videos       │
  │  • /api/* server routes    │              │  • 24h auto-delete       │
  │  • Stackframe auth         │              │    (cron from Modal)     │
  │  • Prisma → Postgres       │              └────────────┬─────────────┘
  └──┬───────────────┬─────────┘                           │
     │               │                                     │ download
     │ DATABASE_URL  │ webhook callbacks                   │
     ▼               │ (Bearer WEBHOOK_SECRET)             │
  ┌─────────┐        │                                     │
  │Postgres │        │      ┌────────────────────────────┐ │
  │(Prisma) │        └──────│  Modal.com (Python)        │◀┘
  │         │               │                            │
  │ 9 models│       ◀───────│  • FastAPI                 │
  └─────────┘       webhook │  • Matchering 2.0 (master) │
                    POST    │  • OpenAI Whisper (caps)   │
                            │  • Remotion via Node +     │
  ┌────────────────┐        │    Chromium (video render) │
  │ Vercel Blob    │◀───────│  • Cron: nightly cleanup   │
  │ (subscribers   │ upload │                            │
  │  permanent     │        └────────────────────────────┘
  │  5GB cap)      │
  └────────────────┘

  ┌──────────────────┐   ┌────────────────┐   ┌────────────────┐
  │ Stripe           │   │ Resend         │   │ Stackframe     │
  │ • subscription   │   │ • mastering    │   │ • sign-in /    │
  │ • $1 HQ purchase │   │   complete     │   │   sign-up      │
  │ • webhooks → /api│   │ • video        │   │ • session      │
  │   /stripe/webhook│   │   complete     │   │   cookie       │
  └──────────────────┘   │ • admin alerts │   └────────────────┘
                         └────────────────┘
```

## Two-app split

This repo is the **Next.js frontend + API**. The **audio + video processing backend** is Python deployed to Modal — its source lives in [backend/](../backend/) but it ships as its own deployment target. The two communicate over HTTPS:

- **Next.js → Modal** for: starting a master, polling status, starting transcription, starting a video render. Modal URL is `NEXT_PUBLIC_API_URL` (production: `https://teylersf--podcast-mastering-fastapi-app.modal.run`).
- **Modal → Next.js** for: job-complete webhooks. Modal calls `https://freepodcastmastering.com/api/webhooks/{job-complete,video-complete}` with `Authorization: Bearer {WEBHOOK_SECRET}`.

This split is intentional. Next.js is great at request/response and SSR; it is **bad at long-running CPU-bound audio jobs**. Matchering can take 60–180 seconds on a 60-minute podcast; Vercel functions cap out long before that. Modal lets us scale CPU on demand without paying for idle.

## Request flows (the three big ones)

### Flow A — Free-tier master, no signup

```
Browser                    Next.js                Modal                  R2
  │                          │                      │                    │
  ├─ GET / ────────────────▶ │                      │                    │
  │ ◀─ HTML + HomeClient ────│                      │                    │
  │                          │                      │                    │
  ├─ GET /api/rate-limit/check (hashed IP) ────────▶│                    │
  │ ◀─ {allowed: true, remaining: 1, limit: 2} ─────│                    │
  │                          │                      │                    │
  ├─ POST {API}/master (multipart audio) ──────────▶│                    │
  │                          │                      ├─ R2 PutObject ───▶ │
  │ ◀─ {jobId} ─────────────────────────────────────│                    │
  │                          │                      │ [Matchering runs]  │
  │ ── poll /status/{jobId} every 1s ──────────────▶│                    │
  │ ◀─ {status: "processing", progress: 60} ────────│                    │
  │ ◀─ {status: "completed", downloadUrl: R2 url} ──│                    │
  │                          │                      │                    │
  ├─ POST /api/rate-limit/check (record usage) ─▶ DB                     │
  │                          │                      │                    │
  ├─ GET downloadUrl ─────────────────────────────────────────────────▶ │
  │ ◀─ mastered WAV ─────────────────────────────────────────────────────│
```

The user can optionally subscribe to an email notification via `POST /api/notifications/subscribe` — that's the same flow plus a `JobNotification` row. When mastering finishes, Modal POSTs to `/api/webhooks/job-complete` which sends the email via Resend.

### Flow B — Premium master (subscriber)

Same as Flow A through the polling phase, then:

```
Modal                        Next.js                              Vercel Blob
  │ [Matchering done]          │                                     │
  ├─ POST /api/files/get-blob-upload-url ──▶ verify Subscription      │
  │ ◀─ {blobToken, blobPathname, ...} ──────│                         │
  ├─ direct upload bytes ────────────────────────────────────────────▶│
  │ ◀─ {url: blob.url} ───────────────────────────────────────────────│
  │                            │                                     │
  ├─ POST /api/webhooks/job-complete {jobId, blobData: {url, ...}} ──▶│
  │                            ├─ prisma.subscriberFile.create()      │
  │                            └─ send Resend email                   │
```

Subscriber files persist (5 GB cap enforced server-side). The dashboard lists them via `GET /api/files/list`.

### Flow C — Video render

```
Browser                Next.js               Modal (Whisper)      Modal (Remotion)        R2
  │                      │                      │                      │                   │
  ├─ POST {API}/transcribe (audioUrl) ────────▶│                      │                   │
  │ ◀─ {jobId} ──────────────────────────────────│                      │                   │
  ├─ poll /transcribe/{id} ─────────────────────▶│                      │                   │
  │ ◀─ {segments: [{start,end,text}]} ───────────│                      │                   │
  │                      │                      │                      │                   │
  ├─ POST /api/video/render (proxies) ──▶ Modal {audioUrl,title,...}  ▶ │                   │
  │                      │                      │                      ├─ bundle + render ▶│
  │                      │                      │                      ├─ ffmpeg mux ─────▶│
  │ ◀─ {jobId} (proxied) ────────────────────────────────────────────────│                   │
  ├─ poll /video/status/{id} ─────────────────────────────────────────▶│                   │
  │ ◀─ {status, downloadUrl} ──────────────────────────────────────────│                   │
```

## Repository layout

```
podcastmaster/
├── README.md                    Public-facing project README
├── package.json                 Next.js + Remotion + Stripe + Stackframe deps
├── next.config.ts               Image/cache headers, Turbopack alias for Remotion
├── remotion.config.ts           Webpack override for CSS in Remotion bundle
├── postcss.config.mjs           Tailwind 4
├── eslint.config.mjs            Flat config, extends next
├── tsconfig.json                Standard Next.js TS config
├── prisma/
│   └── schema.prisma            9 models — see docs/06-database.md
├── public/                      Static assets (svg icons, robots.txt, sitemap.xml,
│                                 DefaultReccomended.mp3 reference audio)
├── assets/                      Repo-internal images (screenshots)
├── scripts/
│   └── check-files.ts           DB + blob-URL health check (manual)
├── src/
│   ├── app/                     Next.js App Router
│   │   ├── layout.tsx           Root layout: fonts, StackProvider, ThemeProvider, analytics
│   │   ├── page.tsx             Home (mastering tool)
│   │   ├── loading.tsx          Suspense fallback
│   │   ├── globals.css          Tailwind base + 20 theme definitions (CSS vars)
│   │   ├── pricing/             Free vs Unlimited pricing page
│   │   ├── terms/               Terms of service (privacy promises)
│   │   ├── how-to-master-podcast-audio/   1500+ line SEO guide page
│   │   ├── dashboard/           Logged-in user dashboard (files, subscription, HQ credits)
│   │   ├── handler/[...stack]/  Stackframe auth UI (sign-in, sign-up, etc.)
│   │   └── api/                 21 API routes — see docs/05-api-reference.md
│   ├── components/              Client UI components — see docs/03-tech-stack.md
│   ├── lib/                     Server-only singletons (prisma, stripe, resend)
│   ├── emails/                  React Email templates (Resend)
│   ├── remotion/                Remotion compositions (PodcastVideo, Root)
│   └── stack.tsx                Stackframe StackServerApp config
└── backend/                     Python FastAPI + Modal deployment
    ├── main.py                  Local/dev FastAPI app
    ├── modal_app.py             Production Modal deployment (full)
    ├── modal_app_minimal.py     Minimal Modal variant
    ├── transcription.py         Whisper captions
    ├── remotion_renderer.py     Remotion CLI invocation
    ├── remotion_ssr.py          Remotion server-side render integration
    ├── requirements.txt         fastapi, matchering, etc.
    ├── start.sh / start.bat     Local run helpers
    └── setup.sh / setup.bat     Local venv setup helpers
```

## Where state lives

| State | Where | Lifecycle |
|---|---|---|
| User identity | Stackframe cookie | Session-bound |
| Subscription status | `Subscription` table | Updated by Stripe webhooks |
| HQ credits | `HQPurchase` table | Decremented on use |
| Rate-limit counter | `UsageLog` table | Rolling 7-day window |
| Active mastering jobs | Modal `processing_jobs` dict | In-memory, lost on cold start |
| Job-status notifications | `JobNotification` / `VideoJobNotification` | One row per email subscription |
| Free user file metadata | `FreeUserFile` | Has `expiresAt`, GC'd separately |
| Premium user file metadata | `SubscriberFile` (FK → `Subscription`) | Lives until user deletes |
| Premium mastering job link | `PremiumUserJob` | Lets webhook know to save to Blob |
| Email send log | `EmailLog` | Append-only, for analytics |
| Theme choice | `localStorage['podcast-theme-chosen']` | Per-browser |

## Conventions

- **Server-only modules** start with `import "server-only";` (see [src/stack.tsx](../src/stack.tsx) and the API routes). Keeps secrets out of client bundles.
- **Prisma client** is a global singleton — never `new PrismaClient()` ad-hoc (hot-reload would leak connections).
- **Auth check** in every authenticated API route uses `await stackServerApp.getUser()` (returns `null` if not signed in).
- **Webhook auth** uses `Authorization: Bearer ${WEBHOOK_SECRET}` — same secret for Modal callbacks AND the IP-hashing salt in rate-limit (yes, double-duty).
- **Bit depth & quality flags** live on the master request, not on the user — the user's tier just gates which flags are allowed.
