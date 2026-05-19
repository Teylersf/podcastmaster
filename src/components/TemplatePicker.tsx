"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Search, Sparkles } from "lucide-react";
import { groupTemplates, type Template } from "@/lib/templateCategories";

type Props = {
  templates: Template[];
  selected: string;
  onSelect: (id: string) => void;
  /** Compact mode = dashboard / smaller container; non-compact = homepage hero. */
  compact?: boolean;
};

// Categories collapsed by default below the fold to keep the picker scannable.
// Featured stays open; the highest-traffic category (NPR) too.
const OPEN_BY_DEFAULT = new Set(["Featured Presets", "NPR & Public Radio"]);

export default function TemplatePicker({
  templates,
  selected,
  onSelect,
  compact = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  const grouped = useMemo(
    () => groupTemplates(templates, query),
    [templates, query]
  );

  const totalShown = useMemo(
    () => grouped.reduce((n, g) => n + g.items.length, 0),
    [grouped]
  );

  // When the user is searching, force-open every group so matches are visible.
  const isSearching = query.trim().length > 0;
  const isOpen = (label: string) =>
    isSearching || (openCats[label] ?? OPEN_BY_DEFAULT.has(label));

  const toggleCat = (label: string) =>
    setOpenCats((s) => ({ ...s, [label]: !isOpen(label) }));

  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-(--text-muted)">
        <p className="text-sm">Loading presets…</p>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {/* Search */}
      <label className="relative block">
        <span className="sr-only">Search presets</span>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted) pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${templates.length} presets…`}
          className={`w-full pl-9 pr-3 rounded-lg border border-(--border-subtle) bg-(--bg-secondary) text-sm placeholder:text-(--text-muted) focus:outline-none focus:border-(--accent-primary) transition-colors ${
            compact ? "py-2" : "py-2.5"
          }`}
        />
      </label>

      {/* Results count when searching */}
      {isSearching && (
        <p className="text-xs text-(--text-muted)">
          {totalShown} {totalShown === 1 ? "match" : "matches"} for &ldquo;{query}&rdquo;
        </p>
      )}

      {/* No results */}
      {totalShown === 0 && (
        <div className="text-center py-6 text-sm text-(--text-muted)">
          No presets match &ldquo;{query}&rdquo;.{" "}
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-(--accent-primary) underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Grouped sections */}
      {grouped.map((group) => {
        const open = isOpen(group.label);
        return (
          <section key={group.label}>
            <button
              type="button"
              onClick={() => toggleCat(group.label)}
              className="w-full flex items-center justify-between gap-2 px-1 py-1.5 text-left group"
            >
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-(--text-secondary)">
                {group.label === "Featured Presets" && (
                  <Sparkles className="w-3.5 h-3.5 text-(--accent-primary)" />
                )}
                {group.label}
                <span className="text-(--text-muted) font-normal normal-case">
                  ({group.items.length})
                </span>
              </span>
              {open ? (
                <ChevronUp className="w-4 h-4 text-(--text-muted) group-hover:text-(--text-secondary)" />
              ) : (
                <ChevronDown className="w-4 h-4 text-(--text-muted) group-hover:text-(--text-secondary)" />
              )}
            </button>

            {open && (
              <div className={compact ? "mt-1 space-y-1.5" : "mt-2 space-y-2"}>
                {group.items.map((t) => {
                  const isSelected = selected === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelect(t.id)}
                      className={`w-full flex items-start gap-3 ${
                        compact ? "p-3" : "p-4"
                      } rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-(--accent-primary) bg-(--accent-muted)"
                          : "border-(--border-subtle) hover:border-(--border-medium) hover:bg-(--bg-tertiary)"
                      }`}
                    >
                      <div
                        className={`${
                          compact ? "w-4 h-4 mt-0.5" : "w-5 h-5 mt-0.5"
                        } rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? "border-(--accent-primary) bg-(--accent-primary)"
                            : "border-(--text-muted)"
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle2
                            className={compact ? "w-2.5 h-2.5 text-white" : "w-3 h-3 text-white"}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${compact ? "text-sm" : ""}`}>
                          {t.name}
                        </p>
                        <p
                          className={`${
                            compact ? "text-xs" : "text-sm"
                          } text-(--text-muted) mt-0.5`}
                        >
                          {t.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
