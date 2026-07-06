import prisma from "@/lib/prisma";

// Settles a pending Referral when the referee pays for their first master.
// Called from consumeQuota when the decision is `entitlement` (a $2 paid
// master). Runs the fraud gates in fixed order; if any fails, the referral
// row is marked with the appropriate void_* status and no bonus is granted.
// If all pass, the referrer's `unlimitedUntil` is extended by 7 days from
// max(now, current unlimitedUntil) so consecutive referrals stack.
//
// Silent by design: neither party is emailed. The user's FAQ explains why
// a bonus might not have landed.

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Common disposable-email domains. Not exhaustive — the list catches the
// obvious throwaway services, which is enough to raise the fraud cost
// meaningfully. Users determined to bypass can rotate to a mainstream
// provider anyway, and that's the point where the same-IP + fingerprint
// gates take over.
const DISPOSABLE_DOMAINS = new Set<string>([
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "tempmailo.com",
  "tempmail.io",
  "10minutemail.com",
  "10minutemail.net",
  "guerrillamail.com",
  "guerrillamail.info",
  "guerrillamail.biz",
  "guerrillamailblock.com",
  "mailinator.com",
  "mailinator.net",
  "yopmail.com",
  "yopmail.fr",
  "throwawaymail.com",
  "fakeinbox.com",
  "getnada.com",
  "getairmail.com",
  "mohmal.com",
  "maildrop.cc",
  "dispostable.com",
  "trashmail.com",
  "sharklasers.com",
  "spam4.me",
  "moakt.com",
  "mytemp.email",
  "emailondeck.com",
  "burnermail.io",
]);

function isDisposableEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase().trim();
  return DISPOSABLE_DOMAINS.has(domain);
}

// Two emails are considered obviously-same-user when the local parts collapse
// to the same "root" identity by Gmail/Fastmail rules: strip everything after
// a `+`, drop dots for gmail. This catches the classic self-referral fraud
// where teyler@gmail.com refers teyler+alt@gmail.com or teylers.f@gmail.com.
function canonicalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  let local = email.slice(0, at).toLowerCase();
  const domain = email.slice(at + 1).toLowerCase();
  const plus = local.indexOf("+");
  if (plus >= 0) local = local.slice(0, plus);
  // Gmail ignores dots in the local part; other providers don't, so scope
  // this to gmail/googlemail specifically.
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "");
  }
  return `${local}@${domain}`;
}

export type SettleOutcome =
  | { settled: false; reason: "no_pending_referral" }
  | { settled: true; result: "granted"; referralId: string }
  | {
      settled: true;
      result:
        | "void_same_ip"
        | "void_referrer_no_master"
        | "void_disposable_email"
        | "void_self";
      referralId: string;
    };

export async function settlePendingReferral(
  refereeUserId: string,
): Promise<SettleOutcome> {
  const referral = await prisma.referral.findUnique({
    where: { refereeId: refereeUserId },
  });
  if (!referral || referral.status !== "pending") {
    return { settled: false, reason: "no_pending_referral" };
  }

  const [referrer, referee] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: referral.referrerId } }),
    prisma.userProfile.findUnique({ where: { userId: refereeUserId } }),
  ]);

  // Missing profile on either side is treated the same as the void_self case
  // — something's wrong, don't grant. Very unlikely (referrer profile must
  // exist to have their code work; referee profile is what triggered this).
  if (!referrer || !referee) {
    await voidReferral(referral.id, "void_self", "profile missing");
    return { settled: true, result: "void_self", referralId: referral.id };
  }

  // Gate: canonicalized email match. Catches teyler → teyler+x on gmail.
  const refEmail = canonicalizeEmail(referrer.email);
  const usEmail = canonicalizeEmail(referee.email);
  if (refEmail && usEmail && refEmail === usEmail) {
    await voidReferral(
      referral.id,
      "void_self",
      "referrer and referee canonicalize to the same email",
    );
    return { settled: true, result: "void_self", referralId: referral.id };
  }

  // Gate: same IP hash at signup — the classic "sign up on same wifi" fraud.
  // Silently voided (matches the design in the FAQ).
  if (
    referrer.signupIpHash &&
    referee.signupIpHash &&
    referrer.signupIpHash === referee.signupIpHash
  ) {
    await voidReferral(
      referral.id,
      "void_same_ip",
      "matching signup IP hashes",
    );
    return { settled: true, result: "void_same_ip", referralId: referral.id };
  }

  // Gate: referrer must have completed at least one master themselves. Kills
  // the "sign up 50 accounts, refer myself" pattern — each of those bots
  // would have to also complete a master, which is real work.
  if (!referrer.firstMasterAt) {
    await voidReferral(
      referral.id,
      "void_referrer_no_master",
      "referrer has never completed a master",
    );
    return {
      settled: true,
      result: "void_referrer_no_master",
      referralId: referral.id,
    };
  }

  // Gate: disposable-email heuristic on the referee. Anyone signing up
  // through a mailinator-style domain to claim a referral bonus is almost
  // certainly the referrer.
  if (isDisposableEmail(referee.email)) {
    await voidReferral(
      referral.id,
      "void_disposable_email",
      "referee email is on the disposable list",
    );
    return {
      settled: true,
      result: "void_disposable_email",
      referralId: referral.id,
    };
  }

  // All gates cleared — grant the 7-day pass to the referrer. Stack on top
  // of any existing pass: refer 3 friends who each pay, get 21 days.
  const now = new Date();
  const base = referrer.unlimitedUntil && referrer.unlimitedUntil > now
    ? referrer.unlimitedUntil
    : now;
  const newUnlimitedUntil = new Date(base.getTime() + SEVEN_DAYS_MS);

  await prisma.$transaction([
    prisma.userProfile.update({
      where: { userId: referral.referrerId },
      data: { unlimitedUntil: newUnlimitedUntil },
    }),
    prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: "granted",
        reason: null,
        grantedAt: now,
      },
    }),
  ]);

  return { settled: true, result: "granted", referralId: referral.id };
}

async function voidReferral(
  referralId: string,
  status:
    | "void_same_ip"
    | "void_referrer_no_master"
    | "void_disposable_email"
    | "void_self",
  reason: string,
): Promise<void> {
  await prisma.referral.update({
    where: { id: referralId },
    data: { status, reason },
  });
}
