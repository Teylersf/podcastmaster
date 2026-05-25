// Multi-domain routing. The same Next.js app serves both:
//   freepodcastmastering.com  → podcast mastering (unchanged from before)
//   freemusicmaster.com       → music mastering only
//
// Strategy: on the music host, rewrite `/` to the music tool content and
// collapse the duplicate `/audio-mastering` URL via a 301 redirect, so
// Google only sees one canonical URL per piece of content on this domain.
// Podcast-only routes 404 on the music domain so they don't dilute its
// topical relevance signal.
//
// Each request also carries an `x-host-mode` header downstream so server
// components (page metadata, sitemap) can shape canonical URLs without
// having to re-detect the host themselves.

import { NextResponse, type NextRequest } from "next/server";

const MUSIC_HOSTS = new Set<string>([
  "freemusicmaster.com",
  "www.freemusicmaster.com",
]);

// Routes that don't make sense on the music-only domain. Returning 404
// keeps Google from indexing them under freemusicmaster.com.
const PODCAST_ONLY_ROUTES = new Set<string>([
  "/how-to-master-podcast-audio",
]);

function stripPort(host: string): string {
  const colon = host.indexOf(":");
  return colon === -1 ? host : host.slice(0, colon);
}

export function middleware(request: NextRequest) {
  const rawHost = request.headers.get("host") || "";
  const host = stripPort(rawHost).toLowerCase();
  const isMusicHost = MUSIC_HOSTS.has(host);
  const { pathname, search } = request.nextUrl;

  // ---- Music-host-only routing rules ---------------------------------------
  if (isMusicHost) {
    // 404 routes that are podcast-specific.
    if (PODCAST_ONLY_ROUTES.has(pathname)) {
      return new NextResponse(null, { status: 404 });
    }

    // 301: freemusicmaster.com/audio-mastering → freemusicmaster.com/
    // Two URLs serving identical content is bad for SEO; we collapse to /.
    if (pathname === "/audio-mastering") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url, 301);
    }

    // Rewrite freemusicmaster.com/ → render the /audio-mastering content
    // (URL stays as / in the browser; this is a server-side rewrite).
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/audio-mastering";
      const response = NextResponse.rewrite(url);
      response.headers.set("x-host-mode", "music");
      return response;
    }
  }

  // ---- Default path: pass through, just tag the host mode ------------------
  const response = NextResponse.next();
  response.headers.set("x-host-mode", isMusicHost ? "music" : "podcast");
  // The path the page should treat as the user-facing URL (for canonical
  // URLs etc.) — needed because rewrites hide the real request path.
  response.headers.set("x-request-pathname", pathname + search);
  return response;
}

// Skip middleware on static assets and API routes — performance and so we
// don't accidentally rewrite or 404 things like the sitemap or favicon.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|.*\\..*).*)",
  ],
};
