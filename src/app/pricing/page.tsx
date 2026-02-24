"use client";

import { useUser } from "@stackframe/stack";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Headphones,
  Crown,
  Check,
  X,
  Zap,
  HardDrive,
  Clock,
  FileAudio,
  Sparkles,
  ArrowRight,
  Loader2,
  Shield,
} from "lucide-react";
import ThemeSelector from "@/components/ThemeSelector";

export default function PricingPage() {
  const user = useUser();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [hqCheckoutLoading, setHqCheckoutLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      // Redirect to sign up first
      window.location.href = "/handler/sign-up?after_auth_return_to=/pricing";
      return;
    }

    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleHqPurchase = async () => {
    if (!user) {
      // Redirect to sign up first
      window.location.href = "/handler/sign-up?after_auth_return_to=/pricing";
      return;
    }

    setHqCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/purchase-hq", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("HQ checkout error:", error);
    } finally {
      setHqCheckoutLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-12 md:py-20">
      <div className="max-w-5xl mx-auto">
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
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg border border-(--border-subtle) hover:border-(--accent-primary) transition-colors text-sm"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/handler/sign-in"
                className="px-4 py-2 rounded-lg text-(--text-secondary) hover:text-foreground transition-colors text-sm"
              >
                Sign In
              </Link>
            )}
          </div>
        </motion.nav>

        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            <span className="text-gradient">Simple, Transparent Pricing</span>
          </h1>
          <p className="text-lg text-(--text-secondary) max-w-xl mx-auto">
            Start mastering for free. Upgrade when you need more.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          {/* Free Plan */}
          <motion.div
            className="glass-card p-8 relative"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Free</h3>
              <p className="text-(--text-secondary) text-sm">Perfect for trying out the service</p>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-(--text-muted)">/forever</span>
            </div>

            <Link
              href={user ? "/" : "/handler/sign-up"}
              className="w-full mb-8 px-6 py-3 rounded-lg border border-(--border-subtle) hover:border-(--accent-primary) transition-colors flex items-center justify-center gap-2 font-medium"
            >
              {user ? "Start Mastering" : "Get Started Free"}
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="space-y-4">
              <p className="text-sm font-medium text-(--text-secondary) mb-3">What&apos;s included:</p>
              
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">2 files per week</p>
                  <p className="text-xs text-(--text-muted)">Master up to 2 podcasts weekly</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Standard quality (16-bit)</p>
                  <p className="text-xs text-(--text-muted)">Great for most podcasts</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">All mastering presets</p>
                  <p className="text-xs text-(--text-muted)">Voice, music, and custom options</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Email notifications</p>
                  <p className="text-xs text-(--text-muted)">Get notified when ready</p>
                </div>
              </div>

              <div className="pt-4 border-t border-(--border-subtle)">
                <p className="text-sm font-medium text-(--text-muted) mb-3">Limitations:</p>
                
                <div className="flex items-start gap-3 text-(--text-muted)">
                  <X className="w-5 h-5 shrink-0 mt-0.5 opacity-50" />
                  <p className="text-sm">Files deleted after 24 hours</p>
                </div>
                
                <div className="flex items-start gap-3 text-(--text-muted) mt-2">
                  <X className="w-5 h-5 shrink-0 mt-0.5 opacity-50" />
                  <p className="text-sm">No 24-bit exports <span className="text-(--accent-primary)">($1 to try)</span></p>
                </div>
                
                <div className="flex items-start gap-3 text-(--text-muted) mt-2">
                  <X className="w-5 h-5 shrink-0 mt-0.5 opacity-50" />
                  <p className="text-sm">No cloud storage</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Unlimited Plan */}
          <motion.div
            className="glass-card p-8 relative border-2 border-(--accent-primary)"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Popular Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-4 py-1 rounded-full bg-(--accent-primary) text-white text-xs font-medium">
                Most Popular
              </span>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-(--warning)" />
                <h3 className="text-xl font-semibold">Unlimited</h3>
              </div>
              <p className="text-(--text-secondary) text-sm">For serious podcasters</p>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold">$10</span>
              <span className="text-(--text-muted)">/month</span>
            </div>

            <button
              onClick={handleSubscribe}
              disabled={checkoutLoading}
              className="w-full mb-8 px-6 py-4 rounded-xl bg-linear-to-r from-[#c9a066] to-[#b8956a] hover:from-[#d4ad74] hover:to-[#c9a066] text-[#1a1612] font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[rgba(201,160,102,0.2)]"
            >
              {checkoutLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Crown className="w-5 h-5" />
                  <span>Subscribe Now</span>
                </>
              )}
            </button>

            <div className="space-y-4">
              <p className="text-sm font-medium text-(--text-secondary) mb-3">Everything in Free, plus:</p>
              
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-(--accent-muted) flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-3 h-3 text-(--accent-primary)" />
                </div>
                <div>
                  <p className="text-sm font-medium">Unlimited mastering</p>
                  <p className="text-xs text-(--text-muted)">No weekly limits, master as much as you want</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-(--accent-muted) flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-(--accent-primary)" />
                </div>
                <div>
                  <p className="text-sm font-medium">24-bit HQ exports</p>
                  <p className="text-xs text-(--text-muted)">Exact recommended format for Spotify, Apple Podcasts & YouTube</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-(--accent-muted) flex items-center justify-center shrink-0 mt-0.5">
                  <HardDrive className="w-3 h-3 text-(--accent-primary)" />
                </div>
                <div>
                  <p className="text-sm font-medium">5GB cloud storage</p>
                  <p className="text-xs text-(--text-muted)">Keep your files as long as you&apos;re subscribed</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-(--accent-muted) flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-3 h-3 text-(--accent-primary)" />
                </div>
                <div>
                  <p className="text-sm font-medium">Files never expire</p>
                  <p className="text-xs text-(--text-muted)">Download anytime from your dashboard</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-(--accent-muted) flex items-center justify-center shrink-0 mt-0.5">
                  <FileAudio className="w-3 h-3 text-(--accent-primary)" />
                </div>
                <div>
                  <p className="text-sm font-medium">File management dashboard</p>
                  <p className="text-xs text-(--text-muted)">Organize and manage all your mastered files</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* One-Time HQ Purchase Option */}
        <motion.div
          className="max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="glass-card p-6 sm:p-8 bg-linear-to-r from-[rgba(224,122,76,0.05)] to-[rgba(196,105,61,0.05)] border border-[rgba(224,122,76,0.2)]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#e07a4c] to-[#c4693d] flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Just want to try HQ?</h3>
                  <p className="text-sm text-(--text-secondary) mb-2">
                    Get one 24-bit high-quality export for just $1. No subscription required.
                  </p>
                  <p className="text-xs text-(--text-muted)">
                    <strong className="text-(--text-secondary)">Exact recommended format</strong> for Spotify, Apple Podcasts, YouTube & all platforms
                  </p>
                </div>
              </div>
              <button
                onClick={handleHqPurchase}
                disabled={hqCheckoutLoading}
                className="px-6 py-3 rounded-xl bg-linear-to-r from-[#e07a4c] to-[#c4693d] text-white font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap shadow-lg shadow-[rgba(224,122,76,0.2)]"
              >
                {hqCheckoutLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>$1 One-Time</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-2xl font-semibold text-center mb-8">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <div className="glass-card p-5">
              <h3 className="font-medium mb-2">Can I cancel anytime?</h3>
              <p className="text-sm text-(--text-secondary)">
                Yes! You can cancel your subscription at any time from your dashboard. You&apos;ll keep access until the end of your billing period.
              </p>
            </div>
            
            <div className="glass-card p-5">
              <h3 className="font-medium mb-2">What happens to my files if I cancel?</h3>
              <p className="text-sm text-(--text-secondary)">
                Your files will remain accessible until your subscription ends. After that, they&apos;ll be deleted after 30 days. We recommend downloading them before canceling.
              </p>
            </div>
            
            <div className="glass-card p-5">
              <h3 className="font-medium mb-2">Is there a file size limit?</h3>
              <p className="text-sm text-(--text-secondary)">
                Individual files can be up to 500MB. For longer podcasts, we recommend splitting into segments or compressing before upload.
              </p>
            </div>
            
            <div className="glass-card p-5">
              <h3 className="font-medium mb-2">What audio formats do you support?</h3>
              <p className="text-sm text-(--text-secondary)">
                We support MP3, WAV, FLAC, M4A, and most common audio formats. Output is delivered in high-quality WAV format.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex flex-wrap items-center justify-center gap-6 text-(--text-muted) text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Secure payments via Stripe</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>No hidden fees</span>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.footer
          className="mt-16 pt-8 border-t border-(--border-subtle) text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-(--text-muted)">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          </div>
          <p className="mt-4 text-xs text-(--text-muted)">
            © {new Date().getFullYear()} Free Podcast Mastering. All rights reserved.
          </p>
        </motion.footer>
      </div>
    </main>
  );
}

