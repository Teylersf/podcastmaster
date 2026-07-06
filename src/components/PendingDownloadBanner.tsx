"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@stackframe/stack";
import { CheckCircle2, Download, LogIn, X } from "lucide-react";
import {
  loadPendingDownload,
  clearPendingDownload,
  type PendingDownload,
} from "@/lib/pendingDownload";

// Renders at the top of the mastering pages when the browser has a mastered
// file waiting in localStorage that the user hasn't downloaded yet. Two ways
// this state arises:
//   1. User completed a master, left to sign up (per the download gate), and
//      came back. Signed-in state → downloading is one click.
//   2. User completed a master, then refreshed the page. Signed-in state
//      shows the download button; signed-out state shows the sign-up CTA.
//
// The banner never renders during an active mastering session (checked by
// the presence of the parent's jobId prop) — the completion view handles
// that flow directly.
type Props = {
  activeJobId: string | null;
};

export default function PendingDownloadBanner({ activeJobId }: Props) {
  const user = useUser();
  const [pending, setPending] = useState<PendingDownload | null>(null);

  useEffect(() => {
    setPending(loadPendingDownload());
  }, []);

  // If the parent already has this job loaded into the active mastering
  // session, don't show a redundant banner — the completed view already
  // has the download button.
  if (!pending) return null;
  if (activeJobId && activeJobId === pending.jobId) return null;

  const dismiss = () => {
    clearPendingDownload();
    setPending(null);
  };

  return (
    <div className="mb-6 rounded-2xl border border-(--success)/50 bg-(--success-muted) p-5">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-11 h-11 rounded-full bg-(--success-muted) flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-(--success)" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg">Your mastered file is ready</p>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5 truncate">
            {pending.fileName || "mastered_podcast"}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {user ? (
              <a
                href={`/api/mastering/download/${pending.jobId}`}
                className="btn-primary text-sm"
                onClick={() => {
                  // Fire-and-forget: give the download a moment to start
                  // before we blow away the localStorage entry.
                  setTimeout(() => {
                    clearPendingDownload();
                    setPending(null);
                  }, 800);
                }}
              >
                <Download className="w-4 h-4" />
                Download now
              </a>
            ) : (
              <Link
                href={`/handler/sign-up?after_auth_return_to=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
                className="btn-primary text-sm"
              >
                <LogIn className="w-4 h-4" />
                Sign up to download
              </Link>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] inline-flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
