import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is not set");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// Email addresses
// NOTE: Update FROM_EMAIL once you verify freepodcastmastering.com domain in Resend dashboard
// Until then, use the default Resend testing email (onboarding@resend.dev)
export const SUPPORT_EMAIL = "support@freepodcastmastering.com";

// Resend requires format: "Name <email>" or just "email"
const fromName = process.env.RESEND_FROM_NAME || "Free Podcast Mastering";
const fromEmail = process.env.RESEND_FROM_ADDRESS || "onboarding@resend.dev";
export const FROM_EMAIL = `${fromName} <${fromEmail}>`;

