// Grouping for the mastering-preset picker. Frontend-only; the backend
// just hands us a flat array from /templates.
//
// IDs from the backend:
//   - "voice-optimized", "female-podcast", "male-podcast", "news-broadcast" (4 built-ins)
//   - "podcast-<slug>" (40+ from backend/references/manifest.json, built by
//     backend/scripts/build_preset_library.py)
//
// To add a new podcast preset to a category here, add the slug under the
// matching category below. Unknown podcast slugs land in "Other Podcasts".

export type TemplateKind = "podcast" | "music";

export type Template = {
  id: string;
  name: string;
  description: string;
  kind?: TemplateKind;   // backend sends this; older clients may not
};

export const FEATURED_IDS = new Set([
  "voice-optimized",
  "female-podcast",
  "male-podcast",
  "news-broadcast",
]);

// Hardcoded defaults so the picker is usable on first paint without waiting
// for the Modal `/templates` fetch (cold starts can hit 4+ seconds, which
// the user perceives as the picker being broken). The full 44-preset list
// folds in silently when the API responds.
//
// Names + descriptions mirror backend/modal_app.py's _REFERENCE_TEMPLATE_DEFS.
// If they drift, the API response wins (the prefill is only seen for a
// fraction of a second on a warm container, or ~4s on a cold one).
export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "voice-optimized",
    name: "Recommended - Optimized for Voices",
    description: "Professional voice-optimized preset with balanced EQ and loudness. Best for podcasts and spoken content.",
    kind: "podcast",
  },
  {
    id: "female-podcast",
    name: "Female Voice + Full Production",
    description: "Optimized for female voices with intro music and sound effects. Ready-to-release quality.",
    kind: "podcast",
  },
  {
    id: "male-podcast",
    name: "Male Voice + Full Production",
    description: "Optimized for male voices with intro music and sound effects. Ready-to-release quality.",
    kind: "podcast",
  },
  {
    id: "news-broadcast",
    name: "News & Broadcast Style",
    description: "Breaking news channel sound. Male & female voices with background music, intros, and full production.",
    kind: "podcast",
  },
];

// Used as the prefill on the /audio-mastering page until /templates lands.
// When the music preset library ships, the API expands this. If a fresh
// container hasn't received the music presets yet, we don't show *any*
// hardcoded music defaults — the picker hides itself and the page
// surfaces the "Upload your own reference track" path instead.
export const DEFAULT_MUSIC_TEMPLATES: Template[] = [];

// Ordered. Each entry is a display name + the set of podcast slugs it owns.
// The "podcast-" prefix is implicit — list the bare slugs from the manifest.
type CategoryDef = { label: string; slugs: string[] };

const CATEGORY_DEFS: CategoryDef[] = [
  {
    label: "NPR & Public Radio",
    slugs: [
      "this-american-life",
      "radiolab",
      "hidden-brain",
      "planet-money",
      "code-switch",
      "throughline",
      "fresh-air",
      "wait-wait-dont-tell-me",
      "invisibilia",
      "snap-judgment",
      "the-memory-palace",
      "the-moth-radio-hour",
      "99-invisible",
    ],
  },
  {
    label: "Interview & Long-form",
    slugs: [
      "lex-fridman-podcast",
      "the-tim-ferriss-show",
      "conan-obrien-needs-a-friend",
      "smartless",
      "armchair-expert-with-dax-shepard",
      "wtf-with-marc-maron-podcast",
    ],
  },
  {
    label: "Storytelling & Narrative",
    slugs: [
      "revisionist-history",
      "the-happiness-lab",
      "cautionary-tales-with-tim-harford",
      "heavyweight",
      "science-vs",
      "reply-all",
      "criminal",
      "serial",
    ],
  },
  {
    label: "Tech & Business",
    slugs: [
      "all-in-podcast",
      "the-vergecast",
      "pivot",
      "acquired",
    ],
  },
  {
    label: "News & Politics",
    slugs: [
      "the-daily",
      "today-explained",
      "the-weeds",
      "the-ezra-klein-show",
      "hard-fork",
    ],
  },
  {
    label: "Comedy & Chat",
    slugs: [
      "office-ladies",
      "my-brother-my-brother-and-me",
      "stuff-you-should-know",
    ],
  },
  {
    label: "BBC",
    slugs: [
      "in-our-time-philosophy",
      "desert-island-discs",
    ],
  },
];

// Build slug -> category lookup once at module load.
const SLUG_TO_CATEGORY = new Map<string, string>();
for (const def of CATEGORY_DEFS) {
  for (const slug of def.slugs) {
    SLUG_TO_CATEGORY.set(slug, def.label);
  }
}

// Display order: Featured always first, then the explicit category order,
// then "Other Podcasts" as a fallback bucket.
export const CATEGORY_ORDER = [
  "Featured Presets",
  ...CATEGORY_DEFS.map((c) => c.label),
  "Other Podcasts",
  // Music page categories (rendered by the same picker when kind=music)
  "Music References",
  "Other Music",
];

export function categoryFor(template: Template): string {
  if (FEATURED_IDS.has(template.id)) return "Featured Presets";
  // Music presets all live under one bucket for now — they're cross-genre
  // and a curated handful (one per style). When the library grows we can
  // split by genre.
  if (template.kind === "music" || template.id.startsWith("music-")) {
    return "Music References";
  }
  // Podcast presets use the slug map
  const slug = template.id.replace(/^podcast-/, "");
  return SLUG_TO_CATEGORY.get(slug) ?? "Other Podcasts";
}

export type GroupedTemplates = { label: string; items: Template[] }[];

export function groupTemplates(
  templates: Template[],
  query: string = "",
  kindFilter?: TemplateKind
): GroupedTemplates {
  const q = query.trim().toLowerCase();

  let pool = templates;

  // kind filter: if the page is the music page, show only music templates,
  // and vice versa. Templates missing a `kind` (older API response) are
  // treated as "podcast" — matches backend default.
  if (kindFilter) {
    pool = pool.filter((t) => (t.kind ?? "podcast") === kindFilter);
  }

  const filtered = q
    ? pool.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      )
    : pool;

  const buckets = new Map<string, Template[]>();
  for (const t of filtered) {
    const cat = categoryFor(t);
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat)!.push(t);
  }

  return CATEGORY_ORDER.filter((c) => buckets.has(c)).map((label) => ({
    label,
    items: buckets.get(label)!,
  }));
}
