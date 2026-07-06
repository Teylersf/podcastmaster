import prisma from "@/lib/prisma";
import { getOrCreateUserProfile, hasUnlimitedActive } from "@/lib/userProfile";

// The new pricing model: 1 free mastered audio per user per rolling 24-hour
// window. Beyond that, either an active 7-day unlimited pass (won by
// referring a paying friend) or an unused single-master entitlement ($2 via
// Stripe Checkout) is required. Subscribers to the legacy $/month plan bypass
// all of this — their subscription check happens upstream.
const DAILY_LIMIT = 1;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type QuotaDecision =
  | { allowed: true; reason: "under_quota"; usedToday: number; limit: number }
  | { allowed: true; reason: "unlimited_pass"; unlimitedUntil: Date }
  | { allowed: true; reason: "entitlement"; entitlementId: string }
  | {
      allowed: false;
      reason: "quota_exhausted";
      usedToday: number;
      limit: number;
      resetAt: Date;
    };

// Point-in-time decision for the paywall + client pre-check. Does not mutate
// state; call `consumeQuota` when the master actually starts to decrement.
export async function checkUserQuota(userId: string): Promise<QuotaDecision> {
  const profile = await getOrCreateUserProfile({ userId });

  // 1. Active 7-day pass (from a granted referral) — highest priority so a
  //    winning referrer never sees a paywall while their bonus is live.
  if (hasUnlimitedActive(profile)) {
    return {
      allowed: true,
      reason: "unlimited_pass",
      unlimitedUntil: profile.unlimitedUntil!,
    };
  }

  // 2. Count masters started in the last 24h. UsageLog rows are created by
  //    the rate-limit POST endpoint at master-start time.
  const since = new Date(Date.now() - ONE_DAY_MS);
  const usedToday = await prisma.usageLog.count({
    where: { userId, createdAt: { gte: since } },
  });

  if (usedToday < DAILY_LIMIT) {
    return { allowed: true, reason: "under_quota", usedToday, limit: DAILY_LIMIT };
  }

  // 3. Over free quota — does the user have an unused paid entitlement they
  //    can consume for this master?
  const entitlement = await prisma.masterEntitlement.findFirst({
    where: { userId, used: false },
    orderBy: { createdAt: "asc" }, // FIFO — oldest first
  });

  if (entitlement) {
    return {
      allowed: true,
      reason: "entitlement",
      entitlementId: entitlement.id,
    };
  }

  // Reset time: 24h after the oldest usage log in the current window.
  const oldest = await prisma.usageLog.findFirst({
    where: { userId, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  const resetAt = new Date(
    (oldest?.createdAt.getTime() ?? Date.now()) + ONE_DAY_MS,
  );

  return {
    allowed: false,
    reason: "quota_exhausted",
    usedToday,
    limit: DAILY_LIMIT,
    resetAt,
  };
}

// Marks a decision as spent. Called immediately after a master job starts.
// For `entitlement` decisions this also flips the entitlement row to `used`
// so the same $2 purchase can't be reused.
export async function consumeQuota(
  userId: string,
  jobId: string,
  decision: QuotaDecision,
): Promise<void> {
  if (!decision.allowed) return;

  // Always record a UsageLog row so daily-count math stays correct even for
  // unlimited/entitlement flows (used for stats + the referral first-master
  // gate). userId keys it; ipAddress stays null for signed-in users.
  await prisma.usageLog.create({
    data: { userId, jobId, ipAddress: null },
  });

  if (decision.reason === "entitlement") {
    await prisma.masterEntitlement.update({
      where: { id: decision.entitlementId },
      data: {
        used: true,
        usedForJobId: jobId,
        usedAt: new Date(),
      },
    });
  }

  // Stamp firstMasterAt the first time we see the user complete a start.
  // Used by the referral-bonus fraud gate: a referrer's code doesn't
  // activate until they've mastered at least once themselves.
  await prisma.userProfile.updateMany({
    where: { userId, firstMasterAt: null },
    data: { firstMasterAt: new Date() },
  });
}

// Whether this decision was made against a paid entitlement — used by the
// referral system to flag the "first paid master" milestone.
export function isPaidDecision(decision: QuotaDecision): boolean {
  return decision.allowed && decision.reason === "entitlement";
}
