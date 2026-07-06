"use client";

import { useEffect, useState } from "react";
import { useUser } from "@stackframe/stack";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";

// Watches the URL for ?bonus=welcome24. When a signed-in user arrives with
// that param (via the "Sign up with Google — 24h free" CTA returning them
// from the auth flow), POSTs to /api/user/claim-welcome-bonus and shows a
// success toast. Cleans the query string so a refresh doesn't retrigger.
//
// The server is the authority — this component just kicks the request. The
// endpoint is idempotent (guarded by welcomeBonusClaimedAt), so it's safe to
// call from multiple mount cycles.
const QUERY_KEY = "bonus";
const QUERY_VAL = "welcome24";
const SESSION_KEY = "pm_welcome_bonus_toast_shown";

type ClaimResponse = {
  claimed: boolean;
  alreadyClaimed?: boolean;
  unlimitedUntil?: string | null;
};

export default function WelcomeBonusClaimer() {
  const user = useUser();
  const [toastKind, setToastKind] = useState<"granted" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) return;

    const url = new URL(window.location.href);
    if (url.searchParams.get(QUERY_KEY) !== QUERY_VAL) return;

    // Strip the param immediately so the URL is clean if the user shares
    // it or refreshes. This runs before the fetch resolves — the claim
    // endpoint is idempotent so this is safe.
    url.searchParams.delete(QUERY_KEY);
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + (url.search ? url.search : "") + url.hash,
    );

    // Only ever fire the toast once per browser session, so re-renders in
    // strict mode or route changes don't stack toasts.
    const alreadyShown = sessionStorage.getItem(SESSION_KEY) === "1";
    if (alreadyShown) return;

    fetch("/api/user/claim-welcome-bonus", { method: "POST" })
      .then((r) => (r.ok ? (r.json() as Promise<ClaimResponse>) : null))
      .then((data) => {
        if (!data) return;
        // Show the toast only when the claim actually granted the bonus.
        // If the account already claimed, silently do nothing — no need
        // to remind them.
        if (data.claimed && !data.alreadyClaimed) {
          setToastKind("granted");
          sessionStorage.setItem(SESSION_KEY, "1");
        }
      })
      .catch(() => {});
  }, [user]);

  return (
    <AnimatePresence>
      {toastKind === "granted" && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] sm:w-auto"
        >
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-(--success-muted) border border-(--success)/40 shadow-lg">
            <div className="shrink-0 w-9 h-9 rounded-full bg-(--success)/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-(--success)" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">
                24 hours of unlimited mastering unlocked
              </p>
              <p className="text-xs text-(--text-secondary) mt-0.5">
                Welcome bonus applied. Master as many files as you want for the
                next day.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setToastKind(null)}
              className="shrink-0 p-1 rounded-lg hover:bg-(--bg-elevated) transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-(--text-muted)" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
