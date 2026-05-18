# 06 — Database

Postgres via Prisma. Schema: [prisma/schema.prisma](../prisma/schema.prisma).
Client singleton: [src/lib/prisma.ts](../src/lib/prisma.ts).
Connection: `DATABASE_URL` (pooled) + `DATABASE_URL_UNPOOLED` (direct, for migrations).

The DB was on Neon; the active production DB may be on a self-hosted Linode Postgres-16 + PgBouncer host depending on when this snapshot was taken — see [MIGRATING_NEON_TO_LINODE.md](MIGRATING_NEON_TO_LINODE.md) for migration history. Either way, the schema and the app's view of it are identical.

## Models

### `JobNotification`
Tracks email notification subscriptions for **audio mastering** jobs.

```prisma
id          String    @id @default(cuid())
jobId       String    @unique  // from Modal backend
email       String
status      String    @default("pending")  // pending | completed | sent | failed
downloadUrl String?
emailSentAt DateTime?
createdAt   DateTime  @default(now())
updatedAt   DateTime  @updatedAt
```
Indexes: `jobId`, `email`, `status`.

**Lifecycle:** Created by `POST /api/notifications/subscribe`. Status moves `pending → sent` when [`/api/webhooks/job-complete`](../src/app/api/webhooks/job-complete/route.tsx) processes the completion and sends the email.

---

### `VideoJobNotification`
Same shape as `JobNotification` but for **video render** jobs. Has extra `videoTitle` field for the email template.

Indexes: `jobId`, `email`, `status`.

---

### `EmailLog`
Append-only log of every email sent.

```prisma
id        String   @id @default(cuid())
to        String
subject   String
type      String   // completion | reminder | admin-job-started | video-complete | ...
resendId  String?  // Resend's email ID for postmortem lookups
status    String   @default("sent")  // sent | failed | bounced
createdAt DateTime @default(now())
```
Indexes: `to`, `type`.

Not used for application logic — purely analytics / debugging. Safe to delete old rows.

---

### `UsageLog`
Rolling 7-day rate-limit counter.

```prisma
id        String   @id @default(cuid())
userId    String?   // present for signed-in users
ipAddress String?   // hashed IP for guests (SHA256(ip + WEBHOOK_SECRET))
jobId     String
createdAt DateTime @default(now())
```
Indexes: `userId`, `ipAddress`, `createdAt`.

Exactly one row per master job. Counter is `COUNT(*) WHERE (userId = X OR ipAddress = Y) AND createdAt > now() - 7 days`. See [12-rate-limiting.md](12-rate-limiting.md).

Old rows have no value once they're > 7 days old. They could be GC'd periodically — currently they aren't.

---

### `Subscription`
The user's paid-tier state, mirrored from Stripe.

```prisma
id                   String    @id @default(cuid())
userId               String    @unique  // Stack Auth user.id
stripeCustomerId     String?   @unique
stripeSubscriptionId String?   @unique
stripePriceId        String?
status               String    @default("inactive")
                                // active | canceled | past_due | inactive
currentPeriodStart   DateTime?
currentPeriodEnd     DateTime?
cancelAtPeriodEnd    Boolean   @default(false)
createdAt            DateTime  @default(now())
updatedAt            DateTime  @updatedAt
files SubscriberFile[]   // 1:N
```
Indexes: `userId`, `stripeCustomerId`, `status`.

**Source of truth for "is this user a paying subscriber":** `status === "active"` AND (`currentPeriodEnd > now()` OR cancelled-but-not-yet-expired). The Stripe webhook keeps this in sync.

---

### `SubscriberFile`
Premium-only file metadata. The actual bytes live in Vercel Blob.

```prisma
id             String   @id @default(cuid())
subscriptionId String
subscription   Subscription @relation(fields:[subscriptionId], references:[id], onDelete:Cascade)
fileName       String
fileSize       Int      // bytes
blobUrl        String   // public URL from Vercel Blob
blobPathname   String   // for del()
fileType       String   // "input" | "output"
jobId          String?
createdAt      DateTime @default(now())
updatedAt      DateTime @updatedAt
```
Indexes: `subscriptionId`, `jobId`.

**5 GB quota** is enforced application-side — sum `fileSize` across all of a user's files before allowing upload. Cascade-deletes if the parent `Subscription` is deleted (rarely happens; we don't usually delete `Subscription` rows even on cancellation — status just goes to `"canceled"`).

---

### `FreeUserFile`
Free-tier file metadata. Bytes live in R2 with a 24-hour auto-delete cron. Schema row also has a TTL.

```prisma
id          String   @id @default(cuid())
userId      String   // Stack Auth user.id (signed-in free users)
jobId       String   @unique
fileName    String
fileSize    Int
downloadUrl String?
status      String   @default("processing")  // processing | completed | expired
createdAt   DateTime @default(now())
expiresAt   DateTime  // createdAt + 24h
```
Indexes: `userId`, `status`, `expiresAt`.

GET `/api/files/free-user` only returns rows with `expiresAt > now()`. The R2 cleanup cron in the Modal backend keeps the bytes in sync.

---

### `PremiumUserJob`
Bridge so the Modal job-complete webhook can find the right user to attach a `SubscriberFile` to.

```prisma
id          String   @id @default(cuid())
userId      String
jobId       String   @unique
fileName    String
fileSize    Int
status      String   @default("processing")
createdAt   DateTime @default(now())
```
Indexes: `userId`, `jobId`, `status`.

Created by `POST /api/files/premium-job` when a subscriber starts mastering. Read by `/api/files/get-blob-upload-url` and `/api/webhooks/job-complete`.

This row's job is purely to link a Modal `jobId` to a Next.js user. Without it, the webhook arrives with just a `jobId` and no way to know whose file it is.

---

### `HQPurchase`
$1 one-time-purchase credit for 24-bit export.

```prisma
id                    String   @id @default(cuid())
userId                String
stripePaymentIntentId String?  @unique
stripeSessionId       String?  @unique
creditsRemaining      Int      @default(1)
createdAt             DateTime @default(now())
updatedAt             DateTime @updatedAt
```
Index: `userId`.

Created by the Stripe webhook on `checkout.session.completed` in `payment` mode. Decremented by `POST /api/hq-purchase/status` when the user kicks off a 24-bit master.

A user can have multiple `HQPurchase` rows (each from a separate $1 purchase) — credits are summed.

## Query patterns you'll see in the code

- **Is user a subscriber?** `prisma.subscription.findUnique({ where: { userId }, select: { status: true, currentPeriodEnd: true } })` then check `status === "active"`.
- **User's storage usage:** `prisma.subscriberFile.aggregate({ _sum: { fileSize: true }, where: { subscription: { userId } } })`.
- **Rate-limit count:** `prisma.usageLog.count({ where: { OR: [{ userId }, { ipAddress }], createdAt: { gte: sevenDaysAgo } } })`.
- **Pending notifications sweep:** `prisma.jobNotification.findMany({ where: { status: "pending", emailSentAt: null } })`.

## Migrations

Currently the schema is push-managed: `npx prisma db push` syncs the live DB with `schema.prisma`. There's no `prisma/migrations/` directory.

That's fine for a low-team project but means there's no migration audit trail — destructive schema changes need manual care. If you add formal migrations, switch to `npx prisma migrate dev` and check in the `migrations/` folder.

## Indexes — coverage notes

- Every FK and every "lookup by user" path has an index.
- `EmailLog` doesn't have a `createdAt` index — fine because it's not queried for application logic.
- `UsageLog` has indexes on `userId`, `ipAddress`, `createdAt` separately but not a composite. If rate-limit queries get slow, add `@@index([userId, createdAt])` and `@@index([ipAddress, createdAt])`.

## What's not in the DB

- Audio bytes — those live in R2 / Vercel Blob.
- Mastering job status while running — in-memory on Modal (`processing_jobs` dict). The DB only learns about a job on completion (via webhook).
- The user object itself — Stackframe stores that.
