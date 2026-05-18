# 08 — Payments (Stripe)

Two payment products:
1. **Unlimited subscription** — $10/month recurring.
2. **HQ Export** — $1 one-time purchase for a single 24-bit export.

Both flow through Stripe Checkout, both are reconciled into our DB through the webhook.

## Stripe client setup

[src/lib/stripe.ts](../src/lib/stripe.ts):
```ts
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
  typescript: true,
});
export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || "";
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
```

The `apiVersion` is pinned. If Vercel ever rebuilds with a newer minor of the `stripe` package (e.g. because `vercel.json` wipes the lockfile), the literal-typed API version may not match. Fix is the cast trick:
```ts
apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion,
```
See [MIGRATING_NEON_TO_LINODE.md §12.5](MIGRATING_NEON_TO_LINODE.md) for the war story.

## Subscription flow

```
┌───────────────────────────────────────────────────────────────────────┐
│ /pricing (or /dashboard)                                              │
│  user clicks "Upgrade to Unlimited"                                   │
└──────────────────────────┬────────────────────────────────────────────┘
                           │ POST /api/stripe/create-checkout
                           ▼
              ┌─────────────────────────┐
              │ stack.getUser() — auth  │
              │ prisma.subscription.    │
              │   upsert(status: inactive) if no row yet
              │ stripe.checkout.sessions│
              │   .create({             │
              │     mode: 'subscription',
              │     line_items: [{price: STRIPE_PRICE_ID, qty: 1}],
              │     customer_email,     │
              │     metadata: {userId}  │
              │     success_url: /dashboard?subscription=success
              │     cancel_url:  /pricing
              │   })                    │
              │ return { url }          │
              └──────────┬──────────────┘
                         ▼
            redirect to Stripe Checkout
                         │
                         ▼  user pays
                         │
                         ▼
        ┌────────────────────────────────────────────────┐
        │ Stripe sends webhook → POST /api/stripe/webhook │
        │ Event: checkout.session.completed              │
        │   if mode === 'subscription':                  │
        │     prisma.subscription.update({               │
        │       userId,                                  │
        │       stripeCustomerId,                        │
        │       stripeSubscriptionId,                    │
        │       stripePriceId,                           │
        │       status: 'active',                        │
        │       currentPeriodStart, currentPeriodEnd     │
        │     })                                         │
        └────────────────────────────────────────────────┘
                         │
                         ▼
              redirected back to /dashboard?subscription=success
              dashboard reads /api/subscription/status → sees active
              shows "🎉 Welcome to Unlimited!" toast
```

### Recurring lifecycle

Once active, Stripe sends:
- `customer.subscription.updated` on every period roll, plan change, cancellation-scheduled — we update `status`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`.
- `customer.subscription.deleted` when the sub actually ends — we set `status: "canceled"`.
- `invoice.payment_failed` — we set `status: "past_due"`. The user keeps access until the period ends (Stripe handles dunning).

We **don't** keep a separate "ended" row history. The single `Subscription` row per user is mutated.

### Managing a subscription

[Dashboard](../src/app/dashboard/page.tsx) "Manage Subscription" button → `POST /api/stripe/portal`:
```ts
const session = await stripe.billingPortal.sessions.create({
  customer: subscription.stripeCustomerId,
  return_url: `${BASE_URL}/dashboard`,
});
return { url: session.url };
```
The Stripe Customer Portal handles cancellations, plan changes, card updates. Stripe sends the corresponding webhooks; our DB stays in sync.

## $1 HQ Purchase flow

```
/pricing or HQ unlock modal in dashboard
   user clicks "Buy HQ Export ($1)"
            │ POST /api/stripe/purchase-hq
            ▼
  prereq checks:
   - user signed in
   - NOT already a subscriber (subs get HQ free)
   - no existing HQPurchase with creditsRemaining > 0
  if ok:
   stripe.checkout.sessions.create({
     mode: 'payment',
     line_items: [{ price_data: {currency: usd, product_data, unit_amount: 100}, qty: 1 }],
     metadata: { userId, type: 'hq-purchase' },
     success_url: /dashboard?hq=success,
   })
   return { url }
            │
            ▼ Stripe Checkout, user pays
            ▼
  webhook: checkout.session.completed (mode === 'payment')
     prisma.hQPurchase.create({
       userId,
       stripePaymentIntentId,
       stripeSessionId,
       creditsRemaining: 1,
     })
            │
            ▼
  redirect to /dashboard?hq=success → toast "🎉 HQ Export unlocked"
```

### Consuming a credit

When the user starts a 24-bit master:
1. Client calls `GET /api/hq-purchase/status` → `{ hasCredits, credits, isSubscriber }`.
2. If user is a subscriber, no decrement happens — they get HQ free.
3. Otherwise, client calls `POST /api/hq-purchase/status` to decrement one credit. The route picks the oldest `HQPurchase` row with `creditsRemaining > 0` and decrements it.

If the master fails downstream, we currently **don't** refund the credit automatically. (This is a known small edge case; users haven't complained, but if they did, the easy fix is `+1` on failure in the webhook.)

## Webhook security

[Stripe webhook route](../src/app/api/stripe/webhook/route.ts):
```ts
const sig = request.headers.get("stripe-signature")!;
const rawBody = await request.text();
const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
```

`constructEvent` throws if the signature doesn't verify — we return 400. The `rawBody` must be the unparsed string; Next.js App Router gives us that via `await request.text()`.

## Environment variables

| Var | Where | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | Server | API client |
| `STRIPE_WEBHOOK_SECRET` | Server | `whsec_...` from Stripe dashboard |
| `STRIPE_PRICE_ID` | Server | The recurring price ID (`price_...`) for Unlimited |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client (optional) | Only needed if you ever do Stripe Elements client-side; currently unused at runtime |

In Stripe **test mode** during dev: use test keys (`sk_test_...`, `whsec_...`) and a test price ID. Card `4242 4242 4242 4242` for success.

## Webhook URL in Stripe dashboard

Production: `https://freepodcastmastering.com/api/stripe/webhook`
Events to enable:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

For local dev, run `stripe listen --forward-to localhost:3000/api/stripe/webhook` — the CLI prints a `whsec_...` to use as your local `STRIPE_WEBHOOK_SECRET`.

## Edge cases the code handles

- **User clicks "Upgrade" twice** — `create-checkout` checks for existing `active` status and 409s.
- **Webhook arrives before user returns from Stripe Checkout** — we don't depend on the redirect; the webhook is the source of truth.
- **User has multiple `HQPurchase` rows** — we sum credits in `GET /api/hq-purchase/status` and decrement the oldest first.
- **Webhook arrives twice (Stripe retry)** — `Subscription` is `upsert`-ed by `userId`; `HQPurchase.stripeSessionId` has a unique constraint so `prisma.hQPurchase.create()` would 409. The route catches that.

## Edge cases the code does NOT handle (yet)

- Plan changes via Stripe Portal mid-cycle (the price ID stored on `Subscription` won't auto-refresh until the period rolls).
- Multi-currency. Everything is USD.
- Refunds. A refunded HQ purchase doesn't claw back the credit. Manual DB fix if it ever happens.
- Proration on subscription cancellation. Stripe handles billing-side proration; we just see the eventual `subscription.deleted`.

## Testing payments

For Stripe Checkout:
- Test cards: `4242 4242 4242 4242` (success), `4000 0000 0000 9995` (insufficient funds), etc. See [Stripe docs](https://stripe.com/docs/testing).
- Use 3-D Secure card `4000 0027 6000 3184` to test auth flows.

For the webhook locally:
```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# the CLI prints whsec_... — put it in your .env.local
stripe trigger checkout.session.completed
```
