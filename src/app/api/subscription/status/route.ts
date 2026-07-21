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

    // Trialing subs unlock the same product as active subs — the card
    // is on file, the user is inside the paying funnel. The webhook
    // clears `status` back to "canceled" or "incomplete_expired" if
    // the trial ends without a valid payment method, so this is safe
    // to trust.
    const isTrialing =
      subscription?.status === "trialing" &&
      subscription.trialEndsAt !== null &&
      subscription.trialEndsAt.getTime() > Date.now();
    const isActive = subscription?.status === "active";

    if (!subscription || (!isActive && !isTrialing)) {
      return NextResponse.json({
        isSubscribed: false,
        isTrialing: false,
        trialEndsAt: null,
        hasUsedTrial: subscription?.trialEndsAt !== null && subscription?.trialEndsAt !== undefined,
        subscription: null,
        storage: null,
      });
    }

    const storageUsed = subscription.files.reduce((sum, file) => sum + file.fileSize, 0);

    return NextResponse.json({
      isSubscribed: true,
      isTrialing,
      trialEndsAt: subscription.trialEndsAt,
      hasUsedTrial: subscription.trialEndsAt !== null,
      subscription: {
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        trialEndsAt: subscription.trialEndsAt,
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

