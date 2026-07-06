import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import prisma from "@/lib/prisma";

// GET /api/user/referral-stats
//
// Aggregate view for the dashboard's Referrals section. Returns counts of
// granted / pending / voided referrals owned by the caller, plus a breakdown
// of void reasons so the "Why didn't my bonus land?" FAQ can render with
// real numbers ("2 didn't land — same signup IP") instead of generic copy.
//
// Voids are silent everywhere else in the flow (users are never emailed); the
// dashboard is the one place a curious user can see them and get an answer.
export async function GET() {
  const user = await stackServerApp.getUser();
  if (!user) {
    return NextResponse.json({ signedIn: false }, { status: 200 });
  }

  const referrals = await prisma.referral.findMany({
    where: { referrerId: user.id },
    select: { status: true, createdAt: true, grantedAt: true },
  });

  const grantedCount = referrals.filter((r) => r.status === "granted").length;
  const pendingCount = referrals.filter((r) => r.status === "pending").length;

  const voidReasons: Record<string, number> = {};
  for (const r of referrals) {
    if (r.status.startsWith("void_")) {
      voidReasons[r.status] = (voidReasons[r.status] ?? 0) + 1;
    }
  }
  const voidedCount = Object.values(voidReasons).reduce((s, n) => s + n, 0);

  return NextResponse.json({
    signedIn: true,
    grantedCount,
    pendingCount,
    voidedCount,
    voidReasons,
    totalCount: referrals.length,
  });
}
