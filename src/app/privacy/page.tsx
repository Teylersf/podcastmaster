"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Shield,
  ArrowLeft,
  Eye,
  Server,
  Cookie,
  Trash2,
  Users,
  Mail,
  Fingerprint,
  Lock,
} from "lucide-react";
import ThemeSelector from "@/components/ThemeSelector";

const LAST_UPDATED = "July 6, 2026";

export default function PrivacyPolicy() {
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
            Privacy Policy
          </h1>
          <p className="text-base text-(--text-secondary) max-w-lg mx-auto">
            Exactly what data we collect, why, and how long we keep it.
          </p>
          <p className="text-xs text-(--text-muted) mt-3">
            Last updated: {LAST_UPDATED}
          </p>
        </motion.header>

        {/* TL;DR */}
        <motion.div
          className="mb-8 p-5 rounded-xl bg-(--success-muted) border border-(--success)/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-3">
            The short version
          </h2>
          <ul className="space-y-2 text-(--text-secondary) text-sm">
            <li>
              &bull; We never sell your data or use your audio to train AI.
            </li>
            <li>
              &bull; Free-tier files are automatically deleted 24 hours after
              upload.
            </li>
            <li>
              &bull; We collect only what&apos;s needed to run your account,
              process payments, and prevent abuse.
            </li>
            <li>
              &bull; Sign in with Google gives us your email, name, and profile
              picture — nothing else.
            </li>
            <li>
              &bull; Email{" "}
              <a
                href="mailto:teylersf@gmail.com"
                className="text-(--accent-primary) hover:underline"
              >
                teylersf@gmail.com
              </a>{" "}
              any time to see or delete your data.
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
          {/* 1. Who runs this */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <span className="text-(--accent-primary) font-bold text-sm">1</span>
              </div>
              <h2 className="text-lg font-semibold">Who this policy applies to</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                This Privacy Policy covers your use of{" "}
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
                {" "}(collectively the &ldquo;Service&rdquo;), operated by
                Teyler. Contact:{" "}
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

          {/* 2. What we collect */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <Eye className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">2. What we collect and why</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                <strong className="text-foreground">Account information.</strong>{" "}
                When you create an account we store the email address you used,
                the display name and profile picture (if you signed in with
                Google), and a randomly-generated internal user id. We use
                this to sign you in, deliver notifications, and associate your
                masters with your account.
              </p>
              <p>
                <strong className="text-foreground">Uploaded audio.</strong> When
                you upload a file, we send it to our AI mastering backend,
                process it, and return the mastered result. Free-tier files are
                automatically deleted 24 hours after upload. Files kept in the
                Unlimited plan&apos;s 5&nbsp;GB cloud storage stay as long as
                your subscription is active.
              </p>
              <p>
                <strong className="text-foreground">Payment information.</strong>{" "}
                Payments are processed by Stripe. Stripe stores your card
                details; we only store the Stripe customer, subscription, and
                payment intent IDs we need to record your subscription status
                and pay-as-you-go credits. We never see your full card number.
              </p>
              <p>
                <strong className="text-foreground">Referral data.</strong> Each
                account gets a shareable referral code. When you use someone
                else&apos;s code, we record the code (from the{" "}
                <code className="text-xs bg-(--bg-tertiary) px-1.5 py-0.5 rounded">
                  pm_ref
                </code>
                {" "}cookie) so we can credit them if you become a paying
                customer.
              </p>
              <p>
                <strong className="text-foreground">Anti-fraud signals.</strong>{" "}
                To keep the pricing and referral system honest, we store a
                one-way SHA-256 hash of your IP address at signup time. This
                lets us detect same-network referrals without ever storing the
                raw IP. If we enable device fingerprinting in the future, the
                same policy applies.
              </p>
              <p>
                <strong className="text-foreground">Usage records.</strong> Each
                master creates a small log row (user id, timestamp, mastering
                job id) so we can enforce the 1-per-day quota and show you what
                you&apos;ve mastered.
              </p>
              <p>
                <strong className="text-foreground">Feedback you send us.</strong>{" "}
                When you use the &ldquo;Feedback&rdquo; button in the corner, we
                receive your message, the category (bug / feature / etc.), an
                optional email if you provide one, the page URL you were on,
                and technical metadata (user-agent, hashed IP) that helps us
                reproduce the issue.
              </p>
            </div>
          </section>

          {/* 3. Google Sign-In */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <Fingerprint className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">3. Sign in with Google</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                If you choose to sign in with Google, we request only two
                scopes:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong className="text-foreground">Email address</strong>{" "}
                  (
                  <code className="text-xs bg-(--bg-tertiary) px-1.5 py-0.5 rounded">
                    userinfo.email
                  </code>
                  ) — used as your login and for delivering notifications.
                </li>
                <li>
                  <strong className="text-foreground">Name and profile
                  picture</strong>{" "}
                  (
                  <code className="text-xs bg-(--bg-tertiary) px-1.5 py-0.5 rounded">
                    userinfo.profile
                  </code>
                  ) — used for your dashboard display and referral attribution.
                </li>
              </ul>
              <p>
                We do <strong className="text-foreground">not</strong> request
                access to your Google Drive, Gmail, contacts, calendar, or any
                other Google product. We do{" "}
                <strong className="text-foreground">not</strong> post to your
                account or read messages on your behalf.
              </p>
              <p>
                We use and transfer information received from Google APIs to any
                other app in accordance with the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--accent-primary) hover:underline"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
            </div>
          </section>

          {/* 4. Who we share data with */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <Server className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">
                4. Who we share your data with (processors)
              </h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                We don&apos;t sell your data. We do use a small set of trusted
                third-party services (&ldquo;processors&rdquo;) to run parts of
                the platform. Each only receives the specific data it needs.
              </p>
              <ul className="space-y-3 mt-3">
                <li>
                  <strong className="text-foreground">Hexclave (formerly
                  Stack Auth)</strong> — identity and session management.
                  Receives your email, name, profile picture, and OAuth tokens.
                </li>
                <li>
                  <strong className="text-foreground">Modal</strong> — runs the
                  AI mastering job. Receives the audio file you upload for the
                  duration of processing, then it&apos;s deleted per our
                  retention windows below.
                </li>
                <li>
                  <strong className="text-foreground">Vercel Blob</strong> —
                  cloud storage for Unlimited subscribers&apos; mastered files.
                  Receives the mastered output file only.
                </li>
                <li>
                  <strong className="text-foreground">Stripe</strong> — payment
                  processor. Receives your card details, billing email, and the
                  amount charged.
                </li>
                <li>
                  <strong className="text-foreground">Resend</strong> — email
                  delivery. Receives your email address and the notification
                  content when we send you a mastering-complete email.
                </li>
                <li>
                  <strong className="text-foreground">Linode</strong> — database
                  host. Stores our Postgres database (accounts, subscriptions,
                  referrals, usage logs).
                </li>
                <li>
                  <strong className="text-foreground">Vercel</strong> — website
                  hosting and analytics. Receives standard server-access logs
                  and aggregate page-view counts.
                </li>
                <li>
                  <strong className="text-foreground">Google Ads</strong> — used
                  only to measure conversion of paid ads back to the site. No
                  raw personal data is shared beyond what Google&apos;s pixel
                  collects.
                </li>
              </ul>
              <p className="pt-2">
                We may also disclose information when required by law, to
                enforce our Terms, or to protect the rights, property, or
                safety of the Service or its users.
              </p>
            </div>
          </section>

          {/* 5. Retention */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">5. How long we keep it</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <ul className="space-y-2">
                <li>
                  <strong className="text-foreground">Free-tier audio
                  files</strong> — deleted 24 hours after upload.
                </li>
                <li>
                  <strong className="text-foreground">Unlimited-plan
                  files</strong> — kept as long as your subscription is
                  active; deleted 30 days after cancellation.
                </li>
                <li>
                  <strong className="text-foreground">Account records</strong>{" "}
                  (email, subscription status, referral code, usage counts) —
                  kept while your account is active. Deleted within 30 days of
                  account deletion, except where we&apos;re required to keep
                  billing records for tax and accounting purposes.
                </li>
                <li>
                  <strong className="text-foreground">Email delivery logs</strong>{" "}
                  — kept for 90 days for troubleshooting.
                </li>
                <li>
                  <strong className="text-foreground">Payment
                  records</strong> — retained per Stripe&apos;s and applicable
                  tax-law requirements (typically 7 years).
                </li>
              </ul>
            </div>
          </section>

          {/* 6. Cookies */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <Cookie className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">6. Cookies and local storage</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                We use only the cookies and local-storage entries we actually
                need:
              </p>
              <ul className="space-y-2 mt-2">
                <li>
                  <code className="text-xs bg-(--bg-tertiary) px-1.5 py-0.5 rounded">
                    pm_ref
                  </code>{" "}
                  — remembers a referral code you arrived with, for 30 days.
                </li>
                <li>
                  <strong className="text-foreground">Session cookies</strong> —
                  set by Hexclave to keep you signed in.
                </li>
                <li>
                  <strong className="text-foreground">Theme preference</strong>{" "}
                  — stored in your browser&apos;s local storage.
                </li>
                <li>
                  <strong className="text-foreground">Pending-download
                  cache</strong> — stores a reference to your last mastered file
                  in local storage so you can complete a sign-up-and-download
                  flow that starts before you sign in. Cleared on click.
                </li>
                <li>
                  <strong className="text-foreground">Google Ads pixel</strong>{" "}
                  — a conversion pixel from{" "}
                  <code className="text-xs bg-(--bg-tertiary) px-1.5 py-0.5 rounded">
                    googletagmanager.com
                  </code>
                  , used only to measure ad conversions.
                </li>
              </ul>
            </div>
          </section>

          {/* 7. Your rights */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <Users className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">7. Your rights</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Request a copy of the personal data we hold about you.</li>
                <li>Ask us to correct information that&apos;s inaccurate.</li>
                <li>Ask us to delete your account and associated data.</li>
                <li>
                  Withdraw permission you previously granted (for example, by
                  revoking Sign in with Google access from your Google Account
                  settings).
                </li>
                <li>
                  Opt out of Sign in with Google by revoking access at{" "}
                  <a
                    href="https://myaccount.google.com/connections"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-(--accent-primary) hover:underline"
                  >
                    myaccount.google.com/connections
                  </a>
                  .
                </li>
                <li>
                  Lodge a complaint with a data-protection authority in your
                  jurisdiction.
                </li>
              </ul>
              <p className="pt-2">
                To exercise any of these rights, email{" "}
                <a
                  href="mailto:teylersf@gmail.com"
                  className="text-(--accent-primary) hover:underline"
                >
                  teylersf@gmail.com
                </a>
                . We aim to respond within 30 days.
              </p>
            </div>
          </section>

          {/* 8. Security */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <Lock className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">8. Security</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                All traffic between your browser and our servers is encrypted
                in transit (HTTPS/TLS). Database credentials, API secrets, and
                OAuth client secrets are stored as environment variables in
                Vercel and never appear in our code repositories.
              </p>
              <p>
                No system is perfectly secure. If we ever discover a breach
                that affects your data, we&apos;ll notify you and any relevant
                authorities as required by law.
              </p>
            </div>
          </section>

          {/* 9. Children */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <span className="text-(--accent-primary) font-bold text-sm">9</span>
              </div>
              <h2 className="text-lg font-semibold">9. Children</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                The Service is not directed at children under 13, and we do not
                knowingly collect personal information from anyone under 13.
                If you believe a child has provided us data, contact us and we
                will delete it.
              </p>
            </div>
          </section>

          {/* 10. Changes */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-(--bg-tertiary) flex items-center justify-center">
                <Mail className="w-4 h-4 text-(--accent-primary)" />
              </div>
              <h2 className="text-lg font-semibold">10. Changes and contact</h2>
            </div>
            <div className="space-y-3 text-(--text-secondary)">
              <p>
                We may update this Policy from time to time. Material changes
                will be announced on this page and reflected in the &ldquo;Last
                updated&rdquo; date at the top.
              </p>
              <p>
                Privacy questions? Email{" "}
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
          <Link href="/terms" className="text-(--accent-primary) hover:underline">
            Terms of Service
          </Link>
          <Link href="/pricing" className="text-(--accent-primary) hover:underline">
            Pricing
          </Link>
        </footer>
      </div>
    </main>
  );
}
