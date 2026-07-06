// Per-host sitemap. Replaces the old public/sitemap.xml because both
// domains share the same Next.js app — a static sitemap would always
// reflect freepodcastmastering URLs, even when fetched from
// freemusicmaster.com (which Google would treat as a cross-domain leak).
//
// We read the request host and return a sitemap that only lists URLs
// on that host. Cached for an hour at the edge.

import { headers } from "next/headers";

const MUSIC_HOSTS = new Set<string>([
  "freemusicmaster.com",
  "www.freemusicmaster.com",
]);

const TODAY = new Date().toISOString().slice(0, 10);

function buildSitemap(host: string): string {
  const isMusic = MUSIC_HOSTS.has(host);

  const urls: Array<{ loc: string; priority: string; changefreq: string; lastmod?: string }> = [];

  if (isMusic) {
    // Music-only sitemap. Everything routes to freemusicmaster.com origin.
    urls.push(
      { loc: "https://freemusicmaster.com/",        priority: "1.0", changefreq: "weekly",  lastmod: TODAY },
      { loc: "https://freemusicmaster.com/pricing", priority: "0.6", changefreq: "monthly", lastmod: TODAY },
      { loc: "https://freemusicmaster.com/terms",   priority: "0.3", changefreq: "yearly",  lastmod: TODAY },
      { loc: "https://freemusicmaster.com/privacy", priority: "0.3", changefreq: "yearly",  lastmod: TODAY },
    );
  } else {
    // Default = podcast sitemap (preserves the historic SEO surface).
    urls.push(
      { loc: "https://freepodcastmastering.com/",                           priority: "1.0", changefreq: "weekly",  lastmod: TODAY },
      { loc: "https://freepodcastmastering.com/audio-mastering",            priority: "1.0", changefreq: "weekly",  lastmod: TODAY },
      { loc: "https://freepodcastmastering.com/how-to-master-podcast-audio", priority: "0.9", changefreq: "monthly", lastmod: TODAY },
      { loc: "https://freepodcastmastering.com/pricing",                    priority: "0.8", changefreq: "monthly", lastmod: TODAY },
      { loc: "https://freepodcastmastering.com/dashboard",                  priority: "0.5", changefreq: "weekly",  lastmod: TODAY },
      { loc: "https://freepodcastmastering.com/terms",                      priority: "0.3", changefreq: "yearly",  lastmod: TODAY },
      { loc: "https://freepodcastmastering.com/privacy",                    priority: "0.3", changefreq: "yearly",  lastmod: TODAY },
    );
  }

  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

function stripPort(host: string): string {
  const colon = host.indexOf(":");
  return colon === -1 ? host : host.slice(0, colon);
}

export async function GET() {
  const h = await headers();
  const host = stripPort((h.get("host") || "").toLowerCase());
  const xml = buildSitemap(host);

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
