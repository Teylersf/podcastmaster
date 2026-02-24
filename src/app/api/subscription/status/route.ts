import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stackServerApp } from "@/stack";

// Storage limit: 5GB in bytes
const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024;

export async function GET() {
  try {
    // Get the current user from Stack Auth
    const user = await stackServerApp.getUser();
    
    if (!user) {
      return NextResponse.json({
        isSubscribed: false,
        subscription: null,
        storage: null,
      });
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
      include: {
        files: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            blobUrl: true,
            fileType: true,
            createdAt: true,
          },
        },
      },
    });

    if (!subscription || subscription.status !== "active") {
      return NextResponse.json({
        isSubscribed: false,
        subscription: null,
        storage: null,
      });
    }

    // Calculate storage used
    const storageUsed = subscription.files.reduce((sum, file) => sum + file.fileSize, 0);

    return NextResponse.json({
      isSubscribed: true,
      subscription: {
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      storage: {
        used: storageUsed,
        limit: STORAGE_LIMIT,
        remaining: STORAGE_LIMIT - storageUsed,
        files: subscription.files.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          fileSize: f.fileSize,
          url: f.blobUrl,
          fileType: f.fileType,
          jobId: null,
          createdAt: f.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("[SERVER] Subscription status error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 }
    );
  }
}

