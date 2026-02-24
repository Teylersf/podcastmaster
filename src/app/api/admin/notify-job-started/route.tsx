import { NextResponse } from "next/server";
import React from "react";
import { render } from "@react-email/render";
import { resend, FROM_EMAIL, SUPPORT_EMAIL } from "@/lib/resend";
import AdminJobStartedEmail from "@/emails/AdminJobStarted";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Send admin notification when a new mastering job starts.
 * This is called by the frontend when user clicks "Start Mastering".
 */
export async function POST(request: Request) {
  try {
    const { 
      jobId, 
      fileName, 
      fileSize, 
      fileId,
      templateName, 
      outputQuality, 
      limiterMode 
    } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing required field: jobId" },
        { status: 400 }
      );
    }

    // File info - the original is stored in R2 as uploads/{fileId}.ext
    // Admin can access via R2 dashboard if needed
    const fileInfo = `File ID: ${fileId || "N/A"}`;

    // Render the email HTML
    const emailHtml = await render(
      <AdminJobStartedEmail 
        jobId={jobId}
        fileName={fileName || "Unknown"}
        fileSize={fileSize || "Unknown"}
        downloadUrl={fileInfo}
        templateName={templateName || "Default"}
        outputQuality={outputQuality || "standard"}
        limiterMode={limiterMode || "normal"}
      />
    );

    // Send email to admin only
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [SUPPORT_EMAIL],
      subject: `🎙️ New Mastering Job: ${fileName || "Unknown file"}`,
      html: emailHtml,
    });

    if (error) {
      // Log server-side only (not visible to client)
      console.error("[SERVER] Admin notification failed:", error);
      // Return generic response - don't expose details to client
      return NextResponse.json({ success: false });
    }

    // Return minimal response - don't expose any email details
    return NextResponse.json({ success: true });

  } catch (error) {
    // Log server-side only
    console.error("[SERVER] Admin notification error:", error);
    // Return generic response
    return NextResponse.json({ success: false });
  }
}

