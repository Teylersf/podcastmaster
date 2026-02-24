import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stackServerApp } from "@/stack";

const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024; // 5GB
const WARNING_THRESHOLD = 4.5 * 1024 * 1024 * 1024; // 4.5GB - warn when close

export async function GET() {
  try {
    const user = await stackServerApp.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription || subscription.status !== "active") {
      // Free user - no storage limit (files are temporary)
      return NextResponse.json({
        isSubscriber: false,
        canUpload: true,
        used: 0,
        limit: 0,
        remaining: 0,
        nearLimit: false,
        atLimit: false,
      });
    }

    // Get total storage used
    const files = await prisma.subscriberFile.findMany({
      where: { subscriptionId: subscription.id },
      select: { fileSize: true },
    });

    const used = files.reduce((sum, f) => sum + f.fileSize, 0);
    const remaining = Math.max(0, STORAGE_LIMIT - used);
    const nearLimit = used >= WARNING_THRESHOLD;
    const atLimit = used >= STORAGE_LIMIT;

    // Allow one more file if near limit but not at limit
    // Block completely if at or over limit
    const canUpload = !atLimit;

    return NextResponse.json({
      isSubscriber: true,
      canUpload,
      used,
      limit: STORAGE_LIMIT,
      remaining,
      nearLimit,
      atLimit,
      fileCount: files.length,
    });

  } catch (error) {
    console.error("Storage check error:", error);
    return NextResponse.json({ error: "Failed to check storage" }, { status: 500 });
  }
}

