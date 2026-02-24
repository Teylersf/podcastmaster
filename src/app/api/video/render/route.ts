import { NextResponse } from "next/server";

const MODAL_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://teylersf--podcast-mastering-fastapi-app.modal.run";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      audioUrl, 
      title, 
      subtitle,
      captions,
      gradientFrom,
      gradientTo,
      accentColor,
      showProgressBar,
      aspectRatio = "16:9",
      duration,
    } = body;

    if (!audioUrl) {
      return NextResponse.json(
        { error: "Audio URL is required" },
        { status: 400 }
      );
    }

    // Call Modal to render the video
    const response = await fetch(`${MODAL_API_URL}/render-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_url: audioUrl,
        title: title || "Video",
        subtitle: subtitle || "",
        captions: captions || [],
        gradient_from: gradientFrom || "#1a1a2e",
        gradient_to: gradientTo || "#16213e",
        accent_color: accentColor || "#f97316",
        show_progress_bar: showProgressBar !== false,
        aspect_ratio: aspectRatio,
        duration_seconds: duration || 60,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Render failed: ${error}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Video render error:", error);
    return NextResponse.json(
      { error: "Failed to render video" },
      { status: 500 }
    );
  }
}
