import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import Stripe from "stripe";
import { notifyAdminPayment } from "@/lib/adminNotify";

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
          await notifyAdminPayment({
            kind: "hq_purchase",
            amountCents: session.amount_total ?? 100,
            currency: session.currency ?? "usd",
            customerEmail: session.customer_details?.email ?? session.customer_email,
            userId,
            stripeCustomerId: session.customer as string | null,
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent as string | null,
          });
          break;
        }

        // Handle one-time $2 single-master purchase. This is the paywall the
        // client hits after the daily free master is used up. Row lives until
        // the user starts their next master, at which point checkUserQuota
        // picks it up as an unused entitlement and consumeQuota flips
        // `used = true`.
        if (purchaseType === "single_master" && userId) {
          console.log(
            `[WEBHOOK] Creating single-master entitlement for user ${userId}`,
          );
          await prisma.masterEntitlement.create({
            data: {
              userId,
              stripeSessionId: session.id,
              stripePaymentIntentId: session.payment_intent as string,
            },
          });
          console.log(`[WEBHOOK] Entitlement created for user ${userId}`);
          await notifyAdminPayment({
            kind: "single_master",
            amountCents: session.amount_total ?? 200,
            currency: session.currency ?? "usd",
            customerEmail: session.customer_details?.email ?? session.customer_email,
            userId,
            stripeCustomerId: session.customer as string | null,
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent as string | null,
          });
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

          await notifyAdminPayment({
            kind: "subscription_new",
            amountCents: session.amount_total ?? 1000,
            currency: session.currency ?? "usd",
            customerEmail: session.customer_details?.email ?? session.customer_email,
            userId,
            stripeCustomerId: session.customer as string | null,
            stripeSubscriptionId: subscriptionId,
            stripeSessionId: session.id,
            periodEnd: subscriptionData.currentPeriodEnd ?? null,
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

      // Notify on subscription renewal payments. `invoice.paid` fires for
      // BOTH the initial subscription checkout AND every renewal; we only
      // want the renewals here (the initial checkout is already notified
      // in the checkout.session.completed branch). `billing_reason ===
      // "subscription_cycle"` is Stripe's flag for a recurring cycle.
      case "invoice.paid": {
        const invoice = event.data.object as unknown as {
          id?: string;
          customer?: string;
          customer_email?: string;
          amount_paid?: number;
          currency?: string;
          billing_reason?: string;
          subscription?: string;
          lines?: {
            data?: Array<{
              period?: { end?: number };
            }>;
          };
        };

        if (invoice.billing_reason !== "subscription_cycle") {
          break;
        }

        const customerId = invoice.customer;
        const sub = customerId
          ? await prisma.subscription.findFirst({
              where: { stripeCustomerId: customerId },
              select: { userId: true },
            })
          : null;

        const periodEndSec = invoice.lines?.data?.[0]?.period?.end;

        await notifyAdminPayment({
          kind: "subscription_renewal",
          amountCents: invoice.amount_paid ?? 1000,
          currency: invoice.currency ?? "usd",
          customerEmail: invoice.customer_email ?? null,
          userId: sub?.userId ?? null,
          stripeCustomerId: customerId ?? null,
          stripeSubscriptionId: invoice.subscription ?? null,
          stripeInvoiceId: invoice.id ?? null,
          periodEnd:
            typeof periodEndSec === "number"
              ? new Date(periodEndSec * 1000)
              : null,
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

