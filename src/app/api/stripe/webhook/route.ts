import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe's `current_period_start`/`current_period_end` moved from the
// subscription root to the subscription item in the 2025-03-31.basil API.
// New events serialize them only on items; older events have them on the
// root. Read both so we keep working across versions and renewals.
function extractPeriod(sub: Stripe.Subscription): {
  start?: number;
  end?: number;
} {
  const item = sub.items?.data?.[0] as
    | { current_period_start?: number; current_period_end?: number }
    | undefined;
  const root = sub as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };
  return {
    start: item?.current_period_start ?? root.current_period_start,
    end: item?.current_period_end ?? root.current_period_end,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: "Missing signature or webhook secret" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("[SERVER] Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const purchaseType = session.metadata?.type;

        // Handle one-time HQ purchase
        if (purchaseType === "hq_purchase" && userId) {
          console.log(`[WEBHOOK] Processing HQ purchase for user ${userId}`);
          await prisma.hQPurchase.create({
            data: {
              userId,
              stripeSessionId: session.id,
              stripePaymentIntentId: session.payment_intent as string,
              creditsRemaining: 1,
            },
          });
          console.log(`[WEBHOOK] HQ credit added for user ${userId}`);
          break;
        }

        // Handle subscription checkout
        const subscriptionId = session.subscription as string;

        if (userId && subscriptionId) {
          // Get subscription details from Stripe
          const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

          const { start: periodStart, end: periodEnd } = extractPeriod(stripeSubscription);

          // Build data with safe date handling
          const subscriptionData: {
            stripeSubscriptionId: string;
            stripePriceId?: string;
            status: string;
            currentPeriodStart?: Date;
            currentPeriodEnd?: Date;
            cancelAtPeriodEnd?: boolean;
          } = {
            stripeSubscriptionId: subscriptionId,
            stripePriceId: stripeSubscription.items.data[0]?.price.id,
            status: "active",
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          };

          // Only add dates if they exist and are valid
          if (periodStart && typeof periodStart === "number") {
            subscriptionData.currentPeriodStart = new Date(periodStart * 1000);
          }
          if (periodEnd && typeof periodEnd === "number") {
            subscriptionData.currentPeriodEnd = new Date(periodEnd * 1000);
          }

          await prisma.subscription.upsert({
            where: { userId },
            update: {
              ...subscriptionData,
              stripeCustomerId: session.customer as string,
            },
            create: {
              userId,
              stripeCustomerId: session.customer as string,
              ...subscriptionData,
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscriptionData = event.data.object as Stripe.Subscription;
        const customerId = subscriptionData.customer as string;

        const { start: periodStart, end: periodEnd } = extractPeriod(subscriptionData);

        // Build update data dynamically, only including dates if they exist and are valid
        const updateData: {
          status: string;
          cancelAtPeriodEnd: boolean;
          currentPeriodStart?: Date;
          currentPeriodEnd?: Date;
        } = {
          status: subscriptionData.status === "active" ? "active" : subscriptionData.status,
          cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
        };

        // Only add dates if they exist and are valid numbers
        if (periodStart && typeof periodStart === "number") {
          updateData.currentPeriodStart = new Date(periodStart * 1000);
        }
        if (periodEnd && typeof periodEnd === "number") {
          updateData.currentPeriodEnd = new Date(periodEnd * 1000);
        }

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: updateData,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscriptionData = event.data.object as unknown as { customer: string };
        const customerId = subscriptionData.customer;

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status: "canceled",
            cancelAtPeriodEnd: false,
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoiceData = event.data.object as unknown as { customer: string };
        const customerId = invoiceData.customer;

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status: "past_due",
          },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[SERVER] Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

