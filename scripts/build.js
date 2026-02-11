// esbuild bundler — bundles display/main.js → dist/ with tree-shaking + minification
import { build, transform } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync, readdirSync, statSync } from "fs";
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
  // Redirect pixi.js → slim entry that skips unused subsystems (accessibility,
  // advanced-blend-modes, compressed-textures, spritesheet, prepare, dom)
  alias: { "pixi.js": "./display/pixi-slim.js" },
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

// Minify CSS
console.log("Minifying CSS...");
const css = readFileSync(join(root, "display/style.css"), "utf8");
const { code: minCss } = await transform(css, { loader: "css", minify: true });
writeFileSync(join(dist, "style.css"), minCss);

// Size report
function dirSize(dir) {
  let total = 0;
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    total += f.isDirectory() ? dirSize(p) : statSync(p).size;
  }
  return total;
}
function fmt(bytes) {
  return bytes < 1024 ? bytes + " B" : (bytes / 1024).toFixed(1) + " KB";
}
console.log("\nBuild output:");
for (const f of readdirSync(dist, { withFileTypes: true })) {
  const p = join(dist, f.name);
  const size = f.isDirectory() ? dirSize(p) : statSync(p).size;
  console.log(`  ${f.name.padEnd(20)} ${fmt(size).padStart(10)}`);
}
console.log(`  ${"TOTAL".padEnd(20)} ${fmt(dirSize(dist)).padStart(10)}`);
console.log("\nBuild complete → dist/");
