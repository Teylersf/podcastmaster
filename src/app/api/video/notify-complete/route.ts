import { NextResponse } from "next/server";
import { render } from "@react-email/render";
import React from "react";
import prisma from "@/lib/prisma";
import { resend, FROM_EMAIL, SUPPORT_EMAIL } from "@/lib/resend";
import VideoCompleteEmail from "@/emails/VideoComplete";

export async function POST(request: Request) {
  try {
    const { jobId, downloadUrl, videoTitle } = await request.json();

    if (!jobId || !downloadUrl) {
      return NextResponse.json(
        { error: "Missing required fields: jobId and downloadUrl are required" },
        { status: 400 }
      );
    }

    // Find the notification subscription for this job
    const notification = await prisma.videoJobNotification.findUnique({
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

    // Render the email HTML
    const emailHtml = await render(
      React.createElement(VideoCompleteEmail, {
        downloadUrl,
        videoTitle: videoTitle || notification.videoTitle || "Your Video",
      })
    );

    // Send email to user
    console.log(`[VIDEO NOTIFY] Sending email to ${notification.email}`);
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [notification.email],
      cc: [SUPPORT_EMAIL],
      subject: "🎬 Your Video is Ready for Download!",
      html: emailHtml,
    });

    if (error) {
      console.error("[VIDEO NOTIFY] Resend error:", error);
      
      // Log the failed attempt
      await prisma.emailLog.create({
        data: {
          to: notification.email,
          subject: "Your Video is Ready for Download!",
          type: "video_completion",
          status: "failed",
        },
      });

      return NextResponse.json(
        { error: "Failed to send email", details: error },
        { status: 500 }
      );
    }

    console.log(`[VIDEO NOTIFY] Email sent successfully, id: ${data?.id}`);

    // Update notification status
    await prisma.videoJobNotification.update({
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
        subject: "Your Video is Ready for Download!",
        type: "video_completion",
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
    console.error("[VIDEO NOTIFY] Error:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
