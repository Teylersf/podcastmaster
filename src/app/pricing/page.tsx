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
  Gift,
  Coins,
} from "lucide-react";
import ThemeSelector from "@/components/ThemeSelector";

export default function PricingPage() {
  const user = useUser();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [singleMasterLoading, setSingleMasterLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
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

  // Single-master entitlement ($2 one-time). Same endpoint the in-flow
  // paywall modal uses; on success the user gets one entitlement they can
  // spend the next time they hit their daily quota.
  const handleSingleMasterPurchase = async () => {
    if (!user) {
      window.location.href = "/handler/sign-up?after_auth_return_to=/pricing";
      return;
    }

    setSingleMasterLoading(true);
    try {
      const res = await fetch("/api/stripe/purchase-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: "/pricing" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Single-master checkout error:", error);
    } finally {
      setSingleMasterLoading(false);
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
            Free every day. Pay $2 when you need more. $10/month if you master a lot.
          </p>
        </motion.div>

        {/* Three-tier grid: Free (1/day), Pay-as-you-go ($2/master),
            Unlimited ($10/month, most popular). Stacks on mobile,
            three columns from md+. */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
          {/* Free */}
          <motion.div
            className="glass-card p-8 relative flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Free</h3>
              <p className="text-(--text-secondary) text-sm">Try it out. No card, no signup to master.</p>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-(--text-muted)">/forever</span>
            </div>

            <Link
              href={user ? "/" : "/handler/sign-up"}
              className="w-full mb-8 px-6 py-3 rounded-lg border border-(--border-subtle) hover:border-(--accent-primary) transition-colors flex items-center justify-center gap-2 font-medium text-sm"
            >
              {user ? "Start mastering" : "Get started"}
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="space-y-4 mt-auto">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">1 mastered file per day</p>
                  <p className="text-xs text-(--text-muted)">Resets every 24 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Standard 16-bit export</p>
                  <p className="text-xs text-(--text-muted)">Broadcast quality, ready to publish</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">All mastering presets</p>
                  <p className="text-xs text-(--text-muted)">Podcast, music, and custom presets</p>
                </div>
              </div>

              <div className="pt-4 border-t border-(--border-subtle) space-y-2">
                <div className="flex items-start gap-3 text-(--text-muted)">
                  <X className="w-5 h-5 shrink-0 mt-0.5 opacity-50" />
                  <p className="text-sm">Files delete after 24h</p>
                </div>
                <div className="flex items-start gap-3 text-(--text-muted)">
                  <X className="w-5 h-5 shrink-0 mt-0.5 opacity-50" />
                  <p className="text-sm">Signup required to download</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Pay as you go — one-time $2 single master */}
          <motion.div
            className="glass-card p-8 relative flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-5 h-5 text-(--accent-primary)" />
                <h3 className="text-xl font-semibold">Pay as you go</h3>
              </div>
              <p className="text-(--text-secondary) text-sm">Need one more master today? Two bucks.</p>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold">$2</span>
              <span className="text-(--text-muted)">/master</span>
            </div>

            <button
              onClick={handleSingleMasterPurchase}
              disabled={singleMasterLoading}
              className="w-full mb-8 px-6 py-3 rounded-lg bg-(--accent-muted) border border-(--accent-primary)/40 hover:border-(--accent-primary) transition-colors flex items-center justify-center gap-2 font-medium text-sm text-(--accent-primary)"
            >
              {singleMasterLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Buy a master
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="space-y-4 mt-auto">
              <p className="text-sm font-medium text-(--text-secondary) mb-3">Everything in Free, plus:</p>

              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">One extra master, any day</p>
                  <p className="text-xs text-(--text-muted)">Credit stays until you use it</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">24-bit HQ export bundled</p>
                  <p className="text-xs text-(--text-muted)">Spotify / Apple Podcasts spec</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">No subscription</p>
                  <p className="text-xs text-(--text-muted)">One-time. Buy again when you need to.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-(--success) shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Stackable</p>
                  <p className="text-xs text-(--text-muted)">Buy 5 credits, use them over time</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Unlimited subscription — $10/month */}
          <motion.div
            className="glass-card p-8 relative flex flex-col border-2 border-(--accent-primary)"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-4 py-1 rounded-full bg-(--accent-primary) text-white text-xs font-medium whitespace-nowrap">
                Most Popular
              </span>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-(--warning)" />
                <h3 className="text-xl font-semibold">Unlimited</h3>
              </div>
              <p className="text-(--text-secondary) text-sm">For serious podcasters and networks.</p>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold">$10</span>
              <span className="text-(--text-muted)">/month</span>
            </div>

            <button
              onClick={handleSubscribe}
              disabled={checkoutLoading}
              className="w-full mb-8 px-6 py-4 rounded-xl bg-linear-to-r from-(--accent-primary) to-(--accent-tertiary) hover:from-(--accent-hover) hover:to-(--accent-primary) text-(--bg-primary) font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-(--accent-muted)"
            >
              {checkoutLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Crown className="w-5 h-5" />
                  <span>Subscribe</span>
                </>
              )}
            </button>

            <div className="space-y-4 mt-auto">
              <p className="text-sm font-medium text-(--text-secondary) mb-3">Everything else, plus:</p>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-(--accent-muted) flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-3 h-3 text-(--accent-primary)" />
                </div>
                <div>
                  <p className="text-sm font-medium">Truly unlimited</p>
                  <p className="text-xs text-(--text-muted)">Master as many files as you want</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-(--accent-muted) flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-(--accent-primary)" />
                </div>
                <div>
                  <p className="text-sm font-medium">24-bit HQ on every master</p>
                  <p className="text-xs text-(--text-muted)">Spotify / Apple / YouTube spec</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-(--accent-muted) flex items-center justify-center shrink-0 mt-0.5">
                  <HardDrive className="w-3 h-3 text-(--accent-primary)" />
                </div>
                <div>
                  <p className="text-sm font-medium">5 GB cloud storage</p>
                  <p className="text-xs text-(--text-muted)">Keep every mastered file</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-(--accent-muted) flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-3 h-3 text-(--accent-primary)" />
                </div>
                <div>
                  <p className="text-sm font-medium">Files never expire</p>
                  <p className="text-xs text-(--text-muted)">Re-download any time</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-(--accent-muted) flex items-center justify-center shrink-0 mt-0.5">
                  <FileAudio className="w-3 h-3 text-(--accent-primary)" />
                </div>
                <div>
                  <p className="text-sm font-medium">File management dashboard</p>
                  <p className="text-xs text-(--text-muted)">Organize, tag, redownload</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Referral strip — the fourth (free) way to get unlimited access.
            Sits below the pricing grid so it doesn't confuse the primary
            choice, but gives cost-sensitive users a real path. */}
        <motion.div
          className="max-w-4xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="glass-card p-6 sm:p-8 border border-(--border-subtle)">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-12 h-12 rounded-xl bg-(--accent-muted) border border-(--accent-primary)/40 flex items-center justify-center shrink-0">
                  <Gift className="w-6 h-6 text-(--accent-primary)" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Or master free — refer a friend</h3>
                  <p className="text-sm text-(--text-secondary) mb-1">
                    Every referral that pays their first $2 earns you <strong className="text-(--text-primary)">7 days of unlimited mastering</strong>. Bonuses stack.
                  </p>
                  <p className="text-xs text-(--text-muted)">
                    Your code is on the dashboard once you sign up.
                  </p>
                </div>
              </div>
              <Link
                href={user ? "/dashboard" : "/handler/sign-up?after_auth_return_to=/dashboard"}
                className="px-6 py-3 rounded-xl border border-(--border-medium) hover:border-(--accent-primary) text-sm font-medium flex items-center gap-2 whitespace-nowrap"
              >
                {user ? "Get your code" : "Sign up to get yours"}
                <ArrowRight className="w-4 h-4" />
              </Link>
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
              <h3 className="font-medium mb-2">Do the $2 credits expire?</h3>
              <p className="text-sm text-(--text-secondary)">
                No. A pay-as-you-go credit stays on your account until you use it, so you can buy a stack now and spend them over months.
              </p>
            </div>

            <div className="glass-card p-5">
              <h3 className="font-medium mb-2">Does the $10/month plan really have no cap?</h3>
              <p className="text-sm text-(--text-secondary)">
                Yes — while you&apos;re subscribed, master as many files as you want, all with the 24-bit HQ export included, all kept in your 5 GB dashboard storage.
              </p>
            </div>

            <div className="glass-card p-5">
              <h3 className="font-medium mb-2">Can I cancel anytime?</h3>
              <p className="text-sm text-(--text-secondary)">
                Yes. Cancel from your dashboard; you keep unlimited access until the end of the current billing period.
              </p>
            </div>

            <div className="glass-card p-5">
              <h3 className="font-medium mb-2">What happens to my files if I cancel?</h3>
              <p className="text-sm text-(--text-secondary)">
                Cloud files stay accessible until the period ends, then are deleted 30 days later. Download anything you want to keep before then.
              </p>
            </div>

            <div className="glass-card p-5">
              <h3 className="font-medium mb-2">How does the 7-day referral bonus work?</h3>
              <p className="text-sm text-(--text-secondary)">
                When someone you referred pays for their first $2 master, your account gets a week of unlimited access added on. Multiple referrals stack — three friends who pay = 21 days free.
              </p>
            </div>

            <div className="glass-card p-5">
              <h3 className="font-medium mb-2">Is there a file size limit?</h3>
              <p className="text-sm text-(--text-secondary)">
                Individual files can be up to 500 MB. For longer podcasts, split into segments or compress before upload.
              </p>
            </div>

            <div className="glass-card p-5">
              <h3 className="font-medium mb-2">What audio formats do you support?</h3>
              <p className="text-sm text-(--text-secondary)">
                MP3, WAV, FLAC, M4A, AIFF, and OGG. Output is delivered as high-quality WAV.
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
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
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

