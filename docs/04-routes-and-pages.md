# 04 — Routes & Pages

Frontend page routes only. API routes are in [05-api-reference.md](05-api-reference.md).

All routes live under [src/app/](../src/app/) (Next.js App Router).

## Public pages

### `/` — Home / Mastering tool
**File:** [src/app/page.tsx](../src/app/page.tsx)
**Type:** Server Component with dynamic-imported client component
**Layout:** Uses root [layout.tsx](../src/app/layout.tsx)

Renders:
- **Static, server-rendered:** Hero copy, "How It Works" 3-step section, Why Use This Tool, link to the mastering guide, Privacy banner, Open-Source CTA, footer.
- **Dynamic client component:** [HomeClient](../src/components/HomeClient.tsx) — the actual upload + master interactive widget. Lazy-loaded via `next/dynamic` to keep the initial JS bundle small. A skeleton (`HomeLoadingSkeleton`) renders while it streams in.

SEO: extensive `metadata` block in [layout.tsx](../src/app/layout.tsx), JSON-LD WebApplication schema, Google Ads gtag.

### `/pricing` — Pricing & subscription / one-time purchase
**File:** [src/app/pricing/page.tsx](../src/app/pricing/page.tsx) (~426 lines)

Free vs Unlimited ($10/mo) comparison cards plus the $1 one-time HQ Export option. FAQ section (4 entries).

Buttons that call:
- `POST /api/stripe/create-checkout` — start subscription. Redirects to Stripe Checkout `url`.
- `POST /api/stripe/purchase-hq` — buy the $1 HQ credit. Redirects to Stripe Checkout `url`.

Unauthenticated users are redirected to the Stackframe sign-up before checkout completes (Stripe Checkout requires a signed-in user so we have `userId` to attach the subscription to).

### `/terms` — Terms of Service
**File:** [src/app/terms/page.tsx](../src/app/terms/page.tsx) (~298 lines)

Static. TL;DR banner up top, then 6 sections covering: 24-hour file retention, no data selling, no AI training, user rights, mission statement, service terms.

**Important:** The privacy claims here are commitments the code must honor. Don't add features that violate them (e.g. don't add a "save my voice for future templates" toggle).

### `/how-to-master-podcast-audio` — SEO guide
**File:** [src/app/how-to-master-podcast-audio/page.tsx](../src/app/how-to-master-podcast-audio/page.tsx) (~1517 lines)

Massive static SEO content piece. 18-section table of contents covering:
- Universal 7-step mastering workflow
- Editor-specific step-by-step guides for Audacity, DaVinci Resolve, CapCut, Premiere Pro, Final Cut Pro, Adobe Audition, GarageBand, Logic Pro, REAPER, Pro Tools, Hindenburg, Descript
- Pro tips, troubleshooting, FAQ

This page is the main organic-traffic driver — be careful about restructuring URLs or removing it.

## Authenticated pages

### `/dashboard` — User dashboard
**File:** [src/app/dashboard/page.tsx](../src/app/dashboard/page.tsx) (~956 lines)
**Auth:** Required. Server-side check via `await stackServerApp.getUser()` — redirects to `/handler/sign-in` if `null`.

Sections:
- **Compact mastering tool** ([MasteringTool](../src/components/MasteringTool.tsx) with `compact={true}`)
- **Subscription status card** — shows current plan, next billing date, "Manage Subscription" button (Stripe Portal)
- **Storage & files** (subscribers only) — 5 GB usage bar, list of `SubscriberFile`s with download / delete buttons
- **Recent files** (free users) — list of `FreeUserFile`s with countdown timer to the 24-hour expiry
- **HQ Credits card** — shows remaining 24-bit credits or "Buy HQ Export ($1)" CTA for non-subscribers
- **Video generator overlay** — [VideoGenerator](../src/components/video/VideoGenerator.tsx) opens as a modal when the user clicks "Make Video" on any file

API calls the dashboard makes:
- `GET /api/subscription/status` — subscription + storage + file list
- `GET /api/files/free-user` — free-tier files
- `GET /api/hq-purchase/status` — credits state
- `POST /api/stripe/create-checkout` — upgrade to Unlimited
- `POST /api/stripe/portal` — manage subscription
- `POST /api/stripe/purchase-hq` — buy HQ credit
- `DELETE /api/files/delete` — remove a subscriber file

Real-time UI:
- 60-second-interval countdown timers for free file expiry.
- Toast notifications when the user returns from a successful Stripe Checkout (looks at URL query params).

## Auth pages

### `/handler/[...stack]` — Stackframe auth catch-all
**File:** [src/app/handler/[...stack]/page.tsx](../src/app/handler/[...stack]/page.tsx)

Renders `<StackHandler fullPage app={stackServerApp} params={props.params} />`. Stackframe handles all auth UI: sign-in, sign-up, forgot password, email verification, OAuth callbacks. No custom code needed.

Common paths inside this catch-all:
- `/handler/sign-in`
- `/handler/sign-up`
- `/handler/forgot-password`
- `/handler/oauth-callback`
- `/handler/account-settings`

Configuration lives in [src/stack.tsx](../src/stack.tsx) — particularly the redirects:
```ts
urls: {
  home: "/",
  signIn: "/handler/sign-in",
  signUp: "/handler/sign-up",
  afterSignIn: "/dashboard",
  afterSignUp: "/dashboard",
  afterSignOut: "/",
}
```

## Loading / fallback

### `loading.tsx`
**File:** [src/app/loading.tsx](../src/app/loading.tsx) — global Suspense fallback for the root segment.

## Layouts

### Root layout
**File:** [src/app/layout.tsx](../src/app/layout.tsx)

Wraps every page:
1. `<html lang="en" className="dark" suppressHydrationWarning>`
2. Inline theme-restoration script (prevents FOUC by reading `localStorage['podcast-theme-chosen']` synchronously)
3. JSON-LD schema script
4. Google Ads gtag script
5. `<StackProvider app={stackServerApp}>` → `<StackTheme>` → `<ThemeProvider>` (custom 20-theme provider) → children
6. `<Analytics />` from `@vercel/analytics/next`
7. Noise texture overlay div

Fonts attached as CSS variables: `--font-dm-sans`, `--font-ibm-mono`, `--font-caveat`, `--font-patrick-hand`. Only DM Sans is preloaded (others are theme-conditional).

There are no nested `layout.tsx` files — the root layout serves every page.

## Routes by category

| Category | Path | File |
|---|---|---|
| Public — landing | `/` | [page.tsx](../src/app/page.tsx) |
| Public — pricing | `/pricing` | [pricing/page.tsx](../src/app/pricing/page.tsx) |
| Public — terms | `/terms` | [terms/page.tsx](../src/app/terms/page.tsx) |
| Public — SEO guide | `/how-to-master-podcast-audio` | [how-to-master-podcast-audio/page.tsx](../src/app/how-to-master-podcast-audio/page.tsx) |
| Auth (Stackframe) | `/handler/*` | [handler/[...stack]/page.tsx](../src/app/handler/[...stack]/page.tsx) |
| Authenticated | `/dashboard` | [dashboard/page.tsx](../src/app/dashboard/page.tsx) |

## What's NOT a route

- [src/app/api/](../src/app/api/) — these are API route handlers (see [05-api-reference.md](05-api-reference.md))
- [src/app/globals.css](../src/app/globals.css) — styles
- [src/app/favicon.ico](../src/app/favicon.ico) — favicon
