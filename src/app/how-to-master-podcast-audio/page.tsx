"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Headphones,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Download,
  Upload,
  Wand2,
  Music,
  Mic,
  Volume2,
  Settings,
  FileAudio,
  Play,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
  Zap,
  Target,
  Clock,
  Star,
  BookOpen,
  Video,
  Scissors,
  Layers,
} from "lucide-react";
import { useState } from "react";
import ThemeSelector from "@/components/ThemeSelector";

// Table of Contents sections
const tableOfContents = [
  { id: "introduction", title: "Introduction to Podcast Mastering" },
  { id: "why-master", title: "Why Master Your Podcast Audio?" },
  { id: "voice-only-method", title: "The Voice-Only Mastering Method" },
  { id: "step-by-step", title: "Step-by-Step Guide" },
  { id: "audacity", title: "Audacity Guide" },
  { id: "davinci-resolve", title: "DaVinci Resolve Guide" },
  { id: "capcut", title: "CapCut Pro Guide" },
  { id: "premiere-pro", title: "Adobe Premiere Pro Guide" },
  { id: "final-cut", title: "Final Cut Pro Guide" },
  { id: "adobe-audition", title: "Adobe Audition Guide" },
  { id: "garageband", title: "GarageBand Guide" },
  { id: "logic-pro", title: "Logic Pro Guide" },
  { id: "reaper", title: "REAPER Guide" },
  { id: "pro-tools", title: "Pro Tools Guide" },
  { id: "hindenburg", title: "Hindenburg Journalist Guide" },
  { id: "descript", title: "Descript Guide" },
  { id: "tips", title: "Pro Tips & Best Practices" },
  { id: "troubleshooting", title: "Troubleshooting Common Issues" },
  { id: "faq", title: "Frequently Asked Questions" },
];

// Expandable section component
function ExpandableSection({ 
  id, 
  title, 
  icon: Icon, 
  children,
  defaultOpen = false 
}: { 
  id: string; 
  title: string; 
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <section id={id} className="scroll-mt-24">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full glass-card p-6 flex items-center justify-between gap-4 text-left hover:border-(--accent-primary) transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-(--accent-muted) flex items-center justify-center shrink-0">
            <Icon className="w-6 h-6 text-(--accent-primary)" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
        </div>
        {isOpen ? (
          <ChevronUp className="w-6 h-6 text-(--text-muted) shrink-0" />
        ) : (
          <ChevronDown className="w-6 h-6 text-(--text-muted) shrink-0" />
        )}
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 glass-card p-6 md:p-8"
        >
          {children}
        </motion.div>
      )}
    </section>
  );
}

// Step component
function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-6">
      <div className="w-10 h-10 rounded-full bg-(--accent-primary) text-white flex items-center justify-center font-bold shrink-0">
        {number}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-lg mb-2">{title}</h4>
        <div className="text-(--text-secondary) space-y-2">{children}</div>
      </div>
    </div>
  );
}

// Pro tip component
function ProTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-[rgba(234,179,8,0.1)] border border-[rgba(234,179,8,0.2)] my-4">
      <div className="flex gap-3">
        <Lightbulb className="w-5 h-5 text-(--warning) shrink-0 mt-0.5" />
        <div className="text-sm text-(--text-secondary)">{children}</div>
      </div>
    </div>
  );
}

// Warning component
function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] my-4">
      <div className="flex gap-3">
        <AlertTriangle className="w-5 h-5 text-(--error) shrink-0 mt-0.5" />
        <div className="text-sm text-(--text-secondary)">{children}</div>
      </div>
    </div>
  );
}

export default function HowToMasterPodcastAudio() {
  return (
    <main className="min-h-screen px-4 py-12 md:py-20">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <motion.nav
          className="flex items-center justify-between mb-12"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-(--accent-muted) border border-(--border-subtle) flex items-center justify-center">
              <Headphones className="w-4 h-4 text-(--accent-primary)" />
            </div>
            <span className="font-semibold text-sm hidden sm:inline">Free Podcast Mastering</span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSelector />
            <Link
              href="/"
              className="btn-primary text-sm"
            >
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">Master Now</span>
            </Link>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <motion.header
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-(--accent-muted) text-sm font-medium text-(--accent-primary) mb-6">
            <BookOpen className="w-4 h-4" />
            Ultimate Guide • 2025 Edition
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight leading-tight">
            <span className="text-gradient">How to Master</span>
            <br />
            Podcast Audio for Free
          </h1>
          <p className="text-xl text-(--text-secondary) max-w-2xl mx-auto mb-8 leading-relaxed">
            The complete guide to professional podcast mastering using the voice-only method. 
            Learn how to achieve broadcast-quality audio in any audio or video editor — 100% free.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-(--text-muted)">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              25 min read
            </span>
            <span className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Updated December 2025
            </span>
            <span className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Beginner to Advanced
            </span>
          </div>
        </motion.header>

        {/* Quick Start CTA */}
        <motion.div
          className="glass-card p-6 md:p-8 mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold mb-4">Ready to Master Your Podcast?</h2>
          <p className="text-(--text-secondary) mb-6 max-w-xl mx-auto">
            Skip the reading and jump straight to our free AI-powered mastering tool. 
            Upload your audio and get professional results in minutes.
          </p>
          <Link href="/" className="btn-primary inline-flex">
            <Wand2 className="w-5 h-5" />
            Start Mastering Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>

        {/* Table of Contents */}
        <motion.div
          className="glass-card p-6 md:p-8 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-(--accent-primary)" />
            Table of Contents
          </h2>
          <div className="grid md:grid-cols-2 gap-2">
            {tableOfContents.map((item, index) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-(--bg-tertiary) transition-colors text-sm"
              >
                <span className="w-6 h-6 rounded-full bg-(--bg-tertiary) flex items-center justify-center text-xs font-medium text-(--text-muted)">
                  {index + 1}
                </span>
                <span className="text-(--text-secondary) hover:text-(--accent-primary)">{item.title}</span>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="space-y-8">
          
          {/* Introduction */}
          <section id="introduction" className="scroll-mt-24">
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-(--accent-muted) flex items-center justify-center">
                  <Mic className="w-6 h-6 text-(--accent-primary)" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">Introduction to Podcast Mastering</h2>
              </div>
              
              <div className="prose prose-lg max-w-none text-(--text-secondary) space-y-4">
                <p>
                  <strong className="text-foreground">Podcast mastering</strong> is the final step in audio production 
                  that transforms your raw recordings into polished, professional-sounding content ready for distribution 
                  across all major platforms like Spotify, Apple Podcasts, Google Podcasts, and more.
                </p>
                
                <p>
                  Whether you&apos;re a solo podcaster recording in your bedroom, a professional production team, or 
                  somewhere in between, mastering is essential for ensuring your podcast sounds consistent, clear, 
                  and competitive with other shows in your niche.
                </p>

                <p>
                  In this comprehensive guide, we&apos;ll teach you the <strong className="text-foreground">voice-only 
                  mastering method</strong> — a professional technique used by top podcast producers to achieve the 
                  cleanest possible audio quality. This method involves isolating your voice tracks, mastering them 
                  separately, and then recombining them with your music and sound effects.
                </p>

                <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">What You&apos;ll Learn</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span>Why mastering your podcast is essential for professional sound quality</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span>The voice-only mastering technique used by professional studios</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span>Step-by-step guides for 12+ popular audio and video editors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span>How to use Free Podcast Mastering&apos;s AI-powered tool</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span>Pro tips for achieving broadcast-quality results every time</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Why Master Your Podcast */}
          <section id="why-master" className="scroll-mt-24">
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-(--accent-muted) flex items-center justify-center">
                  <Target className="w-6 h-6 text-(--accent-primary)" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">Why Master Your Podcast Audio?</h2>
              </div>
              
              <div className="prose prose-lg max-w-none text-(--text-secondary) space-y-4">
                <p>
                  You might be wondering: &quot;Is mastering really necessary for my podcast?&quot; The short answer is 
                  <strong className="text-foreground"> absolutely yes</strong>. Here&apos;s why mastering is 
                  crucial for any serious podcaster:
                </p>

                <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Consistent Volume Levels</h3>
                <p>
                  Have you ever listened to a podcast where one host is too quiet and another is too loud? Or where 
                  the volume jumps around unpredictably? Mastering fixes this by normalizing your audio to consistent 
                  levels that meet broadcast standards like <strong className="text-foreground">-16 LUFS for 
                  podcasts</strong>.
                </p>

                <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Professional Sound Quality</h3>
                <p>
                  Mastering applies subtle EQ adjustments, compression, and limiting that make your voice sound 
                  clearer, more present, and more professional. It&apos;s the difference between sounding like 
                  a bedroom recording and sounding like NPR or Gimlet Media.
                </p>

                <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Platform Compatibility</h3>
                <p>
                  Different podcast platforms have different loudness requirements. Spotify prefers -14 LUFS, 
                  Apple Podcasts recommends -16 LUFS, and YouTube has its own standards. Proper mastering ensures 
                  your podcast sounds great everywhere without automatic normalization ruining your dynamics.
                </p>

                <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Listener Retention</h3>
                <p>
                  Studies show that audio quality directly impacts listener retention. Podcasts with poor audio 
                  quality have significantly higher drop-off rates in the first few minutes. Professional mastering 
                  keeps listeners engaged from start to finish.
                </p>

                <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Brand Perception</h3>
                <p>
                  Your audio quality reflects your brand. A well-mastered podcast signals professionalism, attention 
                  to detail, and respect for your audience. It builds trust and credibility with your listeners.
                </p>

                <div className="p-6 rounded-xl bg-(--success-muted) border border-[rgba(34,197,94,0.2)] mt-8">
                  <h4 className="font-semibold text-(--success) mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    The Good News
                  </h4>
                  <p className="text-(--text-secondary)">
                    With Free Podcast Mastering, you can achieve all of these benefits in minutes — completely free. 
                    Our AI-powered tool analyzes your audio and applies professional-grade processing automatically.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* The Voice-Only Method */}
          <section id="voice-only-method" className="scroll-mt-24">
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-(--accent-muted) flex items-center justify-center">
                  <Mic className="w-6 h-6 text-(--accent-primary)" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">The Voice-Only Mastering Method</h2>
              </div>
              
              <div className="prose prose-lg max-w-none text-(--text-secondary) space-y-4">
                <p>
                  The <strong className="text-foreground">voice-only mastering method</strong> is a professional 
                  technique that separates your voice recordings from music and sound effects before mastering. 
                  This approach yields significantly better results than mastering a mixed audio file.
                </p>

                <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Why Voice-Only Works Better</h3>
                
                <p>
                  When you master audio that contains both voice and music, the mastering algorithm has to make 
                  compromises. The EQ settings that make voice sound crystal clear might not be ideal for music. 
                  The compression that controls vocal dynamics might pump strangely against a music bed.
                </p>

                <p>
                  By isolating just the voice tracks, the mastering algorithm can focus 100% on making your 
                  voice sound perfect. It can apply:
                </p>

                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span><strong className="text-foreground">Voice-optimized EQ</strong> — Enhancing clarity, presence, and intelligibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span><strong className="text-foreground">Dynamic compression</strong> — Smoothing out volume variations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span><strong className="text-foreground">De-essing</strong> — Reducing harsh &quot;S&quot; sounds</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span><strong className="text-foreground">Noise reduction</strong> — Cleaning up background noise</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span><strong className="text-foreground">Loudness optimization</strong> — Meeting broadcast standards</span>
                  </li>
                </ul>

                <ProTip>
                  <strong>Pro Tip:</strong> Even if you don&apos;t use intro music or sound effects, the voice-only 
                  method still applies. Export just your voice recordings, master them, and you&apos;re done!
                </ProTip>

                <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">When to Master With Music</h3>
                
                <p>
                  While the voice-only method is recommended, mastering with music and sound effects included 
                  can still produce great results. You might choose this approach if:
                </p>

                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-5 h-5 text-(--accent-primary) shrink-0 mt-0.5" />
                    <span>You have a very simple setup with no music beds or effects</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-5 h-5 text-(--accent-primary) shrink-0 mt-0.5" />
                    <span>Your music is already professionally mixed and balanced</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-5 h-5 text-(--accent-primary) shrink-0 mt-0.5" />
                    <span>You&apos;re in a hurry and need quick results</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-5 h-5 text-(--accent-primary) shrink-0 mt-0.5" />
                    <span>Your editor doesn&apos;t easily support multi-track export</span>
                  </li>
                </ul>

                <Warning>
                  <strong>Important:</strong> If you master audio with music that has heavy bass or complex 
                  frequencies, the mastering algorithm may affect your voice quality. The voice-only method 
                  avoids this issue entirely.
                </Warning>
              </div>
            </div>
          </section>

          {/* Step by Step Guide */}
          <section id="step-by-step" className="scroll-mt-24">
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-(--accent-muted) flex items-center justify-center">
                  <Settings className="w-6 h-6 text-(--accent-primary)" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">Step-by-Step Guide: The Universal Workflow</h2>
              </div>
              
              <div className="prose prose-lg max-w-none text-(--text-secondary) space-y-4">
                <p>
                  This workflow works with any audio or video editor. Follow these steps to master your 
                  podcast using the voice-only method:
                </p>

                <div className="mt-8 space-y-6">
                  <Step number={1} title="Prepare Your Project">
                    <p>
                      Open your podcast project in your editor. Make sure all your voice tracks are 
                      properly labeled and organized. If you have multiple speakers, each should 
                      ideally be on their own track.
                    </p>
                  </Step>

                  <Step number={2} title="Mute Non-Voice Tracks">
                    <p>
                      Mute or disable all tracks that are not voice recordings. This includes:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Intro/outro music</li>
                      <li>Background music beds</li>
                      <li>Sound effects</li>
                      <li>Jingles and transitions</li>
                      <li>Any pre-recorded segments with music</li>
                    </ul>
                  </Step>

                  <Step number={3} title="Export Voice-Only Audio">
                    <p>
                      Export your project with only the voice tracks enabled. Use these recommended settings:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><strong>Format:</strong> WAV or MP3 (WAV preferred for quality)</li>
                      <li><strong>Sample Rate:</strong> 44.1 kHz or 48 kHz</li>
                      <li><strong>Bit Depth:</strong> 16-bit or 24-bit</li>
                      <li><strong>Channels:</strong> Stereo or Mono</li>
                    </ul>
                  </Step>

                  <Step number={4} title="Master with Free Podcast Mastering">
                    <p>
                      Visit <Link href="/" className="text-(--accent-primary) hover:underline">freepodcastmastering.com</Link> and:
                    </p>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Upload your voice-only audio file</li>
                      <li>Select the &quot;Recommended - Optimized for Voices&quot; preset</li>
                      <li>Click &quot;Start Mastering&quot;</li>
                      <li>Wait for processing (typically 10-40 minutes per hour of audio)</li>
                      <li>Download your mastered file</li>
                    </ol>
                  </Step>

                  <Step number={5} title="Import Mastered Audio">
                    <p>
                      Import the mastered audio file back into your project. Place it on a new track 
                      or replace your original voice tracks. Make sure it&apos;s aligned properly with 
                      your timeline.
                    </p>
                  </Step>

                  <Step number={6} title="Re-enable Other Tracks">
                    <p>
                      Unmute your music, sound effects, and other tracks. You may need to adjust their 
                      volume levels slightly since your voice will now be louder and more present.
                    </p>
                    <ProTip>
                      Lower your music bed by 1-2 dB after importing the mastered voice. The mastered 
                      vocals will cut through the mix better, so you may need less music volume than before.
                    </ProTip>
                  </Step>

                  <Step number={7} title="Final Export">
                    <p>
                      Export your complete podcast with all tracks enabled. Use your platform&apos;s 
                      recommended settings (typically MP3 at 128-192 kbps for podcast distribution).
                    </p>
                  </Step>
                </div>
              </div>
            </div>
          </section>

          {/* Editor-Specific Guides */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
              Editor-Specific Guides
            </h2>
            <p className="text-(--text-secondary) text-center mb-8 max-w-2xl mx-auto">
              Click on your audio or video editor below for detailed, step-by-step instructions 
              tailored to your specific software.
            </p>
          </motion.div>

          {/* Audacity Guide */}
          <ExpandableSection id="audacity" title="Audacity - Free Audio Editor" icon={Volume2}>
            <div className="prose prose-lg max-w-none text-(--text-secondary) space-y-4">
              <p>
                <strong className="text-foreground">Audacity</strong> is a free, open-source audio editor 
                available for Windows, Mac, and Linux. It&apos;s perfect for podcasters on a budget who need 
                powerful editing capabilities.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-4">Exporting Voice-Only in Audacity</h3>
              
              <Step number={1} title="Open Your Project">
                <p>Open your Audacity project file (.aup3) containing all your podcast tracks.</p>
              </Step>

              <Step number={2} title="Mute Non-Voice Tracks">
                <p>
                  Click the <strong>Mute</strong> button (speaker icon) on each track that contains 
                  music or sound effects. Only your voice tracks should remain unmuted.
                </p>
              </Step>

              <Step number={3} title="Select All Audio">
                <p>
                  Press <kbd className="px-2 py-1 rounded bg-(--bg-tertiary) text-sm">Ctrl+A</kbd> (Windows) 
                  or <kbd className="px-2 py-1 rounded bg-(--bg-tertiary) text-sm">Cmd+A</kbd> (Mac) to select all audio.
                </p>
              </Step>

              <Step number={4} title="Export as WAV">
                <p>
                  Go to <strong>File → Export → Export as WAV</strong>. Choose a filename like 
                  &quot;podcast-voices-only.wav&quot; and save it.
                </p>
              </Step>

              <Step number={5} title="Master Your Audio">
                <p>
                  Upload the exported file to <Link href="/" className="text-(--accent-primary) hover:underline">
                  Free Podcast Mastering</Link>, select the voice-optimized preset, and download the mastered file.
                </p>
              </Step>

              <Step number={6} title="Import Mastered File">
                <p>
                  Go to <strong>File → Import → Audio</strong> and select your mastered file. 
                  It will appear as a new track.
                </p>
              </Step>

              <Step number={7} title="Replace Original Voices">
                <p>
                  Delete or mute your original voice tracks, unmute your music/effects tracks, 
                  and align the mastered track with your timeline. Use the Time Shift Tool to 
                  position it correctly.
                </p>
              </Step>

              <Step number={8} title="Final Export">
                <p>
                  Go to <strong>File → Export → Export as MP3</strong>. Set the bit rate to 
                  128-192 kbps for podcast distribution.
                </p>
              </Step>

              <ProTip>
                <strong>Audacity Tip:</strong> Use labels (Ctrl+B) to mark important points in your 
                timeline before exporting. This makes it easier to align the mastered audio when you 
                import it back.
              </ProTip>
            </div>
          </ExpandableSection>

          {/* DaVinci Resolve Guide */}
          <ExpandableSection id="davinci-resolve" title="DaVinci Resolve - Free Video Editor" icon={Video}>
            <div className="prose prose-lg max-w-none text-(--text-secondary) space-y-4">
              <p>
                <strong className="text-foreground">DaVinci Resolve</strong> is a professional-grade 
                video editor that&apos;s free to use. It includes Fairlight, a complete digital audio workstation, 
                making it excellent for video podcasts.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-4">Exporting Voice-Only in DaVinci Resolve</h3>
              
              <Step number={1} title="Open Your Project">
                <p>Open your DaVinci Resolve project in the Edit or Fairlight page.</p>
              </Step>

              <Step number={2} title="Solo Voice Tracks">
                <p>
                  In the mixer panel, click the <strong>S</strong> (Solo) button on your voice tracks. 
                  This will mute all other tracks automatically.
                </p>
              </Step>

              <Step number={3} title="Go to Deliver Page">
                <p>
                  Click the <strong>Deliver</strong> tab at the bottom of the screen to access export settings.
                </p>
              </Step>

              <Step number={4} title="Configure Audio Export">
                <p>
                  Under Format, select <strong>Audio Only</strong>. Choose WAV as the format. 
                  Set the sample rate to 48 kHz (standard for video) or 44.1 kHz.
                </p>
              </Step>

              <Step number={5} title="Add to Render Queue">
                <p>
                  Click <strong>Add to Render Queue</strong>, then click <strong>Render All</strong>.
                </p>
              </Step>

              <Step number={6} title="Master and Re-import">
                <p>
                  Upload to Free Podcast Mastering, download the mastered file, and import it back 
                  using <strong>File → Import → Media</strong>.
                </p>
              </Step>

              <Step number={7} title="Replace and Align">
                <p>
                  Drag the mastered audio to a new track, disable solo mode on your original tracks, 
                  and mute or delete the original voice tracks. Enable your music and effects tracks.
                </p>
              </Step>

              <ProTip>
                <strong>DaVinci Resolve Tip:</strong> Use the Fairlight page for precise audio alignment. 
                The waveform display makes it easy to match the mastered audio with your original timeline.
              </ProTip>
            </div>
          </ExpandableSection>

          {/* CapCut Pro Guide */}
          <ExpandableSection id="capcut" title="CapCut Pro - Popular Video Editor" icon={Scissors}>
            <div className="prose prose-lg max-w-none text-(--text-secondary) space-y-4">
              <p>
                <strong className="text-foreground">CapCut Pro</strong> is a popular video editor 
                especially loved by content creators and podcasters creating video content for YouTube, 
                TikTok, and social media platforms.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-4">Exporting Voice-Only in CapCut Pro</h3>
              
              <Step number={1} title="Open Your Project">
                <p>Open your CapCut project containing your podcast video or audio.</p>
              </Step>

              <Step number={2} title="Mute Music and Effects">
                <p>
                  Click on each music or sound effect track and either mute it or set its volume to 0. 
                  You can also temporarily delete these clips and re-add them later.
                </p>
              </Step>

              <Step number={3} title="Export Audio Only">
                <p>
                  Go to <strong>Export</strong> and look for audio export options. If CapCut doesn&apos;t 
                  support audio-only export, export as a video with lowest quality settings, then 
                  extract the audio using a free tool or convert it.
                </p>
              </Step>

              <Step number={4} title="Master Your Audio">
                <p>
                  Upload the extracted audio to Free Podcast Mastering and download the mastered version.
                </p>
              </Step>

              <Step number={5} title="Replace Audio">
                <p>
                  Import the mastered audio, add it to your timeline, and re-enable your music 
                  and sound effect tracks.
                </p>
              </Step>

              <ProTip>
                <strong>CapCut Tip:</strong> If you&apos;re creating short-form content from your podcast, 
                master the full episode first, then create your clips. This ensures consistent audio 
                quality across all your content.
              </ProTip>
            </div>
          </ExpandableSection>

          {/* Premiere Pro Guide */}
          <ExpandableSection id="premiere-pro" title="Adobe Premiere Pro - Professional Video Editor" icon={Video}>
            <div className="prose prose-lg max-w-none text-(--text-secondary) space-y-4">
              <p>
                <strong className="text-foreground">Adobe Premiere Pro</strong> is the industry-standard 
                video editing software used by professionals worldwide. Its advanced audio capabilities 
                make it excellent for video podcasts.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-4">Exporting Voice-Only in Premiere Pro</h3>
              
              <Step number={1} title="Open Your Sequence">
                <p>Open your Premiere Pro project and navigate to your podcast sequence.</p>
              </Step>

              <Step number={2} title="Solo Voice Tracks">
                <p>
                  In the Audio Track Mixer (Window → Audio Track Mixer), click the <strong>S</strong> button 
                  on your voice tracks to solo them. All other audio will be muted.
                </p>
              </Step>

              <Step number={3} title="Export Audio Only">
                <p>
                  Go to <strong>File → Export → Media</strong>. Under Format, select <strong>AIFF</strong> 
                  or <strong>WAV</strong>. Uncheck &quot;Export Video&quot; if you only need audio.
                </p>
              </Step>

              <Step number={4} title="Configure Audio Settings">
                <p>
                  In the Audio tab, set Sample Rate to 48000 Hz, Channels to Stereo, and 
                  Sample Size to 16 or 24 bit.
                </p>
              </Step>

              <Step number={5} title="Export and Master">
                <p>
                  Click Export, upload to Free Podcast Mastering, and download your mastered file.
                </p>
              </Step>

              <Step number={6} title="Import and Replace">
                <p>
                  Import the mastered audio via <strong>File → Import</strong>. Place it on a new 
                  audio track, unsolo your original tracks, and mute or delete the original voice audio.
                </p>
              </Step>

              <ProTip>
                <strong>Premiere Pro Tip:</strong> Use the Essential Sound panel (Window → Essential Sound) 
                to tag your tracks as Dialogue, Music, or SFX. This helps with organization and makes 
                it easier to identify which tracks to solo.
              </ProTip>
            </div>
          </ExpandableSection>

          {/* Final Cut Pro Guide */}
          <ExpandableSection id="final-cut" title="Final Cut Pro - Mac Video Editor" icon={Video}>
            <div className="prose prose-lg max-w-none text-(--text-secondary) space-y-4">
              <p>
                <strong className="text-foreground">Final Cut Pro</strong> is Apple&apos;s professional 
                video editing software for Mac. It offers powerful audio editing capabilities and 
                integrates seamlessly with other Apple products.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-4">Exporting Voice-Only in Final Cut Pro</h3>
              
              <Step number={1} title="Open Your Project">
                <p>Open your Final Cut Pro project and select your timeline.</p>
              </Step>

              <Step number={2} title="Create Audio Roles">
                <p>
                  If you haven&apos;t already, assign roles to your clips. Select voice clips and 
                  assign them a &quot;Dialogue&quot; role. Assign music to &quot;Music&quot; role.
                </p>
              </Step>

              <Step number={3} title="Solo Dialogue Role">
                <p>
                  In the Timeline Index (press <kbd className="px-2 py-1 rounded bg-(--bg-tertiary) text-sm">Cmd+Shift+2</kbd>), 
                  go to the Roles tab and solo only the Dialogue role by Option-clicking its checkbox.
                </p>
              </Step>

              <Step number={4} title="Export Audio">
                <p>
                  Go to <strong>File → Share → Master File</strong>. In Settings, change Format to 
                  &quot;Audio Only&quot; and select AIFF or WAV.
                </p>
              </Step>

              <Step number={5} title="Master and Import">
                <p>
                  Upload to Free Podcast Mastering, download the mastered file, and import it 
                  back into your project.
                </p>
              </Step>

              <Step number={6} title="Replace Audio">
                <p>
                  Place the mastered audio in your timeline, unsolo the Dialogue role, and 
                  disable or delete the original voice clips.
                </p>
              </Step>

              <ProTip>
                <strong>Final Cut Pro Tip:</strong> Use Compound Clips to group your voice tracks 
                together. This makes it easier to manage and replace them with the mastered version.
              </ProTip>
            </div>
          </ExpandableSection>

          {/* Adobe Audition Guide */}
          <ExpandableSection id="adobe-audition" title="Adobe Audition - Professional Audio Workstation" icon={Volume2}>
            <div className="prose prose-lg max-w-none text-(--text-secondary) space-y-4">
              <p>
                <strong className="text-foreground">Adobe Audition</strong> is a professional 
                digital audio workstation designed specifically for audio production, making it 
                ideal for podcasters who want granular control over their sound.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-4">Exporting Voice-Only in Adobe Audition</h3>
              
              <Step number={1} title="Open Multitrack Session">
                <p>Open your Adobe Audition multitrack session (.sesx file).</p>
              </Step>

              <Step number={2} title="Solo Voice Tracks">
                <p>
                  Click the <strong>S</strong> button on each voice track to solo them. 
                  All music and effects tracks will be muted automatically.
                </p>
              </Step>

              <Step number={3} title="Select Time Range">
                <p>
                  In the timeline, select the entire session by pressing 
                  <kbd className="px-2 py-1 rounded bg-(--bg-tertiary) text-sm">Ctrl+A</kbd>.
                </p>
              </Step>

              <Step number={4} title="Mixdown to New File">
                <p>
                  Go to <strong>Multitrack → Mixdown Session to New File</strong>. Choose 
                  &quot;Entire Session&quot; and select WAV format with 48 kHz sample rate.
                </p>
              </Step>

              <Step number={5} title="Save and Master">
                <p>
                  Save the mixdown, upload it to Free Podcast Mastering, and download the 
                  mastered version.
                </p>
              </Step>

              <Step number={6} title="Import and Replace">
                <p>
                  Import the mastered file to a new track, unsolo your original voice tracks, 
                  then mute or delete them. Your mastered voice will now play with your music 
                  and effects.
                </p>
              </Step>

              <ProTip>
                <strong>Audition Tip:</strong> Use Audition&apos;s Session Templates to save your 
                track layout. This speeds up future episodes and ensures consistency.
              </ProTip>
            </div>
          </ExpandableSection>

          {/* GarageBand Guide */}
          <ExpandableSection id="garageband" title="GarageBand - Free Mac/iOS Audio Editor" icon={Music}>
            <div className="prose prose-lg max-w-none text-(--text-secondary) space-y-4">
              <p>
                <strong className="text-foreground">GarageBand</strong> is Apple&apos;s free audio 
                production software available on Mac and iOS. It&apos;s beginner-friendly while still 
                offering powerful features for podcasters.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-4">Exporting Voice-Only in GarageBand</h3>
              
              <Step number={1} title="Open Your Project">
                <p>Open your GarageBand project containing your podcast.</p>
              </Step>

              <Step number={2} title="Mute Non-Voice Tracks">
                <p>
                  Click the headphone icon (Mute) on each track that isn&apos;t voice audio. 
                  Only your voice tracks should remain active.
                </p>
              </Step>

              <Step number={3} title="Export Project">
                <p>
                  Go to <strong>Share → Export Song to Disk</strong>. Select AIFF or WAV format, 
                  choose maximum quality, and save the file.
                </p>
              </Step>

              <Step number={4} title="Master Your Audio">
                <p>
                  Upload to Free Podcast Mastering, select the voice preset, and download 
                  your mastered file.
                </p>
              </Step>

              <Step number={5} title="Import Mastered Audio">
                <p>
                  Drag the mastered file into GarageBand to create a new track. Position it 
                  at the beginning of your timeline.
                </p>
              </Step>

              <Step number={6} title="Unmute and Finalize">
                <p>
                  Unmute your music and effects tracks, mute or delete the original voice 
                  tracks, and adjust volume levels as needed.
                </p>
              </Step>

              <ProTip>
                <strong>GarageBand Tip:</strong> Use the Track Header area to color-code your 
                tracks. Make all voice tracks one color and music/effects another for easy 
                identification.
              </ProTip>
            </div>
          </ExpandableSection>

          {/* Logic Pro Guide */}
          <ExpandableSection id="logic-pro" title="Logic Pro - Professional Mac DAW" icon={Music}>
            <div className="prose prose-lg max-w-none text-(--text-secondary) space-y-4">
              <p>
                <strong className="text-foreground">Logic Pro</strong> is Apple&apos;s professional 
                digital audio workstation, offering advanced features for music and audio production. 
                Many professional podcasters use Logic Pro for its superior audio capabilities.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-4">Exporting Voice-Only in Logic Pro</h3>
              
              <Step number={1} title="Open Your Project">
                <p>Open your Logic Pro project.</p>
              </Step>

              <Step number={2} title="Solo Voice Tracks">
                <p>
                  Click the <strong>S</strong> button on your voice tracks to solo them. 
                  Use <kbd className="px-2 py-1 rounded bg-(--bg-tertiary) text-sm">Option+S</kbd> to 
                  solo multiple tracks at once.
                </p>
              </Step>

              <Step number={3} title="Bounce Project">
                <p>
                  Go to <strong>File → Bounce → Project or Section</strong>. Select your 
                  preferred format (AIFF or WAV) and destination.
                </p>
              </Step>

              <Step number={4} title="Configure Settings">
                <p>
                  Set Resolution to 24-bit, Sample Rate to 48 kHz, and File Type to 
                  Interleaved. Click Bounce.
                </p>
              </Step>

              <Step number={5} title="Master and Import">
                <p>
                  Upload to Free Podcast Mastering, download the mastered file, and drag 
                  it into your Logic Pro project.
                </p>
              </Step>

              <Step number={6} title="Replace Tracks">
                <p>
                  Unsolo your original tracks, mute or delete the original voice recordings, 
                  and adjust levels for your music and effects.
                </p>
              </Step>

              <ProTip>
                <strong>Logic Pro Tip:</strong> Create Track Stacks to group related tracks together. 
                Put all voice tracks in one stack and all music in another for easy management.
              </ProTip>
            </div>
          </ExpandableSection>

          {/* REAPER Guide */}
          <ExpandableSection id="reaper" title="REAPER - Affordable Professional DAW" icon={Volume2}>
            <div className="prose prose-lg max-w-none text-(--text-secondary) space-y-4">
              <p>
                <strong className="text-foreground">REAPER</strong> is an affordable, professional-grade 
                digital audio workstation loved by podcasters for its flexibility, extensive customization 
                options, and low price point.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-4">Exporting Voice-Only in REAPER</h3>
              
              <Step number={1} title="Open Your Project">
                <p>Open your REAPER project file (.rpp).</p>
              </Step>

              <Step number={2} title="Solo Voice Tracks">
                <p>
                  Click the <strong>Solo</strong> button on each voice track, or select multiple 
                  tracks and press <kbd className="px-2 py-1 rounded bg-(--bg-tertiary) text-sm">Alt+Solo</kbd>.
                </p>
              </Step>

              <Step number={3} title="Render Project">
                <p>
                  Go to <strong>File → Render</strong> or press 
                  <kbd className="px-2 py-1 rounded bg-(--bg-tertiary) text-sm">Ctrl+Alt+R</kbd>.
                </p>
              </Step>

              <Step number={4} title="Configure Render Settings">
                <p>
                  Set Output Format to WAV, Sample rate to 48000, and Channels to Stereo. 
                  Under &quot;Source&quot;, make sure &quot;Master mix&quot; is selected.
                </p>
              </Step>

              <Step number={5} title="Render and Master">
                <p>
                  Click Render, then upload the file to Free Podcast Mastering.
                </p>
              </Step>

              <Step number={6} title="Import Mastered File">
                <p>
                  Drag the mastered file into REAPER, unsolo your tracks, and mute or 
                  remove the original voice tracks.
                </p>
              </Step>

              <ProTip>
                <strong>REAPER Tip:</strong> Use REAPER&apos;s custom actions to create a one-click 
                &quot;Export Voice Only&quot; action that solos voice tracks and opens the render dialog.
              </ProTip>
            </div>
          </ExpandableSection>

          {/* Pro Tools Guide */}
          <ExpandableSection id="pro-tools" title="Pro Tools - Industry Standard DAW" icon={Volume2}>
            <div className="prose prose-lg max-w-none text-(--text-secondary) space-y-4">
              <p>
                <strong className="text-foreground">Pro Tools</strong> is the industry-standard 
                digital audio workstation used in professional recording studios worldwide. Many 
                high-profile podcasts are produced in Pro Tools.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-4">Exporting Voice-Only in Pro Tools</h3>
              
              <Step number={1} title="Open Your Session">
                <p>Open your Pro Tools session containing your podcast.</p>
              </Step>

              <Step number={2} title="Solo Voice Tracks">
                <p>
                  Click the <strong>S</strong> button on each voice track. Hold 
                  <kbd className="px-2 py-1 rounded bg-(--bg-tertiary) text-sm">Option</kbd> (Mac) or 
                  <kbd className="px-2 py-1 rounded bg-(--bg-tertiary) text-sm">Alt</kbd> (Windows) and 
                  click to solo multiple tracks.
                </p>
              </Step>

              <Step number={3} title="Select All and Bounce">
                <p>
                  Select the entire timeline, then go to <strong>File → Bounce Mix</strong> 
                  or press <kbd className="px-2 py-1 rounded bg-(--bg-tertiary) text-sm">Cmd+Opt+B</kbd>.
                </p>
              </Step>

              <Step number={4} title="Configure Bounce Settings">
                <p>
                  Choose WAV (BWF) format, 24-bit resolution, and your session&apos;s sample rate. 
                  Enable &quot;Offline&quot; for faster bouncing.
                </p>
              </Step>

              <Step number={5} title="Bounce, Master, and Import">
                <p>
                  Bounce the file, upload to Free Podcast Mastering, download the mastered 
                  version, and import it via <strong>File → Import → Audio</strong>.
                </p>
              </Step>

              <Step number={6} title="Replace and Finalize">
                <p>
                  Place the mastered audio on a new track, unsolo all tracks, and mute 
                  or make inactive the original voice tracks.
                </p>
              </Step>

              <ProTip>
                <strong>Pro Tools Tip:</strong> Use Track Groups to link your voice tracks together. 
                This makes soloing and muting faster and ensures you don&apos;t miss any tracks.
              </ProTip>
            </div>
          </ExpandableSection>

          {/* Hindenburg Guide */}
          <ExpandableSection id="hindenburg" title="Hindenburg Journalist - Made for Podcasters" icon={Mic}>
            <div className="prose prose-lg max-w-none text-(--text-secondary) space-y-4">
              <p>
                <strong className="text-foreground">Hindenburg Journalist</strong> is an audio editor 
                designed specifically for radio producers and podcasters. It includes features like 
                automatic leveling and voice profiling built-in.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-4">Exporting Voice-Only in Hindenburg</h3>
              
              <Step number={1} title="Open Your Project">
                <p>Open your Hindenburg project.</p>
              </Step>

              <Step number={2} title="Mute Non-Voice Tracks">
                <p>
                  Click the <strong>M</strong> (Mute) button on all tracks that contain 
                  music, sound effects, or other non-voice content.
                </p>
              </Step>

              <Step number={3} title="Export Audio">
                <p>
                  Go to <strong>File → Export</strong>. Choose WAV format and select 
                  your desired quality settings.
                </p>
              </Step>

              <Step number={4} title="Master with Free Podcast Mastering">
                <p>
                  Upload your exported file, select the voice-optimized preset, and 
                  download the mastered version.
                </p>
              </Step>

              <Step number={5} title="Import and Replace">
                <p>
                  Import the mastered file, unmute your other tracks, and mute or 
                  delete the original voice recordings.
                </p>
              </Step>

              <ProTip>
                <strong>Hindenburg Tip:</strong> Even though Hindenburg has built-in leveling, 
                using Free Podcast Mastering for your voice tracks can provide additional 
                polish and ensure platform compliance.
              </ProTip>
            </div>
          </ExpandableSection>

          {/* Descript Guide */}
          <ExpandableSection id="descript" title="Descript - AI-Powered Editor" icon={FileAudio}>
            <div className="prose prose-lg max-w-none text-(--text-secondary) space-y-4">
              <p>
                <strong className="text-foreground">Descript</strong> is an innovative audio/video 
                editor that uses AI to enable text-based editing. It&apos;s becoming increasingly popular 
                among podcasters for its unique workflow.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-4">Exporting Voice-Only in Descript</h3>
              
              <Step number={1} title="Open Your Project">
                <p>Open your Descript composition.</p>
              </Step>

              <Step number={2} title="Identify Speaker Tracks">
                <p>
                  Descript automatically separates speakers. Identify which tracks 
                  contain voice vs. music or effects.
                </p>
              </Step>

              <Step number={3} title="Remove Non-Voice Content Temporarily">
                <p>
                  Select and cut (don&apos;t delete) any music or sound effect sections. 
                  Save the cut content for later.
                </p>
              </Step>

              <Step number={4} title="Export Voice-Only">
                <p>
                  Go to <strong>File → Export</strong> and choose your audio format 
                  (WAV recommended).
                </p>
              </Step>

              <Step number={5} title="Master Your Audio">
                <p>
                  Upload to Free Podcast Mastering and download the mastered version.
                </p>
              </Step>

              <Step number={6} title="Replace Audio in Descript">
                <p>
                  Import the mastered audio, then restore your music and effects 
                  by pasting them back in their original positions.
                </p>
              </Step>

              <ProTip>
                <strong>Descript Tip:</strong> Use Descript&apos;s &quot;Underlays&quot; feature to add music 
                beds. These can be easily muted when exporting voice-only audio.
              </ProTip>
            </div>
          </ExpandableSection>

          {/* Pro Tips Section */}
          <section id="tips" className="scroll-mt-24">
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-(--accent-muted) flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-(--accent-primary)" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">Pro Tips & Best Practices</h2>
              </div>
              
              <div className="prose prose-lg max-w-none text-(--text-secondary) space-y-6">
                <h3 className="text-xl font-semibold text-foreground">Recording Tips</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span><strong>Record in a quiet environment</strong> — Even the best mastering can&apos;t remove loud background noise</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span><strong>Use a pop filter</strong> — Prevents plosives that are difficult to fix in post</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span><strong>Maintain consistent mic distance</strong> — 4-6 inches is ideal for most mics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span><strong>Record each speaker on separate tracks</strong> — Makes editing and mastering easier</span>
                  </li>
                </ul>

                <h3 className="text-xl font-semibold text-foreground mt-8">Export Settings</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span><strong>Use WAV format when possible</strong> — Highest quality for mastering</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span><strong>48 kHz sample rate</strong> — Standard for video; 44.1 kHz works for audio-only</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span><strong>24-bit depth for editing</strong> — More headroom; export final as 16-bit</span>
                  </li>
                </ul>

                <h3 className="text-xl font-semibold text-foreground mt-8">Mixing with Music</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span><strong>Lower music bed by 1-2 dB after mastering</strong> — Mastered voice is more present</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span><strong>Use ducking/sidechain</strong> — Automatically lower music when speaking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                    <span><strong>Keep intro music at normal level</strong> — Only duck during speech</span>
                  </li>
                </ul>

                <h3 className="text-xl font-semibold text-foreground mt-8">Platform-Specific Tips</h3>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 rounded-lg bg-(--bg-tertiary)">
                    <h4 className="font-semibold text-foreground mb-2">Spotify</h4>
                    <p className="text-sm">Target -14 LUFS for optimal loudness normalization.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-(--bg-tertiary)">
                    <h4 className="font-semibold text-foreground mb-2">Apple Podcasts</h4>
                    <p className="text-sm">Target -16 LUFS as recommended by Apple.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-(--bg-tertiary)">
                    <h4 className="font-semibold text-foreground mb-2">YouTube</h4>
                    <p className="text-sm">Target -14 LUFS; YouTube normalizes to -14 LUFS.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-(--bg-tertiary)">
                    <h4 className="font-semibold text-foreground mb-2">General Distribution</h4>
                    <p className="text-sm">Target -16 LUFS for widest compatibility.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Troubleshooting */}
          <section id="troubleshooting" className="scroll-mt-24">
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-(--accent-muted) flex items-center justify-center">
                  <Settings className="w-6 h-6 text-(--accent-primary)" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">Troubleshooting Common Issues</h2>
              </div>
              
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-(--bg-tertiary)">
                  <h3 className="font-semibold text-foreground mb-2">
                    Mastered audio doesn&apos;t align with my timeline
                  </h3>
                  <p className="text-(--text-secondary) text-sm">
                    Make sure you export from the very beginning of your timeline (time 0:00). 
                    If your audio starts mid-timeline, add silence or adjust the import position.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-(--bg-tertiary)">
                  <h3 className="font-semibold text-foreground mb-2">
                    Music sounds too quiet after adding mastered voice
                  </h3>
                  <p className="text-(--text-secondary) text-sm">
                    This is normal! Your mastered voice is now louder and more present. 
                    Boost your music by 1-2 dB or use the volume you had before mastering.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-(--bg-tertiary)">
                  <h3 className="font-semibold text-foreground mb-2">
                    File won&apos;t upload to Free Podcast Mastering
                  </h3>
                  <p className="text-(--text-secondary) text-sm">
                    Check that your file is under 500MB and in a supported format (WAV, MP3, 
                    FLAC, M4A, AIFF, OGG). Try converting to WAV if other formats fail.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-(--bg-tertiary)">
                  <h3 className="font-semibold text-foreground mb-2">
                    Mastering is taking a long time
                  </h3>
                  <p className="text-(--text-secondary) text-sm">
                    Processing time is approximately 10-40 minutes per hour of audio. 
                    Sign up for email notifications so you can close the tab and get notified when done.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-(--bg-tertiary)">
                  <h3 className="font-semibold text-foreground mb-2">
                    Audio sounds over-compressed or distorted
                  </h3>
                  <p className="text-(--text-secondary) text-sm">
                    Try the &quot;Gentle&quot; limiter setting instead of &quot;Loud&quot;. Also ensure your 
                    original recording isn&apos;t clipping — mastering can&apos;t fix distorted source audio.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section id="faq" className="scroll-mt-24">
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-(--accent-muted) flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-(--accent-primary)" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">Frequently Asked Questions</h2>
              </div>
              
              <div className="space-y-4">
                {[
                  {
                    q: "Is Free Podcast Mastering really free?",
                    a: "Yes! Free users can master 2 files per week at no cost. There are no watermarks, no quality restrictions, and no signup required. Premium users get unlimited mastering and additional features."
                  },
                  {
                    q: "What file formats do you support?",
                    a: "We support WAV, MP3, FLAC, M4A, AIFF, and OGG formats. For best results, we recommend uploading in WAV format at 44.1 kHz or 48 kHz."
                  },
                  {
                    q: "How long does mastering take?",
                    a: "Processing time is typically 10-40 minutes per hour of audio, depending on file size and server load. You can sign up for email notifications to be alerted when your file is ready."
                  },
                  {
                    q: "Will mastering fix my bad recording?",
                    a: "Mastering can significantly improve good recordings, but it can't fix fundamental issues like heavy background noise, distortion, or room echo. Always aim for the best possible recording quality."
                  },
                  {
                    q: "Should I master before or after adding music?",
                    a: "We recommend mastering your voice tracks separately (before adding music), then mixing the mastered voice with your music. This gives the best results as explained in our voice-only method above."
                  },
                  {
                    q: "What's the difference between mixing and mastering?",
                    a: "Mixing involves balancing multiple tracks (adjusting levels, panning, effects). Mastering is the final step that polishes the overall sound, ensures consistent loudness, and prepares audio for distribution."
                  },
                  {
                    q: "Can I use this for video podcasts?",
                    a: "Absolutely! Extract or export just the audio track from your video editor, master it with our tool, then import the mastered audio back into your video project."
                  },
                  {
                    q: "What loudness level does your mastering target?",
                    a: "Our tool targets -16 LUFS, which is the recommended standard for podcasts and compatible with all major platforms including Spotify, Apple Podcasts, and YouTube."
                  },
                ].map((faq, index) => (
                  <div key={index} className="p-4 rounded-lg bg-(--bg-tertiary)">
                    <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                    <p className="text-(--text-secondary) text-sm">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="glass-card p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Master Your Podcast?</h2>
            <p className="text-(--text-secondary) mb-8 max-w-xl mx-auto">
              Now that you know the professional voice-only mastering technique, it&apos;s time to 
              put it into practice. Get broadcast-quality audio in minutes — completely free.
            </p>
            <Link href="/" className="btn-primary inline-flex text-lg px-8 py-4">
              <Wand2 className="w-6 h-6" />
              Start Mastering Free
              <ArrowRight className="w-6 h-6" />
            </Link>
            <p className="text-sm text-(--text-muted) mt-4">
              No signup required • No watermarks • 100% free
            </p>
          </section>

        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-(--border-subtle) text-center">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-(--text-muted) mb-6">
            <Link href="/" className="hover:text-(--accent-primary) transition-colors">Home</Link>
            <Link href="/pricing" className="hover:text-(--accent-primary) transition-colors">Pricing</Link>
            <Link href="/terms" className="hover:text-(--accent-primary) transition-colors">Terms of Service</Link>
            <Link href="/dashboard" className="hover:text-(--accent-primary) transition-colors">Dashboard</Link>
          </div>
          <p className="text-sm text-(--text-muted)">
            © {new Date().getFullYear()} Free Podcast Mastering. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}

