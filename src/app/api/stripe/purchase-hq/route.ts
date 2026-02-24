import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { stackServerApp } from "@/stack";

// Price in cents ($1.00)
const HQ_PRICE_CENTS = 100;

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

    // Check if user already has a subscription (they get HQ for free)
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (subscription?.status === "active") {
      return NextResponse.json(
        { error: "Subscribers already have access to HQ exports" },
        { status: 400 }
      );
    }

    // Check if user already has unused HQ credits
    const existingPurchase = await prisma.hQPurchase.findFirst({
      where: {
        userId,
        creditsRemaining: { gt: 0 },
      },
    });

    if (existingPurchase) {
      return NextResponse.json(
        { error: "You already have HQ credits available", credits: existingPurchase.creditsRemaining },
        { status: 400 }
      );
    }

    // Create Stripe checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "24-bit HQ Export",
              description: "One high-quality 24-bit WAV export for your podcast",
            },
            unit_amount: HQ_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      customer_email: userEmail || undefined,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://freepodcastmastering.com"}/?hq_success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://freepodcastmastering.com"}/?hq_canceled=true`,
      metadata: {
        userId,
        type: "hq_purchase",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[SERVER] HQ Purchase checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
