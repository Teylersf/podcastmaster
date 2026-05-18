# 13 — Email Notifications

Transactional email via [Resend](https://resend.com). Three templates, three triggers, all routed through [Resend client](../src/lib/resend.ts).

## The three emails

| Template file | When sent | To | Trigger |
|---|---|---|---|
| [AdminJobStarted.tsx](../src/emails/AdminJobStarted.tsx) | Master is kicked off | `SUPPORT_EMAIL` (internal) | `POST /api/admin/notify-job-started` from client |
| [MasteringComplete.tsx](../src/emails/MasteringComplete.tsx) | Master finishes (user opted in) | User's email | `POST /api/webhooks/job-complete` (Modal callback) or sweep via `GET /api/notifications/send` |
| [VideoComplete.tsx](../src/emails/VideoComplete.tsx) | Video render finishes (user opted in) | User's email | `POST /api/webhooks/video-complete` (Modal callback) |

## Setup

[src/lib/resend.ts](../src/lib/resend.ts):
```ts
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY environment variable is not set");

export const resend = new Resend(process.env.RESEND_API_KEY);
export const SUPPORT_EMAIL = "support@freepodcastmastering.com";

const fromName = process.env.RESEND_FROM_NAME || "Free Podcast Mastering";
const fromEmail = process.env.RESEND_FROM_ADDRESS || "onboarding@resend.dev";
export const FROM_EMAIL = `${fromName} <${fromEmail}>`;
```

**Important:** `RESEND_FROM_ADDRESS` defaults to Resend's testing address. Until `freepodcastmastering.com` is verified in Resend (DNS records), production must keep `RESEND_FROM_ADDRESS=...@yourverified.com` or sends will be sandboxed.

## Sending an email

Pattern used by every sender:
```ts
import { render } from "@react-email/render";
import { resend, FROM_EMAIL } from "@/lib/resend";
import MasteringCompleteEmail from "@/emails/MasteringComplete";

const html = await render(MasteringCompleteEmail({ downloadUrl }));
const result = await resend.emails.send({
  from: FROM_EMAIL,
  to: email,
  subject: "Your podcast is mastered 🎙️",
  html,
});

await prisma.emailLog.create({
  data: { to: email, subject, type: "completion", resendId: result.data?.id, status: "sent" },
});
```

## Templates

All built with [React Email](https://react.email/) (`@react-email/render` v2). They're React components that render to email-safe HTML inline-styled tables.

### `AdminJobStarted.tsx`
Internal monitoring email. Sent to `SUPPORT_EMAIL` whenever a master starts. Includes job ID, filename, size, template, output quality, limiter mode.

Useful for: noticing weird usage patterns, spotting outages early ("haven't gotten one in 3 hours, something's broken").

### `MasteringComplete.tsx`
User-facing. Props: `{ downloadUrl }`.
- Success header
- Big download button
- 24-hour expiry warning (free tier)
- "What's Next?" suggestions

### `VideoComplete.tsx`
User-facing. Props: `{ downloadUrl, videoTitle }`.
- Title display
- Download button (adds `?download=1` to force download in browser, since MP4s often display inline)
- 24-hour expiry warning
- "What's Next?" (download, upload to YouTube/TikTok, share)

## Subscription flow (user opts in)

Both audio and video emails are opt-in.

### Audio
1. User checks "Email me when it's done" in [HomeClient](../src/components/HomeClient.tsx).
2. Client `POST /api/notifications/subscribe` with `{ jobId, email }`.
3. `JobNotification` row is upserted with `status: "pending"`.
4. When the Modal webhook arrives, the webhook checks for this row and sends.

### Video
1. User checks the same in [VideoGenerator](../src/components/video/VideoGenerator.tsx).
2. Client `POST /api/video/subscribe` with `{ jobId, email, videoTitle }`.
3. `VideoJobNotification` row is upserted.
4. Modal webhook → `/api/webhooks/video-complete` → email sent.

## Idempotency

Every email-send path:
```ts
if (notification.emailSentAt) {
  return { skipped: "already sent" };
}
// ... send ...
await prisma.jobNotification.update({
  where: { id }, data: { status: "sent", emailSentAt: new Date() },
});
```

So if Modal retries a webhook, or the sweep endpoint races the webhook, only one email goes out.

## The sweep fallback — `GET /api/notifications/send`

Cron-able endpoint. Walks all `JobNotification` rows where `status === "pending"`, asks the Modal backend `GET /status/{jobId}`, and if the job is `completed` triggers the same email send path.

Why this exists: webhook delivery is generally reliable, but if Modal redeploys mid-job or there's a transient network failure, the webhook may not fire. The sweep is a backstop.

Currently **not** scheduled by anything. Vercel Cron could run it every 15 minutes — left as a TODO. (Modal callbacks have been ~100% reliable in production, so the sweep is dormant.)

## EmailLog

Every successful send writes a row to `EmailLog` (see [06-database.md](06-database.md)). Useful for:
- Deliverability postmortems via `resendId` (look up in Resend dashboard)
- Volume analytics ("how many completion emails per day?")
- Not used for application logic — safe to truncate old rows

## Common operational tasks

### Add a new email template
1. Create `src/emails/MyNewEmail.tsx` with React Email components.
2. In the sender (some API route), `import` it, render it, send via `resend.emails.send(...)`.
3. Write an `EmailLog` row.

### Change the sender address
Update `RESEND_FROM_ADDRESS` env var in Vercel. Verify the new domain in Resend first.

### Stop emails entirely (kill switch)
Wrap the send call in `if (process.env.EMAILS_ENABLED !== "false") { ... }`. We don't have this flag — could add if needed.

### Debug a non-delivered email
1. Look up `EmailLog` by `to` email and recent `createdAt`.
2. Grab the `resendId`.
3. Find it in the Resend dashboard → see bounce reason, spam report, etc.

## Gotchas

- **Resend test address** — `onboarding@resend.dev` can only send to *your own* account email. If a real user reports "I didn't get the email", first check that `RESEND_FROM_ADDRESS` is set in production env to a verified domain address, not the default.
- **`@react-email/render` is async** — `await render(...)`. Forgetting the `await` produces an HTML string of `[object Promise]`.
- **React Email v2** — props must be plain JSON (no class instances, no Dates). Pass `Date.toISOString()` strings if you need dates.
