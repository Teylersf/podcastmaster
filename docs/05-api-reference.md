# 05 — API Reference

Every route under [src/app/api/](../src/app/api/). All routes are Next.js App Router route handlers; every file exports the HTTP method as a named export (e.g. `export async function POST(...)`).

Auth styles used:
- **Stack user** — `await stackServerApp.getUser()`; returns user or `null`. We 401 if `null` on protected routes.
- **Bearer webhook secret** — `Authorization: Bearer ${WEBHOOK_SECRET}`. For Modal → Next.js callbacks.
- **Stripe signature** — `stripe.webhooks.constructEvent(...)` against `STRIPE_WEBHOOK_SECRET`.
- **None** — public (rate-limit, notifications/subscribe, video/render proxy).

---

## `admin/`

### `POST /api/admin/notify-job-started`
**File:** [src/app/api/admin/notify-job-started/route.tsx](../src/app/api/admin/notify-job-started/route.tsx)
**Auth:** None (called from the client when mastering starts)
**Body:** `{ jobId, fileName, fileSize, fileId, templateName, outputQuality, limiterMode }`
**Does:** Renders [AdminJobStarted](../src/emails/AdminJobStarted.tsx), sends to `SUPPORT_EMAIL` via Resend. Used for internal monitoring of usage patterns.
**Response:** `{ success: true }` regardless of email outcome (don't leak failures to clients).

---

## `files/`

### `DELETE /api/files/delete`
**File:** [src/app/api/files/delete/route.ts](../src/app/api/files/delete/route.ts)
**Auth:** Stack user
**Body:** `{ fileId }`
**Does:** Verifies ownership via `subscriberFile.subscription.userId === user.id`. Calls `del()` from `@vercel/blob` then `prisma.subscriberFile.delete()`.
**Response:** `{ success: true }`

### `GET /api/files/free-user`
**File:** [src/app/api/files/free-user/route.ts](../src/app/api/files/free-user/route.ts)
**Auth:** Stack user
**Does:** Returns the user's `FreeUserFile` records where `expiresAt > now()`.
**Response:** `{ files: FreeUserFile[] }`

### `POST /api/files/free-user`
**Auth:** Stack user
**Body:** `{ jobId, fileName, fileSize }`
**Does:** Creates a `FreeUserFile` with `expiresAt = now + 24h`, `status = "processing"`.
**Response:** `{ success: true, file }`

### `POST /api/files/get-blob-upload-url`
**File:** [src/app/api/files/get-blob-upload-url/route.ts](../src/app/api/files/get-blob-upload-url/route.ts)
**Auth:** Bearer webhook secret (called by Modal backend, not the browser)
**Body:** `{ jobId, fileName, fileSize }`
**Does:**
1. Looks up `PremiumUserJob` by `jobId` to find the userId.
2. Verifies the user has an active `Subscription`.
3. Verifies total existing `SubscriberFile` size + this file ≤ 5 GB.
4. Returns Vercel Blob credentials Modal uses to direct-upload.
**Response:** `{ shouldUpload: true, blobToken, blobPathname, outputFileName, subscriptionId, userId }` — or `{ shouldUpload: false, reason }` if quota exceeded or not premium.

### `GET /api/files/list`
**File:** [src/app/api/files/list/route.ts](../src/app/api/files/list/route.ts)
**Auth:** Stack user
**Does:** Lists user's `SubscriberFile`s with storage totals.
**Response:** `{ files: SubscriberFile[], storage: { used, limit: 5_368_709_120, remaining } }`

### `POST /api/files/premium-job`
**File:** [src/app/api/files/premium-job/route.ts](../src/app/api/files/premium-job/route.ts)
**Auth:** Stack user
**Body:** `{ jobId, fileName, fileSize }`
**Does:** Creates a `PremiumUserJob` row so the Modal webhook can later save the mastered output to Vercel Blob with the right `userId`.
**Response:** `{ success: true }`

### `POST /api/files/upload`
**File:** [src/app/api/files/upload/route.ts](../src/app/api/files/upload/route.ts)
**Auth:** Stack user (must have active subscription)
**Body:** `multipart/form-data` — fields: `file`, `fileType` (`"input"` | `"output"`), `jobId`
**Does:** Direct subscriber upload to Vercel Blob at `subscribers/{userId}/{timestamp}-{filename}`. Enforces 5 GB quota. Creates `SubscriberFile` row.
**Response:** `{ success: true, file }`

---

## `hq-purchase/`

### `GET /api/hq-purchase/status`
**File:** [src/app/api/hq-purchase/status/route.ts](../src/app/api/hq-purchase/status/route.ts)
**Auth:** Stack user
**Does:** Reports whether the user can do a 24-bit export.
- Subscribers always can: returns `{ hasCredits: true, credits: -1, isSubscriber: true }`.
- Others: counts `HQPurchase.creditsRemaining` across their rows.
**Response:** `{ hasCredits, credits, isSubscriber }`

### `POST /api/hq-purchase/status`
**Auth:** Stack user
**Does:** Decrements one HQ credit when a 24-bit export starts (the client calls this just before kicking off the master).
**Response:** `{ success: true, creditsRemaining }`

---

## `notifications/`

### `POST /api/notifications/subscribe`
**File:** [src/app/api/notifications/subscribe/route.ts](../src/app/api/notifications/subscribe/route.ts)
**Auth:** None
**Body:** `{ jobId, email }` (email validated by regex)
**Does:** Upserts `JobNotification` with `status: "pending"`. Idempotent.
**Response:** `{ success, notification }`

### `GET /api/notifications/subscribe?jobId=...`
**Does:** Returns subscription state for the given jobId.
**Response:** `{ subscribed: bool, email, status }`

### `POST /api/notifications/send`
**File:** [src/app/api/notifications/send/route.tsx](../src/app/api/notifications/send/route.tsx)
**Auth:** None (idempotent — guarded by `emailSentAt` check)
**Body:** `{ jobId, downloadUrl }`
**Does:** Finds `JobNotification` by jobId, renders [MasteringComplete](../src/emails/MasteringComplete.tsx), sends via Resend, sets `emailSentAt`, writes `EmailLog`.
**Response:** `{ success, emailSent }`

### `GET /api/notifications/send`
**Does:** Sweeps pending `JobNotification`s — for each one, asks the Modal backend `GET /status/{jobId}`; if completed, sends the email. (Acts as a fallback in case the webhook from Modal never fires.)
**Response:** `{ processed, results: [...] }`

---

## `rate-limit/`

### `GET /api/rate-limit/check`
**File:** [src/app/api/rate-limit/check/route.ts](../src/app/api/rate-limit/check/route.ts)
**Auth:** None
**Query:** `userId` (optional — for signed-in users; falls back to hashed IP)
**Does:**
1. Identity = `userId` if provided, else `SHA256(ip + WEBHOOK_SECRET)`.
2. Counts `UsageLog` rows in the last 7 days for that identity.
3. Compares to `limit = 2`.
**Response:** `{ allowed, remaining, limit: 2, used }`

### `POST /api/rate-limit/check`
**Auth:** None
**Body:** `{ jobId, userId? }`
**Does:** Records usage by inserting a `UsageLog` row (after re-checking the limit). Called from the client when a master is kicked off.
**Response:** `{ success, allowed, remaining }`

The IP hash uses `WEBHOOK_SECRET` as salt — keep that secret stable or every guest counter resets. See [12-rate-limiting.md](12-rate-limiting.md).

---

## `storage/`

### `GET /api/storage/check`
**File:** [src/app/api/storage/check/route.ts](../src/app/api/storage/check/route.ts)
**Auth:** Stack user
**Does:** Aggregates the user's `SubscriberFile.fileSize` sum and compares to 5 GB.
**Response:** `{ isSubscriber, canUpload, used, limit, remaining, nearLimit (>4.5GB), atLimit (≥5GB), fileCount }`

---

## `stripe/`

### `POST /api/stripe/create-checkout`
**File:** [src/app/api/stripe/create-checkout/route.ts](../src/app/api/stripe/create-checkout/route.ts)
**Auth:** Stack user
**Body:** none
**Does:**
1. Finds or creates a `Subscription` row (status `inactive` if new).
2. Refuses if the user is already `active`.
3. Creates a Stripe Checkout Session in `subscription` mode with `STRIPE_PRICE_ID`. Success URL: `/dashboard?subscription=success`.
**Response:** `{ url }` — client redirects.

### `POST /api/stripe/portal`
**File:** [src/app/api/stripe/portal/route.ts](../src/app/api/stripe/portal/route.ts)
**Auth:** Stack user (must have a `stripeCustomerId` on file)
**Does:** Creates a Stripe Billing Portal session. Used by the dashboard "Manage Subscription" button.
**Response:** `{ url }`

### `POST /api/stripe/purchase-hq`
**File:** [src/app/api/stripe/purchase-hq/route.ts](../src/app/api/stripe/purchase-hq/route.ts)
**Auth:** Stack user
**Does:**
1. Blocks if user is a subscriber (they get HQ free).
2. Blocks if user already has unused HQ credits.
3. Creates a Stripe Checkout in `payment` mode (one-time $1).
**Response:** `{ url }`

### `POST /api/stripe/webhook`
**File:** [src/app/api/stripe/webhook/route.ts](../src/app/api/stripe/webhook/route.ts)
**Auth:** `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`
**Events handled:**
- `checkout.session.completed`
  - If subscription mode → upsert `Subscription` with stripe IDs + dates + status.
  - If payment mode → create `HQPurchase` with `creditsRemaining: 1`.
- `customer.subscription.updated` → update `Subscription.status`, periods, `cancelAtPeriodEnd`.
- `customer.subscription.deleted` → status = `"canceled"`.
- `invoice.payment_failed` → status = `"past_due"`.
**Response:** `{ received: true }`

See [08-payments.md](08-payments.md) for the full Stripe state machine.

---

## `subscription/`

### `GET /api/subscription/status`
**File:** [src/app/api/subscription/status/route.ts](../src/app/api/subscription/status/route.ts)
**Auth:** Stack user
**Does:** Returns subscription + storage + file list for the dashboard.
**Response:** `{ isSubscribed, subscription: { status, currentPeriodEnd, cancelAtPeriodEnd }, storage: { used, limit, remaining, files: [...] } }`

---

## `video/`

### `POST /api/video/render`
**File:** [src/app/api/video/render/route.ts](../src/app/api/video/render/route.ts)
**Auth:** None
**Body:** `{ audioUrl, title, subtitle, captions, gradientFrom, gradientTo, accentColor, showProgressBar, aspectRatio, duration }`
**Does:** Thin proxy. Forwards the request body to `POST ${NEXT_PUBLIC_API_URL}/render-video` (Modal). Used so the browser never needs to know the Modal URL directly and so we can add server-side auth later.
**Response:** Whatever Modal returns — typically `{ jobId }`.

### `POST /api/video/subscribe`
**File:** [src/app/api/video/subscribe/route.ts](../src/app/api/video/subscribe/route.ts)
**Auth:** None
**Body:** `{ jobId, email, videoTitle }`
**Does:** Upserts a `VideoJobNotification` (email validated).
**Response:** `{ success, notification }`

### `POST /api/video/notify-complete`
**File:** [src/app/api/video/notify-complete/route.ts](../src/app/api/video/notify-complete/route.ts)
**Auth:** None (idempotent)
**Body:** `{ jobId, downloadUrl, videoTitle }`
**Does:** Sends [VideoComplete](../src/emails/VideoComplete.tsx) email if not already sent, sets `emailSentAt`, writes `EmailLog`.
**Response:** `{ success }`

---

## `webhooks/`

### `POST /api/webhooks/job-complete`
**File:** [src/app/api/webhooks/job-complete/route.tsx](../src/app/api/webhooks/job-complete/route.tsx)
**Auth:** Bearer webhook secret (Modal → Next.js)
**Body:** `{ jobId, status, blobData? }` where `blobData` includes `{ url, pathname, size, contentType, fileName }` for premium uploads.
**Does:**
1. If `status === "completed"` and `blobData` present → call internal `saveBlobDataForPremiumUser()` to find the `PremiumUserJob`, the user's `Subscription`, and create a `SubscriberFile` row.
2. Update any matching `FreeUserFile.status` to `"completed"` and set `downloadUrl`.
3. Find `JobNotification` by jobId; if found and not yet sent, render `MasteringComplete` and send via Resend; update `emailSentAt`; write `EmailLog`.
**Response:** `{ success }`

### `GET /api/webhooks/job-complete`
Health check. Returns `{ status: "ok", endpoint: "job-complete webhook" }`.

### `POST /api/webhooks/video-complete`
**File:** [src/app/api/webhooks/video-complete/route.tsx](../src/app/api/webhooks/video-complete/route.tsx)
**Auth:** Bearer webhook secret
**Body:** `{ jobId, status, downloadUrl, videoTitle }`
**Does:** Same shape as `job-complete` but for video jobs and `VideoJobNotification` / `VideoComplete` template.
**Response:** `{ success }`

### `GET /api/webhooks/video-complete`
Health check.

---

## Common patterns

- **Body parsing:** All routes use `await request.json()` (or `request.formData()` for uploads). No body validators library — ad-hoc `typeof` checks or `zod` parses inline.
- **Error responses:** Standard `NextResponse.json({ error: "..." }, { status })`. Status codes: 400 bad request, 401 not signed in, 403 not authorized for resource, 404 not found, 500 server error.
- **Idempotency:** Webhook receivers and email senders check an "already sent / already saved" condition before acting, so retries are safe.
- **Logging:** `console.log` / `console.error` only — Vercel captures these in the deployment logs.
