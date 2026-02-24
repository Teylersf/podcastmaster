import { NextResponse } from "next/server";
import { stripe, STRIPE_PRICE_ID } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { stackServerApp } from "@/stack";

export async function POST() {
  try {
    // Get the current user from Stack Auth
    const user = await stackServerApp.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = user.id;
    const userEmail = user.primaryEmail;

    // Check if user already has a subscription record
    let subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    let customerId = subscription?.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || undefined,
        metadata: {
          userId,
        },
      });
      customerId = customer.id;

      // Create or update subscription record
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

    // Check if user already has an active subscription
    if (subscription?.status === "active") {
      return NextResponse.json(
        { error: "Already subscribed" },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://freepodcastmastering.com"}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://freepodcastmastering.com"}/dashboard?canceled=true`,
      metadata: {
        userId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[SERVER] Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

