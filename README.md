# XMind to Markdown Converter

A pure-frontend, privacy-friendly PWA that converts **XMind ↔ Markdown** with real-time preview.
All conversion runs in the browser — no file ever leaves the device. Installable, works offline.

## Features

- **Bidirectional**: drag a `.xmind` → Markdown; drag a `.md` → `.xmind`
- **Tree preview**: collapsible outline view (Document / 🌲 Tree toggle) that mirrors the XMind hierarchy
- Real-time Markdown preview with table of contents
- Dark mode
- PWA: offline-capable, with auto "new version ready" prompt on update
- Export to `.md`; copy to clipboard

## Tech Stack

- **Astro 5** (islands) + **Svelte 5** (runes) — UI
- **Tailwind CSS 4** — styling
- **jsZip** + **fast-xml-parser** — XMind (ZIP/XML) handling
- **marked** + **DOMPurify** — Markdown rendering (sanitized)
- **Vitest** — tests & architecture guards
- **vite-plugin-pwa / workbox** — service worker

## Getting Started

```bash
npm install        # install
npm run dev        # dev server
npm run lint       # astro check (types/diagnostics)
npm run typecheck  # tsc --noEmit
npm test           # vitest run (incl. guards)
npm run build      # production build → dist/
npm run deploy     # build + publish to gh-pages
```

CI-equivalent: `make ci` (lint + typecheck + test + build).

## Project Structure

```
src/
├── components/
│   ├── ui/           # Button, Card, DropZone, ThemeToggle
│   ├── converter/    # Converter, ResultPanel, TreeView, TableOfContents, MarkdownInput, ProgressBar
│   └── layout/       # Header, Footer
├── lib/              # conversion core: client-converter (XMind→MD), markdown-to-xmind, xmind-builder, download, utils, guards.test
├── layouts/          # Layout.astro (SW registration + update prompt)
├── pages/            # index.astro
├── styles/           # global / dark CSS
└── types/            # converter type definitions
```

XMind→Markdown logic has a single source of truth: `src/lib/client-converter.ts`.

## Engineering Framework & Guards

This project adopts a shared engineering framework (adapted). See `01-CLAUDE.md` (constitution) and `CLAUDE.md` (engineering contract).

Architecture & defense guards live in `src/lib/guards.test.ts` and run with every `npm test`:

| Guard | What it enforces |
|---|---|
| D1 | `as any` budget (only decrease) |
| D2 | `{@html}` injection points tracked (now sanitized via DOMPurify) |
| D3 | no obvious secrets/tokens in source |
| D4 | no unused dependencies |
| D5 | doc-referenced file paths exist |
| D6 | `console.*` residue budget |
| D7 | required npm scripts present (build/test gate) |
| D8 | no dead modules / unused barrel |
| D9 | components must use the shared renderer (no hand-rolled markdownToHtml) |
| G5 | no regenerable test artifacts committed |
| D17–D21 | Fix→Lock parity + registry meta + FIX-LOG/REFLECT/THINK artifacts |

## License

MIT
