# How game colors work

Every game on the map has a color. Games that are similar — because they share tags like "fps", "open-world", or "narrative" — get similar colors. Games that have nothing in common end up with very different colors.

This page explains how that works, starting from the intuition and building up to the math.

## The simple version

### The problem

Each game has a handful of tags: Doom is tagged `fps`, `fast-paced`, `modding`; The Witcher 3 is tagged `open-world`, `narrative`, `moral-choices`, `action-rpg`. We want to turn those tags into a color, such that games sharing tags look alike.

The naive approach would be to pick a fixed category for each game — "Doom is an FPS, color it blue." But games don't fit neatly into boxes. Is Deus Ex an FPS, an RPG, or an immersive sim? Forcing a single category loses information.

### The idea

Instead of assigning categories, we let the tags organize themselves.

We look at which tags tend to appear together on the same games. Tags like `fps` and `multiplayer` co-appear often (Quake, Halo, Counter-Strike all have both). Tags like `fps` and `puzzle` almost never appear together.

Using this co-occurrence information, we arrange all ~450 tags in a line, from left to right, so that tags which frequently co-occur are placed next to each other. This is the **spectral ordering** — it finds the optimal arrangement automatically.

Once the tags are arranged in a line, we map that line to a color spectrum (red through yellow, green, blue, purple, and back). Each game's color is the average position of its tags on this line.

### The result

The arrangement is entirely emergent — no human decided that "FPS should be blue." The algorithm discovers the structure from the data:

| Game | Tags (sample) | Position | Color |
|------|---------------|----------|-------|
| Doom | fps, fast-paced, modding | 0.655 | blue |
| Half-Life | fps, narrative-driven, scripted-events | 0.692 | blue-indigo |
| Quake | fps, 3d-graphics, multiplayer | 0.709 | indigo |
| Dark Souls | action-rpg, difficulty, interconnected-world | 0.485 | teal |
| The Witcher 3 | open-world, narrative, moral-choices | 0.444 | green-teal |
| Minecraft | sandbox, procedural-generation, crafting | 0.310 | green |
| Tetris | puzzle, falling-blocks, high-score | 0.851 | purple |
| Pac-Man | arcade, maze, power-ups, ghost-ai | 1.000 | red |

FPS games cluster in the blue-indigo range. RPGs sit in the teal-green range. Puzzle and arcade games end up in purple and red. But these clusters emerged from the data — they weren't predefined.

### Why "spectral"?

The word "spectral" has a double meaning here. It refers to spectral graph theory (the math technique used — see below). But it also refers to the color spectrum: the output is literally a position on a rainbow.

## The technical version

### Step 1: Build a co-occurrence graph

For every pair of tags, we count how many games share both tags. This gives us a weighted undirected graph where:

- Each **node** is a tag (~450 nodes)
- Each **edge** connects two tags that co-appear on at least one game
- The **weight** of an edge is the number of games sharing both tags

For example, `open-world ↔ sandbox` has weight 12 (12 games have both), `fps ↔ multiplayer` has weight 9.

### Step 2: Compute the graph Laplacian

The Laplacian matrix **L** encodes the graph's structure:

```
L = D - W
```

Where:
- **W** is the adjacency matrix (W[i][j] = co-occurrence weight between tags i and j)
- **D** is the diagonal degree matrix (D[i][i] = sum of all weights for tag i)

The Laplacian has a useful property: for any ordering of nodes as a vector **x**, the quantity **x^T L x** measures how much the ordering "respects" the graph structure. Connected nodes that are far apart in **x** contribute a large penalty.

### Step 3: Find the Fiedler vector

The optimal 1D ordering — the one that minimizes the total penalty — is given by the **Fiedler vector**: the eigenvector corresponding to the second-smallest eigenvalue of **L**.

Why second-smallest? The smallest eigenvalue of any Laplacian is always 0, with a constant eigenvector (all entries equal). That's trivial — it says "put all tags at the same position." The Fiedler vector is the first non-trivial solution.

**Finding the Fiedler vector via power iteration:**

We can't easily find the *smallest* non-trivial eigenvector directly (power iteration converges to the *largest*). So we flip the spectrum:

```
M = λ_max · I - L
```

Where **λ_max** is an upper bound on L's largest eigenvalue (estimated via the Gershgorin circle theorem as 1.1 × max diagonal entry). Now the Fiedler vector of **L** becomes the *dominant* non-trivial eigenvector of **M**.

The iteration:

```
1. Start with a random-ish vector v
2. Repeat 200 times:
   a. v ← M · v                    (matrix-vector multiply)
   b. v ← v - mean(v) · 1          (deflate: remove the constant eigenvector)
   c. v ← v / ||v||                 (normalize to unit length)
3. Sort tags by their component in v
```

The deflation step (2b) is critical — without it, the iteration would converge to the constant vector (all 1s) instead of the Fiedler vector.

### Step 4: From ordering to color

Once tags are sorted by their Fiedler vector component, each game gets a position:

```
raw_position(game) = average of (tag_index / total_tags) for each of the game's tags
```

Positions are then stretched to fill [0, 1] via min-max normalization:

```
position(game) = (raw_position - min) / (max - min)
```

Finally, the position maps to an HSL color:

```
color(game) = hsl(position × 360, 70%, 55%)
```

### Complexity

- **Tag count N ≈ 450**, game count G ≈ 278
- Co-occurrence matrix construction: O(G × T^2) where T is average tags per game (~5), so effectively O(G)
- Laplacian construction: O(N^2)
- Power iteration: 200 iterations × O(N^2) matrix-vector multiply = O(N^2) total
- With N = 450, the full computation takes ~50ms — fast enough to run on page load

### Why spectral ordering?

We considered simpler approaches:

- **Alphabetical sorting**: Tags named similarly aren't necessarily related. "action-rpg" and "arcade" are alphabetically adjacent but semantically distant.
- **Frequency sorting**: Puts common tags together, but ignores relationships. "multiplayer" is common across very different games.
- **Manual ordering**: Doesn't scale. With 450 tags, no human can find the optimal arrangement.
- **Dimensionality reduction (t-SNE, UMAP)**: These embed to 2D, which doesn't map cleanly to a 1D color spectrum. Also non-deterministic.

Spectral ordering is optimal in a precise sense: the Fiedler vector minimizes the sum of squared distances between connected nodes, weighted by edge strength. It's deterministic, fast, and produces an ordering that naturally reveals cluster structure.

### Source code

The implementation is in [`src/utils/tagColor.ts`](../src/utils/tagColor.ts).

Key functions:

| Function | Purpose |
|----------|---------|
| `spectralOrder()` | Core algorithm — Fiedler vector via power iteration |
| `buildTagIndex()` | Builds co-occurrence graph, runs spectral ordering |
| `computeTagPositions()` | Maps each game to [0, 1] via average tag position |
| `computeTagColors()` | Converts positions to HSL color strings |
| `hslFromPosition()` | Position → `hsl(hue, 70%, 55%)` |
| `explainGameColor()` | Per-game breakdown for the UI color explainer |
| `computeNormParams()` | Min/max normalization parameters |

### Further reading

- Fiedler, M. (1973). "Algebraic connectivity of graphs." *Czechoslovak Mathematical Journal*, 23(2), 298–305.
- Atkins, J. E., Boman, E. G., & Hendrickson, B. (1998). "A spectral algorithm for seriation and the consecutive ones problem." *SIAM Journal on Computing*, 28(1), 297–310.
- Von Luxburg, U. (2007). "A tutorial on spectral clustering." *Statistics and Computing*, 17(4), 395–416.
