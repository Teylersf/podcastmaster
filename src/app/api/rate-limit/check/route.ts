import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import prisma from "@/lib/prisma";

// Rate limit: 2 files per week
const WEEKLY_LIMIT = 2;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Hash the IP address for privacy - we don't store raw IPs
 */
function hashIP(ip: string): string {
  const salt = process.env.WEBHOOK_SECRET || "default-salt";
  return crypto.createHash("sha256").update(ip + salt).digest("hex");
}

/**
 * Get the client's IP address from headers
 */
async function getClientIP(): Promise<string> {
  const headersList = await headers();
  
  // Try various headers (Vercel, Cloudflare, etc.)
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIP = headersList.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = headersList.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  return "unknown";
}

/**
 * Check if the user has exceeded their weekly rate limit.
 * Accepts userId query param for signed-in users, falls back to IP for guests.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    
    const oneWeekAgo = new Date(Date.now() - ONE_WEEK_MS);
    
    let usageCount: number;
    let identifier: string;
    
    if (userId) {
      // Signed-in user: check by user ID
      identifier = `user:${userId}`;
      usageCount = await prisma.usageLog.count({
        where: {
          userId,
          createdAt: { gte: oneWeekAgo },
        },
      });
    } else {
      // Guest user: check by IP
      const clientIP = await getClientIP();
      const hashedIP = hashIP(clientIP);
      identifier = `ip:${hashedIP.substring(0, 8)}...`;
      
      usageCount = await prisma.usageLog.count({
        where: {
          ipAddress: hashedIP,
          userId: null, // Only count guest usage
          createdAt: { gte: oneWeekAgo },
        },
      });
    }
    
    const remaining = Math.max(0, WEEKLY_LIMIT - usageCount);
    const allowed = usageCount < WEEKLY_LIMIT;
    
    console.log(`[RATE-LIMIT] Check for ${identifier}: ${usageCount}/${WEEKLY_LIMIT} used, allowed: ${allowed}`);
    
    return NextResponse.json({
      allowed,
      remaining,
      limit: WEEKLY_LIMIT,
      used: usageCount,
    });
    
  } catch (error) {
    console.error("[RATE-LIMIT] Check error:", error);
    // On check error, be conservative and allow (don't block users due to DB issues)
    return NextResponse.json({
      allowed: true,
      remaining: WEEKLY_LIMIT,
      limit: WEEKLY_LIMIT,
      used: 0,
      error: "check_failed",
    });
  }
}

/**
 * Record a usage when mastering starts.
 * Uses userId for signed-in users, IP for guests.
 */
export async function POST(request: Request) {
  try {
    const { jobId, userId } = await request.json();
    
    if (!jobId) {
      return NextResponse.json(
        { error: "Missing jobId" },
        { status: 400 }
      );
    }
    
    const oneWeekAgo = new Date(Date.now() - ONE_WEEK_MS);
    
    let usageCount: number;
    let hashedIP: string | null = null;
    let identifier: string;
    
    if (userId) {
      // Signed-in user: check and record by user ID
      identifier = `user:${userId}`;
      usageCount = await prisma.usageLog.count({
        where: {
          userId,
          createdAt: { gte: oneWeekAgo },
        },
      });
    } else {
      // Guest user: check and record by IP
      const clientIP = await getClientIP();
      hashedIP = hashIP(clientIP);
      identifier = `ip:${hashedIP.substring(0, 8)}...`;
      
      usageCount = await prisma.usageLog.count({
        where: {
          ipAddress: hashedIP,
          userId: null,
          createdAt: { gte: oneWeekAgo },
        },
      });
    }
    
    // Double-check limit before recording
    if (usageCount >= WEEKLY_LIMIT) {
      console.log(`[RATE-LIMIT] Blocked ${identifier}: already at ${usageCount}/${WEEKLY_LIMIT}`);
      return NextResponse.json({
        allowed: false,
        remaining: 0,
        limit: WEEKLY_LIMIT,
        used: usageCount,
      });
    }
    
    // Record the usage
    await prisma.usageLog.create({
      data: {
        userId: userId || null,
        ipAddress: userId ? null : hashedIP,
        jobId,
      },
    });
    
    const newCount = usageCount + 1;
    console.log(`[RATE-LIMIT] Recorded for ${identifier}: now ${newCount}/${WEEKLY_LIMIT} used`);
    
    return NextResponse.json({
      allowed: true,
      remaining: WEEKLY_LIMIT - newCount,
      limit: WEEKLY_LIMIT,
      used: newCount,
      recorded: true,
    });
    
  } catch (error) {
    console.error("[RATE-LIMIT] Record error:", error);
    // On record error, return error status so frontend knows it failed
    return NextResponse.json(
      { 
        error: "Failed to record usage",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
