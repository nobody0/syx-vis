// Find potentially unused CSS classes in display/style.css
import { readFileSync, readdirSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ── CSS Class Extraction ─────────────────────────────────

/** Extract all class names from CSS, returning Map<className, lineNumber[]> */
function extractCSSClasses(css) {
  // Strip /* ... */ comments
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

  const classes = new Map(); // className → [lineNumbers]
  let depth = 0;
  let selectorBuf = "";
  let lineNum = 1;
  let selectorStartLine = 1;

  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch === "\n") lineNum++;

    if (ch === "{") {
      if (depth === 0) {
        // Extract class names from selector
        const classRe = /\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g;
        let m;
        while ((m = classRe.exec(selectorBuf)) !== null) {
          const name = m[1];
          if (!classes.has(name)) classes.set(name, []);
          classes.get(name).push(selectorStartLine);
        }
        selectorBuf = "";
      }
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth <= 0) {
        depth = 0;
        selectorBuf = "";
        selectorStartLine = lineNum;
      }
    } else if (depth === 0) {
      if (selectorBuf === "" && ch.trim()) selectorStartLine = lineNum;
      selectorBuf += ch;
    }
  }

  return classes;
}

// ── Source File Scanning ─────────────────────────────────

function scanSourceFiles() {
  const files = [];

  // index.html
  files.push("index.html");

  // display/*.js
  for (const f of readdirSync(join(root, "display"))) {
    if (f.endsWith(".js")) files.push(`display/${f}`);
  }

  // derive/*.js
  for (const f of readdirSync(join(root, "derive"))) {
    if (f.endsWith(".js")) files.push(`derive/${f}`);
  }

  const staticClasses = new Set();
  const dynamicPatterns = []; // { prefix: string, source: string }
  const allContent = [];

  for (const file of files) {
    const content = readFileSync(join(root, file), "utf8");
    allContent.push(content);

    // 1. class="..." in HTML/template strings
    for (const m of content.matchAll(/class="([^"]+)"/g)) {
      for (const cls of m[1].split(/\s+/)) {
        if (cls) staticClasses.add(cls);
      }
    }

    // 2. className = "..."
    for (const m of content.matchAll(/className\s*=\s*"([^"]+)"/g)) {
      for (const cls of m[1].split(/\s+/)) {
        if (cls) staticClasses.add(cls);
      }
    }

    // 3. classList.(add|remove|toggle|contains)("...")
    for (const m of content.matchAll(/classList\.(?:add|remove|toggle|contains)\("([^"]+)"/g)) {
      for (const cls of m[1].split(/\s+/)) {
        if (cls) staticClasses.add(cls);
      }
    }

    // 4. .classed("...", ...)
    for (const m of content.matchAll(/\.classed\("([^"]+)"/g)) {
      for (const cls of m[1].split(/\s+/)) {
        if (cls) staticClasses.add(cls);
      }
    }

    // 5. .attr("class", "...")
    for (const m of content.matchAll(/\.attr\("class",\s*"([^"]+)"/g)) {
      for (const cls of m[1].split(/\s+/)) {
        if (cls) staticClasses.add(cls);
      }
    }

    // 6. el("tag", "classes") / elText("tag", ..., "classes")
    for (const m of content.matchAll(/\bel\(\s*"[^"]+"\s*,\s*"([^"]+)"/g)) {
      for (const cls of m[1].split(/\s+/)) {
        if (cls) staticClasses.add(cls);
      }
    }
    for (const m of content.matchAll(/\belText\(\s*"[^"]+"\s*,\s*[^,]+,\s*"([^"]+)"/g)) {
      for (const cls of m[1].split(/\s+/)) {
        if (cls) staticClasses.add(cls);
      }
    }

    // 7. querySelector/querySelectorAll selectors — extract .className
    for (const m of content.matchAll(/querySelector(?:All)?\("([^"]+)"/g)) {
      for (const cm of m[1].matchAll(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)) {
        staticClasses.add(cm[1]);
      }
    }

    // 8. Dynamic patterns: template literals with ${} in class contexts
    //    e.g. el("div", `blueprint-toast toast-${type}`)
    //    e.g. elText("div", w.msg, `planner-valid-${w.type}`)
    //    e.g. className = `state-${opt.key}`
    const dynContexts = [
      /\bel\(\s*"[^"]+"\s*,\s*`([^`]+)`/g,
      /\belText\(\s*"[^"]+"\s*,\s*[^,]+,\s*`([^`]+)`/g,
      /className\s*=\s*`([^`]+)`/g,
      /class=\\?"`([^`]+)`/g,
    ];
    for (const re of dynContexts) {
      for (const m of content.matchAll(re)) {
        const tmpl = m[1];
        if (!tmpl.includes("${")) continue;
        // Extract each whitespace-separated token that has ${} interpolation
        for (const token of tmpl.split(/\s+/)) {
          if (token.includes("${")) {
            // Convert `prefix-${...}` to prefix pattern
            const prefix = token.split("${")[0];
            if (prefix) {
              dynamicPatterns.push({ prefix, source: token });
            }
          } else if (token) {
            // Static parts of the template
            staticClasses.add(token);
          }
        }
      }
    }
  }

  const fullContent = allContent.join("\n");
  return { staticClasses, dynamicPatterns, fullContent, fileCount: files.length };
}

// ── Main ─────────────────────────────────────────────────

const cssPath = join(root, "display/style.css");
const css = readFileSync(cssPath, "utf8");
const cssClasses = extractCSSClasses(css);

const { staticClasses, dynamicPatterns, fullContent, fileCount } = scanSourceFiles();

const used = [];
const dynamic = [];
const unused = [];

for (const [cls, lines] of cssClasses) {
  const line = lines[0];

  // 1. Direct static match
  if (staticClasses.has(cls)) {
    used.push(cls);
    continue;
  }

  // 2. Dynamic pattern match (prefix-*)
  const dynMatch = dynamicPatterns.find((p) => cls.startsWith(p.prefix));
  if (dynMatch) {
    dynamic.push({ cls, line, pattern: dynMatch.source });
    continue;
  }

  // 3. Conservative fallback — substring search in all source content
  if (fullContent.includes(cls)) {
    dynamic.push({ cls, line, pattern: "string match" });
    continue;
  }

  unused.push({ cls, line });
}

// ── Report ───────────────────────────────────────────────

console.log("=== CSS Unused Class Finder ===");
console.log(`Scanned: ${relative(root, cssPath)} (${cssClasses.size} classes)`);
console.log(`Searched: index.html + ${fileCount - 1} JS files\n`);

if (unused.length > 0) {
  console.log(`--- Potentially Unused (${unused.length} classes) ---`);
  for (const { cls, line } of unused.sort((a, b) => a.line - b.line)) {
    console.log(`  .${cls.padEnd(40)} line ${line}`);
  }
  console.log();
}

if (dynamic.length > 0) {
  console.log(`--- Dynamic / String Matches (${dynamic.length} classes) ---`);
  for (const { cls, line, pattern } of dynamic.sort((a, b) => a.line - b.line)) {
    console.log(`  .${cls.padEnd(40)} line ${String(line).padEnd(6)} (${pattern})`);
  }
  console.log();
}

console.log(
  `Summary: ${used.length} used, ${dynamic.length} dynamic, ${unused.length} potentially unused / ${cssClasses.size} total`
);
