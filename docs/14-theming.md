# 14 — Theming

20 user-selectable themes. The whole UI is driven by CSS variables — components never hardcode colors.

## The 20 themes

| Key | Name | Vibe |
|---|---|---|
| `glassmorphism` | Glassmorphism (default) | Orange + Blue, blurred glass cards |
| `dark` | Dark | Warm brown studio |
| `light` | Light | Pale + brown |
| `pretty-pink` | Pretty Pink | Pink + pastels |
| `blue` | Blue Ocean | Cool blues |
| `green-ocean` | Green Ocean | Teal |
| `purple-galaxy` | Purple Galaxy | Purple + space |
| `boring-enterprise` | Boring Enterprise | Corporate gray |
| `grey-alien` | Grey Alien | Cool gray |
| `matrix` | Matrix | Green-on-black terminal |
| `hand-written` | Hand Written | Caveat font, sketchy |
| `coloring-book` | Coloring Book | Patrick Hand font, pastel |
| `rainbow` | Rainbow | Multi-color gradients |
| `chaos` | Chaos | Intentionally over-saturated |
| `orange-slim` | Orange Slim | Orange focus |
| `yellow-sunshine` | Yellow Sunshine | Bright yellow |
| `90s` | 90s | Retro 90s palette |
| `80s` | 80s | Retro 80s neon |
| `cringe` | Cringe | Comic sans, neons |
| `black-and-white` | Black and White | Pure monochrome |

## How a theme is "applied"

The active theme is identified by `data-theme="<key>"` on `<html>`.

```html
<html data-theme="glassmorphism" class="dark">
```

The theme list in [src/app/layout.tsx](../src/app/layout.tsx) inline script and in [src/components/ThemeProvider.tsx](../src/components/ThemeProvider.tsx) MUST stay in sync. Add a theme in three places (see "Adding a theme" below).

## CSS variables defined per theme

Each theme block in [src/app/globals.css](../src/app/globals.css) defines:

```css
[data-theme="<key>"] {
  --bg-primary, --bg-secondary, --bg-tertiary, --bg-card, --bg-elevated;
  --accent-primary, --accent-secondary, --accent-tertiary, --accent-muted, --accent-hover;
  --text-primary, --text-secondary, --text-muted;
  --wave-primary, --wave-secondary, --wave-glow;       /* waveform visualizer colors */
  --success, --success-muted, --error, --warning;
  --border-subtle, --border-medium, --border-hover;
  --font-body, --font-heading;
  --noise-opacity;                                      /* the noise overlay */
  --card-radius;
  /* glassmorphism-only: */
  --glass-blur, --glass-bg, --glass-border, --glass-shadow;
  --gradient-primary, --gradient-secondary, --gradient-bg;
}
```

Components reference these via `var(--accent-primary)`, etc. Tailwind 4 lets you use them directly in arbitrary values: `bg-[var(--bg-card)]`.

## ThemeProvider — the React side

[src/components/ThemeProvider.tsx](../src/components/ThemeProvider.tsx) is a Context provider:

```ts
const ThemeContext = createContext<{
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  hasChosenTheme: boolean;
}>(...);
```

On mount:
1. Reads `localStorage["podcast-theme-chosen"]`.
2. Falls back to `"glassmorphism"`.
3. Sets `document.documentElement.dataset.theme`.

On `setTheme(name)`:
1. Updates state.
2. Writes localStorage.
3. Updates the `data-theme` attribute.

`hasChosenTheme` is used to show the "✨ Try a different theme!" first-visit tooltip in [ThemeSelector](../src/components/ThemeSelector.tsx).

## Preventing flash-of-wrong-theme

The inline `<script>` in [src/app/layout.tsx](../src/app/layout.tsx) runs **before React hydrates**:

```js
(function() {
  var themes = ['glassmorphism','dark', /* ...all 20... */];
  var userChosen = localStorage.getItem('podcast-theme-chosen');
  var theme = 'glassmorphism';
  if (userChosen && themes.indexOf(userChosen) !== -1) theme = userChosen;
  document.documentElement.setAttribute('data-theme', theme);
})();
```

This must include every theme name. Forgetting one means that theme loads with default styles for one frame, then snaps.

## ThemeSelector UI

[src/components/ThemeSelector.tsx](../src/components/ThemeSelector.tsx) is a dropdown:
- Grid of all 20 themes with emoji icons + names
- Hover preview tooltip
- First-visit hint tooltip ("19 themes available!") shown only if `!hasChosenTheme`
- Persists on click

Renders in the header of [HomeClient](../src/components/HomeClient.tsx) and [MasteringTool](../src/components/MasteringTool.tsx).

## Fonts per theme

Most themes use `'DM Sans'`. Specialty themes use Google Fonts loaded conditionally in [src/app/layout.tsx](../src/app/layout.tsx):
- `hand-written` → `Caveat`
- `coloring-book` → `Patrick Hand`

Fonts loaded with `display: "swap"`. The specialty ones have `preload: false` to avoid wasting bandwidth for users who don't use them.

## Glassmorphism specifics

The default theme has extra variables for the frosted-glass card effect:
```css
--glass-blur: 20px;
--glass-bg: rgba(15, 23, 42, 0.6);
--glass-border: rgba(148, 163, 184, 0.15);
--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
```
Used via the `.glass-card` utility class (defined in globals.css):
```css
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: var(--card-radius);
}
```

Other themes redefine `--glass-bg`, `--glass-blur`, etc. to fit their style — `.glass-card` still works everywhere.

## Adding a new theme

1. **CSS** — Add a new block in [src/app/globals.css](../src/app/globals.css) with all required CSS variables:
   ```css
   [data-theme="my-new-theme"] {
     --bg-primary: ...;
     --accent-primary: ...;
     /* ...rest... */
   }
   ```
2. **Theme list (FOUC script)** — Add `'my-new-theme'` to the array in [src/app/layout.tsx](../src/app/layout.tsx) inline script.
3. **ThemeProvider type** — Add to the `ThemeName` union in [src/components/ThemeProvider.tsx](../src/components/ThemeProvider.tsx).
4. **ThemeSelector list** — Add an entry to the themes array in [src/components/ThemeSelector.tsx](../src/components/ThemeSelector.tsx) with icon + label.

Test on:
- Home page mastering tool
- Dashboard (cards, file rows, modals)
- Video generator modal
- The terms / pricing pages

## Removing a theme

Reverse the same four steps. Users who had it chosen will fall back to glassmorphism on next page load (the FOUC script's `themes.indexOf(userChosen) !== -1` check guards this).

## Why this many themes?

Brand differentiator + virality angle. The product is free; "20 themes" gives users something playful to share. Adding more is cheap; do it when one comes up.
