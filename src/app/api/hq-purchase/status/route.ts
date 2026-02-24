import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stackServerApp } from "@/stack";

export async function GET() {
  try {
    const user = await stackServerApp.getUser();
    
    if (!user) {
      return NextResponse.json({ hasCredits: false, credits: 0 });
    }

    // Check if user is a subscriber (they get unlimited HQ)
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (subscription?.status === "active") {
      return NextResponse.json({ 
        hasCredits: true, 
        credits: -1, // -1 means unlimited (subscriber)
        isSubscriber: true 
      });
    }

    // Check for one-time purchases
    const purchase = await prisma.hQPurchase.findFirst({
      where: {
        userId: user.id,
        creditsRemaining: { gt: 0 },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      hasCredits: purchase ? purchase.creditsRemaining > 0 : false,
      credits: purchase?.creditsRemaining || 0,
      isSubscriber: false,
    });
  } catch (error) {
    console.error("Error checking HQ purchase status:", error);
    return NextResponse.json({ hasCredits: false, credits: 0 });
  }
}

// POST - Use an HQ credit
export async function POST() {
  try {
    const user = await stackServerApp.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check if user is a subscriber (they don't consume credits)
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (subscription?.status === "active") {
      return NextResponse.json({ success: true, creditsRemaining: -1 });
    }

    // Find and decrement credit
    const purchase = await prisma.hQPurchase.findFirst({
      where: {
        userId: user.id,
        creditsRemaining: { gt: 0 },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "No HQ credits available" },
        { status: 400 }
      );
    }

    // Decrement credit
    const updated = await prisma.hQPurchase.update({
      where: { id: purchase.id },
      data: { creditsRemaining: purchase.creditsRemaining - 1 },
    });

    return NextResponse.json({
      success: true,
      creditsRemaining: updated.creditsRemaining,
    });
  } catch (error) {
    console.error("Error using HQ credit:", error);
    return NextResponse.json(
      { error: "Failed to use HQ credit" },
      { status: 500 }
    );
  }
}
