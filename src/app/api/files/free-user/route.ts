import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import prisma from "@/lib/prisma";

// GET - Fetch free user's files
export async function GET() {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Include the permanent slot (expiresAt IS NULL) alongside any legacy
    // rows that still have a future expiry date.
    const files = await prisma.freeUserFile.findMany({
      where: {
        userId: user.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error fetching free user files:", error);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}

// POST - Create a new FreeUserFile row when a signed-in free user starts
// mastering. Every free account has a single permanent slot — this
// endpoint rotates it: any pre-existing row for the caller is deleted
// before the new one is inserted, so the dashboard only ever shows the
// most recent master. expiresAt is set to NULL to mark the row as
// permanent (the row lives forever; the underlying Modal-hosted file
// still expires after 24h until the Modal-side change lands to persist
// the audio to Vercel Blob).
export async function POST(request: Request) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, fileName, fileSize } = await request.json();

    if (!jobId || !fileName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Rotate the slot: delete any older rows this user has that are not
    // the one we're about to create. Uses deleteMany so a mid-flight
    // second call is idempotent (nothing to delete → no error).
    await prisma.freeUserFile.deleteMany({
      where: {
        userId: user.id,
        jobId: { not: jobId },
      },
    });

    const file = await prisma.freeUserFile.create({
      data: {
        userId: user.id,
        jobId,
        fileName,
        fileSize: fileSize || 0,
        expiresAt: null,
      },
    });

    return NextResponse.json({ file });
  } catch (error) {
    console.error("Error creating free user file:", error);
    return NextResponse.json({ error: "Failed to create file record" }, { status: 500 });
  }
}

