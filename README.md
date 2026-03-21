# Morphmap

An interactive visualization of video game history and influence. Explore how ideas like permadeath, open-world design, and stamina combat propagated across 50+ years of game development.

## Overview

Morphmap renders games from 1972 to today on a zoomable timeline. Curved influence lines connect games to their ancestors, showing which specific mechanics and ideas were inherited. Select a game to reveal its full lineage; filter by tag to trace a single concept across decades.

## Features

- **Zoomable timeline** -- games plotted by release date on X, arranged by tag similarity on Y
- **Influence graph** -- curated influence relationships with "through" tags describing inherited ideas
- **Game selection** -- click a node to highlight its full ancestor/descendant tree, dim everything else
- **Tag filtering** -- mechanic tags (permadeath, open-world, stamina-combat...) to filter the view
- **Fuzzy search** -- find any game instantly with match highlighting
- **Time range slider** -- filter to a specific era (e.g., 1990-2005)
- **Keyboard navigation** -- arrow keys traverse the influence graph (closest in time), `/` focuses search, `?` shows shortcuts
- **Shareable URLs** -- selected game, tag, time range, view mode encoded in the URL hash
- **Minimap** -- corner overview for orientation in a large graph
- **Hover tooltips** -- quick game info before committing to a click
- **Influence strength** -- line thickness reflects how many mechanics a connection carries
- **Lineage view** -- dedicated column layout showing a game's full ancestor/descendant tree with SVG connectors
- **Embeddable subgraphs** -- iframe-friendly embed mode via URL hash (`#game=doom&embed=true&depth=2`) with compact header and depth-limited lineage
- **Export** -- export a game's lineage subgraph as PNG, or copy an `<iframe>` embed snippet to clipboard
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
| `npm run data:add` | Add a new game (fetches metadata from Wikidata) |
| `npm run data:link` | Add influence relationships to a game |
| `npm run data:audit` | Analyze the dataset for quality issues |
| `npm run data:validate` | Validate all game files (optional `--online` for Wikidata checks) |

## Tech Stack

- **React 19** + **TypeScript 5.9** + **Vite 8**
- **D3.js** sub-packages (d3-force, d3-scale, d3-zoom, d3-selection, d3-axis, d3-transition, d3-shape)
- **CSS Modules** with CSS custom properties for theming
- **Vitest** + **React Testing Library** for tests
- **Web Worker** for off-thread force simulation

No backend. The entire dataset ships as a static JSON file.

## Data

Each game lives as an individual JSON file in `src/data/games/`. These are aggregated into `src/data/games.json` at build time (this file is gitignored).

A game file looks like this:

```json
{
  "id": "dark-souls",
  "title": "Dark Souls",
  "date": "2011-09-22",
  "tags": ["action-rpg", "stamina-combat", "interconnected-world", "bonfires", "die-and-retry"],
  "influencedBy": [
    { "id": "demons-souls", "through": ["action-rpg", "stamina-combat", "bonfires", "die-and-retry"] },
    { "id": "the-legend-of-zelda", "through": ["interconnected-world"] }
  ],
  "imageUrl": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x78.jpg"
}
```

- **id** -- URL-safe slug, must match the filename
- **title** -- display name
- **date** -- release date in YYYY-MM-DD format
- **tags** -- freeform mechanic/concept tags describing what the game is known for
- **influencedBy** -- list of ancestor games with `through` tags describing which ideas were inherited
- **imageUrl** -- optional IGDB cover art URL

Tags are freeform (no fixed list). Colors are assigned automatically via spectral ordering based on tag co-occurrence.

### Contributing Data

There are two ways to contribute: adding new games and adding/updating influence relationships.

#### Adding a game

The easiest way is with the CLI:

```bash
npm run data:add "Dark Souls"
```

This searches Wikidata for the game, fetches its release date and genres, and creates `src/data/games/{id}.json`. You can then edit the file to refine tags or add an `imageUrl`.

To skip Wikidata and enter everything manually:

```bash
npm run data:add --skip-wikidata --title "My Game" --date "2024-01-15" --tags "action,adventure"
```

#### Adding influence relationships

```bash
npm run data:link dark-souls
```

In interactive mode, this prompts you to pick a source game and select which tags represent the inherited ideas. It validates that the source predates the target and auto-adds missing `through` tags to the game's tag list.

You can also do it non-interactively:

```bash
npm run data:link dark-souls --from demons-souls --through "stamina-combat,die-and-retry"
```

Or just edit the game's JSON file directly.

#### Validation

A test suite (`src/data/validate.test.ts`) enforces:

- No duplicate IDs
- Required fields present with correct types
- Valid YYYY-MM-DD dates
- All `influencedBy` references point to existing games
- No self-references
- Non-empty `through` arrays
- Every `through` tag appears in the game's own `tags` array
- Influence sources predate the influenced game
- No mutual influence cycles (A influenced by B and B influenced by A)
- Image URLs must be IGDB CDN URLs if present

Run `npm test` after any data change. Use `npm run data:audit` to find orphaned games, dead ends, and other quality issues.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `/` | Focus search |
| `Esc` | Deselect game / blur input |
| `Left` | Navigate to closest ancestor |
| `Right` | Navigate to closest descendant |
| `Up` / `Down` | Cycle connected games |
| `?` | Toggle shortcut overlay |

## Embed Mode

Morphmap supports an iframe-embeddable view for blog posts, wikis, or documentation. Add `embed=true` to the URL hash to render a minimal page with just the lineage graph:

```
https://your-domain/#game=dark-souls&embed=true
https://your-domain/#game=dark-souls&embed=true&depth=2
```

- `embed=true` -- renders only the lineage view with a compact header (no toolbar, search, filters, or legend)
- `depth=N` -- limits the ancestor/descendant traversal to N generations (optional, shows full lineage if omitted)
- The header shows the game title, year, and a "Morphmap" badge linking to the full app

The "Copy embed code" button in the detail panel generates the `<iframe>` snippet.

## Project Structure

```
src/
  components/      UI components (Timeline, GameNode, InfluenceLine, LineageView, EmbedView, etc.)
  data/            Individual game JSON files, generated aggregate, validation tests
  dataset/         Dataset abstraction layer (DatasetContext, config interface)
  hooks/           Custom hooks (useTimeline, useViewport, useKeyboardNav, etc.)
  store/           React Context store (reducer, provider, context)
  utils/           Pure functions (graph, fuzzy search, label placement, lineage layout, etc.)
  workers/         Web Worker for D3 force simulation
  types.ts         Core TypeScript types (Entity, Game, GameNode, Link)
  constants.ts     All magic numbers (force config, rendering params, theme colors)
  App.tsx          Root component with embed mode routing
  main.tsx         Entry point, CSS variable injection
```

## License

Private project.
