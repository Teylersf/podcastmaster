# 16 — Deployment

Two deployment targets:
1. **Next.js → Vercel** (frontend + API routes)
2. **Python → Modal** (audio mastering + transcription + video rendering)

Plus:
3. **Postgres** — hosted somewhere (Linode VM or Neon — see [MIGRATING_NEON_TO_LINODE.md](MIGRATING_NEON_TO_LINODE.md))
4. **Cloudflare R2** — bucket configured via Cloudflare dashboard (one-time setup)
5. **Vercel Blob** — provisioned via Vercel dashboard, single token

## Vercel deployment

### Initial setup (one-time)

1. Push the repo to GitHub.
2. Import in Vercel — set framework to "Next.js" (auto-detected).
3. Add all env vars from [15-environment-variables.md](15-environment-variables.md) under **Production**.
4. (Optional) Connect a custom domain — `freepodcastmastering.com`.
5. Set up Stripe webhook endpoint pointing to `https://<your-domain>/api/stripe/webhook`. Copy the `whsec_...` into `STRIPE_WEBHOOK_SECRET`.

### Standard deploy

If GitHub → Vercel auto-deploy is wired:
```bash
git push origin master  # auto-deploys to production
```

If it's not (some projects in this org skip auto-deploy):
```bash
npx vercel@latest --prod --yes
```

### Build process

From [package.json](../package.json):
```json
"scripts": {
  "build": "prisma generate && next build"
}
```

Vercel runs `npm install` → `npm run build`. `prisma generate` runs before `next build` to ensure the Prisma client is regenerated for the current schema.

### `next.config.ts` notes

- `optimizePackageImports` reduces bundle size for `lucide-react`, `framer-motion`, `@stackframe/stack`, `remotion`, `@remotion/player`.
- Turbopack alias for `remotion` so the bundler resolves the package correctly when imported from `src/remotion/`.
- Image format / cache headers — see [next.config.ts](../next.config.ts).

### Watching a deploy

```bash
npx vercel@latest --prod --yes 2>&1 | tee /tmp/deploy.log
# Look for "Compiled successfully" and "Generating static pages (N/N)"
```

If a build errors on a file you didn't touch, it's likely a **latent type error** that an earlier build never exercised (Next.js 16 + TypeScript 5 + Turbopack catches more than the previous setup did). Fix in a separate commit.

### Cache busting Vercel local-vs-built TypeScript

If `tsc --noEmit` returns 0 locally but Vercel build catches type errors:
```bash
rm -f tsconfig.tsbuildinfo
rm -rf .next/cache
# then retry
```

### Stripe SDK type drift gotcha

If [vercel.json](../vercel.json) — if it exists — has `"installCommand": "rm -f package-lock.json && npm install ..."`, Vercel resolves a NEWER minor of `stripe` than what's in your local `node_modules`. The `apiVersion` literal-type check can then fail. Cast:
```ts
apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion,
```

### Smoke test after deploy

`curl` can't pass Vercel's anti-bot challenge. Use a real browser. Playwright snippet in [MIGRATING_NEON_TO_LINODE.md §14](MIGRATING_NEON_TO_LINODE.md).

Quick smoke checklist:
- [ ] Open homepage — UI renders, no console errors
- [ ] Upload a sample audio file — master starts and completes
- [ ] Generate a video — render starts and completes
- [ ] Sign in — dashboard loads
- [ ] (if you have a test Stripe customer) Upgrade flow works

## Modal deployment

### Initial setup (one-time)

```bash
pip install modal
modal token new   # one-time auth

# Create secrets
modal secret create podcast-mastering-secrets \
  WEBHOOK_SECRET=... \
  R2_ACCOUNT_ID=... \
  R2_ACCESS_KEY_ID=... \
  R2_SECRET_ACCESS_KEY=... \
  R2_BUCKET_NAME=... \
  R2_PUBLIC_URL=... \
  WEBHOOK_URL=https://freepodcastmastering.com/api/webhooks/job-complete \
  VIDEO_WEBHOOK_URL=https://freepodcastmastering.com/api/webhooks/video-complete \
  VERCEL_BLOB_RW_TOKEN=...
```

### Standard deploy

```bash
cd backend
modal deploy modal_app.py
```

Modal builds the container image (Debian + Python 3.11 + ffmpeg + Node + Chromium + Matchering + Whisper) and uploads. First build is ~10 minutes; subsequent ones reuse cached layers and finish in seconds.

After deploy, Modal prints the FastAPI URL — e.g. `https://teylersf--podcast-mastering-fastapi-app.modal.run`. This goes into Vercel's `NEXT_PUBLIC_API_URL`.

### Modal app components

[backend/modal_app.py](../backend/modal_app.py) declares:
- A `modal.Image` with all dependencies
- An `App` with FastAPI mounted via `@modal.asgi_app()`
- Background functions: `process_mastering_job()`, `transcribe_audio()`, `render_video_job()`
- A cron: `cleanup_old_files()` running daily

### Watching Modal logs

```bash
modal app logs podcast-mastering-fastapi
```

Real-time stream. Lines from each container's stdout/stderr.

### Rolling back

Modal keeps deploy history. To revert:
```bash
modal app history podcast-mastering-fastapi
modal deploy --tag=<old-tag> modal_app.py
```

In practice, fixing forward is usually faster.

## Postgres

The DB lives on either Neon (free tier) or a self-hosted Linode VM running Postgres 16 + PgBouncer. See [MIGRATING_NEON_TO_LINODE.md](MIGRATING_NEON_TO_LINODE.md) for the full migration playbook.

Connection string is set as `DATABASE_URL` in Vercel.

### Schema changes (production)

Currently push-based:
```bash
# WARNING: This applies the schema directly. No migration history.
DATABASE_URL="<prod-url>" npx prisma db push
```

For column adds that the new deploy will need, run `db push` **before** deploying so the old deploy doesn't break.

If you want migration history, switch to:
```bash
npx prisma migrate dev --name what_changed
# commit prisma/migrations/...
# in CI: npx prisma migrate deploy
```

## Cloudflare R2

One-time setup:
1. Create a bucket in Cloudflare R2.
2. Create an API token with read+write to that bucket.
3. (Optional) Set up a custom domain via R2 → Settings → Custom Domains so URLs are nice (`https://files.freepodcastmastering.com/...`).
4. Configure bucket CORS to allow GET from `*` so the Remotion video render can fetch audio.

Then set the R2 creds as Modal secrets.

## Vercel Blob

Provisioned once via Vercel dashboard. Generates `BLOB_READ_WRITE_TOKEN`. Set as both:
- Vercel project env: `BLOB_READ_WRITE_TOKEN`
- Modal secret: `VERCEL_BLOB_RW_TOKEN`

## Stripe

One-time setup in dashboard:
1. Create products + prices (one recurring $10/mo subscription product; you can also pre-create the $1 HQ price, but the code currently builds it inline with `price_data`).
2. Note the recurring `price_id` → `STRIPE_PRICE_ID`.
3. Webhook endpoint → `https://freepodcastmastering.com/api/stripe/webhook`. Enable events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Note the `whsec_...` → `STRIPE_WEBHOOK_SECRET`.

## Resend

One-time:
1. Add `freepodcastmastering.com` as a verified domain (add DNS records they provide).
2. Set `RESEND_FROM_ADDRESS=noreply@freepodcastmastering.com` (or similar) in Vercel env.

Until verified, you must use `onboarding@resend.dev` as `RESEND_FROM_ADDRESS`, and emails only deliver to your account email.

## Deploy checklist (production)

```
[ ] Stripe webhook signing secret matches Vercel STRIPE_WEBHOOK_SECRET
[ ] All Vercel env vars set (Production scope)
[ ] WEBHOOK_SECRET matches between Vercel and Modal
[ ] BLOB_READ_WRITE_TOKEN matches between Vercel and Modal
[ ] NEXT_PUBLIC_API_URL points at the deployed Modal endpoint
[ ] Resend domain verified, RESEND_FROM_ADDRESS uses the verified domain
[ ] R2 bucket CORS allows GET from *
[ ] Postgres DATABASE_URL works from Vercel (test with `vercel dev` or `prisma db pull`)
[ ] Latest schema applied to DB (prisma db push)
[ ] Modal cleanup cron is enabled (check Modal dashboard)
[ ] Stripe is in LIVE mode (not test mode) — keys start with `sk_live_`
```

## What you should NOT do

- **Don't `vercel --prod` without testing** if the project has anything fragile (see `forsalespokane` exception noted in [MIGRATING_NEON_TO_LINODE.md §12](MIGRATING_NEON_TO_LINODE.md) — this project doesn't have that restriction, but the pattern is worth knowing).
- **Don't push schema changes** without checking that the old deploy still works (i.e. avoid destructive changes; use additive nullable columns).
- **Don't rotate `WEBHOOK_SECRET`** in only one place — Vercel and Modal must change together.
- **Don't deploy Modal without testing locally first** — see [17-local-development.md](17-local-development.md) for `modal serve` (hot-reload dev mode).
