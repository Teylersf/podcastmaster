import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { jobId, email, videoTitle } = await request.json();

    if (!jobId || !email) {
      return NextResponse.json(
        { error: "Missing required fields: jobId and email are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Upsert the notification subscription
    const notification = await prisma.videoJobNotification.upsert({
      where: { jobId },
      update: {
        email,
        videoTitle: videoTitle || null,
        status: "pending",
      },
      create: {
        jobId,
        email,
        videoTitle: videoTitle || null,
        status: "pending",
      },
    });

    console.log(`[VIDEO SUBSCRIBE] User ${email} subscribed to job ${jobId}`);

    return NextResponse.json({
      success: true,
      message: "Subscribed to video completion notifications",
      notification: {
        id: notification.id,
        jobId: notification.jobId,
        email: notification.email,
        status: notification.status,
      },
    });

  } catch (error) {
    console.error("[VIDEO SUBSCRIBE] Error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe to notifications" },
      { status: 500 }
    );
  }
}
