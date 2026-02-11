# Production Chain Atlas – Songs of Syx

Interactive production chain visualizer, room planner, and balancing calculator for [Songs of Syx](https://songsofsyx.com/).

**Live app:** https://nobody0.github.io/syx-vis/

## Features

- **Graph** — Full production chain with resource flows, construction costs, upgrade paths, and city tracking
- **Population** — Per-capita needs, equipment wear, food/drink preferences by species
- **Upkeep** — Building maintenance costs from value degradation
- **Balancing** — Calculate upstream worker/building requirements for any target production rate
- **Planner** — Design and optimize room furniture layouts, import/export game blueprints

## Data source

All data is extracted directly from the game's `data.zip` (v70). The wiki is not used. Run `node scripts/extract-game-data.js` to regenerate after a game update — see `.env.example` for setup.

## Development

Zero-build static site. Serve locally with:

```
npx http-server . -c-1
```

Then open http://localhost:8080.

## Feedback

Found a bug or have a suggestion? [Open an issue](https://github.com/nobody0/syx-vis/issues).

## License

[MIT](LICENSE)
