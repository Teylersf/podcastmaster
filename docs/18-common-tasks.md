# 18 — Common Tasks

Recipes for the kinds of changes that come up. Each is the **shortest path to a working result** — read the linked source files for context before editing.

## Add a new theme

See [14-theming.md](14-theming.md). TL;DR — 4 files:
1. CSS block in [src/app/globals.css](../src/app/globals.css)
2. Theme list in the inline FOUC script in [src/app/layout.tsx](../src/app/layout.tsx)
3. `ThemeName` union in [src/components/ThemeProvider.tsx](../src/components/ThemeProvider.tsx)
4. Entry in the themes array in [src/components/ThemeSelector.tsx](../src/components/ThemeSelector.tsx)

## Add a new email template

1. Create `src/emails/MyEmail.tsx` using `@react-email/components`.
2. Pick the API route that should send it. Render + send:
   ```ts
   import { render } from "@react-email/render";
   import { resend, FROM_EMAIL } from "@/lib/resend";
   import MyEmail from "@/emails/MyEmail";

   const html = await render(MyEmail({ ...props }));
   const result = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
   await prisma.emailLog.create({ data: { to, subject, type: "my-email", resendId: result.data?.id } });
   ```

See [13-email-notifications.md](13-email-notifications.md) for patterns + gotchas.

## Add a new API route

1. Create `src/app/api/my-feature/route.ts` (or nested folder).
2. Export named handlers per HTTP method:
   ```ts
   import { NextResponse } from "next/server";
   import { stackServerApp } from "@/stack";
   import { prisma } from "@/lib/prisma";

   export async function POST(request: Request) {
     const user = await stackServerApp.getUser();
     if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
     const body = await request.json();
     // ... do work ...
     return NextResponse.json({ success: true });
   }
   ```
3. If it's a webhook from Modal, verify Bearer auth:
   ```ts
   const auth = request.headers.get("authorization");
   if (auth !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }
   ```
4. Document it in [05-api-reference.md](05-api-reference.md).

## Add a new Prisma model

1. Add to [prisma/schema.prisma](../prisma/schema.prisma). Follow existing conventions: `id String @id @default(cuid())`, `createdAt`, `updatedAt`. Add indexes on lookup paths.
2. `npx prisma db push` to apply to local DB.
3. `npx prisma generate` to update the TS client.
4. Apply to prod: `DATABASE_URL=<prod> npx prisma db push` **before** deploying code that uses it.
5. Document the model in [06-database.md](06-database.md).

## Add a new mastering template

1. Get / create a reference WAV file with the sound you want to match to.
2. Add it to `backend/references/your-template.wav`.
3. Update [backend/modal_app.py](../backend/modal_app.py) — the template list / dictionary mapping name → reference path.
4. Update the template dropdown in [src/components/HomeClient.tsx](../src/components/HomeClient.tsx) and [src/components/MasteringTool.tsx](../src/components/MasteringTool.tsx).
5. `modal deploy modal_app.py` to push the new reference + code.
6. Update [09-audio-pipeline.md](09-audio-pipeline.md) — the templates table.

## Add a new video visualization template

1. Inside [src/remotion/PodcastVideo.tsx](../src/remotion/PodcastVideo.tsx), add a new inner component:
   ```tsx
   function MyNewViz({ frame, accentColor }: { frame: number; accentColor: string }) {
     // return JSX driven by frame math
   }
   ```
2. Add a switch case in the main `PodcastVideo` component for `template === "my-new-viz"`.
3. Add `"my-new-viz"` to the `template` field of `podcastVideoSchema` (zod union).
4. Add a button for it in [src/components/video/VideoGenerator.tsx](../src/components/video/VideoGenerator.tsx).
5. Update [10-video-pipeline.md](10-video-pipeline.md).
6. Rebuild and deploy Modal (`modal deploy backend/modal_app.py`) so the renderer ships the new code.

## Change subscription pricing

1. Create a new price in the Stripe dashboard ($X/mo).
2. Update Vercel env: `STRIPE_PRICE_ID=price_...`.
3. Update the pricing copy in [src/app/pricing/page.tsx](../src/app/pricing/page.tsx) and the dashboard upgrade card.
4. Existing subscribers stay on their old price (Stripe doesn't migrate them automatically). To force-migrate, do it in the Stripe dashboard (Subscriptions → individual sub → update price). Or wait for natural churn.

## Change the 24-hour file retention

The retention is enforced in two places — both need updating:

1. **R2 deletion cron** in [backend/modal_app.py](../backend/modal_app.py) — change the `cutoff = now - timedelta(hours=24)`.
2. **Database expiry** in [src/app/api/files/free-user/route.ts](../src/app/api/files/free-user/route.ts) (POST handler) — change `expiresAt = now + 24*60*60*1000`.

Also update the Terms of Service ([src/app/terms/page.tsx](../src/app/terms/page.tsx)) and the marketing copy on the home page.

## Change the rate limit (e.g. 2/week → 3/week)

Single place: [src/app/api/rate-limit/check/route.ts](../src/app/api/rate-limit/check/route.ts) — the `LIMIT = 2` constant.

## Increase subscriber storage quota

Single place: [src/app/api/files/upload/route.ts](../src/app/api/files/upload/route.ts), [src/app/api/files/get-blob-upload-url/route.ts](../src/app/api/files/get-blob-upload-url/route.ts), and [src/app/api/storage/check/route.ts](../src/app/api/storage/check/route.ts). They each define `STORAGE_LIMIT = 5 * 1024 * 1024 * 1024`. Hoist into a shared constant if you find yourself touching all three.

## Add OAuth sign-in (e.g. Google)

1. Enable Google in your Stackframe project dashboard. Get a client ID/secret from Google Cloud, paste into Stackframe.
2. No code changes needed — Stackframe's `<SignIn />` UI at `/handler/sign-in` will surface the new option automatically on next page load.

## Investigate a failed mastering job

1. Find the user's `JobNotification` or `PremiumUserJob` by jobId in Postgres.
2. Check Modal logs: `modal app logs podcast-mastering-fastapi | grep <jobId>`.
3. If it's a Matchering error, the log will show the exception. Common: too-quiet target, unsupported file format.
4. Check the user's `EmailLog` — were they emailed at all?

## Investigate a failed payment

1. Stripe dashboard → Events → filter by customer email.
2. Find the `checkout.session.*` or `invoice.*` event.
3. Check our `EmailLog` for any related sends.
4. Check `Subscription.status` for that `userId` — is it `past_due`?

## Rebuild the Modal image (e.g. after upgrading Matchering)

1. Bump the version in [backend/modal_app.py](../backend/modal_app.py) image declaration.
2. `modal deploy modal_app.py` — Modal rebuilds and redeploys.

Building from scratch can take 10+ min the first time after a dep version change. Cached layers make subsequent deploys fast.

## Roll back a bad deploy

**Vercel:**
- Go to Vercel dashboard → Deployments → click the previous green one → "Promote to Production". Instant.

**Modal:**
- `modal app history podcast-mastering-fastapi` → find the previous deploy → `modal deploy --tag=<id> modal_app.py`.

**Postgres schema changes** can't be auto-rolled-back. If you push a destructive change, restore from backup (see [MIGRATING_NEON_TO_LINODE.md](MIGRATING_NEON_TO_LINODE.md) for backup procedure).

## Refund / give a user free credits

```sql
-- Make them a subscriber until X date:
UPDATE "Subscription"
SET status='active', "currentPeriodEnd"='2026-12-31'::timestamp
WHERE "userId"='<stackframe-user-id>';

-- Or grant N HQ credits:
INSERT INTO "HQPurchase" ("id","userId","creditsRemaining","createdAt","updatedAt")
VALUES (gen_random_uuid()::text, '<stackframe-user-id>', N, NOW(), NOW());
```

Or just refund in Stripe — that triggers `customer.subscription.deleted`, which sets status to `canceled` — opposite of what you want here. Manual DB edit is the more reliable approach for goodwill grants.

## Update SEO metadata for a page

Metadata is exported per-route. For the home page it's in [src/app/layout.tsx](../src/app/layout.tsx); other pages have their own `export const metadata: Metadata = {...}`. Standard Next.js 16 Metadata API.

## Add a new page

1. Create `src/app/<slug>/page.tsx`.
2. Export a default React component (server component by default).
3. Optionally export `metadata` for SEO.
4. Link to it from the relevant nav / footer.

If it should be in the sitemap, update [public/sitemap.xml](../public/sitemap.xml) (currently static — could be migrated to a dynamic route handler if you add many pages).

## What if I want to delete a user entirely?

Cascade order (Stackframe doesn't currently support GDPR-style "right to be forgotten" via API; you do it manually):

1. **Postgres** — delete in this order to satisfy FKs:
   ```sql
   DELETE FROM "SubscriberFile" WHERE "subscriptionId" IN (SELECT id FROM "Subscription" WHERE "userId"='X');
   DELETE FROM "Subscription" WHERE "userId"='X';
   DELETE FROM "FreeUserFile" WHERE "userId"='X';
   DELETE FROM "PremiumUserJob" WHERE "userId"='X';
   DELETE FROM "HQPurchase" WHERE "userId"='X';
   DELETE FROM "UsageLog" WHERE "userId"='X';
   ```
2. **Vercel Blob** — list and delete under `subscribers/X/...`.
3. **R2** — list and delete under `uploads/<jobId>/...` and `outputs/<jobId>/...` for any of their `jobId`s if still within retention.
4. **Stackframe** — delete the user via their dashboard.
5. **Stripe** — delete the customer (Stripe dashboard or API).

Consider adding an admin endpoint for this if it happens more than once a month.

## Pre-deploy sanity checklist

```
[ ] npm run build succeeds locally
[ ] No new uncommitted env vars used in code
[ ] Schema changes (if any) applied to prod DB before code deploy
[ ] Stripe + Resend + Modal credentials still valid
[ ] Smoke test plan: home → master → download (free); /pricing → checkout (test mode)
```

## Where to look first when something's broken

| Symptom | First check |
|---|---|
| Site won't load | Vercel deployment logs → likely a build/runtime error |
| "Stripe webhook signature failed" | `STRIPE_WEBHOOK_SECRET` mismatch — Stripe dashboard vs Vercel env |
| "Modal calls failing 401" | `WEBHOOK_SECRET` mismatch between Vercel and Modal |
| Master starts but never finishes | Modal logs |
| Email never arrives | Resend dashboard → look up by recipient |
| Subscription not active after payment | Stripe webhook delivery → check `Events` in Stripe dashboard |
| Theme reverts on each visit | `localStorage` access failing (private window?) or theme name not in FOUC script list |
| Build fails on Vercel only | TS cache mismatch → see [16-deployment.md](16-deployment.md) cache busting |
