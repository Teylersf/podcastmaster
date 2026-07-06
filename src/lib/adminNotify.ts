import { resend, FROM_EMAIL } from "@/lib/resend";

const ADMIN_EMAIL = "teylersf@gmail.com";

export type PaymentKind =
  | "subscription_new"
  | "subscription_renewal"
  | "single_master"
  | "hq_purchase";

const KIND_LABELS: Record<PaymentKind, string> = {
  subscription_new: "New Unlimited subscription",
  subscription_renewal: "Subscription renewal",
  single_master: "Single master purchase",
  hq_purchase: "HQ credit purchase",
};

type PaymentDetails = {
  kind: PaymentKind;
  amountCents: number;
  currency: string;
  customerEmail?: string | null;
  userId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeSessionId?: string | null;
  stripeInvoiceId?: string | null;
  stripePaymentIntentId?: string | null;
  host?: string | null;
  periodEnd?: Date | null;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatAmount(cents: number, currency: string): string {
  const dollars = (cents / 100).toFixed(2);
  return `${currency.toUpperCase()} $${dollars}`;
}

// Fires a "you got money" notification email to the admin. Wrapped in
// try/catch and awaited from the webhook — Resend is fast (a few hundred
// ms) and Stripe gives us ~30 seconds before it retries, so the cost is
// well within budget and we get a synchronous confirmation the send
// happened. Any Resend failure is logged and swallowed so the webhook
// still returns 200 — losing an email is far less bad than reprocessing
// a payment.
export async function notifyAdminPayment(details: PaymentDetails): Promise<void> {
  try {
    const kindLabel = KIND_LABELS[details.kind] ?? details.kind;
    const amount = formatAmount(details.amountCents, details.currency);
    const host = details.host || "freepodcastmastering.com";

    const subject = `[${host}] 💰 ${amount} — ${kindLabel}`;

    const rows: [string, string][] = [
      ["Type", kindLabel],
      ["Amount", amount],
    ];
    if (details.customerEmail) rows.push(["Customer email", details.customerEmail]);
    if (details.userId) rows.push(["User id (Stack Auth)", details.userId]);
    if (details.stripeCustomerId) rows.push(["Stripe customer", details.stripeCustomerId]);
    if (details.stripeSubscriptionId) rows.push(["Stripe subscription", details.stripeSubscriptionId]);
    if (details.stripeSessionId) rows.push(["Checkout session", details.stripeSessionId]);
    if (details.stripeInvoiceId) rows.push(["Invoice", details.stripeInvoiceId]);
    if (details.stripePaymentIntentId) rows.push(["Payment intent", details.stripePaymentIntentId]);
    if (details.periodEnd) rows.push(["Renews / expires", details.periodEnd.toISOString()]);

    const html = `
      <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 8px 0; font-size: 20px;">${escapeHtml(kindLabel)}</h2>
        <p style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #111;">${escapeHtml(amount)}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <table style="width: 100%; font-size: 13px; color: #555; border-collapse: collapse;">
          ${rows
            .map(
              ([k, v]) => `
            <tr>
              <td style="padding: 4px 16px 4px 0; vertical-align: top; white-space: nowrap; color: #666;">${escapeHtml(k)}</td>
              <td style="padding: 4px 0; word-break: break-all; color: #111;">${escapeHtml(v)}</td>
            </tr>
          `,
            )
            .join("")}
        </table>
      </div>
    `;

    const text = [
      kindLabel,
      "",
      amount,
      "",
      "---",
      ...rows.map(([k, v]) => `${k}: ${v}`),
    ].join("\n");

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[ADMIN-NOTIFY] Resend error:", error);
    }
  } catch (err) {
    // Never let a notification failure break the webhook.
    console.error("[ADMIN-NOTIFY] Unexpected error:", err);
  }
}
