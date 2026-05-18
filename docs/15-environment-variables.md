# 15 — Environment Variables

Every env var the app reads, where it's set, and whether it's required.

## Naming conventions

- `NEXT_PUBLIC_*` — exposed to the browser. Anything else stays server-only.
- Secrets never go in `NEXT_PUBLIC_*`. (Yes, this includes API keys for client-side SDKs — use a server route if you need a key client-side.)

Three places vars live:
- **`.env.local`** — local development, gitignored
- **Vercel project env** — production / preview / development
- **Modal secrets** — only for the Python backend (set via `modal secret create`)

## Next.js (frontend + API)

### Required for the app to boot

| Var | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | Postgres pooled connection (Prisma) | `postgresql://user:pw@host:6432/db?pgbouncer=true&connection_limit=1` |
| `NEXT_PUBLIC_STACK_PROJECT_ID` | Stackframe project | `abc123-...` |
| `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` | Stackframe public key | `pk_live_...` |
| `STACK_SECRET_SERVER_KEY` | Stackframe server key | `sk_live_...` |
| `STRIPE_SECRET_KEY` | Stripe API | `sk_live_...` or `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Verify Stripe webhooks | `whsec_...` |
| `STRIPE_PRICE_ID` | Unlimited subscription price | `price_...` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | `vercel_blob_rw_...` |
| `RESEND_API_KEY` | Email send | `re_...` |
| `NEXT_PUBLIC_API_URL` | Modal backend base URL | `https://teylersf--podcast-mastering-fastapi-app.modal.run` |
| `WEBHOOK_SECRET` | Bearer auth for Modal ↔ Next.js callbacks **and** rate-limit IP hash salt | a 32-char random string |

If `RESEND_API_KEY` or `STRIPE_SECRET_KEY` are missing, the app **throws on boot** (see [src/lib/resend.ts:3](../src/lib/resend.ts) and [src/lib/stripe.ts:3](../src/lib/stripe.ts)).

### Optional but commonly set

| Var | Purpose | Default if unset |
|---|---|---|
| `DATABASE_URL_UNPOOLED` | Prisma's `directUrl` for migrations | unused; only needed if you run `prisma migrate` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public Stripe key, in case of client-side Stripe Elements | `""` |
| `RESEND_FROM_NAME` | Display name for sent emails | `"Free Podcast Mastering"` |
| `RESEND_FROM_ADDRESS` | Sender email | `onboarding@resend.dev` (Resend's test address — only sends to your own account email) |

### Where they're read

| Var | First read in |
|---|---|
| `DATABASE_URL` | [prisma/schema.prisma](../prisma/schema.prisma) (build time), then [src/lib/prisma.ts](../src/lib/prisma.ts) |
| `DATABASE_URL_UNPOOLED` | [prisma/schema.prisma](../prisma/schema.prisma) (`directUrl`) |
| `STACK_SECRET_SERVER_KEY` | implicit via `@stackframe/stack` package |
| `NEXT_PUBLIC_STACK_PROJECT_ID` | implicit via `@stackframe/stack` package |
| `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` | implicit via `@stackframe/stack` package |
| `STRIPE_SECRET_KEY` | [src/lib/stripe.ts:3](../src/lib/stripe.ts) |
| `STRIPE_WEBHOOK_SECRET` | [src/app/api/stripe/webhook/route.ts](../src/app/api/stripe/webhook/route.ts) |
| `STRIPE_PRICE_ID` | [src/lib/stripe.ts:13](../src/lib/stripe.ts) |
| `BLOB_READ_WRITE_TOKEN` | [src/app/api/files/upload/route.ts](../src/app/api/files/upload/route.ts), [src/app/api/files/get-blob-upload-url/route.ts](../src/app/api/files/get-blob-upload-url/route.ts) |
| `RESEND_API_KEY` | [src/lib/resend.ts:3](../src/lib/resend.ts) |
| `RESEND_FROM_NAME` / `RESEND_FROM_ADDRESS` | [src/lib/resend.ts:15-16](../src/lib/resend.ts) |
| `NEXT_PUBLIC_API_URL` | [HomeClient.tsx](../src/components/HomeClient.tsx), [MasteringTool.tsx](../src/components/MasteringTool.tsx), [VideoGenerator.tsx](../src/components/video/VideoGenerator.tsx), [src/app/api/video/render/route.ts](../src/app/api/video/render/route.ts), [src/app/api/notifications/send/route.tsx](../src/app/api/notifications/send/route.tsx) |
| `WEBHOOK_SECRET` | webhook routes (Bearer verification) + [src/app/api/rate-limit/check/route.ts](../src/app/api/rate-limit/check/route.ts) (IP hash salt) |

## Modal backend

Set via:
```bash
modal secret create podcast-mastering-secrets WEBHOOK_SECRET=... R2_ACCESS_KEY_ID=... ...
```
And referenced in [backend/modal_app.py](../backend/modal_app.py) via `modal.Secret.from_name("podcast-mastering-secrets")`.

| Var | Purpose |
|---|---|
| `WEBHOOK_SECRET` | Bearer token used to authenticate when calling back into Next.js. Must match the Next.js `WEBHOOK_SECRET`. |
| `R2_ACCOUNT_ID` | Cloudflare R2 account |
| `R2_ACCESS_KEY_ID` | R2 access |
| `R2_SECRET_ACCESS_KEY` | R2 secret |
| `R2_BUCKET_NAME` | The bucket |
| `R2_PUBLIC_URL` | Public domain for objects, e.g. `https://files.freepodcastmastering.com` |
| `WEBHOOK_URL` | Next.js webhook URL — `https://freepodcastmastering.com/api/webhooks/job-complete` |
| `VIDEO_WEBHOOK_URL` | Video webhook URL |
| `VERCEL_BLOB_RW_TOKEN` | Same value as Next.js `BLOB_READ_WRITE_TOKEN` (Modal uploads to Blob for premium users) |

## Local `.env.local` template

```env
# Database (use a dev Postgres — local Docker or a free Neon dev DB)
DATABASE_URL="postgresql://user:pw@host:5432/podcastmaster_dev?sslmode=require"

# Stackframe (create a project at stackframe.dev)
NEXT_PUBLIC_STACK_PROJECT_ID=
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=
STACK_SECRET_SERVER_KEY=

# Stripe TEST mode
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # from `stripe listen --forward-to localhost:3000/api/stripe/webhook`
STRIPE_PRICE_ID=price_...        # test-mode price

# Vercel Blob (create from Vercel dashboard)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Resend
RESEND_API_KEY=re_...
# RESEND_FROM_ADDRESS=  # leave unset to use Resend test address (sends only to your account email)

# Backend
NEXT_PUBLIC_API_URL=https://teylersf--podcast-mastering-fastapi-app.modal.run
WEBHOOK_SECRET=any-long-random-string-32-chars
```

## Production Vercel env

All variables set under **Production**, **Preview**, **Development** scopes.

For Preview/Development scopes, you can keep test-mode Stripe keys but production Modal URL is fine (Modal is a single endpoint, no preview environments needed).

### Caveat: never include trailing newlines

If you `echo "$URL" | vercel env add ...`, the value gets a literal `\n` appended. Use `printf '%s'` instead:
```bash
printf '%s' "$URL" | npx vercel@latest env add DATABASE_URL production
```
See [MIGRATING_NEON_TO_LINODE.md §9](MIGRATING_NEON_TO_LINODE.md) for the war story.

### Caveat: Preview env vars without git connection

If the Vercel project has no GitHub→Vercel connection, `vercel env add ... preview` may hang. Use the REST API:
```bash
TOKEN=$(grep -oE '"token"\s*:\s*"[^"]+"' ~/AppData/Roaming/com.vercel.cli/Data/auth.json | sed -E 's/.*"token"\s*:\s*"([^"]+)".*/\1/')
curl -s -X POST "https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"key":"NAME","value":"...","type":"encrypted","target":["preview"]}'
```

## Public vs server vars — a common mistake

- `NEXT_PUBLIC_*` vars are **inlined into the client bundle at build time**. Changing them in Vercel requires a rebuild, not just a restart.
- Server-only vars are read at runtime in API routes — no rebuild needed for those.

## Rotating secrets

If you rotate:
- `STRIPE_WEBHOOK_SECRET` → also update in Stripe dashboard (regenerate signing secret).
- `WEBHOOK_SECRET` → update in BOTH Vercel and Modal at the same time, or webhook calls fail. Also resets the guest rate-limit counter (hashes change).
- `RESEND_API_KEY` → just update; no other moving parts.
- `BLOB_READ_WRITE_TOKEN` → update in Vercel AND in Modal's `VERCEL_BLOB_RW_TOKEN`.
- Database creds → rotate the Postgres role password, update `DATABASE_URL` everywhere (Vercel + local).

## What's NOT in env

- Theme list — hardcoded in CSS + components (see [14-theming.md](14-theming.md)).
- Matchering reference WAV files — baked into the Modal container image.
- Feature flags — currently no feature flag system. Add one if needed.
