import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import prisma from "@/lib/prisma";
import { stackServerApp } from "@/stack";

export async function DELETE(request: Request) {
  try {
    // Get the current user from Stack Auth
    const user = await stackServerApp.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID required" },
        { status: 400 }
      );
    }

    // Get the file and verify ownership
    const file = await prisma.subscriberFile.findUnique({
      where: { id: fileId },
      include: { subscription: true },
    });

    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    if (file.subscription.userId !== user.id) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    // Delete from Vercel Blob
    await del(file.blobUrl);

    // Delete from database
    await prisma.subscriberFile.delete({
      where: { id: fileId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SERVER] File delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}

