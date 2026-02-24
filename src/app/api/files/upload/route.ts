import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import prisma from "@/lib/prisma";
import { stackServerApp } from "@/stack";

// Storage limit: 5GB in bytes
const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    // Get the current user from Stack Auth
    const user = await stackServerApp.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
      include: { files: true },
    });

    if (!subscription || subscription.status !== "active") {
      return NextResponse.json(
        { error: "Active subscription required" },
        { status: 403 }
      );
    }

    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("fileType") as string || "input";
    const jobId = formData.get("jobId") as string || null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Check storage limit
    const currentStorage = subscription.files.reduce((sum, f) => sum + f.fileSize, 0);
    if (currentStorage + file.size > STORAGE_LIMIT) {
      return NextResponse.json(
        { error: "Storage limit exceeded. Please delete some files." },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const blob = await put(`subscribers/${user.id}/${Date.now()}-${file.name}`, file, {
      access: "public",
    });

    // Save to database
    const subscriberFile = await prisma.subscriberFile.create({
      data: {
        subscriptionId: subscription.id,
        fileName: file.name,
        fileSize: file.size,
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        fileType,
        jobId,
      },
    });

    return NextResponse.json({
      success: true,
      file: {
        id: subscriberFile.id,
        fileName: subscriberFile.fileName,
        fileSize: subscriberFile.fileSize,
        url: subscriberFile.blobUrl,
        fileType: subscriberFile.fileType,
      },
    });
  } catch (error) {
    console.error("[SERVER] File upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

