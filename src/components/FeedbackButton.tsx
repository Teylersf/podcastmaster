"use client";

import { useEffect, useState } from "react";
import { MessageSquare, X, Bug, Lightbulb, MessageCircle, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

type Category = "bug" | "feature" | "feedback" | "issue";

const CATEGORIES: { id: Category; label: string; icon: typeof Bug; desc: string }[] = [
  { id: "bug",      label: "Bug report",       icon: Bug,           desc: "Something broken" },
  { id: "feature",  label: "Feature request",  icon: Lightbulb,     desc: "Ask for something new" },
  { id: "feedback", label: "Feedback",         icon: MessageCircle, desc: "Tell us what you think" },
  { id: "issue",    label: "Issue",            icon: AlertCircle,   desc: "Trouble using the site" },
];

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("feedback");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when closed so reopening starts clean
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setDone(false);
        setError(null);
        setMessage("");
        setEmail("");
        setCategory("feedback");
      }, 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          email: email.trim() || undefined,
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to send");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] font-semibold shadow-lg shadow-black/30 hover:opacity-90 transition-opacity"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Send feedback"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
              <h2 className="font-bold text-lg">Send feedback</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {done ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--success-muted)] flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-[var(--success)]" />
                </div>
                <h3 className="font-bold text-lg mb-2">Thanks!</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-6">
                  Your message has been sent. We&apos;ll read every one.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-5 py-2.5 rounded-lg bg-[var(--accent-primary)] text-[var(--bg-primary)] font-semibold"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                    What kind of feedback?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((c) => {
                      const Icon = c.icon;
                      const active = category === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCategory(c.id)}
                          className={`flex items-start gap-2 p-3 rounded-lg border text-left transition-all ${
                            active
                              ? "border-[var(--accent-primary)] bg-[var(--accent-muted)]"
                              : "border-[var(--border-subtle)] hover:border-[var(--border-medium)]"
                          }`}
                        >
                          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{c.label}</p>
                            <p className="text-[11px] text-[var(--text-muted)] leading-tight">{c.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="feedback-message" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                    Your message
                  </label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What happened, or what would you like to see?"
                    rows={5}
                    required
                    minLength={3}
                    maxLength={5000}
                    className="resize-y"
                  />
                </div>

                <div>
                  <label htmlFor="feedback-email" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                    Your email <span className="text-[var(--text-muted)] font-normal">(optional — so we can reply)</span>
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-(--error-muted) border border-(--error)/30 text-sm text-[var(--error)] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || message.trim().length < 3}
                  className="btn-primary w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send feedback"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
