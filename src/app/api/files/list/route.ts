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
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get subscription with files
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
      include: {
        files: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!subscription || subscription.status !== "active") {
      return NextResponse.json({
        files: [],
        storage: { used: 0, limit: STORAGE_LIMIT, remaining: STORAGE_LIMIT },
      });
    }

    const storageUsed = subscription.files.reduce((sum, f) => sum + f.fileSize, 0);

    return NextResponse.json({
      files: subscription.files.map((f) => ({
        id: f.id,
        fileName: f.fileName,
        fileSize: f.fileSize,
        url: f.blobUrl,
        fileType: f.fileType,
        jobId: f.jobId,
        createdAt: f.createdAt.toISOString(),
      })),
      storage: {
        used: storageUsed,
        limit: STORAGE_LIMIT,
        remaining: STORAGE_LIMIT - storageUsed,
      },
    });
  } catch (error) {
    console.error("[SERVER] File list error:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}

