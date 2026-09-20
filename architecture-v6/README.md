# TAR v6 — architecture site (Astro)

Static site presenting the TAR v6 target architecture. Three pages:

| Route | Source | Content |
|---|---|---|
| `/` | `src/pages/index.astro` | Order walkthrough (one example end to end) |
| `/architecture` | `src/pages/architecture.astro` | Full architecture (system path, flow lab, runtime) |
| `/glossary` | `src/pages/glossary.astro` | Visual terminology guide |

## Commands

```bash
npm install      # first time only
npm run dev      # dev server with hot reload -> http://localhost:4321
npm run build    # static build -> dist/
npm run preview  # serve the built output
```

## Layout

```
src/
  layouts/Base.astro     shared <head>: meta, title, Google Fonts
  pages/                 one .astro page per route
  styles/                page CSS, imported at the top of each page
  scripts/               vanilla DOM scripts, bundled via <script>import ...</script>
public/                  static assets served as-is
```

Each page imports its own CSS and loads its script with
`<script>import '../scripts/<name>.js';</script>`, which Astro bundles as a deferred
module with hot reload. The scripts set `window.selectHomeTab` / `window.selectMobileTab`
so the inline `onclick` handlers in the markup keep working.
