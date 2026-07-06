import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { stackServerApp } from "@/stack";
import {
  getOrCreateUserProfile,
  hasUnlimitedActive,
} from "@/lib/userProfile";

const REF_COOKIE = "pm_ref";

// GET /api/user/profile
//
// Returns (and lazily creates) the caller's UserProfile row. The client hits
// this once per session after Stack Auth reports a signed-in user; it's the
// point at which we:
//   - allocate the user's own referral code (first call only)
//   - stamp the signup IP hash (first call only, for the same-IP fraud gate)
//   - persist the referral code the user came in with, if any
//
// Subsequent calls are pure reads. The client uses the response to render the
// dashboard and to gate the free-tier upload flow.
export async function GET() {
  const user = await stackServerApp.getUser();
  if (!user) {
    return NextResponse.json({ signedIn: false }, { status: 200 });
  }

  const h = await headers();
  const c = await cookies();
  const refCookie = c.get(REF_COOKIE)?.value;

  // Rehydrate signup context — used only if this is the first call.
  const ipHeader = h.get("x-forwarded-for")?.split(",")[0]?.trim()
    || h.get("x-real-ip")
    || null;

  const profile = await getOrCreateUserProfile({
    userId: user.id,
    email: user.primaryEmail ?? null,
    ip: ipHeader,
    referredByCode: refCookie ?? null,
  });

  return NextResponse.json({
    signedIn: true,
    profile: {
      referralCode: profile.referralCode,
      referredByCode: profile.referredByCode,
      unlimitedUntil: profile.unlimitedUntil,
      unlimitedActive: hasUnlimitedActive(profile),
      firstMasterAt: profile.firstMasterAt,
      firstPaidMasterAt: profile.firstPaidMasterAt,
      createdAt: profile.createdAt,
    },
  });
}
