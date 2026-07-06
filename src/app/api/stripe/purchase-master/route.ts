import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { stackServerApp } from "@/stack";

// POST /api/stripe/purchase-master
//
// Creates a $2 one-time Stripe Checkout session for a single mastered file
// on top of the day's free master. Success flips the MasterEntitlement row
// to created (via the checkout.session.completed webhook), which the next
// call to `checkUserQuota` picks up and lets the user master.
//
// Body is intentionally empty — the price is fixed server-side so the client
// can't mint arbitrary amounts. Metadata carries the userId and a type tag
// the webhook dispatches on.
export async function POST(request: Request) {
  const user = await stackServerApp.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in required" },
      { status: 401 },
    );
  }

  // Where to send the user after Checkout. Uses the current origin so the
  // flow works on prod, previews, and (eventually) freemusicmaster.com.
  const h = await headers();
  const origin =
    h.get("origin") ||
    `https://${h.get("host") || "freepodcastmastering.com"}`;

  // Pull the return path from the client so a music-page paywall returns
  // to /audio-mastering instead of the podcast homepage.
  let returnPath = "/";
  try {
    const body = (await request.json().catch(() => ({}))) as {
      returnPath?: string;
    };
    if (typeof body.returnPath === "string" && body.returnPath.startsWith("/")) {
      returnPath = body.returnPath;
    }
  } catch {
    // Body optional — default returnPath is fine.
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 200, // $2.00
          product_data: {
            name: "Master one podcast",
            description:
              "One additional mastered audio file. Includes 24-bit HQ export.",
          },
        },
      },
    ],
    metadata: {
      userId: user.id,
      type: "single_master",
    },
    success_url: `${origin}${returnPath}${returnPath.includes("?") ? "&" : "?"}entitlement_purchased=1`,
    cancel_url: `${origin}${returnPath}${returnPath.includes("?") ? "&" : "?"}entitlement_canceled=1`,
    // Attach the customer if we already know their Stripe id (from a prior
    // subscription or HQ purchase). Falls back to a new customer otherwise.
    customer_email: user.primaryEmail ?? undefined,
  });

  return NextResponse.json({ url: session.url });
}
