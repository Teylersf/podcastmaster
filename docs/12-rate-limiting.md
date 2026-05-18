# 12 — Rate Limiting

The product's only rate limit is the **free-tier 2 masters per 7-day rolling window**. Subscribers are unlimited; video generation is not currently rate-limited.

## Where the logic lives

[src/app/api/rate-limit/check/route.ts](../src/app/api/rate-limit/check/route.ts) — both `GET` (check) and `POST` (record).

## Identity — who's a "user" for rate-limiting?

- **Signed-in user:** identity = Stackframe `user.id`. Passed in as `?userId=...` query param.
- **Guest:** identity = `SHA256(ip + WEBHOOK_SECRET)`, where `ip` comes from the `x-forwarded-for` header (Vercel sets it; falls back to `request.headers.get('x-real-ip')` if missing).

The hash + secret-as-salt makes the stored identifier non-reversible. Even an attacker with DB read access can't enumerate which IPs hit the API.

```ts
function hashIp(ip: string) {
  return crypto
    .createHash("sha256")
    .update(ip + process.env.WEBHOOK_SECRET!)
    .digest("hex");
}
```

## The check (`GET`)

```
GET /api/rate-limit/check?userId=<optional>
```

1. Compute identity (userId or hashIp).
2. `prisma.usageLog.count({ where: { OR: [{ userId }, { ipAddress }], createdAt: { gte: oneWeekAgo } } })`.
3. Return `{ allowed: used < 2, remaining: max(0, 2 - used), limit: 2, used }`.

The client (`HomeClient` / `MasteringTool`) calls this **before** allowing the user to start a master. If `allowed === false`, the UI shows the "you've hit the free limit — sign up to keep going" CTA.

## The record (`POST`)

```
POST /api/rate-limit/check
body: { jobId, userId? }
```

1. Re-runs the GET-style check (defense in depth — the client could lie).
2. If still allowed: `prisma.usageLog.create({ data: { userId?, ipAddress?, jobId } })`.
3. Returns `{ success, allowed, remaining }`.

The client calls this **after** the master kicks off (it has a `jobId` now).

## When you get a free job back

- A user hitting the limit who then signs up — the existing IP-keyed logs are NOT migrated to their `userId`. They effectively reset because the OR clause won't match either identifier for a fresh user record. Whether this is a bug or a feature is debatable; current behavior is "free counter resets on sign-up". Don't fix this without product input — it's likely intentional friction-reducer.
- Subscribers don't bypass the recorder — `UsageLog` rows still get written for them (so we can report on usage). The *limit check* is skipped for actives in the client (the UI just never displays a limit warning for subscribers), but if it weren't skipped the count would still allow because... well, it wouldn't, after 2 jobs. **TODO consider:** explicitly short-circuit the check for `Subscription.status === "active"` in the route to make this bulletproof.

## Why `WEBHOOK_SECRET` as the salt

`WEBHOOK_SECRET` is already a server-only secret used for Modal callbacks. Reusing it avoids adding another secret to manage. Downside: if it gets rotated, every guest's existing log entries are now keyed under an orphaned hash — guests get a free reset.

If you rotate `WEBHOOK_SECRET`, expect a one-time wave of "you should be over the limit but aren't". Old `UsageLog` rows are harmless but unmatchable.

## Off-the-shelf alternatives we explicitly didn't use

- **Upstash Redis** — extra dependency for a trivial counter.
- **Vercel KV** — same.
- **Cookies** — trivially bypassable; we want a soft barrier, not Fort Knox.

The Postgres-backed `UsageLog` model is overkill for a 2/week counter but is convenient because the same row also serves as a per-job audit trail.

## Edge cases

| Scenario | Behavior |
|---|---|
| Same IP behind NAT (e.g. a coffee shop) | They share the counter. Mildly unfair, very rare in practice. |
| User toggles VPN | They get a new counter. Sign-up flow is more effective at deterring abuse. |
| User clears cookies | Doesn't matter — counter is server-side. |
| Modal job fails after we recorded usage | Currently: usage is burned. **Possible future fix:** decrement on webhook with `status === "failed"`. |

## Where rate-limiting is NOT applied

- Video render: no limit. Cost of a render is high; if abuse appears, the lever is here.
- Transcription: no limit (it's a precursor to video).
- File deletion / list / dashboard reads: no limit.
- Stripe Checkout creation: no limit (Stripe itself rate-limits).

## Adding a new rate-limited route

Pattern:
```ts
import { headers } from "next/headers";
import crypto from "crypto";

const RATE_LIMIT = 5;
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

async function check(identity: string): Promise<{ allowed: boolean; remaining: number }> {
  const since = new Date(Date.now() - WINDOW_MS);
  const used = await prisma.usageLog.count({
    where: {
      OR: [{ userId: identity }, { ipAddress: identity }],
      createdAt: { gte: since },
    },
  });
  return { allowed: used < RATE_LIMIT, remaining: Math.max(0, RATE_LIMIT - used) };
}
```
If you add a different limit category, add a `category` column to `UsageLog` rather than creating a parallel model.
