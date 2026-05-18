# 03 — Tech Stack

Exact versions from [package.json](../package.json) at time of writing. Versions drift — `npm outdated` is authoritative.

## Frontend / framework

| Package | Version | What it does here |
|---|---|---|
| `next` | `16.0.7` | App Router, server components, API routes, image optimization |
| `react` / `react-dom` | `19.2.1` | UI |
| `typescript` | `^5` | Types throughout |
| `tailwindcss` | `^4` | Styling. CSS-vars-first (theme system uses Tailwind 4's @theme) |
| `@tailwindcss/postcss` | `^4` | Tailwind 4 build |
| `postcss` (via `@tailwindcss/postcss`) | — | Compiles Tailwind |
| `eslint` + `eslint-config-next` | `^9` / `16.0.7` | Linting |

## UI & animation

| Package | Version | Where |
|---|---|---|
| `lucide-react` | `^0.554.0` | Icons everywhere |
| `framer-motion` | `^12.23.24` | Card animations, theme transitions |
| `react-dropzone` | `^14.3.8` | [FileDropzone](../src/components/FileDropzone.tsx) |
| `html-to-image` | `^1.11.13` | Used for screenshot/exports (currently lightly used) |

Fonts (loaded via `next/font/google` in [src/app/layout.tsx](../src/app/layout.tsx)):
- `DM Sans` — body + headings (preloaded)
- `IBM Plex Mono` — code/mono accents
- `Caveat` — hand-written theme only
- `Patrick Hand` — coloring-book theme only

## Auth

| Package | Version | What it does |
|---|---|---|
| `@stackframe/stack` | `^2.8.54` | Email/password + OAuth auth. Cookie-based sessions. Drop-in UI at `/handler/*` |

Configured in [src/stack.tsx](../src/stack.tsx) — `StackServerApp` with `tokenStore: "nextjs-cookie"`. After-sign-in redirect is `/dashboard`.

## Database

| Package | Version | What it does |
|---|---|---|
| `@prisma/client` | `^5.22.0` | DB client |
| `prisma` | `^5.22.0` | Migrations / introspection |

Postgres (was Neon; the [Neon→Linode migration playbook](MIGRATING_NEON_TO_LINODE.md) is in this folder). Connection via `DATABASE_URL` and optional `DATABASE_URL_UNPOOLED` (Prisma's `directUrl`).

Singleton client in [src/lib/prisma.ts](../src/lib/prisma.ts).

## Payments

| Package | Version | What it does |
|---|---|---|
| `stripe` | `^20.0.0` | Subscription checkout, one-time payment, billing portal, webhooks |

Configured in [src/lib/stripe.ts](../src/lib/stripe.ts) — API version `2024-11-20.acacia`. **Note:** If Vercel's `vercel.json` ever wipes the lockfile, Stripe might resolve to a newer minor than the local install — see the gotcha in [MIGRATING_NEON_TO_LINODE.md](MIGRATING_NEON_TO_LINODE.md) §12.5 about the `as Stripe.LatestApiVersion` cast.

## Storage

| Package | Version | What it does |
|---|---|---|
| `@vercel/blob` | `^2.0.0` | Premium-user file storage (5 GB cap per user) |

Cloudflare R2 is accessed from **Python** via `boto3` in the Modal backend — there's no R2 client in the Next.js code. R2 holds free-tier files and rendered videos.

## Email

| Package | Version | What it does |
|---|---|---|
| `resend` | `^6.5.2` | Transactional email API |
| `@react-email/render` | `^2.0.0` | Renders React Email components to HTML for Resend |

Configured in [src/lib/resend.ts](../src/lib/resend.ts). Templates in [src/emails/](../src/emails/).

## Video

| Package | Version | What it does |
|---|---|---|
| `remotion` | `^4.0.414` | React-based video framework (compositions) |
| `@remotion/player` | `^4.0.414` | Browser preview |
| `@remotion/bundler` | `^4.0.414` | Used by Modal backend to bundle compositions |
| `@remotion/renderer` | `^4.0.414` | Used by Modal backend to render via Chromium |
| `@remotion/cli` | `^4.0.414` | CLI commands (`npx remotion preview`, etc.) |

Compositions in [src/remotion/](../src/remotion/) — 3 registered:
- `PodcastVideo-YouTube` (1920×1080, 30fps)
- `PodcastVideo-Vertical` (1080×1920, 30fps — Shorts)
- `PodcastVideo-YouTube-60fps` (1920×1080, 60fps — HD output)

Remotion config in [remotion.config.ts](../remotion.config.ts) — only override is adding `style-loader` + `css-loader` so we can use Tailwind classes in compositions.

## Validation

| Package | Version | What it does |
|---|---|---|
| `zod` | `^4.3.6` | Props schema for Remotion compositions; ad-hoc body validation in API routes |

## Networking

| Package | Version | What it does |
|---|---|---|
| `axios` | `^1.13.2` | Used in a few places; most fetches are native `fetch` |

## Analytics

| Package | Version | What it does |
|---|---|---|
| `@vercel/analytics` | `^1.5.0` | Page view tracking, mounted in root layout |

Google Ads gtag (`AW-875960507`) is wired inline in [src/app/layout.tsx](../src/app/layout.tsx) for conversion tracking when a master finishes.

## Backend (Python — separate deployment target)

Not in `package.json`. From [backend/requirements.txt](../backend/requirements.txt):

| Package | Purpose |
|---|---|
| `fastapi` (>=0.109) + `uvicorn[standard]` | HTTP server |
| `python-multipart` | File uploads |
| `matchering` (>=2.0.6) | Reference-based audio mastering (the core IP) |
| `aiofiles` | Async file IO |
| `pydantic` (>=2) | Request/response models |

Plus deps installed inside the Modal container image (in [backend/modal_app.py](../backend/modal_app.py)):
- `openai-whisper` — transcription
- `boto3` — Cloudflare R2 (S3-API)
- `requests` — HTTP for callbacks
- `vercel_blob` — Vercel Blob direct upload from Python

And system packages in the Modal image: `libsndfile1`, `ffmpeg`, plus Node.js + Chromium for Remotion rendering.

## Build / dev tools

| Tool | Purpose |
|---|---|
| **Turbopack** | Default Next.js 16 dev/build bundler. Aliased to resolve Remotion. |
| **Modal CLI** | `modal deploy backend/modal_app.py` to deploy the Python backend |
| **Vercel CLI** | `npx vercel@latest --prod` for production deploys |
| **Prisma CLI** | `npx prisma generate`, `npx prisma db push`, `npx prisma migrate` |

## Why these choices

- **Next.js + Vercel** — fast SSR, free tier covers most of the app cost, dead-simple deploy.
- **Modal for Python** — pay-per-second compute, scales to zero, handles the long-running audio jobs Vercel can't.
- **Matchering** — open-source, no API costs, runs entirely on our compute. The product literally cannot work on Vercel functions; this is why the Python split exists.
- **Cloudflare R2** — egress is free, S3-compatible, cheap.
- **Vercel Blob** for premium files — tighter integration with the Next.js app for the dashboard's file list, ACL via Stack Auth.
- **Stackframe** — Next.js-native, free tier, no DIY auth code.
- **Remotion** — TypeScript/React for video means the team only needs one mental model. Renders deterministically.
- **Resend** — fast onboarding, good DX, transactional only (no marketing-list features we'd never use).
