import crypto from "crypto";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { notifyAdminSignup } from "@/lib/adminNotify";
import { scheduleTrialOfferEmail } from "@/lib/trialEmail";

// Referral codes: 8 chars, uppercase-only. We drop the visually ambiguous
// glyphs (0/O, 1/I/L) so a code copied off a phone screen still works.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function generateReferralCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

// Hash an IP with the shared webhook secret so raw IPs never touch disk.
// The same salt is used across the codebase (rate-limit route uses this
// pattern too), so a rehash from the same IP always produces the same value.
export function hashIp(ip: string): string {
  const salt = process.env.WEBHOOK_SECRET || "default-salt";
  return crypto
    .createHash("sha256")
    .update(ip + salt)
    .digest("hex");
}

// Pulls the client's IP from the standard forwarding headers Vercel sets.
// x-forwarded-for is a comma-separated chain of proxies; the leftmost entry
// is the origin client. Falls back to x-real-ip, then "unknown".
export function getClientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") || "unknown";
}

export type ProfileInitInput = {
  userId: string;
  email?: string | null;
  ip?: string | null;
  visitorId?: string | null;
  referredByCode?: string | null;
};

// Idempotent: returns an existing profile or creates a new one with a unique
// referral code. Collisions on the 8-char code are ~1 in 8e10 per attempt, but
// we still retry a few times just in case rather than 500ing on the user.
//
// Side effect on first create: if `referredByCode` matches an existing user
// and that user isn't the caller (self-signup would be void_self), inserts
// a Referral row in `pending` state. The fraud gates + bonus grant happen
// later, at the referee's first paid $2 master (see settlePendingReferral).
export async function getOrCreateUserProfile(input: ProfileInitInput) {
  const existing = await prisma.userProfile.findUnique({
    where: { userId: input.userId },
  });
  if (existing) return existing;

  const ipHash = input.ip ? hashIp(input.ip) : null;

  let created;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();
    try {
      created = await prisma.userProfile.create({
        data: {
          userId: input.userId,
          email: input.email ?? null,
          referralCode: code,
          referredByCode: input.referredByCode ?? null,
          signupIpHash: ipHash,
          signupVisitorId: input.visitorId ?? null,
        },
      });
      break;
    } catch (err) {
      if (isUniqueConstraintError(err) && attempt < 4) continue;
      throw err;
    }
  }
  if (!created) {
    throw new Error("Could not allocate unique referral code after 5 attempts");
  }

  // Admin notification — one email per real signup. Awaited, not
  // fire-and-forget: on Vercel serverless the function process is
  // terminated the moment the response is sent, so `void <promise>`
  // did not reliably deliver the email (this bug ate the notifications
  // for four out of five real signups on 07-06–07-08). notifyAdminSignup
  // swallows its own errors internally, so awaiting can only add ~300ms
  // to the very first hit — safe.
  await notifyAdminSignup({
    userId: created.userId,
    email: created.email,
    referredByCode: created.referredByCode,
  });

  // Second email — the 7-day trial pitch, scheduled to land ~5 min
  // after signup via Resend's scheduled_at. Only fires when we have
  // a real email to send to (Google OAuth signups always provide one;
  // email/password signups do too — but be defensive).
  if (created.email) {
    await scheduleTrialOfferEmail({
      toEmail: created.email,
      firstName: firstNameFromEmail(created.email),
    });
  }

  // Non-fatal: create the Referral row if the user came in with a valid code.
  // A missing/unknown code or a self-referral is silently skipped; a Postgres
  // unique-violation on refereeId means the row already exists (idempotent
  // recovery from a mid-flight retry). Any other error would risk blocking
  // signup, so we swallow-log and continue.
  if (input.referredByCode) {
    try {
      const referrer = await prisma.userProfile.findUnique({
        where: { referralCode: input.referredByCode },
        select: { userId: true },
      });
      if (referrer && referrer.userId !== input.userId) {
        await prisma.referral.create({
          data: {
            referrerId: referrer.userId,
            refereeId: input.userId,
            refCode: input.referredByCode,
          },
        });
      }
    } catch (err) {
      if (!isUniqueConstraintError(err)) {
        console.error("[REFERRAL] Failed to create referral row:", err);
      }
    }
  }

  return created;
}

// Best-effort first name pluck for email personalization. Falls back
// to "" so the greeting reads "Hey," rather than "Hey null,".
function firstNameFromEmail(email: string): string {
  const local = email.split("@")[0] || "";
  const cleaned = local
    .replace(/[._+\-0-9]+/g, " ")
    .trim()
    .split(/\s+/)[0]
    ?? "";
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as Prisma.PrismaClientKnownRequestError).code === "P2002"
  );
}

// Whether the user's current time falls inside an active 7-day pass.
export function hasUnlimitedActive(
  profile: { unlimitedUntil: Date | null } | null,
): boolean {
  return (
    !!profile?.unlimitedUntil && profile.unlimitedUntil.getTime() > Date.now()
  );
}
