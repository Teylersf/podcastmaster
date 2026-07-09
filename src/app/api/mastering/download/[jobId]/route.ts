import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://teylersf--podcast-mastering-fastapi-app.modal.run";

// GET /api/mastering/download/[jobId]
//
// Gates the mastered-file download behind sign-in. On success it 302-redirects
// to the Modal backend's own download URL, so no audio bytes ever flow through
// Vercel — the auth check is the whole point of the hop.
//
// Signed-out visitors get sent to /handler/sign-in with after_auth_return_to
// pointing right back at this URL, so once they authenticate the browser
// resolves back here, the auth check passes, and Modal serves the file. This
// is what makes the emailed completion link Just Work when the recipient
// clicks it from an inbox where they aren't currently signed in.
//
// Design tradeoff: the Modal backend URL itself is still public. A determined
// user could inspect the redirect Location and reuse it. That's fine for now
// — the goal of this gate is the friction of requiring a Stack Auth account,
// not cryptographic ownership proof. Job ownership + Modal-side signed URLs
// are follow-up work if we see abuse.
export async function GET(
  request: Request,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await ctx.params;

  if (!jobId || !/^[a-zA-Z0-9_-]{6,64}$/.test(jobId)) {
    return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
  }

  const user = await stackServerApp.getUser();
  if (!user) {
    // Bounce the visitor into Stack Auth's sign-in flow, then back here.
    // Absolute path with just the pathname so after_auth_return_to's
    // same-origin check accepts it.
    const url = new URL(request.url);
    const returnTo = url.pathname;
    const wantsJson =
      request.headers.get("accept")?.includes("application/json") ?? false;

    if (wantsJson) {
      return NextResponse.json(
        {
          error: "auth_required",
          message: "Sign in to download your mastered file",
          signInUrl: `/handler/sign-in?after_auth_return_to=${encodeURIComponent(returnTo)}`,
        },
        { status: 401 },
      );
    }

    return NextResponse.redirect(
      new URL(
        `/handler/sign-in?after_auth_return_to=${encodeURIComponent(returnTo)}`,
        url.origin,
      ),
      302,
    );
  }

  return NextResponse.redirect(`${API_URL}/download/${jobId}`, 302);
}
