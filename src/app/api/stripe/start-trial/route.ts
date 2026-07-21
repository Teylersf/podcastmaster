import { NextResponse } from "next/server";
import { stripe, STRIPE_PRICE_ID } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { stackServerApp } from "@/stack";

// POST /api/stripe/start-trial
//
// Card-required 7-day free trial checkout. Same $10/mo price as the
// non-trial subscription flow, but with subscription_data.trial_period_days
// so Stripe collects a payment method up front, charges $0 today, and
// starts billing on day 8 unless the user cancels first.
//
// Abuse guard: refuses if the user has ever been on a trial before
// (their Subscription.trialEndsAt is populated). A one-time trial is a
// deliberate business rule — send them to /api/stripe/create-checkout
// (paid immediately, no trial) instead if they want back in.
export async function POST(request: Request) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.primaryEmail;

    let subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (subscription?.status === "active" || subscription?.status === "trialing") {
      return NextResponse.json(
        { error: "already_subscribed" },
        { status: 400 },
      );
    }
    if (subscription?.trialEndsAt !== null && subscription?.trialEndsAt !== undefined) {
      return NextResponse.json(
        { error: "trial_already_used" },
        { status: 400 },
      );
    }

    let customerId = subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      if (subscription) {
        await prisma.subscription.update({
          where: { userId },
          data: { stripeCustomerId: customerId },
        });
      } else {
        subscription = await prisma.subscription.create({
          data: {
            userId,
            stripeCustomerId: customerId,
            status: "inactive",
          },
        });
      }
    }

    // Callers can pass returnPath so the "start trial" button in the
    // mastering tool completion view can bring the user back to the
    // right page after Stripe's checkout.
    let returnPath = "/dashboard";
    try {
      const body = await request.json();
      if (typeof body?.returnPath === "string" && body.returnPath.startsWith("/")) {
        returnPath = body.returnPath;
      }
    } catch {
      // No body — fine, use default.
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL || "https://freepodcastmastering.com";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        // If the trial ends and Stripe can't charge the saved card, pause
        // the sub instead of leaving it lingering as past_due — keeps the
        // conversion metric honest.
        trial_settings: {
          end_behavior: { missing_payment_method: "pause" },
        },
        metadata: {
          userId,
          checkout_type: "trial",
        },
      },
      metadata: {
        userId,
        type: "trial",
      },
      success_url: `${origin}${returnPath}${returnPath.includes("?") ? "&" : "?"}trial=started`,
      cancel_url: `${origin}${returnPath}${returnPath.includes("?") ? "&" : "?"}trial=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[SERVER] start-trial error:", error);
    return NextResponse.json(
      { error: "checkout_failed" },
      { status: 500 },
    );
  }
}
