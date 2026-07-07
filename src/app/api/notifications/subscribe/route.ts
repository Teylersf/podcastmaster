import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stackServerApp } from "@/stack";

export async function POST(request: Request) {
  try {
    // Sign-in required. Previously this endpoint accepted arbitrary
    // email addresses from anon users, then the completion webhook
    // mailed them the raw Modal download URL — a bypass of every
    // sign-up gate. Gating the write endpoint kills the bypass even
    // if a client-side caller sneaks past the UI change.
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "auth_required" },
        { status: 401 },
      );
    }

    const { jobId, email } = await request.json();

    // Validate inputs
    if (!jobId || !email) {
      return NextResponse.json(
        { error: "Missing required fields: jobId and email" },
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

    // Check if notification already exists for this job
    const existing = await prisma.jobNotification.findUnique({
      where: { jobId },
    });

    if (existing) {
      // Update the email if job already exists
      const updated = await prisma.jobNotification.update({
        where: { jobId },
        data: { email },
      });
      return NextResponse.json({ 
        success: true, 
        message: "Email updated for notification",
        id: updated.id 
      });
    }

    // Create new notification subscription
    const notification = await prisma.jobNotification.create({
      data: {
        jobId,
        email,
        status: "pending",
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Successfully subscribed to notifications",
      id: notification.id 
    });

  } catch (error) {
    console.error("Error subscribing to notifications:", error);
    return NextResponse.json(
      { error: "Failed to subscribe to notifications" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing jobId parameter" },
        { status: 400 }
      );
    }

    const notification = await prisma.jobNotification.findUnique({
      where: { jobId },
    });

    if (!notification) {
      return NextResponse.json({ subscribed: false });
    }

    return NextResponse.json({ 
      subscribed: true, 
      email: notification.email,
      status: notification.status,
    });

  } catch (error) {
    console.error("Error checking notification status:", error);
    return NextResponse.json(
      { error: "Failed to check notification status" },
      { status: 500 }
    );
  }
}

