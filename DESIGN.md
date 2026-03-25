# Morphmap -- Technical Design

## 1. High-Level Architecture

Morphmap is a static single-page application. There is no backend, no database, and no API. The entire dataset ships as a JSON file bundled at build time.

```
┌──────────────────────────────────────────────────────────┐
│  Browser                                                 │
│                                                          │
│  ┌────────────┐    ┌─────────────┐    ┌───────────────┐  │
│  │  games.json │───▶│  GameStore   │───▶│  Components   │  │
│  │  (static)   │    │  (Context)   │    │  (React)      │  │
│  └────────────┘    └──────┬──────┘    └───────┬───────┘  │
│                           │                   │          │
│                    ┌──────▼──────┐    ┌───────▼───────┐  │
│                    │  Derived     │    │  SVG / Canvas │  │
│                    │  (memoized)  │    │  (D3 zoom)    │  │
│                    └─────────────┘    └───────────────┘  │
│                                                          │
│  ┌─────────────────┐                                     │
│  │  Force Worker    │  (Web Worker -- off main thread)   │
│  │  (d3-force sim)  │                                    │
│  └─────────────────┘                                     │
└──────────────────────────────────────────────────────────┘
```

### Key decisions

- **React owns the DOM, D3 owns the math.** D3 is used for scales, force simulation, zoom behavior, axis rendering, and stack/area generation. React renders all SVG elements and manages all state. The two never fight over DOM ownership.
- **No routing library.** The URL hash is manually synced with state via `useHashState`. This avoids a dependency for what is effectively a single-view app.
- **No state management library.** `useReducer` + Context is sufficient. The state shape is small (6 fields) and only the store provider re-renders on changes.
- **Dataset abstraction.** A `DatasetContext` provides category definitions, colors, and labels, decoupling the visualization engine from the video game dataset. `Entity` is the base type; `Game extends Entity` adds game-specific fields.

---

## 2. Data Model

### 2.1 Schema

Each game entry in `src/data/games.json`:

```typescript
interface Game {
  id: string            // URL-safe slug, e.g. "dark-souls"
  title: string         // Display name
  date: string          // ISO date YYYY-MM-DD (real release date)
  tags: string[]        // Freeform tags (mechanics, art style, themes, design philosophy, etc.)
  primaryTag: string    // One of 10 broad categories for Y-axis clustering
  influencedBy: {
    id: string          // ID of the ancestor game
    through: string[]   // Which specific ideas were inherited
  }[]
}
```

### 2.2 Tag System

Tags serve two purposes:

1. **`tags`** -- freeform descriptors of what a game is known for: mechanics, art style, themes, design philosophy, etc. (e.g., "permadeath", "pixel-art", "open-world", "cyberpunk"). Used for filtering.
2. **`primaryTag`** -- one of 10 fixed categories. Used for Y-axis visual clustering and color coding.

The 10 categories are defined in `src/data/categories.ts` as `TAG_CATEGORIES`, each with an `id`, `label`, and `color`. They are re-exported from `src/types.ts` for convenience. `TAG_COLORS` (a derived `Record<string, string>` lookup) is also exported from the same file. These are the single source of truth for category colors -- injected as CSS custom properties (`--cat-{id}`) at startup in `main.tsx`.

### 2.3 Influence Relationships

An influence is a directed edge: `game.influencedBy[].id -> game.id`. The `through` array describes _which_ specific ideas were inherited, enabling tag-level filtering of influence lines.

Important: `through` tags don't have to match either game's `tags` array. A game can be influenced through an idea without that being one of its primary tags.

### 2.4 Data Validation

`src/data/validate.test.ts` runs 9 checks against the dataset:

| Check | What it catches |
|---|---|
| No duplicate IDs | Copy-paste errors |
| Required fields + types | Missing id/title/date/tags/primaryTag/influencedBy |
| Valid YYYY-MM-DD dates | Typos, invalid dates |
| Known primaryTag | Typo in category assignment |
| Valid influencedBy refs | Dangling references to removed games |
| No self-references | Game referencing itself |
| Non-empty through arrays | Influence with no tag description |
| At least one tag per game | Empty tags array |
| No mutual influence cycles | A influenced by B and B influenced by A |

---

## 3. State Management

### 3.1 Store Architecture

```
GameStoreProvider (src/store/GameStoreContext.tsx)
├── useReducer(gameStoreReducer, initialState)
├── useMemo: links           -- buildLinks(games)
├── useMemo: adjacency       -- buildAdjacency(links)
├── useMemo: derived         -- connectedSet, connectedLinks for selection
└── useMemo: context value   -- { state, derived, games, dispatch }
```

**State shape** (`GameStoreState`):

```typescript
{
  selectedGameId: string | null
  selectedTag: string | null
  timeRange: { from: number; to: number } | null
  viewMode: 'timeline' | 'lineage' | 'trends'
  embed: boolean        // true when rendering in iframe-friendly embed mode
  depth: number | null  // max ancestor/descendant depth for embed mode
}
```

**Actions:**

| Action | Effect |
|---|---|
| `SELECT_GAME` | Toggle game selection (same ID deselects) |
| `SELECT_TAG` | Toggle tag filter (same tag deselects) |
| `SET_TIME_RANGE` | Set year range filter, or null to clear |
| `SET_VIEW_MODE` | Switch between timeline, lineage, and trends views |

### 3.2 Derived State

When a game is selected, the provider computes:

- **`connectedSet`** -- Set of all game IDs in the selected game's full ancestor + descendant lineage (BFS traversal via `getAncestors`/`getDescendants`)
- **`connectedLinks`** -- Set of `"sourceId->targetId"` strings for links that belong to the lineage (not cross-links between connected games)

These are used by `GameNode` and `InfluenceLine` to determine highlight/dim state.

### 3.3 URL Hash Sync

`useHashState.ts` provides:

- `readInitialStateFromHash()` -- called once at provider init to restore state from URL
- `useSyncHashWithState(state)` -- effect that updates `window.location.hash` on state changes (skips first render to avoid overwriting the hash just read)

Hash format: `#game=dark-souls&tag=stamina-combat&from=2000&to=2020&view=lineage`

---

## 4. Layout Pipeline

### 4.1 Initial Positioning

`useTimeline` (called with `games`, `width`, `height`) computes initial node positions:

1. **X-axis**: `scaleTime` maps release dates to horizontal position. The virtual width is `3x` the container width to spread games out, with 100px padding.

2. **Y-axis**: Each of the 10 categories gets an equal vertical band. Within each band, games are sorted by tag popularity (most popular tags = closer to center) and spaced evenly.

### 4.2 Force Simulation (Web Worker)

Initial positions are sent to `src/workers/forceWorker.ts` which runs a D3 force simulation with:

| Force | Purpose | Strength |
|---|---|---|
| `forceX` | Pull nodes toward their date-based X position | 0.8 |
| `forceY` | Pull nodes toward their category band center | 0.8 |
| `forceCollide` | Prevent node overlap (radius + 3px padding) | 0.7 |
| `forceManyBody` | Gentle repulsion between nearby nodes | -20 (max distance 80px) |

The worker posts position updates on every tick. The main thread updates node state, reusing existing `GameNode` objects when positions haven't changed to minimize React re-renders.

**Error handling**: Both `onmessage` and individual tick/end handlers are wrapped in try-catch. Errors are posted back as `{ type: 'error', message }`. If the worker crashes entirely (`onerror`), the app falls back to pre-simulation positions.

### 4.3 Why a Web Worker?

With 178 games and the configured forces, the simulation runs ~100-150 ticks before stabilizing. Running this on the main thread blocks UI for ~200-400ms. The worker keeps the UI responsive and shows a loading indicator during computation.

---

## 5. Rendering

### 5.1 Three View Modes

The `Timeline` component acts as a router based on `viewMode` and dataset size:

- **`viewMode === 'timeline'` + `games.length < 400`**: `SvgTimeline` (React SVG components)
- **`viewMode === 'timeline'` + `games.length >= 400`**: `CanvasTimeline` (imperative Canvas 2D)

Both renderers read from the same `useGameStore` context.

### 5.2 SVG Renderer (`SvgTimeline`)

```
<svg> (D3 zoom behavior attached)
  <g transform={zoomTransform}>
    <TimeAxis />           -- D3 axisBottom, tick lines
    {links.map(InfluenceLine)}   -- curved quadratic paths
    {visibleNodes.map(GameNode)} -- circles + labels
    {linkLabels.map(pill)}       -- tag labels on highlighted links
  </g>
  <Minimap />              -- fixed position, outside zoom transform
</svg>
```

**Viewport culling**: `useViewport` inverts the zoom transform to compute world-space bounds. Only nodes within bounds (+100px margin) are rendered. Links are rendered if either endpoint is visible.

### 5.3 Canvas Renderer (`CanvasTimeline`)

Single `<canvas>` element with:

- D3 zoom behavior for pan/zoom (updates `transformRef`, triggers redraw)
- `ResizeObserver` on container for responsive sizing (handles DPR scaling)
- RAF-throttled redraw via `scheduleRedraw` -> `drawRef.current()`
- Hit testing: on click/mousemove, convert screen coords to world coords via inverse transform, find closest node within radius
- Hover throttling: `mousemove` hit tests are limited to one per animation frame; redraws only happen when the hovered node changes

Draw order: background -> time axis -> links -> nodes -> link labels -> minimap (in screen space).

### 5.4 Influence Lines

Curved quadratic Bezier paths:

```
M source.x,source.y Q midX,controlY target.x,target.y
```

- `controlY` creates a curve perpendicular to the line, magnitude capped at 100px
- Curve direction: up if source is below target, down otherwise
- **Strength encoding**: line thickness interpolated from 0.5px (1 through-tag) to 3.5px (5+ through-tags)
- **Highlight state**: when a game is selected, lineage links get `opacity: 0.6`, non-lineage links get `opacity: 0.03`

### 5.5 Link Labels

When a game is selected, `computeLinkLabel` calculates label positions at the midpoint/control point of each highlighted link. `resolveOverlaps` uses a sweep-line algorithm (sorted by X, early-exit when no X-overlap possible) with 4 passes to push overlapping labels apart vertically.

### 5.6 Minimap

Both SVG and Canvas renderers share layout logic from `src/utils/minimapLayout.ts`:

1. `computeMinimapBounds` -- world-space bounding box of all nodes (with 5% padding)
2. `computeMinimapLayout` -- maps world bounds to minimap pixel space, computes viewport rectangle
3. `toMinimapX/Y` -- coordinate conversion helpers

The minimap renders as a 180x100px rounded rectangle in the bottom-right corner, showing all nodes as 1.2px dots color-coded by category, with a viewport indicator rectangle.

---

## 6. Components

### 6.1 Component Tree

```
App
├── ErrorBoundary
│   └── GameStoreProvider
│       └── AppInner
│           ├── header.top-bar
│           │   ├── SearchBox (forwardRef for keyboard focus)
│           │   ├── ViewToggle (Graph / Trends / Lineage mode switch)
│           │   ├── TagFilter (chip list + overflow dropdown)
│           │   └── TimeRangeSlider (dual-thumb range input)
│           ├── div.main-area
│           │   ├── ErrorBoundary
│           │   │   └── Timeline -> SvgTimeline | CanvasTimeline
│           │   │       ├── GameNode (per node, SVG mode)
│           │   │       ├── InfluenceLine (per link, SVG mode)
│           │   │       ├── Minimap (SVG mode)
│           │   └── ErrorBoundary > Suspense
│           │       └── LazyGameDetail (slide-in panel)
│           ├── Legend (category color reference)
│           ├── Stats line (game + connection count)
│           ├── ErrorBoundary > Suspense
│           │   └── LazyTooltip (follows cursor)
│           └── ShortcutOverlay (modal, toggled by ?)
```

### 6.2 Key Component Details

**SearchBox** -- `forwardRef` so `useKeyboardNav` can focus it on `/`. Uses custom `fuzzyFilter` (not a library) that returns match indices for character-level highlighting. Keyboard navigation: ArrowUp/Down through results, Enter to select.

**ViewToggle** -- Radio group switching between `'timeline'`, `'trends'`, and `'lineage'` view modes.

**TagFilter** -- Shows top 8 tags by frequency inline, remaining in a searchable dropdown. If the selected tag is in the overflow set, it's swapped into the visible row. Closes on outside click via `pointerdown` listener.

**GameDetail** -- Lazy-loaded. Animated slide-in/fade with a 3-state machine (`entering` -> `visible` -> `exiting` -> `hidden`). Ancestor and descendant names are clickable buttons that dispatch `SELECT_GAME`, enabling graph traversal from the panel.

**Tooltip** -- Lazy-loaded. Positioned at cursor + offset. Shows game title, year, category label, tags, and influence count.

**TimeRangeSlider** -- Two overlapping `<input type="range">` elements on a shared track. When both are at extremes (1972-2024), dispatches `null` to clear the filter.

---

## 7. Hooks

| Hook | Purpose |
|---|---|
| `useTimeline` | Computes node positions (initial layout + Web Worker force sim), returns `{ nodes, xScale }` |
| `useViewport` | Inverts zoom transform to world-space bounds for viewport culling |
| `useContainerSize` | `ResizeObserver` on a ref, returns `{ width, height }` |
| `useKeyboardNav` | Global keydown handler for arrow keys (closest-in-time navigation), Escape, `/` |
| `useHashState` | Read initial state from URL hash + sync state changes back to hash |
| `useGameStore` | Convenience wrapper around `useContext(GameStoreContext)` with null check |

---

## 8. Utility Modules

### 8.1 Graph (`src/utils/graph.ts`)

- `buildLinks(games)` -- extracts directed edges from `influencedBy` arrays, skipping references to missing games
- `buildAdjacency(links)` -- builds forward (source->targets) and reverse (target->sources) `Map<string, Set<string>>` for O(1) neighbor lookup
- `getAncestors(gameId, links, adj?)` / `getDescendants(...)` -- BFS traversal using adjacency maps
- `getAllTags(games)` -- union of all tags from game tags and influence through-tags

### 8.2 Fuzzy Search (`src/utils/fuzzy.ts`)

Custom scorer (no external library):

- Sequential character matching (case-insensitive)
- Bonuses: consecutive matches (+5), word boundary matches (+3), string start
- Penalties: gaps between matches (-0.3 per character gap)
- `fuzzyMatchIndices` returns matched character positions for UI highlighting
- `fuzzyFilter` scores all items, sorts by score descending, returns top N with indices

### 8.3 Label Placement (`src/utils/labelPlacement.ts`)

- `computeLinkLabel` -- positions a label at the control point of the link's Bezier curve
- `resolveOverlaps` -- sweep-line overlap resolution: sort by X, check forward neighbors until X-gap exceeds label width (early exit), push overlapping labels apart on Y. 4 passes for cascading resolution.
- `influenceStrokeWidth` -- linear interpolation from `STROKE_STRENGTH_MIN` (0.5) to `STROKE_STRENGTH_MAX` (3.5) based on through-tag count

### 8.4 Minimap Layout (`src/utils/minimapLayout.ts`)

Shared between SVG `Minimap` component and Canvas `drawMinimap`:

- `computeMinimapBounds` -- world bounding box with 5% padding
- `computeMinimapLayout` -- scales, offsets, viewport rectangle
- `toMinimapX/Y` -- world-to-minimap coordinate conversion

### 8.5 Date Helpers (`src/utils/date.ts`)

- `getYear(dateStr)` -- extracts year from a YYYY-MM-DD string

### 8.6 Curve Utilities (`src/utils/curve.ts`)

- Shared Bezier curve computation used by both SVG and Canvas influence line renderers

### 8.7 Heatmap Data (`src/utils/heatmapData.ts`)

- `buildDecadeBuckets` -- aggregates games and influence counts by decade (1970s-2020s), broken down by primary tag. Legacy utility, not currently used by the UI.

---

## 9. Performance

### 9.1 Strategies

| Technique | Where | Impact |
|---|---|---|
| Web Worker force simulation | `forceWorker.ts` | Keeps UI responsive during 100-150 tick layout |
| Viewport culling | `SvgTimeline`, `CanvasTimeline` | Only renders nodes/links in view |
| Canvas fallback | `CanvasTimeline` | Avoids 400+ SVG DOM nodes |
| Memoized adjacency | `GameStoreContext` | `buildAdjacency` recomputed only when links change |
| RAF-throttled hover | `CanvasTimeline` | Hit test + redraw limited to 1/frame |
| Stable node references | `useTimeline` | Reuses GameNode objects when position unchanged |
| Lazy loading | `GameDetail`, `Tooltip` | Code-split, loaded on first use |
| Manual chunk splitting | `vite.config.ts` | Separates vendor-react and vendor-d3 bundles |
| Tree-shaken D3 | `package.json` | Only d3 sub-packages imported (no monolith `d3`) |

### 9.2 Memoization Strategy

All expensive computations are wrapped in `useMemo` with precise dependency arrays:

- `links` depends only on `games`
- `adjacency` depends only on `links`
- `derived` (connectedSet/connectedLinks) depends on `selectedGameId`, `links`, `adjacency`
- `nodeMap` depends only on `nodes`
- `visibleNodes` depends on `nodes` and `viewport`
- `linkLabels` depends on selection state, filtered links, connected set, and node map
---

## 10. Theming

All colors are defined in two places that serve as single sources of truth:

1. **`THEME` in `constants.ts`** -- background, surface, text, accent colors. Used directly by Canvas renderers and injected as CSS vars in `main.tsx`.
2. **`TAG_CATEGORIES` in `data/categories.ts`** (re-exported from `types.ts`) -- category colors. Injected as `--cat-{id}` CSS vars in `main.tsx`. `TAG_COLORS` provides a `Record<string, string>` lookup derived from the same data.

SVG components use CSS vars (`var(--cat-rpg)`, `var(--text-muted)`). Canvas components use the constant values directly since Canvas 2D context doesn't support CSS vars.

---

## 11. Testing

16 test files, 165 tests covering:

| Area | Files | What's tested |
|---|---|---|
| Data integrity | `validate.test.ts` | 9 schema/reference checks against games.json |
| Graph utils | `graph.test.ts` | Link building, adjacency, ancestors/descendants, tag extraction |
| Fuzzy search | `fuzzy.test.ts` | Scoring, match indices, filtering/ranking |
| Label placement | `labelPlacement.test.ts` | Overlap resolution, stroke width calculation |
| Minimap layout | `minimapLayout.test.ts` | Bounds computation, coordinate mapping |
| Heatmap data | `heatmapData.test.ts` | Decade bucketing |
| Curve utils | `curve.test.ts` | Bezier curve computation |
| Components | `GameNode.test.tsx`, `SearchBox.test.tsx`, `TagFilter.test.tsx`, `GameDetail.test.tsx` | Rendering, interaction, accessibility |
| Hooks | `useViewport.test.ts`, `useKeyboardNav.test.ts`, `useHashState.test.ts` | Viewport math, key handling, closest-in-time nav, hash parsing/building |
| Store | `GameStoreContext.test.ts` | Reducer, provider, derived state |

Test environment: Vitest with jsdom. Component tests use React Testing Library.

---

## 12. Build & Bundle

**Vite 8** with `@vitejs/plugin-react`.

Manual chunk splitting in `vite.config.ts`:

- `vendor-react` -- react + react-dom
- `vendor-d3` -- all d3-* sub-packages

This ensures framework code is cached separately from application code.

**TypeScript**: strict mode, two tsconfig files (`tsconfig.app.json` for source, `tsconfig.node.json` for Vite config).

---

## 13. File Map

```
src/
├── main.tsx                    Entry point, CSS variable injection
├── App.tsx                     Root component, lazy loading setup
├── App.css                     Global styles (reset, layout)
├── types.ts                    Game, GameNode, Link, TagCategory types + re-exports
├── constants.ts                FORCE, TIMELINE, NODE, LINE, LABEL, THEME, MINIMAP
│
├── store/
│   ├── storeContext.ts         Context creation + type definitions
│   ├── gameStoreReducer.ts     Reducer + action/state types
│   ├── GameStoreContext.tsx     Provider with derived state computation
│   ├── GameStoreContext.test.ts
│   └── useGameStore.ts         Context consumer hook
│
├── components/
│   ├── Timeline.tsx            View router (SVG / Canvas)
│   ├── Timeline.module.css
│   ├── CanvasTimeline.tsx      Canvas renderer (imperative drawing)
│   ├── GameNode.tsx            Individual game node (SVG)
│   ├── GameNode.module.css
│   ├── GameNode.test.tsx
│   ├── InfluenceLine.tsx       Curved influence path (SVG)
│   ├── Minimap.tsx             SVG minimap overlay
│   ├── GameDetail.tsx          Selection detail panel (lazy)
│   ├── GameDetail.module.css
│   ├── GameDetail.test.tsx
│   ├── Tooltip.tsx             Hover tooltip (lazy)
│   ├── Tooltip.module.css
│   ├── SearchBox.tsx           Fuzzy search with dropdown
│   ├── SearchBox.module.css
│   ├── SearchBox.test.tsx
│   ├── TagFilter.tsx           Tag chip filter with overflow
│   ├── TagFilter.module.css
│   ├── TagFilter.test.tsx
│   ├── TimeRangeSlider.tsx     Year range dual slider
│   ├── TimeRangeSlider.module.css
│   ├── Legend.tsx              Category color legend
│   ├── Legend.module.css
│   ├── ViewToggle.tsx          View mode switch (Graph/Trends/Lineage)
│   ├── ViewToggle.module.css
│   ├── ShortcutOverlay.tsx     Keyboard shortcut modal
│   ├── ShortcutOverlay.module.css
│   └── ErrorBoundary.tsx       Class-based error boundary
│
├── hooks/
│   ├── useTimeline.ts          Force layout pipeline
│   ├── useViewport.ts          Zoom transform -> world bounds
│   ├── useViewport.test.ts
│   ├── useContainerSize.ts     ResizeObserver wrapper
│   ├── useKeyboardNav.ts       Global keyboard shortcuts + closest-in-time nav
│   ├── useKeyboardNav.test.ts
│   ├── useHashState.ts         URL hash <-> state sync
│   └── useHashState.test.ts
│
├── utils/
│   ├── graph.ts                Link building, adjacency, BFS traversal
│   ├── graph.test.ts
│   ├── fuzzy.ts                Fuzzy string matching + filtering
│   ├── fuzzy.test.ts
│   ├── labelPlacement.ts       Link label positioning + overlap resolution
│   ├── labelPlacement.test.ts
│   ├── minimapLayout.ts        Shared minimap math (SVG + Canvas)
│   ├── minimapLayout.test.ts
│   ├── curve.ts                Shared Bezier curve computation
│   ├── curve.test.ts
│   ├── date.ts                 Date helper (getYear)
│   ├── exportSubgraph.ts       Subgraph export utility
│   ├── heatmapData.ts          Decade bucket aggregation (legacy)
│   └── heatmapData.test.ts
│
├── workers/
│   └── forceWorker.ts          D3 force simulation Web Worker
│
├── data/
│   ├── games.json              178 curated games (1972-2024)
│   ├── categories.ts           TAG_CATEGORIES + TAG_COLORS definitions
│   └── validate.test.ts        Dataset integrity checks
│
└── test/
    └── helpers.tsx             Test utilities
```
