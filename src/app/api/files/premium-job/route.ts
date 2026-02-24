import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import prisma from "@/lib/prisma";

// POST - Track a new mastering job for a premium user
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

    // Create job tracking record
    const job = await prisma.premiumUserJob.create({
      data: {
        userId: user.id,
        jobId,
        fileName,
        fileSize: fileSize || 0,
      },
    });

    console.log(`[PREMIUM-JOB] Created job tracking for user ${user.id}, job ${jobId}`);

    return NextResponse.json({ job });
  } catch (error) {
    console.error("Error creating premium user job:", error);
    return NextResponse.json({ error: "Failed to create job record" }, { status: 500 });
  }
}

