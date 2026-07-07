"use client";

import { useEffect, useState } from "react";
import { useUser } from "@stackframe/stack";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { loadPendingDownload } from "@/lib/pendingDownload";

// Watches the URL for ?claim=<jobId>. When a signed-in user arrives with
// that param (from the sign-in gate on the mastering tool), POSTs to
// /api/files/claim to bind the just-completed mastering job to their
// fresh account, then strips the query string.
//
// The server is the authority (idempotent by UNIQUE jobId). This
// component just kicks the request and shows a small confirmation
// toast so the user knows their file is now saved to their account.
const QUERY_KEY = "claim";
const SESSION_KEY = "pm_claim_toast_shown";

type ClaimResponse = {
  claimed: boolean;
  alreadyClaimed?: boolean;
  error?: string;
};

export default function PostSignInClaimer() {
  const user = useUser();
  const [toastKind, setToastKind] = useState<"claimed" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) return;

    const url = new URL(window.location.href);
    const jobId = url.searchParams.get(QUERY_KEY);
    if (!jobId) return;

    // Strip the param immediately so a refresh / share doesn't retrigger.
    // The endpoint is idempotent so this is safe even if the fetch below
    // hasn't resolved yet.
    url.searchParams.delete(QUERY_KEY);
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + (url.search ? url.search : "") + url.hash,
    );

    // Also pull the fileName the anon side stashed in localStorage — the
    // server persists it on the FreeUserFile row so the dashboard has a
    // useful label instead of "Mastered file".
    const pending = loadPendingDownload();
    const fileName = pending && pending.jobId === jobId ? pending.fileName : "";

    const alreadyShown = sessionStorage.getItem(SESSION_KEY) === "1";

    fetch("/api/files/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, fileName }),
    })
      .then((r) => (r.ok ? (r.json() as Promise<ClaimResponse>) : null))
      .then((data) => {
        if (!data) return;
        if (data.claimed && !data.alreadyClaimed && !alreadyShown) {
          setToastKind("claimed");
          sessionStorage.setItem(SESSION_KEY, "1");
        }
      })
      .catch(() => {});
  }, [user]);

  return (
    <AnimatePresence>
      {toastKind === "claimed" && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] sm:w-auto"
        >
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-(--success-muted) border border-(--success)/40 shadow-lg">
            <div className="shrink-0 w-9 h-9 rounded-full bg-(--success)/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-(--success)" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">
                Your master is saved to your account
              </p>
              <p className="text-xs text-(--text-secondary) mt-0.5">
                Grab the download below — it's also in your{" "}
                <a href="/dashboard/files" className="underline">dashboard</a>.
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
