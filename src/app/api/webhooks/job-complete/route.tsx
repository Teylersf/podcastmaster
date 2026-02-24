import { NextResponse } from "next/server";
import React from "react";
import { render } from "@react-email/render";
import { PrismaClient } from "@prisma/client";
import { resend, FROM_EMAIL, SUPPORT_EMAIL } from "@/lib/resend";
import MasteringCompleteEmail from "@/emails/MasteringComplete";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://teylersf--podcast-mastering-fastapi-app.modal.run";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * Create a fresh Prisma client for webhook operations.
 * We use the direct (unpooled) connection URL if available for better reliability.
 */
function createPrismaClient() {
  // Use unpooled connection for webhooks to avoid PgBouncer timeouts
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

interface BlobData {
  blobUrl: string;
  blobPathname: string;
  subscriptionId: string;
  outputFileName: string;
  fileSize: number;
}

/**
 * Save blob data to database for premium users.
 * This is called when Modal has already uploaded directly to Vercel Blob.
 * No file transfer needed - just database updates!
 */
async function saveBlobDataForPremiumUser(jobId: string, blobData: BlobData) {
  const prisma = createPrismaClient();
  
  try {
    console.log(`[WEBHOOK] Saving blob data for job ${jobId}: ${blobData.blobUrl}`);

    // Save to SubscriberFile table
    await prisma.subscriberFile.create({
      data: {
        subscriptionId: blobData.subscriptionId,
        fileName: blobData.outputFileName,
        fileSize: blobData.fileSize,
        blobUrl: blobData.blobUrl,
        blobPathname: blobData.blobPathname,
        fileType: "output",
        jobId,
      },
    });

    // Mark premium job as completed
    await prisma.premiumUserJob.update({
      where: { jobId },
      data: { status: "completed" },
    });

    console.log(`[WEBHOOK] Successfully saved blob data for job ${jobId}`);
    return blobData.blobUrl;

  } catch (error) {
    console.error(`[WEBHOOK] Error saving blob data:`, error);
    // Mark job as failed
    try {
      await prisma.premiumUserJob.update({
        where: { jobId },
        data: { status: "failed" },
      });
    } catch (dbError) {
      console.error(`[WEBHOOK] Failed to update job status:`, dbError);
    }
    return null;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

/**
 * Mark premium job as completed (when blob upload was skipped or failed)
 */
async function markPremiumJobCompleted(jobId: string) {
  const prisma = createPrismaClient();
  
  try {
    const premiumJob = await prisma.premiumUserJob.findUnique({
      where: { jobId },
    });

    if (premiumJob) {
      await prisma.premiumUserJob.update({
        where: { jobId },
        data: { status: "completed" },
      });
      console.log(`[WEBHOOK] Marked premium job ${jobId} as completed`);
    }
  } catch (error) {
    console.error(`[WEBHOOK] Error marking premium job completed:`, error);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

/**
 * Webhook endpoint called by the Python backend when a mastering job completes.
 * This allows users to close the browser window and still get email notifications.
 * 
 * NEW FLOW (for large files):
 * - Modal uploads directly to Vercel Blob and sends blobData in the payload
 * - Webhook only does database updates and email notifications (no file transfer!)
 * 
 * Authentication: Bearer token using WEBHOOK_SECRET
 */
export async function POST(request: Request) {
  let prisma: PrismaClient | null = null;
  
  try {
    // Verify webhook authentication
    const authHeader = request.headers.get("authorization");
    const providedToken = authHeader?.replace("Bearer ", "");

    if (!WEBHOOK_SECRET || providedToken !== WEBHOOK_SECRET) {
      console.error("Webhook authentication failed");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse the request body
    const { jobId, status, blobData } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing required field: jobId" },
        { status: 400 }
      );
    }

    console.log(`[WEBHOOK] Job ${jobId} completed with status: ${status}, blobData: ${blobData ? 'yes' : 'no'}`);

    // Construct download URL (R2)
    const downloadUrl = `${API_URL}/download/${jobId}`;

    // Handle premium users - save blob data to database
    // Modal has already uploaded the file directly to Vercel Blob!
    if (status === "completed") {
      if (blobData) {
        // Modal uploaded directly - just save the database record
        await saveBlobDataForPremiumUser(jobId, blobData);
      } else {
        // Blob upload was skipped (not premium, storage full, etc.)
        // Just mark the job as completed if it's a premium job
        await markPremiumJobCompleted(jobId);
      }
    }

    // Create fresh connection for remaining operations
    prisma = createPrismaClient();

    // Update FreeUserFile record if exists (for signed-in free users' dashboard)
    // Using updateMany() to avoid errors when record doesn't exist (anonymous users, premium users)
    const freeUserUpdate = await prisma.freeUserFile.updateMany({
      where: { jobId },
      data: {
        downloadUrl,
        status: status === "completed" ? "completed" : "failed",
      },
    });
    
    if (freeUserUpdate.count > 0) {
      console.log(`[WEBHOOK] Updated FreeUserFile record for job ${jobId}`);
    }

    // Find the notification subscription for this job
    const notification = await prisma.jobNotification.findUnique({
      where: { jobId },
    });

    if (!notification) {
      // No one subscribed to notifications for this job - that's okay
      return NextResponse.json({ 
        success: true, 
        message: "No notification subscription found for this job",
        emailSent: false,
      });
    }

    // Only send email if job completed successfully
    if (status !== "completed") {
      if (status === "failed") {
        await prisma.jobNotification.update({
          where: { jobId },
          data: { status: "failed" },
        });
      }
      return NextResponse.json({ 
        success: true, 
        message: `Job status is ${status}, no email sent`,
        emailSent: false,
      });
    }

    // Check if email was already sent
    if (notification.status === "sent") {
      return NextResponse.json({ 
        success: true, 
        message: "Email already sent for this job",
        emailSent: false,
      });
    }

    // Render the email HTML
    const emailHtml = await render(
      <MasteringCompleteEmail downloadUrl={downloadUrl} />
    );

    // Send email to user
    console.log(`[WEBHOOK] Sending email to ${notification.email}`);
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [notification.email],
      cc: [SUPPORT_EMAIL],
      subject: "🎧 Your Mastered Podcast is Ready!",
      html: emailHtml,
    });

    if (error) {
      console.error("[WEBHOOK] Resend error:", error);
      
      try {
        await prisma.emailLog.create({
          data: {
            to: notification.email,
            subject: "Your Mastered Podcast is Ready!",
            type: "completion",
            status: "failed",
          },
        });
      } catch (dbError) {
        console.error("[WEBHOOK] Failed to log email error:", dbError);
      }

      return NextResponse.json(
        { error: "Failed to send email", details: error },
        { status: 500 }
      );
    }

    console.log(`[WEBHOOK] Email sent successfully, id: ${data?.id}`);

    // Update notification status
    await prisma.jobNotification.update({
      where: { jobId },
      data: {
        status: "sent",
        downloadUrl,
        emailSentAt: new Date(),
      },
    });

    // Log the successful email
    await prisma.emailLog.create({
      data: {
        to: notification.email,
        subject: "Your Mastered Podcast is Ready!",
        type: "completion",
        resendId: data?.id,
        status: "sent",
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Email sent successfully",
      emailSent: true,
      emailId: data?.id,
    });

  } catch (error) {
    console.error("[WEBHOOK] Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  } finally {
    // Always disconnect Prisma client
    if (prisma) {
      await prisma.$disconnect().catch((e) => {
        console.error("[WEBHOOK] Error disconnecting prisma:", e);
      });
    }
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    endpoint: "job-complete webhook" 
  });
}
