import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { resend, FROM_EMAIL } from "@/lib/resend";

const RECIPIENT = "teylersf@gmail.com";

const CATEGORIES = ["bug", "feature", "feedback", "issue"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  bug: "Bug report",
  feature: "Feature request",
  feedback: "General feedback",
  issue: "Issue",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      category?: string;
      message?: string;
      email?: string;
      pageUrl?: string;
    };

    const category = body.category as Category | undefined;
    const message = body.message?.trim();
    const replyEmail = body.email?.trim();
    const pageUrl = body.pageUrl?.trim();

    if (!category || !CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (!message || message.length < 3) {
      return NextResponse.json({ error: "Message too short" }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }
    if (replyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyEmail)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "unknown";
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      "unknown";
    const host = headersList.get("host") || "unknown";
    const referer = headersList.get("referer") || pageUrl || "unknown";

    const label = CATEGORY_LABELS[category];
    const subject = `[${host}] ${label}`;

    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const html = `
      <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px;">${escapeHtml(label)}</h2>
        <div style="white-space: pre-wrap; padding: 16px; background: #f6f6f7; border-radius: 8px; border: 1px solid #e5e7eb; color: #111;">${escapeHtml(
          message
        )}</div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <table style="font-size: 13px; color: #555;">
          <tr><td style="padding: 2px 12px 2px 0;">Reply to</td><td>${replyEmail ? escapeHtml(replyEmail) : "<i>not provided</i>"}</td></tr>
          <tr><td style="padding: 2px 12px 2px 0;">Page</td><td>${escapeHtml(referer)}</td></tr>
          <tr><td style="padding: 2px 12px 2px 0;">Host</td><td>${escapeHtml(host)}</td></tr>
          <tr><td style="padding: 2px 12px 2px 0;">IP</td><td>${escapeHtml(ip)}</td></tr>
          <tr><td style="padding: 2px 12px 2px 0;">User agent</td><td style="word-break: break-all;">${escapeHtml(userAgent)}</td></tr>
        </table>
      </div>
    `;

    const text = [
      `${label}`,
      "",
      message,
      "",
      "---",
      `Reply to: ${replyEmail || "(not provided)"}`,
      `Page: ${referer}`,
      `Host: ${host}`,
      `IP: ${ip}`,
      `User agent: ${userAgent}`,
    ].join("\n");

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [RECIPIENT],
      replyTo: replyEmail || undefined,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[FEEDBACK] Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error("[FEEDBACK] Error:", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
