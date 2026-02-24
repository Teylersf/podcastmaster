import { NextResponse } from "next/server";
import React from "react";
import { render } from "@react-email/render";
import prisma from "@/lib/prisma";
import { resend, FROM_EMAIL, SUPPORT_EMAIL } from "@/lib/resend";
import MasteringCompleteEmail from "@/emails/MasteringComplete";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const { jobId, downloadUrl } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing required field: jobId" },
        { status: 400 }
      );
    }

    // Find the notification subscription for this job
    const notification = await prisma.jobNotification.findUnique({
      where: { jobId },
    });

    if (!notification) {
      return NextResponse.json({ 
        success: false, 
        message: "No notification subscription found for this job" 
      });
    }

    // Check if email was already sent
    if (notification.status === "sent") {
      return NextResponse.json({ 
        success: true, 
        message: "Email already sent for this job" 
      });
    }

    // Construct download URL if not provided
    const finalDownloadUrl = downloadUrl || `${API_URL}/download/${jobId}`;

    // Render the email HTML
    const emailHtml = await render(
      <MasteringCompleteEmail downloadUrl={finalDownloadUrl} />
    );

    // Send email to user
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [notification.email],
      cc: [SUPPORT_EMAIL], // Always send a copy to support
      subject: "🎧 Your Mastered Podcast is Ready!",
      html: emailHtml,
    });

    if (error) {
      console.error("Resend error:", error);
      
      // Log the failed attempt
      await prisma.emailLog.create({
        data: {
          to: notification.email,
          subject: "Your Mastered Podcast is Ready!",
          type: "completion",
          status: "failed",
        },
      });

      return NextResponse.json(
        { error: "Failed to send email", details: error },
        { status: 500 }
      );
    }

    // Update notification status
    await prisma.jobNotification.update({
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
        subject: "Your Mastered Podcast is Ready!",
        type: "completion",
        resendId: data?.id,
        status: "sent",
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Email sent successfully",
      emailId: data?.id,
    });

  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}

// This endpoint can be called to check for completed jobs and send emails
export async function GET() {
  try {
    // Find all pending notifications
    const pendingNotifications = await prisma.jobNotification.findMany({
      where: { status: "pending" },
    });

    const results = [];

    for (const notification of pendingNotifications) {
      try {
        // Check job status from the backend
        const statusResponse = await fetch(`${API_URL}/status/${notification.jobId}`);
        
        if (!statusResponse.ok) continue;

        const status = await statusResponse.json();

        if (status.status === "completed") {
          // Job is complete, send the email
          const downloadUrl = `${API_URL}/download/${notification.jobId}`;
          
          const emailHtml = await render(
            <MasteringCompleteEmail downloadUrl={downloadUrl} />
          );

          const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [notification.email],
            cc: [SUPPORT_EMAIL],
            subject: "🎧 Your Mastered Podcast is Ready!",
            html: emailHtml,
          });

          if (!error) {
            await prisma.jobNotification.update({
              where: { id: notification.id },
              data: {
                status: "sent",
                downloadUrl,
                emailSentAt: new Date(),
              },
            });

            await prisma.emailLog.create({
              data: {
                to: notification.email,
                subject: "Your Mastered Podcast is Ready!",
                type: "completion",
                resendId: data?.id,
                status: "sent",
              },
            });

            results.push({ jobId: notification.jobId, status: "sent" });
          } else {
            results.push({ jobId: notification.jobId, status: "failed", error });
          }
        } else if (status.status === "failed") {
          // Mark as failed
          await prisma.jobNotification.update({
            where: { id: notification.id },
            data: { status: "failed" },
          });
          results.push({ jobId: notification.jobId, status: "job_failed" });
        }
      } catch (err) {
        console.error(`Error processing job ${notification.jobId}:`, err);
        results.push({ jobId: notification.jobId, status: "error" });
      }
    }

    return NextResponse.json({ 
      processed: results.length,
      results 
    });

  } catch (error) {
    console.error("Error processing pending notifications:", error);
    return NextResponse.json(
      { error: "Failed to process pending notifications" },
      { status: 500 }
    );
  }
}

