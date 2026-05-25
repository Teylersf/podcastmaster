# 19 — Multi-domain setup (freepodcastmastering.com + freemusicmaster.com)

The same Next.js app serves **two** domains, each with its own SEO surface:

| Domain | What it shows on `/` | Canonical strategy |
|---|---|---|
| `freepodcastmastering.com` | The podcast mastering tool (the historic home page — unchanged) | Self-canonical; `/audio-mastering` page canonicals over to the music domain |
| `freemusicmaster.com` | The music mastering tool (rewritten from `/audio-mastering`) | Self-canonical; podcast-only routes 404 here |

One codebase, one Vercel project, one Modal backend. Middleware does the per-host routing.

## How the routing works

[middleware.ts](../middleware.ts) inspects every incoming request's `Host` header and:

| Host | Path | What middleware does |
|---|---|---|
| `freemusicmaster.com` | `/` | Rewrite to `/audio-mastering` content (URL stays `/` in browser) |
| `freemusicmaster.com` | `/audio-mastering` | 301 redirect → `/` (collapse duplicate URL) |
| `freemusicmaster.com` | `/how-to-master-podcast-audio` | 404 (podcast-only page) |
| `freemusicmaster.com` | anything else | Pass through, tag with `x-host-mode: music` |
| `freepodcastmastering.com` | anything | Pass through, tag with `x-host-mode: podcast` |

The `x-host-mode` request header is read by server components ([audio-mastering/page.tsx](../src/app/audio-mastering/page.tsx) + [sitemap.xml/route.ts](../src/app/sitemap.xml/route.ts)) to shape canonical URLs, openGraph metadata, footer brand line, and sitemap contents.

## Canonical URL strategy (the SEO load-bearing piece)

Both `freepodcastmastering.com/audio-mastering` AND `freemusicmaster.com/` serve identical content. To avoid duplicate-content penalties + concentrate ranking authority on the exact-match domain, **both URLs canonicalize to `https://freemusicmaster.com/`**.

```html
<!-- on freepodcastmastering.com/audio-mastering -->
<link rel="canonical" href="https://freemusicmaster.com/" />

<!-- on freemusicmaster.com/ -->
<link rel="canonical" href="https://freemusicmaster.com/" />
```

Google handles cross-domain canonicals fine; the non-canonical URL just won't get indexed (still serves to users, just not in search results). All the inbound link equity for "free music mastering" queries flows to `freemusicmaster.com`.

The podcast home page (`freepodcastmastering.com/`) keeps its self-canonical — it's a completely different keyword cluster.

## Sitemap

Two sitemaps from one route handler ([src/app/sitemap.xml/route.ts](../src/app/sitemap.xml/route.ts)):

- `freepodcastmastering.com/sitemap.xml` → 6 podcast URLs (home, audio-mastering, how-to guide, pricing, dashboard, terms)
- `freemusicmaster.com/sitemap.xml` → 3 music URLs (home, pricing, terms)

Each host gets a sitemap that only references URLs on itself. No cross-domain leak.

The old `public/sitemap.xml` was deleted — a static file would always serve the podcast list, including on the music host.

## What's hidden on the music domain

- The prominent "Mastering a podcast instead?" callout above the footer
- The footer's "freepodcastmastering.com" branding line (becomes "freemusicmaster.com")
- The footer's "Podcast Mastering" link is rewritten to absolute `https://freepodcastmastering.com/` so it still works as an off-domain exit

## What's NOT changed

- The podcast home page (`freepodcastmastering.com/`) — metadata, JSON-LD, headings all untouched
- All API routes
- The Modal backend
- The Stripe + Stackframe + Resend integrations
- The dashboard (works on either host; user accounts are domain-agnostic)

## Vercel setup (one-time, manual)

To make `freemusicmaster.com` actually resolve:

1. **Add the domain in Vercel:**
   - Vercel dashboard → Project `podcastmaster` → Settings → Domains
   - Add `freemusicmaster.com`
   - Add `www.freemusicmaster.com` (with redirect to apex, optional but recommended)

2. **DNS:** point the domain at Vercel. Vercel will show you the records to add at the registrar:
   - Apex (`freemusicmaster.com`) → A record to `76.76.21.21`
   - WWW (`www.freemusicmaster.com`) → CNAME to `cname.vercel-dns.com`

3. **Wait for DNS propagation** (~5 min to a few hours). Vercel auto-provisions SSL via Let's Encrypt.

4. **Verify** with curl once DNS resolves:
   ```bash
   curl -sI https://freemusicmaster.com/ | head -5
   curl -s  https://freemusicmaster.com/sitemap.xml | head -8
   curl -sI https://freemusicmaster.com/how-to-master-podcast-audio   # should be 404
   curl -sI https://freemusicmaster.com/audio-mastering              # should be 301 → /
   ```

5. **Google Search Console:** add `freemusicmaster.com` as a new property. Submit `https://freemusicmaster.com/sitemap.xml`. Within a day or two Google starts indexing.

## Adjusting later

To **add more music-domain routes**: add them to the `urls` array in [src/app/sitemap.xml/route.ts](../src/app/sitemap.xml/route.ts) under the `if (isMusic)` branch.

To **add more podcast-only routes that should 404 on the music host**: add their pathnames to `PODCAST_ONLY_ROUTES` in [middleware.ts](../middleware.ts).

To **add another brand domain** (e.g. `freealbummastering.com`):
1. Add it to `MUSIC_HOSTS` in middleware.ts (and to the sitemap route's `MUSIC_HOSTS`)
2. Add it in Vercel + DNS
3. Add it to Google Search Console
4. Decide its canonical strategy (probably alias-canonical to `freemusicmaster.com/`)

## Caveats

- **Cookie domain:** Stackframe auth cookies are set per-domain. A user signed in on `freemusicmaster.com` won't be signed in on `freepodcastmastering.com` (separate cookies). For most users this is fine — the music domain doesn't have a dashboard surface in the current build.
- **Analytics:** Vercel Analytics tracks per-deployment, not per-host. Both domains show up in the same dashboard. If you want separate analytics, add a host filter in your analytics tool or set up GA with a hostname dimension.
- **OG image:** both domains share `/og-image.png` — currently a podcast-themed image. Worth replacing with a music-themed variant for `freemusicmaster.com` later (the openGraph URL already differs per host; just need the image to differ too — could be host-aware in the `<head>`).
