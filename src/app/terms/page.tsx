"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ScrollText,
  ArrowLeft,
  Zap,
  CreditCard,
  User,
  AlertCircle,
  Ban,
  RefreshCw,
  Scale,
} from "lucide-react";
import ThemeSelector from "@/components/ThemeSelector";

const LAST_UPDATED = "July 6, 2026";

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
              <ScrollText className="w-6 h-6 text-(--accent-primary)" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-base text-(--text-secondary) max-w-lg mx-auto">
            The rules for using Free Podcast Mastering. Plain English.
          </p>
          <p className="text-xs text-(--text-muted) mt-3">
            Last updated: {LAST_UPDATED}
          </p>
        </motion.header>

        {/* TL;DR */}
        <motion.div
          className="mb-8 p-5 rounded-xl bg-(--accent-muted) border border-(--accent-primary)/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-3">
            The short version
          </h2>
          <ul className="space-y-2 text-(--text-secondary) text-sm">
            <li>
              &bull; One free master per day. $2 for extras, $10/month for
              unlimited. Cancel anytime.
            </li>
            <li>
              &bull; You keep every right to your audio. We never claim any
              ownership.
            </li>
            <li>
              &bull; Only upload audio you have permission to process. Don&apos;t
              try to break the service.
            </li>
            <li>
              &bull; Your privacy is covered separately in the{" "}
              <Link
                href="/privacy"
                className="text-(--accent-primary) hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </li>
          </ul>
        </motion.div>

        {/* Sections */}
        <motion.div
          className="space-y-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {/* 1. Who we are */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <span className="text-(--accent-primary) font-bold text-sm">1</span>
              </div>
              <h2 className="text-lg font-semibold">Who we are and what this is</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                &ldquo;Free Podcast Mastering&rdquo; (the &ldquo;Service&rdquo;)
                is an AI-powered audio mastering tool operated by Teyler at{" "}
                <a
                  href="https://freepodcastmastering.com"
                  className="text-(--accent-primary) hover:underline"
                >
                  freepodcastmastering.com
                </a>{" "}
                and{" "}
                <a
                  href="https://freemusicmaster.com"
                  className="text-(--accent-primary) hover:underline"
                >
                  freemusicmaster.com
                </a>
                . These Terms of Service (the &ldquo;Terms&rdquo;) govern your
                access to and use of the Service.
              </p>
              <p>
                By using the Service you agree to these Terms and to our{" "}
                <Link
                  href="/privacy"
                  className="text-(--accent-primary) hover:underline"
                >
                  Privacy Policy
                </Link>
                . If you don&apos;t agree, please don&apos;t use the Service.
              </p>
            </div>
          </section>

          {/* 2. Pricing */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">2. Pricing and payments</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                <strong className="text-foreground">Free tier:</strong> one
                mastered file per rolling 24-hour window. No card required to
                master. You must create a free account to download your file.
              </p>
              <p>
                <strong className="text-foreground">Pay-as-you-go
                ($2/master):</strong> a one-time purchase that unlocks one
                additional master beyond the daily free one. Credits never
                expire; you can stack them.
              </p>
              <p>
                <strong className="text-foreground">Unlimited ($10/month):</strong>{" "}
                a recurring subscription that unlocks unlimited masters, 24-bit
                HQ exports, 5 GB of cloud storage, and files that never expire.
                Billed monthly until you cancel.
              </p>
              <p>
                All payments are processed by{" "}
                <a
                  href="https://stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--accent-primary) hover:underline"
                >
                  Stripe
                </a>
                . We do not store your card details.
              </p>
              <p>
                <strong className="text-foreground">Cancellation:</strong> you
                can cancel your subscription at any time from your dashboard.
                You keep unlimited access through the end of your current billing
                period, after which the account reverts to the free tier.
              </p>
              <p>
                <strong className="text-foreground">Refunds:</strong> pay-as-you
                -go credits and subscription payments are non-refundable, except
                where required by law or at our sole discretion. Email{" "}
                <a
                  href="mailto:teylersf@gmail.com"
                  className="text-(--accent-primary) hover:underline"
                >
                  teylersf@gmail.com
                </a>{" "}
                if you have a refund request.
              </p>
            </div>
          </section>

          {/* 3. Referral program */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <Zap className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">3. Referral program</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                Every account gets a shareable referral code. When a friend
                signs up with your code and completes their first paid $2 master,
                your account receives 7 days of unlimited access. Multiple
                referrals stack.
              </p>
              <p>
                To keep the program fair, we automatically void referrals that
                appear self-generated. The current fraud gates include
                same-signup-IP matches between referrer and referee, disposable-
                email domains, and referrers who have never completed a master
                themselves. Voids are silent; you can see any that didn&apos;t
                land on your dashboard.
              </p>
            </div>
          </section>

          {/* 4. Accounts */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <User className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">4. Your account</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                Authentication is handled by our identity provider (Hexclave,
                formerly Stack Auth). You can sign up with email, magic link, or
                Sign in with Google.
              </p>
              <p>
                You are responsible for keeping your login credentials secure
                and for all activity that happens under your account. If you
                believe your account has been accessed without your permission,
                let us know at{" "}
                <a
                  href="mailto:teylersf@gmail.com"
                  className="text-(--accent-primary) hover:underline"
                >
                  teylersf@gmail.com
                </a>
                .
              </p>
              <p>
                You can delete your account at any time by contacting us at the
                email above. Deletion removes your profile, subscription record,
                mastered-file metadata, and referral history from our database.
              </p>
            </div>
          </section>

          {/* 5. Acceptable use */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <Ban className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">5. Acceptable use</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>By using the Service, you agree not to:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  Upload audio you don&apos;t have the rights to process, or
                  content that infringes anyone else&apos;s rights.
                </li>
                <li>
                  Upload content that is unlawful, harassing, hateful, or
                  contains sexual material involving minors.
                </li>
                <li>
                  Attempt to overload, disrupt, reverse-engineer, or scrape the
                  Service.
                </li>
                <li>
                  Create fake accounts, use disposable emails to game the
                  referral program, or otherwise attempt to defraud the pricing
                  or referral system.
                </li>
                <li>
                  Use the Service to build a competing product, resell the
                  mastered outputs commercially without permission, or train
                  machine-learning models on the outputs.
                </li>
              </ul>
              <p>
                We may suspend or terminate accounts that violate these rules.
              </p>
            </div>
          </section>

          {/* 6. Ownership */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <Scale className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">6. Ownership and license</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                <strong className="text-foreground">You keep every right</strong>{" "}
                to the audio you upload and to the mastered files we produce.
                We claim no ownership over your content.
              </p>
              <p>
                You grant us a strictly limited, temporary license to store and
                process your audio for the sole purpose of mastering it and
                delivering the result back to you. Once processing is complete
                and the retention window has elapsed, the file is deleted (see{" "}
                <Link
                  href="/privacy"
                  className="text-(--accent-primary) hover:underline"
                >
                  Privacy Policy
                </Link>{" "}
                for exact windows).
              </p>
              <p>
                We do not use your audio to train AI models, clone voices, or
                power any other product. Full stop.
              </p>
            </div>
          </section>

          {/* 7. Service availability */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">7. Service availability</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                The Service is provided on an &ldquo;as-is&rdquo; and
                &ldquo;as-available&rdquo; basis. We do not guarantee that the
                Service will be uninterrupted, error-free, or that every master
                will be successful.
              </p>
              <p>
                We may change, suspend, or discontinue features at any time. If
                we discontinue a paid feature you&apos;ve pre-paid for, we&apos;ll
                make a reasonable effort to refund the unused portion.
              </p>
            </div>
          </section>

          {/* 8. Warranty + liability */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">
                8. Warranty disclaimer and limitation of liability
              </h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                To the maximum extent permitted by law, the Service is provided
                without warranties of any kind, express or implied, including
                warranties of merchantability, fitness for a particular purpose,
                and non-infringement.
              </p>
              <p>
                To the maximum extent permitted by law, in no event will Free
                Podcast Mastering or its operator be liable for any indirect,
                incidental, special, consequential, or punitive damages, or any
                loss of profits or revenues, whether incurred directly or
                indirectly, arising from your use of the Service. Our total
                liability for any claim arising out of these Terms will not
                exceed the amount you paid us in the 12 months before the claim
                arose (or $50, whichever is greater).
              </p>
            </div>
          </section>

          {/* 9. Changes */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <span className="text-(--accent-primary) font-bold text-sm">§</span>
              </div>
              <h2 className="text-lg font-semibold">9. Changes and contact</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                We may update these Terms from time to time. Material changes
                will be announced on this page and reflected in the &ldquo;Last
                updated&rdquo; date at the top. Continued use of the Service
                after a change means you accept the updated Terms.
              </p>
              <p>
                Questions, refund requests, or complaints? Email{" "}
                <a
                  href="mailto:teylersf@gmail.com"
                  className="text-(--accent-primary) hover:underline"
                >
                  teylersf@gmail.com
                </a>
                .
              </p>
            </div>
          </section>
        </motion.div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-(--border-subtle) text-center text-sm text-(--text-muted) flex flex-wrap items-center justify-center gap-4">
          <Link href="/" className="text-(--accent-primary) hover:underline">
            Home
          </Link>
          <Link href="/privacy" className="text-(--accent-primary) hover:underline">
            Privacy Policy
          </Link>
          <Link href="/pricing" className="text-(--accent-primary) hover:underline">
            Pricing
          </Link>
        </footer>
      </div>
    </main>
  );
}
