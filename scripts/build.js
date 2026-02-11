// esbuild bundler — bundles display/main.js → dist/ with tree-shaking + minification
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

// Clean dist/
if (existsSync(dist)) rmSync(dist, { recursive: true });
mkdirSync(dist, { recursive: true });

// Bundle JS
console.log("Bundling JS...");
await build({
  entryPoints: [join(root, "display/main.js")],
  bundle: true,
  splitting: true,
  format: "esm",
  minify: true,
  outdir: dist,
  entryNames: "[name]",
  chunkNames: "chunks/[name]-[hash]",
  target: ["es2022"],
  // Data files are loaded at runtime via fetch/import — inline them into the bundle
  // since they're ES modules imported by graph.js, layout.js etc.
  external: [],
});

// Copy static assets
console.log("Copying assets...");
cpSync(join(root, "data/icons"), join(dist, "data/icons"), { recursive: true });
cpSync(join(root, "data/sprites"), join(dist, "data/sprites"), { recursive: true });
cpSync(join(root, "favicon.svg"), join(dist, "favicon.svg"));
cpSync(join(root, "og-image.svg"), join(dist, "og-image.svg"));

// Process index.html — update paths for bundled output
console.log("Processing index.html...");
let html = readFileSync(join(root, "index.html"), "utf8");

// Replace display/style.css → style.css
html = html.replace('href="display/style.css"', 'href="style.css"');

// Replace display/main.js → main.js
html = html.replace('src="display/main.js"', 'src="main.js"');

writeFileSync(join(dist, "index.html"), html);

// Copy CSS
cpSync(join(root, "display/style.css"), join(dist, "style.css"));

console.log("Build complete → dist/");
