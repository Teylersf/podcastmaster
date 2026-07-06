import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Headphones,
  Crown,
  Upload,
  Wand2,
  Volume2,
  CheckCircle2,
  Play,
  BookOpen,
  ArrowRight,
  Sparkles,
  Mail,
  HardDrive,
  Mic,
  Zap,
  Download,
  Github,
  Lock,
  Trash2,
  Gift,
} from "lucide-react";

// Dynamic imports for client components - reduces initial JS bundle
const HomeClient = dynamic(() => import("@/components/HomeClient"), {
  loading: () => <HomeLoadingSkeleton />,
});

// Loading skeleton for the interactive tool
function HomeLoadingSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Navigation skeleton */}
      <nav className="flex items-center justify-between mb-12 md:mb-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-(--bg-elevated)" />
          <div className="hidden sm:block w-40 h-6 rounded bg-(--bg-elevated)" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-10 rounded-lg bg-(--bg-elevated)" />
          <div className="w-24 h-10 rounded-xl bg-(--bg-elevated)" />
        </div>
      </nav>

      {/* Hero skeleton */}
      <header className="text-center mb-12 md:mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-(--bg-elevated) mb-6 mx-auto">
          <div className="w-2 h-2 rounded-full bg-(--success)" />
          <div className="w-40 h-4 rounded bg-(--bg-elevated)" />
        </div>

        <div className="w-3/4 max-w-lg h-14 rounded bg-(--bg-elevated) mx-auto mb-4" />
        <div className="w-1/2 max-w-md h-14 rounded bg-(--bg-elevated) mx-auto mb-6" />
        <div className="w-2/3 max-w-xl h-6 rounded bg-(--bg-elevated) mx-auto mb-8" />

        {/* Feature pills skeleton */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-32 h-10 rounded-full bg-(--bg-elevated)" />
          ))}
        </div>
      </header>

      {/* Tool skeleton */}
      <div className="glass-card p-6 mb-8">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-48 rounded-xl bg-(--bg-elevated)" />
          <div className="h-48 rounded-xl bg-(--bg-elevated)" />
        </div>
        <div className="mt-6 h-14 rounded-xl bg-(--bg-elevated) w-full" />
      </div>
    </div>
  );
}

// Static sections that can be server-rendered
function StaticSections() {
  return (
    <>
      {/* How It Works - Server rendered for SEO and fast LCP */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">How It Works</h2>
        <p className="text-center text-[var(--text-muted)] mb-10">Three simple steps to professional audio</p>
        
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Upload,
              step: "01",
              title: "Upload",
              description: "Drop your podcast audio file. We support WAV, MP3, FLAC, and more.",
              gradient: "from-(--accent-primary) to-(--accent-tertiary)",
            },
            {
              icon: Wand2,
              step: "02",
              title: "Process",
              description: "Our AI engine analyzes and masters your audio to broadcast standards.",
              gradient: "from-(--accent-tertiary) to-(--accent-secondary)",
            },
            {
              icon: Volume2,
              step: "03",
              title: "Download",
              description: "Get your professionally mastered file. No watermarks, ready to publish.",
              gradient: "from-(--success) to-(--success)",
            },
          ].map((item) => (
            <div key={item.step} className="glass-card p-6">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-5 shadow-lg`}>
                <item.icon className="w-7 h-7 text-white" />
              </div>
              <p className="text-xs text-[var(--text-muted)] font-mono mb-2">{item.step}</p>
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Podcast */}
      <section className="mt-16 glass-card p-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-(--accent-muted) to-transparent rounded-bl-full" />
        
        <div className="relative flex flex-col md:flex-row items-center gap-6">
          <a href="https://www.averageonpurpose.com/" target="_blank" rel="noopener noreferrer" className="shrink-0 group">
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-(--accent-primary) to-(--accent-tertiary) flex items-center justify-center shadow-lg shadow-(--accent-muted) group-hover:scale-105 transition-transform">
              <Headphones className="w-14 h-14 text-white/90" />
            </div>
          </a>
          
          <div className="flex-1 text-center md:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-(--accent-muted) text-xs font-medium text-(--accent-primary) mb-3">
              <Sparkles className="w-3 h-3" />
              Featured Podcast
            </span>
            <h3 className="text-xl font-bold mb-2">
              <a href="https://www.averageonpurpose.com/" target="_blank" rel="noopener noreferrer" className="hover:text-(--accent-primary) transition-colors">
                Average On Purpose
              </a>
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              This podcast <strong className="text-[var(--text-primary)]">exclusively uses Free Podcast Mastering</strong> for all their audio mastering.
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <a
                href="https://podcasts.apple.com/us/podcast/average-on-purpose/id1850387174"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-(--bg-elevated) hover:bg-(--bg-elevated) border border-(--border-medium) transition-all text-sm font-medium"
              >
                <Play className="w-4 h-4" />
                Listen on Apple Podcasts
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mt-16 glass-card p-8">
        <h2 className="text-xl font-bold mb-6">Why Use This Tool?</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { title: "Professional Quality", desc: "Broadcast-ready audio that sounds great on Spotify, Apple Podcasts, and all major platforms." },
            { title: "No Signup Required", desc: "Start immediately. No account, no email verification, no credit card needed." },
            { title: "AI-Powered Processing", desc: "Our audio engine applies EQ, compression, and loudness optimization tailored for voice." },
            { title: "Podcast Optimized", desc: "Specifically designed for spoken word content, ensuring clear and engaging audio." },
          ].map((feature) => (
            <div key={feature.title} className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-(--success-muted) flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-(--success)" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Guide Section */}
      <section className="mt-16 glass-card p-8 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-48 h-48 bg-gradient-to-br from-(--accent-muted) to-transparent rounded-br-full" />
        
        <div className="relative flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-(--accent-tertiary) to-(--accent-secondary) flex items-center justify-center shadow-lg shadow-(--accent-muted)">
            <BookOpen className="w-12 h-12 text-white/90" />
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-(--accent-muted) text-xs font-medium text-(--accent-tertiary) mb-3">
              <Sparkles className="w-3 h-3" />
              Free Guide
            </span>
            <h3 className="text-xl font-bold mb-2">How to Master Podcast Audio for Free</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Learn the voice-only mastering method used by professional studios. Includes step-by-step tutorials for <strong className="text-[var(--text-primary)]">Audacity, DaVinci Resolve, Premiere Pro</strong>, and more.
            </p>
            <Link href="/how-to-master-podcast-audio" className="btn-primary text-sm inline-flex">
              Read the Complete Guide
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Privacy Banner */}
      <section className="mt-12 p-6 rounded-2xl bg-(--success-muted) border border-(--success)/30">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left">
          <div className="w-12 h-12 rounded-xl bg-(--success-muted) flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-(--success)" />
          </div>
          <div>
            <h3 className="font-bold text-(--success) mb-1">Your Privacy is Protected</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              All files deleted within 24 hours. No selling, no AI training, no voice cloning.{" "}
              <Link href="/terms" className="text-(--accent-primary) hover:underline">Terms of Service →</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Open Source Section */}
      <section className="mt-8">
        <a 
          href="https://github.com/Teylersf/podcastmaster" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block p-6 rounded-2xl bg-(--accent-muted) border border-(--border-medium) hover:border-(--border-hover) transition-all group"
        >
          <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-(--accent-tertiary) to-(--accent-secondary) flex items-center justify-center shrink-0 shadow-(--accent-muted) group-hover:scale-105 transition-transform">
              <Github className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                <h3 className="font-bold text-lg">100% Open Source</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-(--success-muted) text-(--success) uppercase tracking-wider">Verified</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                All code is open source so you can verify we <strong className="text-[var(--text-primary)]">don't train models on your audio</strong> and <strong className="text-[var(--text-primary)]">don't save it</strong>. 
                Free tier files are deleted after 24 hours — paid plans keep files as long as you're subscribed.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-(--success)" />
                  Zero AI Training
                </span>
                <span className="flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-(--success)" />
                  Auto-Delete 24h
                </span>
                <span className="flex items-center gap-1.5">
                  <Github className="w-3.5 h-3.5 text-(--text-muted)" />
                  View on GitHub →
                </span>
              </div>
            </div>
          </div>
        </a>
      </section>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-(--border-subtle) text-center">
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm mb-6">
          <Link href="/how-to-master-podcast-audio" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            Mastering Guide
          </Link>
          <span className="text-(--border-medium)">|</span>
          <Link href="/pricing" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            Pricing
          </Link>
          <span className="text-(--border-medium)">|</span>
          <Link href="/terms" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            Terms of Service
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
          <a href="mailto:support@freepodcastmastering.com" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1" title="Usually responds within 1 hour">
            <Mail className="w-3 h-3" />
            Support (responds within 1 hour)
          </a>
        </div>
        <p className="font-bold text-lg bg-gradient-to-r from-(--accent-primary) to-(--accent-tertiary) bg-clip-text text-transparent mb-2">
          freepodcastmastering.com
        </p>
        <p className="text-xs text-[var(--text-muted)] max-w-lg mx-auto mb-4">
          Professional podcast mastering for everyone. Broadcast-quality results in minutes.
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          © {new Date().getFullYear()} Free Podcast Mastering
        </p>
      </footer>
    </>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Static background - CSS only, no JS animation */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background: "radial-gradient(circle, var(--accent-muted) 0%, transparent 70%)",
            filter: "blur(80px)",
            top: "-20%",
            left: "-10%",
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-25"
          style={{
            background: "radial-gradient(circle, var(--accent-muted) 0%, transparent 70%)",
            filter: "blur(80px)",
            bottom: "-10%",
            right: "-5%",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, var(--accent-muted) 0%, transparent 70%)",
            filter: "blur(60px)",
            top: "50%",
            right: "20%",
          }}
        />
      </div>

      <div className="relative z-10 px-4 py-8 md:py-16">
        <div className="max-w-6xl mx-auto">
          {/* Pricing + engine overview — server-rendered, appears instantly */}
          <PricingOverviewBanner />

          {/* Client-side interactive content */}
          <Suspense fallback={<HomeLoadingSkeleton />}>
            <HomeClient />
          </Suspense>

          {/* Static sections - server rendered */}
          <StaticSections />
        </div>
      </div>
    </main>
  );
}

// Homepage overview banner. Two jobs:
//   1. Set expectations on the pricing model up-front so nobody hits the
//      $2 paywall as a surprise ("1 free every day, $2 for extras" is not
//      the same shock as an unadvertised paywall mid-flow).
//   2. Still surface the engine-quality bullets, because those actually
//      differentiate us from the other "free podcast mastering" tools.
function PricingOverviewBanner() {
  const upgrades = [
    "Spotify-spec loudness (-14 LUFS targeting, not just reference matching)",
    "AI noise reduction toggle — cleans hum, room tone, hiss",
    "All-new polish chain: de-esser, presence lift, leveling compressor",
    "True-peak limiting at -1 dBTP (no more clipped uploads)",
    "Iterative loudness convergence (hits target within 0.3 dB)",
    "24-bit HQ export bundled with every paid master",
  ];

  return (
    <section className="relative mb-10 md:mb-12 overflow-hidden rounded-3xl border border-(--border-hover) bg-(--bg-card) p-6 md:p-8 shadow-lg">
      {/* Decorative gradient glow — themed via the accent-muted variable so
          it fades out on paper-white palettes and glows on dark ones. */}
      <div
        className="pointer-events-none absolute -top-32 -right-32 w-72 h-72 rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, var(--accent-muted) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-32 w-72 h-72 rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, var(--accent-muted) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
        <div>
          <h2 className="text-2xl md:text-4xl font-bold leading-tight mb-2 bg-gradient-to-r from-(--accent-primary) via-(--accent-secondary) to-(--accent-tertiary) bg-clip-text text-transparent">
            Broadcast-ready podcasts in one click
          </h2>
          <p className="text-[var(--text-secondary)] text-sm md:text-base mb-5 max-w-2xl">
            Same mastering chain the pros use — voice-tuned EQ, real broadcast
            loudness, AI noise reduction, true-peak limiting. Sign up to
            download; the mastering itself stays free every day.
          </p>

          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {upgrades.map((upgrade) => (
              <li
                key={upgrade}
                className="flex items-start gap-2 text-[var(--text-secondary)]"
              >
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-(--success)" />
                <span>{upgrade}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing snapshot — the model at a glance so the paywall never
            comes as a surprise. Friendly, not aggressive. */}
        <div className="md:w-[280px] rounded-2xl border border-(--border-hover) bg-(--bg-tertiary) p-5 backdrop-blur">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-(--accent-primary)" />
            <span className="text-xs font-semibold uppercase tracking-wider text-(--accent-primary)">
              How it works
            </span>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-(--success)" />
              <span>
                <span className="font-semibold">1 free master a day</span>
                <span className="block text-xs text-[var(--text-muted)]">
                  Full quality, no watermark
                </span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-(--success)" />
              <span>
                <span className="font-semibold">$2 for more</span>
                <span className="block text-xs text-[var(--text-muted)]">
                  One-time, no subscription
                </span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Gift className="w-4 h-4 mt-0.5 shrink-0 text-(--accent-primary)" />
              <span>
                <span className="font-semibold">Refer a friend</span>
                <span className="block text-xs text-[var(--text-muted)]">
                  Get 7 days unlimited when they pay
                </span>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
