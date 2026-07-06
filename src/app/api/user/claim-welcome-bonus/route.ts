import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import prisma from "@/lib/prisma";
import { getOrCreateUserProfile } from "@/lib/userProfile";

// POST /api/user/claim-welcome-bonus
//
// One-time welcome bonus: grants the caller 24 hours of unlimited mastering.
// Fired by the client (via <WelcomeBonusClaimer />) when a signed-in user
// lands on any page with ?bonus=welcome24 in the URL, which happens right
// after the "Sign up with Google — 24h free" CTA on the home page returns
// the user from the auth flow.
//
// Guarded by `welcomeBonusClaimedAt`: idempotent — a second POST returns the
// existing claim without extending the window. Existing accounts that
// haven't claimed yet can still claim (the CTA framing is "sign up", but the
// mechanic is "any account without a prior claim"). That's deliberate: it's
// a one-time gift per person, so it's fine if an existing user encounters
// the flow once and gets rewarded — they can only ever get it once.
export async function POST() {
  const user = await stackServerApp.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  // Lazy-create the profile so this works on a fresh Google signup where the
  // profile hydrator hasn't fired yet.
  const profile = await getOrCreateUserProfile({
    userId: user.id,
    email: user.primaryEmail ?? null,
  });

  if (profile.welcomeBonusClaimedAt) {
    return NextResponse.json({
      claimed: false,
      alreadyClaimed: true,
      unlimitedUntil: profile.unlimitedUntil,
      claimedAt: profile.welcomeBonusClaimedAt,
    });
  }

  const now = new Date();
  const base =
    profile.unlimitedUntil && profile.unlimitedUntil > now
      ? profile.unlimitedUntil
      : now;
  const newUnlimitedUntil = new Date(base.getTime() + 24 * 60 * 60 * 1000);

  const updated = await prisma.userProfile.update({
    where: { userId: user.id },
    data: {
      unlimitedUntil: newUnlimitedUntil,
      welcomeBonusClaimedAt: now,
    },
    select: {
      unlimitedUntil: true,
      welcomeBonusClaimedAt: true,
    },
  });

  return NextResponse.json({
    claimed: true,
    unlimitedUntil: updated.unlimitedUntil,
    claimedAt: updated.welcomeBonusClaimedAt,
  });
}
