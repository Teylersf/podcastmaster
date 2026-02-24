"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Shield,
  Trash2,
  Lock,
  Heart,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import ThemeSelector from "@/components/ThemeSelector";

export default function TermsOfService() {
  return (
    <main className="min-h-screen px-4 py-12 md:py-20">
      <div className="max-w-3xl mx-auto">
        {/* Navigation */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-(--text-secondary) hover:text-(--accent-primary) transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <ThemeSelector />
        </motion.div>

        {/* Header */}
        <motion.header
          className="text-center mb-10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-(--accent-muted) border border-(--border-subtle) flex items-center justify-center">
              <Shield className="w-6 h-6 text-(--accent-primary)" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-base text-(--text-secondary) max-w-lg mx-auto">
            Your privacy matters. Here&apos;s exactly how we handle your data.
          </p>
        </motion.header>

        {/* Key Points Banner */}
        <motion.div
          className="mb-8 p-5 rounded-xl bg-(--success-muted) border border-[rgba(34,197,94,0.15)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-(--success) mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            The Important Stuff (TL;DR)
          </h2>
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <Trash2 className="w-5 h-5 text-(--success) mt-0.5 shrink-0" />
              <p className="text-foreground">
                <strong>All files are automatically deleted within 24 hours</strong> — no exceptions.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-(--success) mt-0.5 shrink-0" />
              <p className="text-foreground">
                <strong>We never sell, share, or use your audio</strong> for any purpose beyond processing your request.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-(--success) mt-0.5 shrink-0">🤖</span>
              <p className="text-foreground">
                <strong>No AI training, no voice cloning</strong> — your voice and content are never used for any AI purposes.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-(--success) mt-0.5 shrink-0" />
              <p className="text-foreground">
                <strong>We don&apos;t retain any copies</strong> of your files after deletion.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-(--success) mt-0.5 shrink-0" />
              <p className="text-foreground">
                <strong>Built for the good of humanity</strong> — helping podcasters master audio without paying a fortune.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Full Terms */}
        <motion.div
          className="space-y-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {/* Section 1 */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <Clock className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">1. File Retention & Deletion</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                When you upload a file to Free Podcast Mastering, it is stored temporarily 
                <strong className="text-foreground"> only for the duration needed to process your audio</strong>.
              </p>
              <p>
                <strong className="text-foreground">All uploaded and processed files are automatically and permanently deleted within 24 hours.</strong> This 
                includes your original uploaded file and the mastered output file.
              </p>
              <p>
                After deletion, <strong className="text-foreground">there is no way for us — or anyone — to recover your files</strong>. 
                Make sure to download your mastered audio before the 24-hour window expires.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <XCircle className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">2. No Selling, Sharing, or Using Your Data</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                <strong className="text-foreground">We do not sell your audio files to anyone.</strong> Period. Never have, never will.
              </p>
              <p>
                <strong className="text-foreground">We do not share your audio files with any third parties.</strong> Your 
                content is not used for advertising, marketing, or any commercial purposes.
              </p>
              <p>
                <strong className="text-foreground">We do not use your audio to train AI models of any kind.</strong> Your 
                voice and content will never be used to train machine learning models, large language models, 
                or any other AI systems.
              </p>
              <p>
                <strong className="text-foreground">We do not use your audio for voice cloning.</strong> Your voice will 
                never be cloned, synthesized, or replicated in any way using your uploaded content.
              </p>
              <p>
                <strong className="text-foreground">We use your files for absolutely nothing</strong> other than processing 
                your mastering request and then deleting them. That&apos;s it.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <Lock className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">3. No Data Retention</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                We operate on a <strong className="text-foreground">zero-retention policy</strong>. We do not:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Keep backup copies of your files</li>
                <li>Store metadata about your audio content</li>
                <li>Maintain logs that identify specific file contents</li>
                <li>Archive any user-uploaded content</li>
              </ul>
              <p className="pt-2">
                Once your files are deleted from our servers, <strong className="text-foreground">they are gone forever</strong>.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <Shield className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">4. Your Rights & Ownership</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                <strong className="text-foreground">You retain full ownership of your content.</strong> By using our service, 
                you do not grant us any rights to your audio beyond what&apos;s needed to process it.
              </p>
              <p>
                We claim no intellectual property rights over your uploaded or processed files.
              </p>
              <p>
                You are responsible for ensuring you have the rights to process any audio you upload.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <Heart className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">5. Our Mission</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                Free Podcast Mastering was built <strong className="text-foreground">for the good of humanity</strong>.
              </p>
              <p>
                We believe everyone should have access to professional-quality audio tools, 
                regardless of their budget. Professional mastering software and services can cost 
                hundreds or thousands of dollars — <strong className="text-foreground">we think that&apos;s ridiculous</strong>.
              </p>
              <p>
                This tool exists to <strong className="text-foreground">help podcasters master their audio without paying a fortune</strong>. 
                We&apos;re podcasters ourselves and understand the struggle of producing quality content 
                on a tight budget. That&apos;s why this service is <strong className="text-foreground">100% free</strong> — 
                no hidden fees, no premium tiers, no upsells, no tricks.
              </p>
              <p>
                <strong className="text-foreground">How do we keep it free?</strong> If the site ever has hosting costs we can&apos;t 
                cover ourselves, we&apos;ll simply run a few non-intrusive on-page ads. That&apos;s it. No premium 
                version, no subscription model, no selling your data. Just a helpful tool for the podcast community.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <span className="text-(--accent-primary) font-bold text-sm">§</span>
              </div>
              <h2 className="text-lg font-semibold">6. Service Terms</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>By using Free Podcast Mastering, you agree that:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>You will not upload content you don&apos;t have rights to process</li>
                <li>You will not attempt to abuse or overload the service</li>
                <li>You understand files are deleted after 24 hours</li>
                <li>You accept the service is provided &quot;as is&quot; without warranties</li>
              </ul>
              <p className="pt-2">
                We reserve the right to modify these terms at any time. Continued use of the service 
                constitutes acceptance of any changes.
              </p>
            </div>
          </section>
        </motion.div>

        {/* Contact */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <p className="text-(--text-muted) text-sm">
            Questions? Email us at{" "}
            <a
              href="mailto:privacy@freepodcastmastering.com"
              className="text-(--accent-primary) hover:underline"
            >
              privacy@freepodcastmastering.com
            </a>
          </p>
          <p className="text-(--text-muted) text-xs mt-3">
            Last updated: November 2024
          </p>
        </motion.div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-(--border-subtle) text-center text-sm text-(--text-muted)">
          <Link href="/" className="text-(--accent-primary) hover:underline">
            ← Back to Home
          </Link>
        </footer>
      </div>
    </main>
  );
}

