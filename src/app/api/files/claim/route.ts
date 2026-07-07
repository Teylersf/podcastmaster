import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import prisma from "@/lib/prisma";

// POST /api/files/claim
//
// Called by <PostSignInClaimer> when a freshly signed-in user lands
// back on the site with ?claim=<jobId>. Binds the anon mastering job
// they just kicked off to their brand-new account so the file shows
// up in /dashboard/files and is served by /api/mastering/download.
//
// Idempotent by design: jobId is UNIQUE on FreeUserFile, so a repeat
// call by the same user is a no-op. A different user trying to claim
// the same jobId gets 403 — the first signed-in caller wins.
export async function POST(request: Request) {
  const user = await stackServerApp.getUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  let body: { jobId?: unknown; fileName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const jobId = typeof body.jobId === "string" ? body.jobId : "";
  const fileNameInput =
    typeof body.fileName === "string" ? body.fileName : "";

  if (!jobId || !/^[a-zA-Z0-9_-]{6,64}$/.test(jobId)) {
    return NextResponse.json({ error: "invalid_jobId" }, { status: 400 });
  }

  const fileName = (fileNameInput || "Mastered file").slice(0, 255);
  // Free-user files currently expire in 24h. Phase 3 flips this to a
  // permanent 1-slot storage model — the expiry will be pushed out and
  // a "rotate on new master" cleanup added.
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const existing = await prisma.freeUserFile.findUnique({
    where: { jobId },
  });

  if (existing) {
    if (existing.userId === user.id) {
      return NextResponse.json({ claimed: true, alreadyClaimed: true });
    }
    return NextResponse.json({ error: "already_owned" }, { status: 403 });
  }

  try {
    await prisma.freeUserFile.create({
      data: {
        userId: user.id,
        jobId,
        fileName,
        fileSize: 0,
        status: "completed",
        expiresAt,
      },
    });
  } catch (err) {
    // If the row appeared between our findUnique and create (another
    // tab firing the same claim), the unique on jobId will trip. Treat
    // that as a successful claim iff the winner is the same user.
    const now = await prisma.freeUserFile.findUnique({ where: { jobId } });
    if (now && now.userId === user.id) {
      return NextResponse.json({ claimed: true, alreadyClaimed: true });
    }
    console.error("[FILE-CLAIM] Unexpected error:", err);
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }

  return NextResponse.json({ claimed: true, alreadyClaimed: false });
}
