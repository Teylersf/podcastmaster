import { NextResponse } from "next/server";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { stackServerApp } from "@/stack";
import { checkUserQuota, consumeQuota } from "@/lib/quota";
import { hashIp, getClientIp } from "@/lib/userProfile";

// Guest-user throttle. The download gate (Phase 2) already blocks the file
// itself, so this is just a soft rate-limit on Modal compute, not a
// monetization gate. Signed-in flow is authoritative and goes through
// `checkUserQuota` for the real 1/day + $2 paywall + unlimited-pass logic.
const GUEST_DAILY_LIMIT = 1;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// GET — pre-flight check. Called from the client before hitting Modal's
// /master endpoint. Response shape lets the client decide between "just
// master it", "show paywall", or "show over-limit toast for guests".
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userIdParam = searchParams.get("userId");
  const user = await stackServerApp.getUser();
  const userId = user?.id ?? userIdParam ?? null;

  // Signed-in path: real quota including paywall + pass.
  if (userId) {
    const decision = await checkUserQuota(userId);
    if (decision.allowed) {
      return NextResponse.json({
        allowed: true,
        signedIn: true,
        reason: decision.reason,
        limit: 1,
        used:
          decision.reason === "under_quota"
            ? decision.usedToday
            : undefined,
        unlimitedUntil:
          decision.reason === "unlimited_pass"
            ? decision.unlimitedUntil
            : undefined,
      });
    }
    // Quota exhausted, no entitlement → tell the client to show the paywall.
    return NextResponse.json({
      allowed: false,
      signedIn: true,
      reason: "quota_exhausted",
      needsPayment: true,
      limit: decision.limit,
      used: decision.usedToday,
      resetAt: decision.resetAt,
    });
  }

  // Guest path: simple IP-count throttle.
  const h = await headers();
  const hashedIp = hashIp(getClientIp(h));
  const since = new Date(Date.now() - ONE_DAY_MS);
  const usedToday = await prisma.usageLog.count({
    where: { ipAddress: hashedIp, userId: null, createdAt: { gte: since } },
  });
  const allowed = usedToday < GUEST_DAILY_LIMIT;
  return NextResponse.json({
    allowed,
    signedIn: false,
    reason: allowed ? "under_quota" : "quota_exhausted",
    limit: GUEST_DAILY_LIMIT,
    used: usedToday,
  });
}

// POST — record that a mastering job started. Called right after the client
// receives a job_id back from Modal. For signed-in users this consumes any
// entitlement being spent and stamps `firstMasterAt` on the profile.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      jobId?: string;
      userId?: string | null;
    };
    if (!body.jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const user = await stackServerApp.getUser();
    const userId = user?.id ?? body.userId ?? null;

    if (userId) {
      // Re-check at record time in case the client bypassed the pre-check.
      const decision = await checkUserQuota(userId);
      if (!decision.allowed) {
        return NextResponse.json(
          {
            allowed: false,
            recorded: false,
            reason: "quota_exhausted",
            needsPayment: true,
          },
          { status: 402 },
        );
      }
      await consumeQuota(userId, body.jobId, decision);
      return NextResponse.json({
        allowed: true,
        recorded: true,
        reason: decision.reason,
      });
    }

    // Guest recording — same as before, IP-hashed.
    const h = await headers();
    const hashedIp = hashIp(getClientIp(h));
    const since = new Date(Date.now() - ONE_DAY_MS);
    const usedToday = await prisma.usageLog.count({
      where: { ipAddress: hashedIp, userId: null, createdAt: { gte: since } },
    });
    if (usedToday >= GUEST_DAILY_LIMIT) {
      return NextResponse.json({
        allowed: false,
        recorded: false,
        reason: "quota_exhausted",
      });
    }
    await prisma.usageLog.create({
      data: { userId: null, ipAddress: hashedIp, jobId: body.jobId },
    });
    return NextResponse.json({ allowed: true, recorded: true });
  } catch (err) {
    console.error("[RATE-LIMIT] Record error:", err);
    return NextResponse.json(
      { error: "Failed to record usage" },
      { status: 500 },
    );
  }
}
