"use client";

import { useState } from "react";
import { useUser } from "@stackframe/stack";
import { Loader2, Crown, Zap, HardDrive, Sparkles, ArrowRight } from "lucide-react";

// The "start your 7-day free trial" card. Renders in two shapes:
//   variant="tool"       — big card under the download button on the
//                          mastering completion screen. Highest-intent
//                          moment we have to pitch a trial: they just
//                          got a great result, they're delighted.
//   variant="dashboard"  — slim banner at the top of the dashboard for
//                          signed-in free users who haven't converted.
//
// Card required — hits /api/stripe/start-trial which routes through
// Stripe Checkout with subscription_data.trial_period_days = 7. On
// return the URL carries ?trial=started; the dashboard toast (elsewhere)
// picks that up and confirms the trial is active.
type Props = {
  variant: "tool" | "dashboard";
  returnPath?: string;
  onSkip?: () => void;
};

export default function TrialCta({ variant, returnPath, onSkip }: Props) {
  const user = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const startTrial = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/start-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: returnPath || "/dashboard" }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      if (data?.error === "trial_already_used") {
        setError("Looks like you've already used your trial. Ready to subscribe?");
      } else if (data?.error === "already_subscribed") {
        setError("You're already on a plan.");
      } else {
        setError("Couldn't start the trial. Try again in a moment.");
      }
    } catch {
      setError("Couldn't start the trial. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "dashboard") {
    return (
      <div className="mb-6 rounded-2xl border border-(--accent-primary)/40 bg-linear-to-r from-(--accent-muted) to-(--bg-elevated) p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-(--accent-primary)/20 border border-(--accent-primary)/40 flex items-center justify-center">
              <Crown className="w-5 h-5 text-(--accent-primary)" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">
                Start your 7-day free trial
              </p>
              <p className="text-xs text-(--text-secondary) mt-0.5">
                Unlimited HQ masters · permanent cloud storage · $10/mo starts day 8 · cancel anytime
              </p>
            </div>
          </div>
          <button
            onClick={startTrial}
            disabled={loading}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-(--accent-primary) hover:bg-(--accent-hover) text-(--bg-primary) font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Start trial
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
        {error && <p className="text-xs text-(--error) mt-3">{error}</p>}
      </div>
    );
  }

  // variant === "tool"
  return (
    <div className="mt-6 rounded-2xl border border-(--accent-primary)/40 bg-linear-to-br from-(--accent-muted) to-(--bg-elevated) p-6 text-center">
      <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-(--accent-primary)/20 border border-(--accent-primary)/40 flex items-center justify-center">
        <Crown className="w-6 h-6 text-(--accent-primary)" />
      </div>
      <p className="text-lg font-semibold mb-1">Loved it? Get 7 days free.</p>
      <p className="text-sm text-(--text-secondary) mb-5 max-w-md mx-auto">
        Unlimited masters, 24-bit HQ, permanent cloud storage. $10/mo starts on day 8. Cancel anytime.
      </p>

      <div className="grid grid-cols-3 gap-2 max-w-md mx-auto mb-5 text-xs">
        <div className="rounded-xl bg-(--bg-secondary) border border-(--border-subtle) p-3">
          <Zap className="w-4 h-4 text-(--accent-primary) mx-auto mb-1" />
          <p className="font-medium">Unlimited masters</p>
        </div>
        <div className="rounded-xl bg-(--bg-secondary) border border-(--border-subtle) p-3">
          <Sparkles className="w-4 h-4 text-(--accent-primary) mx-auto mb-1" />
          <p className="font-medium">24-bit HQ export</p>
        </div>
        <div className="rounded-xl bg-(--bg-secondary) border border-(--border-subtle) p-3">
          <HardDrive className="w-4 h-4 text-(--accent-primary) mx-auto mb-1" />
          <p className="font-medium">5 GB cloud storage</p>
        </div>
      </div>

      <button
        onClick={startTrial}
        disabled={loading}
        className="w-full max-w-sm mx-auto px-6 py-3 rounded-xl bg-(--accent-primary) hover:bg-(--accent-hover) text-(--bg-primary) font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Start 7 days free · card required
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="mt-3 text-xs text-(--text-muted) hover:text-foreground"
        >
          No thanks — stick with free tier
        </button>
      )}

      {error && <p className="text-xs text-(--error) mt-3">{error}</p>}

      <p className="mt-4 text-[10px] text-(--text-muted)">
        We won't charge on day 1 — you'll get an email 24h before your first charge. Cancel from your dashboard any time.
      </p>
    </div>
  );
}
