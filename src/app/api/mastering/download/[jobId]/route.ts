import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://teylersf--podcast-mastering-fastapi-app.modal.run";

// GET /api/mastering/download/[jobId]
//
// Gates the mastered-file download behind sign-in. This is the URL the client
// hits when the user clicks the Download button. On success it 302-redirects
// to the Modal backend's own download URL, so no audio bytes ever flow
// through Vercel — the auth check is the whole point of the hop.
//
// Design tradeoff: the Modal backend URL itself is still public. A determined
// user could inspect the redirect Location and reuse it. That's fine for now
// — the goal of this gate is the friction of requiring a Stack Auth account,
// not cryptographic ownership proof. Job ownership + Modal-side signed URLs
// are follow-up work if we see abuse.
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await ctx.params;

  if (!jobId || !/^[a-zA-Z0-9_-]{6,64}$/.test(jobId)) {
    return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
  }

  const user = await stackServerApp.getUser();
  if (!user) {
    return NextResponse.json(
      {
        error: "auth_required",
        message: "Sign up to download your mastered file",
        signUpUrl: `/handler/sign-up?after_auth_return_to=${encodeURIComponent("/")}`,
      },
      { status: 401 },
    );
  }

  return NextResponse.redirect(`${API_URL}/download/${jobId}`, 302);
}
