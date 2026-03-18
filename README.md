# Morphmap

An interactive visualization of video game history and influence. Explore how ideas like permadeath, open-world design, and stamina combat propagated across 50+ years of game development.

## Overview

Morphmap renders 178 iconic games (1972-2024) on a zoomable timeline. Curved influence lines connect games to their ancestors, showing which specific mechanics and ideas were inherited. Select a game to reveal its full lineage; filter by tag to trace a single concept across decades.

## Features

- **Zoomable timeline** -- games plotted by release date on X, grouped by category on Y
- **Influence river** -- alternate streamgraph view showing how influence flows into each category over time (toggle with Graph/River button or `H` key)
- **Influence graph** -- 293 curated influence relationships with "through" tags describing inherited ideas
- **Game selection** -- click a node to highlight its full ancestor/descendant tree, dim everything else
- **Tag filtering** -- 265 mechanic tags (permadeath, open-world, stamina-combat...) to filter the view
- **Fuzzy search** -- find any game instantly with match highlighting
- **Time range slider** -- filter to a specific era (e.g., 1990-2005)
- **Keyboard navigation** -- arrow keys traverse the influence graph (closest in time), `/` focuses search, `?` shows shortcuts
- **Shareable URLs** -- selected game, tag, time range, view mode encoded in the URL hash
- **Minimap** -- corner overview for orientation in a large graph
- **Hover tooltips** -- quick game info before committing to a click
- **Influence strength** -- line thickness reflects how many mechanics a connection carries
- **Dual renderer** -- SVG for small datasets, Canvas for 400+ nodes

## Getting Started

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with ESLint |

## Tech Stack

- **React 19** + **TypeScript 5.9** + **Vite 8**
- **D3.js** sub-packages (d3-force, d3-scale, d3-zoom, d3-selection, d3-axis, d3-transition, d3-shape)
- **CSS Modules** with CSS custom properties for theming
- **Vitest** + **React Testing Library** for tests
- **Web Worker** for off-thread force simulation

No backend. The entire dataset ships as a static JSON file.

## Data

The dataset (`src/data/games.json`) contains 178 hand-curated games with:

- Real release dates
- Mechanic/concept tags reflecting what each game is known for
- A `primaryTag` from 10 broad categories (FPS, RPG, Strategy, Platformer, etc.) used for visual clustering
- `influencedBy` relationships with `through` tags describing which ideas were inherited

### Categories

Categories are defined in `src/data/categories.ts` and re-exported from `src/types.ts`.

| Category | Color | Count |
|---|---|---|
| FPS / Shooter | Red | 32 |
| RPG | Yellow | 29 |
| Action-Adventure | Orange | 28 |
| Puzzle / Narrative | Purple | 18 |
| Platformer | Cyan | 16 |
| Strategy / Sim | Green | 15 |
| Sandbox / Open World | Teal | 13 |
| Roguelike / Procedural | Amber | 12 |
| Survival / Horror | Slate | 10 |
| Fighting / Sports | Pink | 5 |

### Contributing Data

Edit `src/data/games.json` directly. A validation test suite (`src/data/validate.test.ts`) catches:

- Duplicate IDs
- Missing required fields
- Invalid date formats
- Unknown `primaryTag` values
- Dangling `influencedBy` references
- Self-references
- Empty `through` arrays
- Mutual influence cycles

Run `npm test` after editing to verify.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `/` | Focus search |
| `Esc` | Deselect game / blur input |
| `Left` | Navigate to closest ancestor |
| `Right` | Navigate to closest descendant |
| `Up` / `Down` | Cycle connected games |
| `H` | Toggle river view |
| `?` | Toggle shortcut overlay |

## Project Structure

```
src/
  components/      UI components (Timeline, GameNode, InfluenceLine, InfluenceRiver, etc.)
  data/            Static dataset, categories, validation tests
  hooks/           Custom hooks (useTimeline, useViewport, useKeyboardNav, etc.)
  store/           React Context store (reducer, provider, context)
  utils/           Pure functions (graph, fuzzy search, label placement, river data, etc.)
  workers/         Web Worker for D3 force simulation
  types.ts         Core TypeScript types, re-exports TAG_CATEGORIES
  constants.ts     All magic numbers (force config, rendering params, theme colors)
  App.tsx          Root component
  main.tsx         Entry point, CSS variable injection
```

## License

Private project.
