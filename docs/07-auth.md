# 07 — Authentication

Auth is **[Stackframe Stack](https://stackframe.dev/)** (`@stackframe/stack` v2.8.54). It's a Next.js-native auth provider — gives us email/password + OAuth (Google, GitHub etc., configurable in their dashboard), session cookies, and a full set of drop-in UI pages.

## Configuration

### Server-side

[src/stack.tsx](../src/stack.tsx):
```ts
import "server-only";
import { StackServerApp } from "@stackframe/stack";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  urls: {
    home: "/",
    signIn: "/handler/sign-in",
    signUp: "/handler/sign-up",
    afterSignIn: "/dashboard",
    afterSignUp: "/dashboard",
    afterSignOut: "/",
  },
});
```
- `"server-only"` import — this module errors if accidentally imported into a client component.
- `tokenStore: "nextjs-cookie"` — session is held in an HTTP-only cookie. No localStorage tokens.

### Provider tree

In [src/app/layout.tsx](../src/app/layout.tsx):
```tsx
<StackProvider app={stackServerApp}>
  <StackTheme>
    <ThemeProvider>
      {children}
      <Analytics />
    </ThemeProvider>
  </StackTheme>
</StackProvider>
```
`StackProvider` injects the auth context globally. `StackTheme` lets us style Stackframe's UI (it picks up our CSS variables automatically).

## Auth UI

There is **zero custom auth UI**. Stackframe owns the entire flow via the catch-all:

[src/app/handler/[...stack]/page.tsx](../src/app/handler/[...stack]/page.tsx):
```tsx
import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/stack";

export default function Handler(props: { params: { stack: string[] } }) {
  return <StackHandler fullPage app={stackServerApp} params={props.params} />;
}
```

That renders different things depending on the URL:
- `/handler/sign-in` — sign in
- `/handler/sign-up` — sign up
- `/handler/forgot-password` — reset
- `/handler/oauth-callback` — OAuth return
- `/handler/account-settings` — profile, password change, OAuth connections

If you want to embed a sign-in form *inside* a custom page, use `<SignIn />` from `@stackframe/stack` — but we don't currently.

## Getting the current user

**Server side (API routes, server components):**
```ts
import { stackServerApp } from "@/stack";

const user = await stackServerApp.getUser();
if (!user) {
  return NextResponse.json({ error: "Not signed in" }, { status: 401 });
}
const userId = user.id;
```

This is the pattern in every authenticated API route ([files/delete](../src/app/api/files/delete/route.ts), [subscription/status](../src/app/api/subscription/status/route.ts), [stripe/*](../src/app/api/stripe/), etc.).

**Client side:**
```tsx
"use client";
import { useUser } from "@stackframe/stack";

const user = useUser();        // null when not signed in
const user = useUser({ or: "redirect" });  // redirects to sign-in
```

Used in the dashboard and in components like [VideoGenerator](../src/components/video/VideoGenerator.tsx) to pre-fill email fields.

## User ID — what we actually store

The `user.id` from Stackframe is the single identifier we use across:
- `Subscription.userId`
- `SubscriberFile` via `subscription.userId` (no direct field)
- `FreeUserFile.userId`
- `PremiumUserJob.userId`
- `HQPurchase.userId`
- `UsageLog.userId` (when signed in)

We **don't** store user email, name, or other profile data in our DB — Stackframe holds that. If you need the user's email for an email send, get it from `user.primaryEmail` or have it passed in explicitly (the notification endpoints take an `email` parameter so the user can use any address, not just their account email).

## Sessions

Stackframe cookies are HTTP-only, secure-in-production, and refresh themselves. Default session length is whatever Stackframe defaults to — tweak in their dashboard if needed. We don't currently customize it.

## OAuth providers

Configured via the Stackframe dashboard (not in code). To enable a new OAuth provider:
1. Add it in Stackframe dashboard.
2. Re-deploy (no code change needed) — the `<SignIn />` UI auto-discovers enabled providers from the server config Stackframe ships down.

## Environment variables

| Var | Required? | Notes |
|---|---|---|
| `NEXT_PUBLIC_STACK_PROJECT_ID` | yes | Public; tells the client which Stackframe project |
| `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` | yes | Public |
| `STACK_SECRET_SERVER_KEY` | yes | Server-only; used by `StackServerApp` |

If any of these are missing the app boots with errors on every page.

## Common auth-related code paths

| What | Where |
|---|---|
| Protect an API route | `await stackServerApp.getUser()` in the handler |
| Protect a page server-side | Same, in the page component (it's a server component) |
| Get user in a client component | `useUser()` |
| Force redirect to sign-in from a client | `useUser({ or: "redirect" })` |
| Sign out | The Stackframe UI handles it; programmatically `user.signOut()` |

## What auth does NOT do

- **Authorize Stripe-related actions** — those routes additionally check the `Subscription.status`. Auth = "you are signed in"; subscription = "you paid".
- **Track guest IPs** — guest rate-limiting uses `request.headers.get('x-forwarded-for')` and salts with `WEBHOOK_SECRET`. No Stackframe involvement.
- **Handle Stripe customer linking** — that's done by storing `stripeCustomerId` on the `Subscription` row when a checkout completes.

## Gotchas

- **Stackframe upgrades** can change session formats — if you upgrade `@stackframe/stack`, test sign-in / sign-out / a webhook flow.
- **Client components calling protected APIs** — always include `credentials: "include"` if you ever use a non-`fetch` HTTP client. Native `fetch` to same-origin URLs sends cookies by default; the helper code does too.
- **No middleware-based auth gate** — there is no `middleware.ts` enforcing auth. Each protected route enforces itself. If you add a `middleware.ts`, be careful not to break the `/handler/*` flows (those need to be public).
