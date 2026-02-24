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
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-[rgba(255,255,255,0.1)]" />
          <div className="hidden sm:block w-40 h-6 rounded bg-[rgba(255,255,255,0.1)]" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-10 rounded-lg bg-[rgba(255,255,255,0.1)]" />
          <div className="w-24 h-10 rounded-xl bg-[rgba(255,255,255,0.1)]" />
        </div>
      </nav>

      {/* Hero skeleton */}
      <header className="text-center mb-12 md:mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(255,255,255,0.05)] mb-6 mx-auto">
          <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
          <div className="w-40 h-4 rounded bg-[rgba(255,255,255,0.1)]" />
        </div>

        <div className="w-3/4 max-w-lg h-14 rounded bg-[rgba(255,255,255,0.1)] mx-auto mb-4" />
        <div className="w-1/2 max-w-md h-14 rounded bg-[rgba(255,255,255,0.1)] mx-auto mb-6" />
        <div className="w-2/3 max-w-xl h-6 rounded bg-[rgba(255,255,255,0.1)] mx-auto mb-8" />

        {/* Feature pills skeleton */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-32 h-10 rounded-full bg-[rgba(255,255,255,0.05)]" />
          ))}
        </div>
      </header>

      {/* Tool skeleton */}
      <div className="glass-card p-6 mb-8">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-48 rounded-xl bg-[rgba(255,255,255,0.05)]" />
          <div className="h-48 rounded-xl bg-[rgba(255,255,255,0.05)]" />
        </div>
        <div className="mt-6 h-14 rounded-xl bg-[rgba(255,255,255,0.1)] w-full" />
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
              gradient: "from-[#f97316] to-[#ea580c]",
            },
            {
              icon: Wand2,
              step: "02",
              title: "Process",
              description: "Our AI engine analyzes and masters your audio to broadcast standards.",
              gradient: "from-[#3b82f6] to-[#2563eb]",
            },
            {
              icon: Volume2,
              step: "03",
              title: "Download",
              description: "Get your professionally mastered file. No watermarks, ready to publish.",
              gradient: "from-[#22c55e] to-[#16a34a]",
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
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[rgba(249,115,22,0.15)] to-transparent rounded-bl-full" />
        
        <div className="relative flex flex-col md:flex-row items-center gap-6">
          <a href="https://www.averageonpurpose.com/" target="_blank" rel="noopener noreferrer" className="shrink-0 group">
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center shadow-lg shadow-[rgba(249,115,22,0.3)] group-hover:scale-105 transition-transform">
              <Headphones className="w-14 h-14 text-white/90" />
            </div>
          </a>
          
          <div className="flex-1 text-center md:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(249,115,22,0.1)] text-xs font-medium text-[#f97316] mb-3">
              <Sparkles className="w-3 h-3" />
              Featured Podcast
            </span>
            <h3 className="text-xl font-bold mb-2">
              <a href="https://www.averageonpurpose.com/" target="_blank" rel="noopener noreferrer" className="hover:text-[#f97316] transition-colors">
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] transition-all text-sm font-medium"
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[rgba(34,197,94,0.2)] to-[rgba(34,197,94,0.1)] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
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
        <div className="absolute top-0 left-0 w-48 h-48 bg-gradient-to-br from-[rgba(59,130,246,0.15)] to-transparent rounded-br-full" />
        
        <div className="relative flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center shadow-lg shadow-[rgba(59,130,246,0.3)]">
            <BookOpen className="w-12 h-12 text-white/90" />
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(59,130,246,0.1)] text-xs font-medium text-[#3b82f6] mb-3">
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
      <section className="mt-12 p-6 rounded-2xl bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)]">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left">
          <div className="w-12 h-12 rounded-xl bg-[rgba(34,197,94,0.15)] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-[#22c55e]" />
          </div>
          <div>
            <h3 className="font-bold text-[#22c55e] mb-1">Your Privacy is Protected</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              All files deleted within 24 hours. No selling, no AI training, no voice cloning.{" "}
              <Link href="/terms" className="text-[#f97316] hover:underline">Terms of Service →</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Open Source Section */}
      <section className="mt-8">
        <a 
          href="https://github.com/yourusername/podcastmaster" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block p-6 rounded-2xl bg-gradient-to-br from-[rgba(139,92,246,0.1)] to-[rgba(59,130,246,0.1)] border border-[rgba(139,92,246,0.3)] hover:border-[rgba(139,92,246,0.5)] transition-all group"
        >
          <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center shrink-0 shadow-lg shadow-[rgba(139,92,246,0.3)] group-hover:scale-105 transition-transform">
              <Github className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                <h3 className="font-bold text-lg">100% Open Source</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#22c55e]/20 text-[#22c55e] uppercase tracking-wider">Verified</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                All code is open source so you can verify we <strong className="text-[var(--text-primary)]">don't train models on your audio</strong> and <strong className="text-[var(--text-primary)]">don't save it</strong>. 
                Free tier files are deleted after 24 hours — paid plans keep files as long as you're subscribed.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#22c55e]" />
                  Zero AI Training
                </span>
                <span className="flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-[#22c55e]" />
                  Auto-Delete 24h
                </span>
                <span className="flex items-center gap-1.5">
                  <Github className="w-3.5 h-3.5 text-[#a78bfa]" />
                  View on GitHub →
                </span>
              </div>
            </div>
          </div>
        </a>
      </section>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-[rgba(255,255,255,0.08)] text-center">
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm mb-6">
          <Link href="/how-to-master-podcast-audio" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            Mastering Guide
          </Link>
          <span className="text-[rgba(255,255,255,0.2)]">|</span>
          <Link href="/pricing" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            Pricing
          </Link>
          <span className="text-[rgba(255,255,255,0.2)]">|</span>
          <Link href="/terms" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            Terms of Service
          </Link>
          <span className="text-[rgba(255,255,255,0.2)]">|</span>
          <a 
            href="https://github.com/yourusername/podcastmaster" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
          >
            <Github className="w-3 h-3" />
            Open Source
          </a>
          <span className="text-[rgba(255,255,255,0.2)]">|</span>
          <a href="mailto:support@freepodcastmastering.com" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1" title="Usually responds within 1 hour">
            <Mail className="w-3 h-3" />
            Support (responds within 1 hour)
          </a>
        </div>
        <p className="font-bold text-lg bg-gradient-to-r from-[#f97316] to-[#3b82f6] bg-clip-text text-transparent mb-2">
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
            background: "radial-gradient(circle, rgba(249,115,22,0.4) 0%, transparent 70%)",
            filter: "blur(80px)",
            top: "-20%",
            left: "-10%",
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-25"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)",
            filter: "blur(80px)",
            bottom: "-10%",
            right: "-5%",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(249,115,22,0.3) 0%, transparent 70%)",
            filter: "blur(60px)",
            top: "50%",
            right: "20%",
          }}
        />
      </div>

      <div className="relative z-10 px-4 py-8 md:py-16">
        <div className="max-w-6xl mx-auto">
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
