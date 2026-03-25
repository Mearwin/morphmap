# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Build data + start Vite dev server
npm run build          # Build data + type-check + production build
npm run test           # Run all tests once (vitest)
npm run test:watch     # Watch mode
npx vitest run src/utils/graph.test.ts   # Single test file
npm run lint           # ESLint
npx tsc --noEmit       # Type-check only
```

**Data pipeline:**
```bash
npm run data:add "Game Title"    # Add game (fetches from Wikidata)
npm run data:link game-id        # Add influence relationships
npm run data:audit               # Find orphans, dead ends, quality issues
npm run data:validate            # Validate all game files
```

## Architecture

Static React SPA — no backend. The entire dataset ships as JSON at build time.

**Data flow:**
1. Individual game files in `src/data/games/*.json`
2. `npm run data:build` aggregates them into `src/data/games.json` (gitignored)
3. `npm run data:build-tags` computes spectral tag ordering into `src/data/tag-index.json`
4. App.tsx imports both, creates a `DatasetConfig` via `createGamesDatasetConfig()`

**Dual context pattern:**
- `DatasetProvider` — rendering config: tag colors, game positions, tag ordering (derived from spectral analysis of tag co-occurrence graph)
- `GameStoreProvider` — UI state: selection, tag filter, time range, view mode. Uses `useReducer`. Computes derived state (links, adjacency, connected sets) via `useMemo`.

**Rendering pipeline:**
- `Timeline` component routes to `SvgTimeline` (< 400 nodes) or `CanvasTimeline` (>= 400)
- Force simulation runs in a Web Worker (`src/workers/forceWorker.ts`), posts final positions only (no intermediate ticks)
- `useTimeline` hook provides both instant pre-simulation positions (`initialNodes`) and final post-simulation positions (`nodes`)
- Viewport culling via `useViewport` — only visible nodes/links are rendered

**View modes:** timeline (graph), lineage (tree), trends (tag chart). Lineage requires a selected game.

## Game data rules

When creating or editing `src/data/games/*.json`:
- **Filename must match the `id` field** — `dark-souls.json` must contain `"id": "dark-souls"`
- **Every `through` tag must appear in the game's `tags` array** — the tag filter depends on this
- Influence sources must predate the influenced game
- No self-references, no mutual cycles
- Run `npm test` after any data change

## Key conventions

- CSS Modules for component styles (`.module.css`)
- Light/dark theme via `data-theme` attribute on `<html>`, all colors as CSS custom properties
- Lazy loading for non-critical views (LineageView, EmbedView, TagTrendsView, MetricsDashboard)
- All tunable numbers in `src/constants.ts` (force params, node sizes, zoom bounds, theme colors)
- Tag colors assigned automatically via spectral ordering (Fiedler vector of co-occurrence Laplacian) — see `src/utils/tagColor.ts` and `docs/spectral-tag-colors.md`
- URL hash encodes full view state for shareable links (`useHashState`)

## Git

- No co-author tags or "Generated with Claude Code" in commits
- Conventional commit format: `feat:`, `fix:`, `refactor:`, `chore:`, etc.

## Testing

Vitest + React Testing Library + jsdom. Tests colocated with source (`.test.ts` / `.test.tsx`). `src/test/helpers.tsx` provides `renderWithStore()` for component tests with store context.
