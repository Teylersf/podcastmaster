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

    // Get user's free files that haven't expired
    const files = await prisma.freeUserFile.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error fetching free user files:", error);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}

// POST - Create a new free user file record when mastering starts
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

    // Create expiration date (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const file = await prisma.freeUserFile.create({
      data: {
        userId: user.id,
        jobId,
        fileName,
        fileSize: fileSize || 0,
        expiresAt,
      },
    });

    return NextResponse.json({ file });
  } catch (error) {
    console.error("Error creating free user file:", error);
    return NextResponse.json({ error: "Failed to create file record" }, { status: 500 });
  }
}

