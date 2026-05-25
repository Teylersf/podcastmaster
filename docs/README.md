# Free Podcast Mastering — Documentation

> Internal documentation for the [freepodcastmastering.com](https://freepodcastmastering.com) codebase.
> Intended as **LLM-readable context** so a fresh chat can pick up work without re-discovering the app.
>
> The whole `docs/` folder is meant to be dropped into a new chat as context.
> Each file is self-contained — read top-to-bottom or jump in via this index.

## Index

| # | File | What's in it |
|---|---|---|
| — | [README.md](README.md) | This index |
| 01 | [01-overview.md](01-overview.md) | What the product is, who uses it, the user journey |
| 02 | [02-architecture.md](02-architecture.md) | High-level diagram, repo layout, request flows |
| 03 | [03-tech-stack.md](03-tech-stack.md) | Every library, version, and what it does in this app |
| 04 | [04-routes-and-pages.md](04-routes-and-pages.md) | Every Next.js page route (frontend) |
| 05 | [05-api-reference.md](05-api-reference.md) | Every `/api/*` route — method, body, response, side effects |
| 06 | [06-database.md](06-database.md) | Prisma schema — every model, every field |
| 07 | [07-auth.md](07-auth.md) | Stackframe Stack auth — how user identity flows |
| 08 | [08-payments.md](08-payments.md) | Stripe subscription, $1 HQ purchase, webhook lifecycle |
| 09 | [09-audio-pipeline.md](09-audio-pipeline.md) | Upload → Modal (Matchering) → R2 / Vercel Blob |
| 10 | [10-video-pipeline.md](10-video-pipeline.md) | Transcription (Whisper) → Remotion render → R2 |
| 11 | [11-storage-and-files.md](11-storage-and-files.md) | R2, Vercel Blob, quotas, 24-hour expiry |
| 12 | [12-rate-limiting.md](12-rate-limiting.md) | 2-files/week guest cap, IP hashing |
| 13 | [13-email-notifications.md](13-email-notifications.md) | Resend + email templates |
| 14 | [14-theming.md](14-theming.md) | 20 themes, CSS variables, `ThemeProvider` |
| 15 | [15-environment-variables.md](15-environment-variables.md) | Every env var, required vs optional, scope |
| 16 | [16-deployment.md](16-deployment.md) | Vercel (frontend) + Modal (backend) |
| 17 | [17-local-development.md](17-local-development.md) | Setup, dev commands, common gotchas |
| 18 | [18-common-tasks.md](18-common-tasks.md) | "How do I add a theme / a Stripe product / an API route" recipes |
| 19 | [19-multi-domain-setup.md](19-multi-domain-setup.md) | freepodcastmastering.com + freemusicmaster.com — middleware, canonicals, sitemap, DNS |
| — | [MIGRATING_NEON_TO_LINODE.md](MIGRATING_NEON_TO_LINODE.md) | One-off Postgres migration playbook (kept for reference) |

## Quick orientation (60 seconds)

- **Stack:** Next.js 16 App Router + React 19 + TypeScript + Tailwind 4 on Vercel, Postgres via Prisma, Python FastAPI on Modal for audio + video rendering, Stackframe for auth, Stripe for payments, Resend for email.
- **Two products in one app:** (1) Free AI podcast mastering using [Matchering](https://github.com/sergree/matchering), (2) Free AI video generation from mastered audio using [Remotion](https://www.remotion.dev/).
- **Two user tiers:** Free (2 masters/week, 24h file retention, 16-bit output) and Unlimited ($10/mo: unlimited, 5GB cloud storage, 24-bit output). Plus a one-time $1 "HQ Export" credit for non-subscribers.
- **Frontend lives in:** [src/app/](../src/app/) (routes), [src/components/](../src/components/) (UI), [src/lib/](../src/lib/) (server helpers), [src/remotion/](../src/remotion/) (video compositions), [src/emails/](../src/emails/) (email templates).
- **Backend lives in:** [backend/](../backend/) — FastAPI + Matchering + Whisper + Remotion-via-Node, deployed to Modal.
- **Database schema:** [prisma/schema.prisma](../prisma/schema.prisma) — 9 models.

## How to use this folder with an LLM

Drop the whole `docs/` folder into your context, then either:
1. Ask the LLM to read [01-overview.md](01-overview.md) and [02-architecture.md](02-architecture.md) first for orientation, or
2. Point it at the specific doc that covers your task (e.g. "we're adding a Stripe product — read [08-payments.md](08-payments.md)").

The docs reference real file paths (e.g. [src/app/api/stripe/webhook/route.ts](../src/app/api/stripe/webhook/route.ts)) — the LLM should read source files directly for any change.
