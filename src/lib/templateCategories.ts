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

export type Template = {
  id: string;
  name: string;
  description: string;
};

export const FEATURED_IDS = new Set([
  "voice-optimized",
  "female-podcast",
  "male-podcast",
  "news-broadcast",
]);

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
];

export function categoryFor(template: Template): string {
  if (FEATURED_IDS.has(template.id)) return "Featured Presets";
  // strip the "podcast-" prefix
  const slug = template.id.replace(/^podcast-/, "");
  return SLUG_TO_CATEGORY.get(slug) ?? "Other Podcasts";
}

export type GroupedTemplates = { label: string; items: Template[] }[];

export function groupTemplates(
  templates: Template[],
  query: string = ""
): GroupedTemplates {
  const q = query.trim().toLowerCase();

  const filtered = q
    ? templates.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      )
    : templates;

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
