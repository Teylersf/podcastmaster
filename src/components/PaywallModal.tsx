"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  X,
  CheckCircle2,
  Gift,
  Users,
  AlertCircle,
} from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCheckoutStart?: () => void;
  // The URL to send the user back to after Checkout. Passed through to the
  // server so podcast-page paywalls return to /, music-page paywalls to
  // /audio-mastering, etc.
  returnPath?: string;
  // The user's referral code, if we already have it — shown so they know
  // they can dodge the paywall by referring a paying friend.
  referralCode?: string | null;
  // How many days remain on the 24h reset if the user prefers to just wait.
  resetAt?: string | Date | null;
};

// Rendered when checkUserQuota returned quota_exhausted with no entitlement.
// The user has three ways out:
//   1. Pay $2 to master this one — the primary CTA.
//   2. Refer a friend who pays $2 → get 7 days unlimited — secondary CTA.
//   3. Come back after the daily reset — passive, just informational.
export default function PaywallModal({
  open,
  onClose,
  onCheckoutStart,
  returnPath = "/",
  referralCode,
  resetAt,
}: Props) {
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function startCheckout() {
    if (starting) return;
    setStarting(true);
    setErr(null);
    onCheckoutStart?.();
    try {
      const res = await fetch("/api/stripe/purchase-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Failed to start checkout");
      }
      window.location.href = data.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setStarting(false);
    }
  }

  const resetLabel = resetAt ? formatResetIn(new Date(resetAt)) : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full sm:max-w-md bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Master another podcast"
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-[var(--bg-primary)]" />
                </div>
                <h2 className="font-bold text-lg">Master another podcast</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pb-6">
              <p className="text-sm text-[var(--text-secondary)] mb-5">
                You&apos;ve used today&apos;s free master. Unlock one more for
                $2 — includes the 24-bit HQ export.
              </p>

              <ul className="space-y-2.5 mb-6">
                {[
                  "One additional mastered file",
                  "24-bit high-quality export included",
                  "Delivered in under 2 minutes",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]"
                  >
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[var(--success)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {err && (
                <div className="mb-4 p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-sm text-[var(--error)] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{err}</span>
                </div>
              )}

              <button
                type="button"
                onClick={startCheckout}
                disabled={starting}
                className="btn-primary w-full text-base py-4 mb-3"
              >
                {starting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Opening checkout&hellip;
                  </>
                ) : (
                  <>
                    Pay $2 to master
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Free-alternative reminder. If we don't have the referral
                  code yet (ProfileHydrator hasn't landed), we still show the
                  hook — the value prop stands without the code itself. */}
              <div className="mt-5 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
                <div className="flex items-start gap-3">
                  <Gift className="w-5 h-5 text-[var(--accent-primary)] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm mb-1">
                      Or master unlimited free for 7 days
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Refer a friend who pays $2 and we&apos;ll comp your next
                      week of mastering — as many files as you want, HQ
                      included.
                    </p>
                    {referralCode && (
                      <div className="mt-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-[var(--text-muted)]" />
                        <code className="text-xs font-mono px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                          {referralCode}
                        </code>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                          your code
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {resetLabel && (
                <p className="text-[11px] text-center text-[var(--text-muted)] mt-4">
                  Or wait — your next free master unlocks in {resetLabel}.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function formatResetIn(resetAt: Date): string {
  const ms = resetAt.getTime() - Date.now();
  if (ms <= 0) return "just now";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 1) {
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  const mins = Math.max(1, Math.floor(ms / (60 * 1000)));
  return mins === 1 ? "1 minute" : `${mins} minutes`;
}
