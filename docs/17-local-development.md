# 17 — Local Development

How to get the app running on your own machine.

## Prerequisites

- **Node.js 18+** (Next.js 16 requirement)
- **npm** (yarn / pnpm should work too)
- **A Postgres** somewhere — easiest options:
  - Local: Docker `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`
  - Free Neon dev branch (their free tier is plenty)
- **Python 3.11+** (only if you're touching the backend)
- **Modal CLI** (only for backend deploys) — `pip install modal`
- **Stripe CLI** (recommended for webhook testing) — `brew install stripe/stripe-cli/stripe` or the equivalent
- **Vercel CLI** (only if deploying yourself) — `npx vercel@latest`

## Frontend (Next.js)

### 1. Install

```bash
git clone https://github.com/Teylersf/podcastmaster.git
cd podcastmaster
npm install
```

`npm install` triggers `postinstall` → `prisma generate`. It will error if `DATABASE_URL` isn't set — set it to anything Postgres-shaped (even a placeholder) just to get past install; you'll fix it properly in the next step.

### 2. Configure `.env.local`

Create `.env.local` in the repo root using the template in [15-environment-variables.md](15-environment-variables.md).

Minimum to actually click around:
- `DATABASE_URL` — pointing at your local/dev Postgres
- The three `STACK_*` env vars — sign up at [stackframe.dev](https://stackframe.dev), create a project, paste the keys
- `STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_WEBHOOK_SECRET=whsec_...`, `STRIPE_PRICE_ID=price_...` — all test-mode
- `BLOB_READ_WRITE_TOKEN` — make a dev Blob store in Vercel
- `RESEND_API_KEY` — sign up at resend.com, free tier
- `NEXT_PUBLIC_API_URL=https://teylersf--podcast-mastering-fastapi-app.modal.run` — yes, you can point at the production Modal endpoint for dev; it's a separate user identity by Stack
- `WEBHOOK_SECRET=any-long-random-string` — local development can use anything

### 3. Set up the database

```bash
npx prisma db push
```
This creates all 9 tables in your dev DB. No migration files — just the current schema.

### 4. Run the dev server

```bash
npm run dev
```

Visit http://localhost:3000. Hot reload via Turbopack (Next.js 16 default).

### 5. (Optional) Forward Stripe webhooks to localhost

```bash
stripe login    # one-time
stripe listen --forward-to localhost:3000/api/stripe/webhook
# The CLI prints `whsec_...` — paste it into .env.local as STRIPE_WEBHOOK_SECRET
```

Now Stripe events fire your local webhook. Useful for testing subscription flows end-to-end.

### 6. (Optional) Make a test Stripe purchase

In test mode with `stripe listen` running:
1. Go to http://localhost:3000/pricing
2. Click "Upgrade"
3. Sign in / sign up (Stack Auth)
4. On Stripe Checkout, use card `4242 4242 4242 4242`, any future expiry, any CVC
5. Get redirected back to `/dashboard?subscription=success`
6. Check the `Subscription` row in your local DB — should have `status: "active"`

## Backend (Python / Modal)

### 1. Local FastAPI (no Modal)

For quick iteration without Modal:
```bash
cd backend
./setup.sh   # or setup.bat on Windows — creates venv, installs reqs
./start.sh   # runs uvicorn main:app --reload --port 8000
```

Then in your `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Limitations vs Modal:
- No R2 upload — outputs stay in `backend/outputs/`
- No Vercel Blob upload — premium flow is harder to test
- No webhook callback (you'd need ngrok to expose your Next.js dev server)
- Matchering reference files must be present at `backend/references/`

This setup is fine for tweaking the audio pipeline or the FastAPI routes themselves.

### 2. Modal dev mode (recommended)

```bash
cd backend
modal serve modal_app.py
```

This deploys to Modal but keeps the process attached — code changes hot-reload, logs stream to your terminal. The URL printed is a temporary dev endpoint distinct from production.

Set `NEXT_PUBLIC_API_URL` to that dev URL in `.env.local`.

### 3. Deploying backend changes to production

```bash
modal deploy modal_app.py
```

See [16-deployment.md](16-deployment.md) for the full deploy story.

## Common dev tasks

### Add a new env var

1. Add it to `.env.local`.
2. Add it to [15-environment-variables.md](15-environment-variables.md).
3. Add it in Vercel (Production + Preview + Development).
4. If used by backend, add it to the Modal secret.

### Reset your dev DB

```bash
npx prisma db push --force-reset
# or, full nuke + recreate:
DATABASE_URL=... npx prisma db push --force-reset --accept-data-loss
```

### Check what files are in the DB

```bash
npx tsx scripts/check-files.ts
# (or ts-node — see scripts/check-files.ts)
```

Lists all `Subscription`s with their files, the latest 10 `FreeUserFile`s, and HEAD-checks each blob URL.

### Inspect the schema in Prisma Studio

```bash
npx prisma studio
```

Opens a browser GUI at http://localhost:5555.

### Run lint

```bash
npm run lint
```

### Test a build

```bash
npm run build
```

Catches type errors that `npm run dev` misses (Turbopack dev doesn't always typecheck eagerly).

### Working on Remotion compositions

```bash
npx remotion preview
```

Opens Remotion's standalone preview UI at http://localhost:3001. Faster iteration than going through the Next.js app.

```bash
npx remotion render PodcastVideo-YouTube out.mp4 --props='{"audioUrl":"https://...","title":"Test"}'
```

Renders locally. Requires Node 18+ and Chromium (installed via `npx remotion install`).

## Gotchas

### Prisma client out of sync

If you change `prisma/schema.prisma` and types feel wrong:
```bash
npx prisma generate
```
(`npm run dev` doesn't auto-regenerate.)

### Stack Auth in dev shows "project not found"

You're using a Production Stack project ID with the wrong publishable client key, or you forgot to switch your Stack project to "development" mode. Check the dashboard.

### `RESEND_API_KEY environment variable is not set` on boot

[src/lib/resend.ts](../src/lib/resend.ts) throws if it's missing. Set any valid-looking value in `.env.local` to get past this even if you're not testing email.

### Webhook from Modal can't reach localhost

If you want to develop the full premium flow including Modal callbacks:
```bash
ngrok http 3000
# use the ngrok URL as WEBHOOK_URL when running modal serve
```

### Hot reload not picking up changes in `prisma/schema.prisma`

Schema isn't hot-reloaded. Restart `npm run dev` after schema changes (and run `prisma generate` + `prisma db push`).

### "Module not found: remotion"

Usually means `optimizePackageImports` in [next.config.ts](../next.config.ts) is stripping it. Already aliased explicitly there — if you upgrade Next.js and this breaks, check the Turbopack `resolveAlias` config.

### TypeScript hovering on `stripe` is wrong

See the API-version literal-type drift gotcha in [16-deployment.md](16-deployment.md).
