import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

/**
 * API endpoint for Modal backend to get a Vercel Blob upload URL.
 * This allows Modal to upload mastered files directly to Vercel Blob,
 * bypassing the webhook file transfer for better performance with large files.
 * 
 * Authentication: Bearer token using WEBHOOK_SECRET (same as webhook)
 */

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: ["error"],
  });
}

export async function POST(request: Request) {
  let prisma: PrismaClient | null = null;

  try {
    // Verify authentication (same as webhook)
    const authHeader = request.headers.get("authorization");
    const providedToken = authHeader?.replace("Bearer ", "");

    if (!WEBHOOK_SECRET || providedToken !== WEBHOOK_SECRET) {
      console.error("[BLOB-URL] Authentication failed");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { jobId, fileName, fileSize } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing required field: jobId" },
        { status: 400 }
      );
    }

    console.log(`[BLOB-URL] Request for job ${jobId}, file: ${fileName}, size: ${fileSize}`);

    // Check if this is a premium user job that should be saved to Blob
    prisma = createPrismaClient();

    const premiumJob = await prisma.premiumUserJob.findUnique({
      where: { jobId },
    });

    if (!premiumJob) {
      console.log(`[BLOB-URL] Job ${jobId} is not a premium job, skipping blob upload`);
      return NextResponse.json({
        shouldUpload: false,
        reason: "Not a premium user job",
      });
    }

    // Check subscription is still active
    const subscription = await prisma.subscription.findUnique({
      where: { userId: premiumJob.userId },
    });

    if (!subscription || subscription.status !== "active") {
      console.log(`[BLOB-URL] User ${premiumJob.userId} no longer has active subscription`);
      return NextResponse.json({
        shouldUpload: false,
        reason: "No active subscription",
      });
    }

    // Check storage limit (5GB)
    const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024;
    const existingFiles = await prisma.subscriberFile.findMany({
      where: { subscriptionId: subscription.id },
      select: { fileSize: true },
    });
    const usedStorage = existingFiles.reduce((sum, f) => sum + f.fileSize, 0);

    if (fileSize && usedStorage + fileSize > STORAGE_LIMIT) {
      console.log(`[BLOB-URL] User ${premiumJob.userId} would exceed storage limit`);
      return NextResponse.json({
        shouldUpload: false,
        reason: "Storage limit exceeded",
      });
    }

    // Generate output filename and blob path
    const outputFileName = premiumJob.fileName.replace(/\.[^/.]+$/, "_mastered.wav");
    const blobPathname = `subscribers/${subscription.id}/${Date.now()}_${outputFileName}`;

    // Return the Blob token and path info for direct upload
    // Modal will use these to upload directly to Vercel Blob
    console.log(`[BLOB-URL] Providing upload credentials for path: ${blobPathname}`);

    return NextResponse.json({
      shouldUpload: true,
      blobToken: BLOB_READ_WRITE_TOKEN,
      blobPathname,
      outputFileName,
      subscriptionId: subscription.id,
      userId: premiumJob.userId,
    });

  } catch (error) {
    console.error("[BLOB-URL] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  } finally {
    if (prisma) {
      await prisma.$disconnect().catch(() => {});
    }
  }
}



