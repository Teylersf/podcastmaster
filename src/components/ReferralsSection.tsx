"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Copy,
  Check,
  Sparkles,
  Gift,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

type Profile = {
  referralCode: string;
  unlimitedUntil: string | null;
  unlimitedActive: boolean;
};

type Stats = {
  grantedCount: number;
  pendingCount: number;
  voidedCount: number;
  voidReasons: Record<string, number>;
  totalCount: number;
};

// The four void reasons that show up in the referral pipeline (matching the
// Referral.status enum values written by referralSettle.ts). Labels are the
// user-facing wording for the "Why didn't my bonus land?" FAQ.
const VOID_LABELS: Record<string, { label: string; blurb: string }> = {
  void_same_ip: {
    label: "Signed up from the same network",
    blurb:
      "The person you referred created their account on the same IP address as you. To keep the program fair, referrals from the same wifi don't count.",
  },
  void_disposable_email: {
    label: "Throwaway email address",
    blurb:
      "The signup used a temporary/disposable email provider. Try referring someone using a personal email.",
  },
  void_referrer_no_master: {
    label: "You hadn't mastered anything yet",
    blurb:
      "Your code only starts counting after you've completed your own first master. Master one file with your account and future referrals will land.",
  },
  void_self: {
    label: "Same account",
    blurb:
      "The signup resolved to the same underlying email as yours (for example the same Gmail address with a +tag). We only count referrals to distinct people.",
  },
};

function formatDaysLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days >= 1) {
    return days === 1 && hours === 0 ? "1 day" : `${days}d ${hours}h`;
  }
  return `${hours}h left`;
}

export default function ReferralsSection() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [copied, setCopied] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/user/profile").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/user/referral-stats").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([p, s]) => {
        if (p?.signedIn && p.profile) setProfile(p.profile);
        if (s?.signedIn) setStats(s);
      })
      .catch(() => {});
  }, []);

  if (!profile) return null;

  const shareUrl =
    typeof window === "undefined"
      ? `https://freepodcastmastering.com/?ref=${profile.referralCode}`
      : `${window.location.origin}/?ref=${profile.referralCode}`;

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — user can copy manually from the field */
    }
  };

  const voidedReasonsList = stats
    ? (Object.entries(stats.voidReasons) as [string, number][])
    : [];

  return (
    <motion.div
      className="glass-card p-6 md:p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--accent-primary)]" />
          Your referrals
        </h2>
        {profile.unlimitedActive && profile.unlimitedUntil && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-muted)] border border-[var(--border-hover)] text-xs font-semibold text-[var(--accent-primary)]">
            <Sparkles className="w-3.5 h-3.5" />
            Unlimited — {formatDaysLeft(profile.unlimitedUntil)}
          </span>
        )}
      </div>

      <p className="text-sm text-[var(--text-secondary)] mb-5">
        Share your link. When someone new pays $2 to master a file with it, you
        get <strong>7 days of unlimited mastering</strong> (HQ included).
        Multiple referrals stack.
      </p>

      {/* Shareable URL + copy */}
      <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] mb-5">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-2">
          Your link
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 text-sm font-mono truncate text-[var(--text-primary)]">
            {shareUrl}
          </code>
          <button
            type="button"
            onClick={copyShareUrl}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-[var(--bg-primary)] font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-3">
          Your code: <code className="font-mono">{profile.referralCode}</code>
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard
          label="Granted"
          value={stats?.grantedCount ?? 0}
          accent="success"
        />
        <StatCard
          label="Pending"
          value={stats?.pendingCount ?? 0}
          accent="warning"
        />
        <StatCard
          label="Didn't land"
          value={stats?.voidedCount ?? 0}
          accent="muted"
        />
      </div>

      {/* FAQ — only shown when there's something to explain */}
      {stats && stats.voidedCount > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] overflow-hidden">
          <button
            type="button"
            onClick={() => setFaqOpen((v) => !v)}
            className="w-full flex items-center justify-between p-4 text-left"
            aria-expanded={faqOpen}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Info className="w-4 h-4 text-[var(--text-muted)]" />
              Why didn&apos;t {stats.voidedCount === 1 ? "one bonus" : `${stats.voidedCount} bonuses`} land?
            </span>
            {faqOpen ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </button>
          {faqOpen && (
            <div className="px-4 pb-4 space-y-3">
              {voidedReasonsList.map(([reason, count]) => {
                const meta = VOID_LABELS[reason];
                if (!meta) return null;
                return (
                  <div
                    key={reason}
                    className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
                  >
                    <p className="text-sm font-semibold mb-1">
                      {meta.label}{" "}
                      <span className="text-xs font-normal text-[var(--text-muted)]">
                        ({count})
                      </span>
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {meta.blurb}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Gentle first-time nudge when the user has zero activity so far */}
      {stats && stats.totalCount === 0 && (
        <div className="mt-2 flex items-start gap-3 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
          <Gift className="w-5 h-5 text-[var(--accent-primary)] shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Share your link with a friend who podcasts. First one who pays $2
            through your link earns you a week free.
          </p>
        </div>
      )}
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "success" | "warning" | "muted";
}) {
  const colorMap: Record<typeof accent, string> = {
    success: "text-[var(--success)]",
    warning: "text-[var(--warning)]",
    muted: "text-[var(--text-muted)]",
  };
  return (
    <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-center">
      <p className={`text-2xl font-bold ${colorMap[accent]}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] mt-1">
        {label}
      </p>
    </div>
  );
}
