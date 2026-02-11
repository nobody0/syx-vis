# Songs of Syx – Production Chain Visualizer

## Global Rules

1. **No made-up data.** Data files are auto-generated from the game's `data.zip` via `scripts/extract-game-data.js`. Do not hand-edit `data/resources.js`, `data/buildings.js`, `data/needs.js`, `data/tech.js`, `data/equipment.js`, or `data/races.js` — re-run the extraction script instead.
2. **esbuild bundling for production.** `npm run build` bundles `display/main.js` → `dist/` with tree-shaking + minification. `npm run dev` serves raw source for development (no build step needed). `pixi.js` is installed locally via npm.
3. **Libraries via npm.** `pixi.js` installed as a dependency, bundled by esbuild. DOM helpers via `display/dom.js` (tiny chainable wrapper). Layout is custom (`derive/layout.js`).
4. **Bipartite graph model.** Both resources AND buildings are nodes. Resources are circles (colored by resource category). Buildings are rounded rectangles (colored by building category). Recipes are edges: input resources → building → output resources.
5. **Columns = build-cost score** (construction materials × tech costs). Layout bands: materials (top), civilian, services, military (bottom).
6. **Keep it simple.** No over-engineering. Minimal CSS. Single `index.html` entry point. Dev: `npm run dev`. Production: `npm run build && npm start`.
7. **ES Modules require HTTP server.** `file://` blocks imports due to CORS. Use `npm run dev` for development, `npm start` for bundled production.

## Data Pipeline

Game data is the **single source of truth**. The wiki is outdated and unreliable.

```
Game install (data.zip)  →  scripts/extract-game-data.js  →  data/resources.js
                                                           →  data/buildings.js
                                                           →  data/needs.js
                                                           →  data/tech.js
                                                           →  data/equipment.js
                                                           →  data/races.js
                                                           →  data/icons/
```

- **Source:** Set `DATA_ZIP` in `.env` (see `.env.example`)
- **Run:** `node scripts/extract-game-data.js` (or pass a custom path to data.zip)
- **Output:** Overwrites all `data/*.js` files and `data/icons/`
- **When to re-run:** After any game update, or if the extraction script is improved
- **All recipe amounts are per-worker-per-day rates** extracted from game files (e.g., `YEILD_WORKER_DAILY`, `INDUSTRIES` IN/OUT values, `PLAYER:` rates for pastures/smithy)

## File Structure

```
syx-vis/
  index.html              <- entry point (4 tabs: Graph, Population Needs, Building Upkeep, Production Balancing)
  CLAUDE.md               <- this file
  jsconfig.json           <- TypeScript checking config (checkJs on derive/ + display/config.js)
  eslint.config.js        <- ESLint flat config (no-undef, eqeqeq, no-shadow)
  types.js                <- JSDoc @typedef declarations (Resource, Building, GraphEdge, etc.)
  scripts/
    build.js               <- esbuild bundler: bundles to dist/, copies assets, rewrites paths
    extract-game-data.js   <- Node.js script: reads data.zip, generates all data files + icons
    diag-padding.js        <- diagnostic script for sprite padding analysis
  data/
    resources.js           <- resource table (auto-generated, ES module, @type annotated)
    buildings.js           <- building table with inlined recipes (auto-generated, ES module, @type annotated)
    needs.js               <- 19 needs with rates, event sizes, display names (auto-generated)
    tech.js                <- 13 tech trees with 246 techs (auto-generated)
    equipment.js           <- 11 equipment types with wear rates, standing, boosts (auto-generated)
    races.js               <- 7 races with food/drink preferences (auto-generated)
    icons/                 <- 158 PNG icon files (42 resource 24x24 + 116 building 32x32)
  derive/
    graph.js               <- build dependency graph from data (+World Map pseudo-building)
    layout.js              <- semantic layout: X=build-cost, Y=category bands
  display/
    main.js                <- application entry point (imported by index.html)
    render.js              <- PixiJS WebGL rendering (Graph tab)
    filters.js             <- filter panel (search, category toggles, per-resource controls)
    config.js              <- centralized color config (category colors, band config)
    tabs.js                <- tab switching logic, lazy-initializes tab content
    population.js          <- Population Needs tab (equipment wear, need fulfillment, species)
    balancing.js           <- Production Balancing tab (upstream chain requirements)
    upkeep.js              <- Building Upkeep tab (maintenance costs from value degradation)
    style.css              <- minimal dark-theme styles
  dist/                    <- bundled output (gitignored, built by npm run build)
```

## Conventions

- Resource IDs: lowercase snake_case matching game IDs (e.g., `sithilon`, `stone_cut`, `alco_beer`, `weapon_short`)
- Building IDs: lowercase version of game room filename (e.g., `workshop_ration`, `mine_stone`, `refiner_bakery`)
- Categories for resources: `material`, `food`, `drink`, `military`
- Categories for buildings: `extraction`, `husbandry`, `refining`, `crafting`, `military`, `service`, `trade`, `infrastructure`
- All amounts are per-worker-per-day numbers from the game
- Resources with `_` prefix in game files (e.g., `_WOOD.txt`) are referenced without prefix in recipes

## Type Checking & Linting

- **`npm run check`** — runs `tsc` on `derive/` + `display/config.js` via `jsconfig.json`. Catches property typos, wrong argument counts, type mismatches.
- **`npm run lint`** — runs ESLint on all JS except `data/*.js`. Catches undefined variables, `==` vs `===`, variable shadowing.
- **`npm run validate`** — runs both check + lint. **Run this before committing.**
- TypeScript is a **devDependency only** — used as a checker, never produces output. Zero-build principle preserved.
- Display files (`render.js`, `filters.js`, etc.) are excluded from `tsc` because they use D3 extensively and `@types/d3` is not installed.
- Auto-generated data files include `@type` annotations (e.g., `/** @type {import('../types.js').Building[]} */`) emitted by the extraction script.
- JSDoc `@param`/`@returns` annotations are on all exported functions and key internal functions in `derive/` and `display/config.js`.

## Deployment

The site is deployed to **GitHub Pages** at `https://nobody0.github.io/syx-vis/`.

- **How:** A GitHub Actions workflow (`.github/workflows/deploy.yml`) runs on every push to `main`. It runs `npm ci && npm run build`, then uploads `dist/` as a Pages artifact.
- **What's served:** Only the `dist/` folder — bundled + minified JS, CSS, icons, sprites, and index.html.
- **Icon case sensitivity:** GitHub Pages runs on Linux (case-sensitive). All icon filenames in `data/icons/` must be lowercase to match the references in `data/resources.js` and `data/buildings.js`. On Windows, `git config core.ignorecase true` can silently preserve old capitalized names in the index — if icons 404 on Pages, check `git ls-files data/icons/ | grep '[A-Z]'` and fix with `core.ignorecase=false`, `git rm --cached -r data/icons/`, `git add data/icons/`.

## Current Data (v70)

- **42 resources:** 23 material, 8 food, 2 drink, 9 military
- **116 buildings:** 18 extraction, 6 husbandry, 5 refining, 10 crafting, 6 military, 58 service, 2 trade, 11 infrastructure
- **93 recipes** total
- **19 needs** extracted from game data; 15 buildings with need fulfillment
