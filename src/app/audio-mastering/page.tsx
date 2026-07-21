import type { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { headers } from "next/headers";
import {
  Music,
  Music2,
  Disc3,
  Mic,
  Headphones,
  Volume2,
  Upload,
  Wand2,
  Download,
  CheckCircle2,
  Sparkles,
  Zap,
  Github,
  Mail,
  ArrowRight,
  Radio,
} from "lucide-react";

const MasteringTool = dynamic(() => import("@/components/MasteringTool"), {
  loading: () => <MasteringToolSkeleton />,
});

// Lazy-load the batch component so it doesn't enlarge the initial bundle.
// (Next.js 16 disallows ssr:false in Server Components — the component is
//  "use client" so it'll hydrate before any browser-only code runs.)
const AlbumBatchMastering = dynamic(
  () => import("@/components/AlbumBatchMastering")
);

// ---- SEO --------------------------------------------------------------------

// Canonical URL strategy (multi-domain SEO):
// Both freepodcastmastering.com/audio-mastering AND freemusicmaster.com/
// serve the same content. To avoid duplicate-content penalties + to
// concentrate ranking authority on the exact-match domain, BOTH point
// their canonical at the music domain root.
const MUSIC_DOMAIN_CANONICAL = "https://freemusicmaster.com/";

// `generateMetadata` runs per-request, so we can read the host header
// and tweak siteName / openGraph URL to match the visitor's domain.
// (Title/description stay the same — they're already music-focused and
//  work equally well from either domain.)
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const isMusicHost = h.get("x-host-mode") === "music";

  const title =
    "Free AI Music Mastering | Master Songs, Albums & Audio Tracks Online Free";
  const description =
    "Free AI-powered music mastering. Master songs, full albums, and audio tracks to professional quality in minutes. Works for pop, rock, electronic, hip-hop, jazz, acoustic. One-click Google sign-in — 24h unlimited on signup, then 1 free master/day.";

  return {
    title,
    description,
    keywords: [
      "free music mastering",
      "free song mastering",
      "free album mastering",
      "free audio mastering",
      "free track mastering",
      "AI music mastering",
      "AI song mastering",
      "7 day free trial music mastering",
      "online music mastering",
      "master my song free",
      "master my album free",
      "master my track free",
      "music mastering tool",
      "automatic music mastering",
      "master audio online",
      "free music mastering online",
      "online song mastering free",
      "best free music mastering",
      "best free mastering tool",
      "professional music mastering free",
      "mastering for spotify",
      "mastering for apple music",
      "mastering for youtube music",
      "free pop mastering",
      "free rock mastering",
      "free electronic mastering",
      "free hip-hop mastering",
      "free album mastering online",
    ],
    // Cross-domain canonical to consolidate SEO equity on freemusicmaster.com.
    // Google handles this fine; the non-canonical URL just won't get indexed.
    alternates: { canonical: MUSIC_DOMAIN_CANONICAL },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: isMusicHost ? MUSIC_DOMAIN_CANONICAL : "https://freepodcastmastering.com/audio-mastering",
      siteName: isMusicHost ? "Free Music Mastering" : "Free Podcast Mastering",
      title: "Free AI Music & Album Mastering — Master Songs Online",
      description:
        "Free AI music mastering for songs, albums and any audio track. Pop, rock, electronic, hip-hop, jazz, acoustic — broadcast-loudness output in minutes. No signup.",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "Free AI Music Mastering Tool",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Free AI Music Mastering | Songs, Albums & Tracks",
      description:
        "Master songs, albums and audio tracks free. Pro-quality AI mastering — one-click Google sign-in, 24h unlimited on signup + 1 free master/day.",
      images: ["/og-image.png"],
    },
    robots: { index: true, follow: true },
  };
}

// The eight Q&As below are repeated in both the visible FAQ and the
// FAQPage schema — keep them in sync. Single source for both:
const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Is the music mastering really free?",
    a: "Yes. One-click Google sign-in (no card) unlocks 24 hours of unlimited HQ mastering as a welcome bonus, then 1 free master per day forever. Your latest master is saved permanently to your dashboard. If you want unlimited past the first 24h, there's an optional 7-day free trial of unlimited HQ + 5 GB cloud storage — card required, cancel anytime, no charge for the 7 days.",
  },
  {
    q: "What audio formats can I upload?",
    a: "WAV, MP3, FLAC, AIFF, OGG, and M4A. We recommend uploading the highest-quality version of your mix you have — bit depth and sample rate are preserved through to the output.",
  },
  {
    q: "Can I master a whole album at once?",
    a: "Yes — scroll down to the 'Master a Full Album' section on this page. Drop multiple files at once or pick an entire folder of tracks. We'll process them in parallel using the same reference, loudness target, and settings, so the album hangs together as a cohesive release. When everything finishes, hit 'Download all as ZIP' for a one-click bundle.",
  },
  {
    q: "Can I use a commercial song as my reference?",
    a: "Yes, locally — upload any well-mastered track as your reference. The output never contains any of the reference audio; only its spectral and loudness profile gets mapped onto your mix. Standard reference-mastering workflow.",
  },
  {
    q: "What loudness should I target for Spotify?",
    a: "Spotify normalizes to -14 LUFS integrated. Apple Music is -16 LUFS. YouTube Music is around -14. Pick 'Standard (-14 LUFS)' in advanced settings for a safe Spotify-ready master, or 'Loud (-12)' for a more aggressive sound that holds up on platforms without normalization.",
  },
  {
    q: "How long does mastering a song take?",
    a: "Most songs (3-5 min) finish in under a minute. Full-length tracks (up to an hour) take a few minutes. Cold-starts on the first request of the session can add 4-5 seconds.",
  },
  {
    q: "Do you train AI on my music?",
    a: "No. We don't train on uploads. Free-tier accounts get a single permanent slot in your dashboard — each new master replaces the previous one, so we're always only holding your latest. Paid tiers keep every file in 5 GB cloud storage. The source code is open on GitHub so you can verify all of this yourself.",
  },
  {
    q: "What's the difference between this and your podcast mastering tool?",
    a: "Same upload/download flow, different polish chain. The podcast version is voice-tuned (de-essing, presence boost around 2.8 kHz, mid cuts). The music version drops those moves so cymbals, bass, and guitars stay clean and full.",
  },
];

// Two pieces of structured data:
//   1. WebApplication — Google's "Free tool" rich panel
//   2. FAQPage — eligible for Google's expandable Q&A rich snippet
// JSON-LD points at the music-domain canonical so Google associates the
// schema (name, offers, features) with freemusicmaster.com regardless of
// which host served the page.
const jsonLdWebApp = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Free AI Music Mastering",
  url: MUSIC_DOMAIN_CANONICAL,
  description:
    "Free AI music mastering tool for songs, albums, and audio tracks. Professional broadcast loudness in minutes.",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Free music mastering",
    "Free song mastering",
    "Free album mastering",
    "Audio track mastering",
    "AI-powered loudness normalization",
    "Spotify, Apple Music, YouTube Music presets",
    "Works for all genres",
    "No signup required",
  ],
};

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

// ---- Skeleton & static sections --------------------------------------------

function MasteringToolSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="glass-card p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-48 rounded-xl bg-(--bg-elevated)" />
          <div className="h-48 rounded-xl bg-(--bg-elevated)" />
        </div>
        <div className="mt-6 h-14 rounded-xl bg-(--bg-elevated) w-full" />
      </div>
    </div>
  );
}

function MusicHero() {
  return (
    <header className="text-center mb-10 md:mb-14">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-(--accent-muted) border border-(--accent-primary)/50 text-xs font-semibold uppercase tracking-wider text-(--accent-primary) mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        New — Audio · Music · Song · Album · Track Mastering
      </div>

      <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4">
        <span className="bg-gradient-to-r from-(--accent-primary) via-(--accent-secondary) to-(--accent-tertiary) bg-clip-text text-transparent">
          Free AI Music Mastering
        </span>
      </h1>
      <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-3xl mx-auto mb-6">
        Master your <strong className="text-[var(--text-primary)]">songs</strong>,{" "}
        <strong className="text-[var(--text-primary)]">full albums</strong>, and{" "}
        <strong className="text-[var(--text-primary)]">audio tracks</strong> to
        professional broadcast quality. Works for vocals, instrumentals, full
        mixes — any genre. Free — sign in with Google in one click, no card,
        24 hours unlimited on us + 7-day trial of 24-bit HQ available.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        {[
          { icon: Music2, text: "Songs & Tracks" },
          { icon: Disc3, text: "Full Albums" },
          { icon: Mic, text: "Vocals & Instrumentals" },
          { icon: Volume2, text: "Spotify Loudness" },
        ].map((p) => (
          <div
            key={p.text}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-(--bg-elevated) border border-(--border-medium) text-sm text-[var(--text-secondary)]"
          >
            <p.icon className="w-4 h-4 text-(--accent-primary)" />
            {p.text}
          </div>
        ))}
      </div>
    </header>
  );
}

function StaticSections({ isMusicHost }: { isMusicHost: boolean }) {
  // When served from freemusicmaster.com, "Podcast mastering" links should
  // point at the absolute podcast domain (otherwise they'd point at this same
  // site). Renders nothing for the prominent cross-link callout — the music
  // site stays music-focused.
  const podcastHomeHref = isMusicHost
    ? "https://freepodcastmastering.com/"
    : "/";

  return (
    <>
      {/* What can you master */}
      <section className="mt-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
          Master Anything With Audio
        </h2>
        <p className="text-center text-[var(--text-muted)] mb-10 max-w-2xl mx-auto">
          One tool for every kind of audio you make. Drop a file, pick a
          reference sound, get a finished master.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: Music,
              title: "Songs & Singles",
              desc: "Master your latest single to compete with commercial releases on Spotify and Apple Music.",
            },
            {
              icon: Disc3,
              title: "Full Albums",
              desc: "Drop a whole folder of tracks (or multi-select) and master the entire album in parallel with one click.",
            },
            {
              icon: Mic,
              title: "Vocals & Acapellas",
              desc: "Clean up isolated vocal stems, lead vocals, harmonies, or full vocal performances.",
            },
            {
              icon: Headphones,
              title: "Instrumentals",
              desc: "Beats, instrumentals, demos, score cues — anything without vocals masters perfectly.",
            },
            {
              icon: Radio,
              title: "Any Genre",
              desc: "Pop, rock, hip-hop, R&B, electronic, EDM, jazz, classical, folk, ambient, cinematic.",
            },
            {
              icon: Wand2,
              title: "Demos & Roughs",
              desc: "Get a polished, releasable-sounding mix from a rough bedroom-studio demo in minutes.",
            },
            {
              icon: Zap,
              title: "Live Recordings",
              desc: "Clean up and loudness-match live performances, concerts, or rehearsal recordings.",
            },
            {
              icon: Sparkles,
              title: "Remixes & Edits",
              desc: "Bring remixes and DJ edits up to commercial loudness before release.",
            },
          ].map((item) => (
            <div key={item.title} className="glass-card p-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-(--accent-primary) to-(--accent-secondary) flex items-center justify-center mb-4 shadow-lg shadow-(--accent-muted)">
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold mb-1">{item.title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
          How Music Mastering Works
        </h2>
        <p className="text-center text-[var(--text-muted)] mb-10">
          Three steps to a release-ready master
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Upload,
              step: "01",
              title: "Upload Your Track",
              desc: "Drop your song, instrumental, or full album mix. We support WAV, MP3, FLAC, AIFF, M4A.",
            },
            {
              icon: Wand2,
              step: "02",
              title: "Pick a Reference Sound",
              desc: "Choose from built-in music presets, or upload any commercial track you want yours to sound like.",
            },
            {
              icon: Download,
              step: "03",
              title: "Download Your Master",
              desc: "Get a broadcast-loud, true-peak-limited file ready for Spotify, Apple Music, YouTube, or distribution.",
            },
          ].map((s) => (
            <div key={s.step} className="glass-card p-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-(--accent-primary) to-(--accent-secondary) flex items-center justify-center mb-5 shadow-lg">
                <s.icon className="w-7 h-7 text-white" />
              </div>
              <p className="text-xs text-[var(--text-muted)] font-mono mb-2">
                {s.step}
              </p>
              <h3 className="font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* What's different for music */}
      <section className="mt-16 glass-card p-8">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          Tuned For Music, Not Voice
        </h2>
        <p className="text-[var(--text-secondary)] mb-6 max-w-3xl">
          Our podcast pipeline is voice-tuned — high-pass at 40 Hz, mid-cut
          for mud, gentle de-essing. Those moves help spoken word but hurt
          music. The music chain is different:
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { label: "Subsonic HPF only", note: "Cuts below 25 Hz — preserves the full bass impact of kick drums, sub bass, and low synths." },
            { label: "No de-essing", note: "Cymbals, hi-hats, and bright synths stay open and airy. No mid-cuts that scoop guitars or vocals." },
            { label: "Slow, gentle glue", note: "A wide-band compressor with a slow attack — adds cohesion without squashing transients or dynamics." },
            { label: "Reference-matched EQ", note: "Matchering analyzes your reference track's spectrum and matches your mix to it. Whatever you reference, your master moves toward." },
            { label: "True-peak limiting at -1 dBTP", note: "Brick-wall ceiling that prevents inter-sample clipping on streaming platforms." },
            { label: "Loudness targets", note: "Hit -14 LUFS for Spotify, -16 for Apple, or -12 for broadcast. Iterative gain converges within 0.3 dB of the target." },
          ].map((b) => (
            <div key={b.label} className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">{b.label}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{b.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ (also rendered as FAQPage schema in <head> for Google rich snippets) */}
      <section className="mt-16 glass-card p-8">
        <h2 className="text-xl md:text-2xl font-bold mb-6">
          Free Music Mastering — Frequently Asked Questions
        </h2>
        <div className="space-y-5">
          {FAQ_ITEMS.map((f) => (
            <details
              key={f.q}
              className="border-b border-(--border-subtle) pb-4 last:border-0"
            >
              <summary className="cursor-pointer font-semibold text-[var(--text-primary)] hover:text-(--accent-primary) transition-colors">
                {f.q}
              </summary>
              <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Cross-link to podcast — only shown when this page is served from
          the podcast domain. On freemusicmaster.com it would be visually
          off-brand to surface the podcast tool that prominently. */}
      {!isMusicHost && (
        <section className="mt-12 p-6 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle)">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-(--accent-primary) to-(--accent-tertiary) flex items-center justify-center shrink-0">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold mb-0.5">Mastering a podcast instead?</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  The voice-tuned pipeline lives on the home page.
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-medium) hover:border-(--border-hover) text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap"
            >
              Podcast mastering
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-(--border-subtle) text-center">
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm mb-6">
          <a
            href={podcastHomeHref}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Podcast Mastering
          </a>
          <span className="text-(--border-medium)">|</span>
          <Link
            href="/pricing"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Pricing
          </Link>
          <span className="text-(--border-medium)">|</span>
          <Link
            href="/terms"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Terms
          </Link>
          <span className="text-(--border-medium)">|</span>
          <a
            href="https://github.com/Teylersf/podcastmaster"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
          >
            <Github className="w-3 h-3" />
            Open Source
          </a>
          <span className="text-(--border-medium)">|</span>
          <a
            href="mailto:support@freepodcastmastering.com"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
          >
            <Mail className="w-3 h-3" />
            Support
          </a>
        </div>
        <p className="font-bold text-lg bg-gradient-to-r from-(--accent-primary) via-(--accent-secondary) to-(--accent-tertiary) bg-clip-text text-transparent mb-2">
          {isMusicHost ? "freemusicmaster.com" : "freepodcastmastering.com"}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {isMusicHost
            ? "Free professional mastering for music, songs, albums, and audio tracks."
            : "Free professional mastering for music, songs, albums, and podcasts."}
        </p>
      </footer>
    </>
  );
}

// ---- Page -------------------------------------------------------------------

export default async function AudioMasteringPage() {
  const h = await headers();
  const isMusicHost = h.get("x-host-mode") === "music";

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Decorative gradient backdrop */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(244,63,157,0.4) 0%, transparent 70%)",
            filter: "blur(80px)",
            top: "-20%",
            left: "-10%",
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-25"
          style={{
            background:
              "radial-gradient(circle, rgba(56,189,248,0.4) 0%, transparent 70%)",
            filter: "blur(80px)",
            bottom: "-10%",
            right: "-5%",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(251,146,60,0.3) 0%, transparent 70%)",
            filter: "blur(60px)",
            top: "40%",
            right: "20%",
          }}
        />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      <div className="relative z-10 px-4 py-8 md:py-14">
        <div className="max-w-6xl mx-auto">
          <MusicHero />

          <Suspense fallback={<MasteringToolSkeleton />}>
            <MasteringTool audioType="music" />
          </Suspense>

          {/* Album batch mode — drop multiple tracks or pick a folder. */}
          <AlbumBatchMastering audioType="music" />

          <StaticSections isMusicHost={isMusicHost} />
        </div>
      </div>
    </main>
  );
}
