// Persists the state of a completed-but-not-yet-downloaded mastering job so
// that if the user leaves to sign up mid-flow, they land back on the page and
// see the download button ready to click. Without this, signing out and back
// in through Stack Auth would drop them into the empty upload state and the
// mastered file would appear lost (the file exists on Modal for 24h, but the
// UI wouldn't know about it).
//
// Data lives in localStorage for one job at a time. Any new completed master
// overwrites the previous entry, and expiry mirrors the Modal-side 24-hour
// retention window so we never point at a file that's already been deleted.

const KEY = "pm_pending_download";
const TTL_MS = 24 * 60 * 60 * 1000;

export type PendingDownload = {
  jobId: string;
  fileName: string;
  completedAt: number;
  audioType?: "podcast" | "music";
};

export function savePendingDownload(pd: Omit<PendingDownload, "completedAt">) {
  if (typeof window === "undefined") return;
  try {
    const payload: PendingDownload = { ...pd, completedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Storage disabled / full — non-fatal, just skip the persistence.
  }
}

export function loadPendingDownload(): PendingDownload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingDownload;
    if (
      !parsed?.jobId ||
      typeof parsed.completedAt !== "number" ||
      Date.now() - parsed.completedAt > TTL_MS
    ) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingDownload() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
