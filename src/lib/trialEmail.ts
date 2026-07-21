import { render } from "@react-email/render";
import React from "react";
import { resend, FROM_EMAIL } from "@/lib/resend";
import TrialOfferEmail from "@/emails/TrialOffer";

// Fires the "start your 7-day free trial" pitch email. Scheduled for
// ~5 minutes after the user signs up — long enough for them to have
// downloaded their first master, short enough that the excitement of
// hearing it hasn't faded.
//
// Uses Resend's scheduled_at so the delay costs nothing on our side
// (Resend queues the send). Awaited from getOrCreateUserProfile —
// fire-and-forget on Vercel serverless kills the promise the moment
// the response returns.
export async function scheduleTrialOfferEmail(params: {
  toEmail: string;
  firstName: string;
}): Promise<void> {
  try {
    const trialUrl = "https://freepodcastmastering.com/dashboard?start_trial=1";

    const html = await render(
      React.createElement(TrialOfferEmail, {
        firstName: params.firstName,
        trialUrl,
      }),
    );

    // 5 minutes in the future. Resend expects ISO-8601. Cap the max
    // at 72h upstream so a clock skew or bug never queues something
    // for weeks out.
    const scheduledAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [params.toEmail],
      subject: "7 days unlimited, on the house — no charge today",
      html,
      scheduledAt,
    });

    if (error) {
      console.error("[TRIAL-EMAIL] Resend error:", error);
    }
  } catch (err) {
    // Never let this block signup.
    console.error("[TRIAL-EMAIL] Unexpected error:", err);
  }
}
