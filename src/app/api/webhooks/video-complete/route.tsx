import { NextResponse } from "next/server";
import React from "react";
import { render } from "@react-email/render";
import { PrismaClient } from "@prisma/client";
import { resend, FROM_EMAIL, SUPPORT_EMAIL } from "@/lib/resend";
import VideoCompleteEmail from "@/emails/VideoComplete";

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

/**
 * Webhook endpoint called by the Python backend when a video render job completes.
 * This allows users to close the browser window and still get email notifications.
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
      console.error("[VIDEO WEBHOOK] Authentication failed");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse the request body
    const { jobId, status, downloadUrl, videoTitle } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing required field: jobId" },
        { status: 400 }
      );
    }

    console.log(`[VIDEO WEBHOOK] Job ${jobId} completed with status: ${status}`);

    // Create fresh connection
    prisma = createPrismaClient();

    // Find the notification subscription for this job
    const notification = await prisma.videoJobNotification.findUnique({
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
        await prisma.videoJobNotification.update({
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

    // Use provided download URL or construct from notification
    const finalDownloadUrl = downloadUrl || notification.downloadUrl;
    
    if (!finalDownloadUrl) {
      return NextResponse.json({
        error: "No download URL available",
      }, { status: 400 });
    }

    // Render the email HTML
    const emailHtml = await render(
      <VideoCompleteEmail 
        downloadUrl={finalDownloadUrl} 
        videoTitle={videoTitle || notification.videoTitle || "Your Video"}
      />
    );

    // Send email to user
    console.log(`[VIDEO WEBHOOK] Sending email to ${notification.email}`);
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [notification.email],
      cc: [SUPPORT_EMAIL],
      subject: "🎬 Your Video is Ready for Download!",
      html: emailHtml,
    });

    if (error) {
      console.error("[VIDEO WEBHOOK] Resend error:", error);
      
      try {
        await prisma.emailLog.create({
          data: {
            to: notification.email,
            subject: "Your Video is Ready for Download!",
            type: "video_completion",
            status: "failed",
          },
        });
      } catch (dbError) {
        console.error("[VIDEO WEBHOOK] Failed to log email error:", dbError);
      }

      return NextResponse.json(
        { error: "Failed to send email", details: error },
        { status: 500 }
      );
    }

    console.log(`[VIDEO WEBHOOK] Email sent successfully, id: ${data?.id}`);

    // Update notification status
    await prisma.videoJobNotification.update({
      where: { jobId },
      data: {
        status: "sent",
        downloadUrl: finalDownloadUrl,
        emailSentAt: new Date(),
      },
    });

    // Log the successful email
    await prisma.emailLog.create({
      data: {
        to: notification.email,
        subject: "Your Video is Ready for Download!",
        type: "video_completion",
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
    console.error("[VIDEO WEBHOOK] Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  } finally {
    // Always disconnect Prisma client
    if (prisma) {
      await prisma.$disconnect().catch((e) => {
        console.error("[VIDEO WEBHOOK] Error disconnecting prisma:", e);
      });
    }
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    endpoint: "video-complete webhook" 
  });
}
