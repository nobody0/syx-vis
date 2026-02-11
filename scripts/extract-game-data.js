#!/usr/bin/env node
// Extract game data from Songs of Syx data.zip and generate
// data/resources.js, data/buildings.js, data/needs.js, data/tech.js,
// data/equipment.js, data/races.js, and data/settlement.js for the visualizer.
//
// Usage: node scripts/extract-game-data.js [path-to-data.zip]
//        node scripts/extract-game-data.js --audit
//        node scripts/extract-game-data.js --dump-sprites
//        node scripts/extract-game-data.js --discover-sprites
// Path: CLI arg → DATA_ZIP env var (set in .env) → error

import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { PNG } from "pngjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

// Load .env from project root (no dependencies)
try {
  const env = readFileSync(resolve(PROJECT_ROOT, ".env"), "utf-8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* .env is optional */ }

const positionalArgs = process.argv.slice(2).filter(a => !a.startsWith("--"));
const DATA_ZIP = positionalArgs[0] || process.env.DATA_ZIP;
if (!DATA_ZIP) {
  console.error("Error: No path to data.zip provided.");
  console.error("Set DATA_ZIP in .env (see .env.example) or pass as CLI argument:");
  console.error("  node scripts/extract-game-data.js path/to/data.zip");
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────

function unzipFile(zipPath, entryPath) {
  try {
    return execSync(`unzip -p "${zipPath}" "${entryPath}"`, {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
    });
  } catch {
    return null;
  }
}

function unzipBinary(zipPath, entryPath) {
  try {
    return execSync(`unzip -p "${zipPath}" "${entryPath}"`, {
      encoding: "buffer",
      maxBuffer: 1024 * 1024,
    });
  } catch {
    return null;
  }
}

function listZipPaths(zipPath, dirPattern) {
  const raw = execSync(`unzip -l "${zipPath}"`, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const paths = [];
  for (const line of raw.split("\n")) {
    const match = line.match(/\d+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(.*)/);
    if (match && dirPattern.test(match[1])) {
      paths.push(match[1].trim());
    }
  }
  return paths;
}

// ── Parser for the SoS tag format ───────────────────────────

function parseSosFormat(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  let pos = 0;

  function skipEmpty() {
    while (pos < lines.length) {
      const t = lines[pos].trim();
      if (t === "" || t.startsWith("//")) {
        pos++;
      } else {
        break;
      }
    }
  }

  function parseScalar(s) {
    const clean = s.replace(/,\s*$/, "").trim();
    if (clean === "" || clean === "-") return null;
    if (clean.startsWith('"') && clean.endsWith('"')) {
      return clean.slice(1, -1);
    }
    const num = Number(clean);
    if (!isNaN(num) && clean !== "") return num;
    if (clean === "true") return true;
    if (clean === "false") return false;
    return clean;
  }

  function parseBlock() {
    const obj = {};
    while (pos < lines.length) {
      skipEmpty();
      if (pos >= lines.length) break;
      const trimmed = lines[pos].trim();

      if (trimmed === "}," || trimmed === "}") {
        pos++;
        return obj;
      }
      if (trimmed === "]," || trimmed === "]") {
        return obj;
      }

      const kvMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_>*]*)\s*:\s*(.*)/);
      if (!kvMatch) {
        pos++;
        continue;
      }

      const key = kvMatch[1];
      let rest = kvMatch[2].trim();

      if (rest === "{") {
        pos++;
        obj[key] = parseBlock();
      } else if (rest.startsWith("{") && (rest.endsWith("},") || rest.endsWith("}"))) {
        pos++;
        const inlineContent = rest.replace(/^\{/, "").replace(/\},?$/, "");
        const inlineObj = {};
        for (const part of inlineContent.split(",")) {
          const m = part.trim().match(/^([A-Za-z_]\w*)\s*:\s*(.+)/);
          if (m) inlineObj[m[1]] = parseScalar(m[2]);
        }
        obj[key] = inlineObj;
      } else if (rest.startsWith("{")) {
        pos++;
        obj[key] = parseBlock();
      } else if (rest === "[") {
        pos++;
        obj[key] = parseArray();
      } else if (rest.startsWith("[") && (rest.endsWith("],") || rest.endsWith("]"))) {
        pos++;
        const items = rest
          .replace(/^\[/, "")
          .replace(/\],?$/, "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map(parseScalar);
        obj[key] = items;
      } else if (rest.startsWith("[")) {
        pos++;
        obj[key] = parseArray();
      } else {
        obj[key] = parseScalar(rest);
        pos++;
      }
    }
    return obj;
  }

  function parseArray() {
    const arr = [];
    while (pos < lines.length) {
      skipEmpty();
      if (pos >= lines.length) break;
      const trimmed = lines[pos].trim();

      if (trimmed === "]," || trimmed === "]") {
        pos++;
        return arr;
      }

      if (trimmed === "{") {
        pos++;
        arr.push(parseBlock());
      } else if (trimmed.startsWith("{") && (trimmed.endsWith("},") || trimmed.endsWith("}"))) {
        pos++;
        const inlineContent = trimmed.replace(/^\{/, "").replace(/\},?$/, "");
        if (inlineContent.trim()) {
          const inlineObj = {};
          for (const part of inlineContent.split(",")) {
            const m = part.trim().match(/^([A-Za-z_]\w*)\s*:\s*(.+)/);
            if (m) inlineObj[m[1]] = parseScalar(m[2]);
          }
          arr.push(inlineObj);
        } else {
          arr.push({});
        }
      } else if (trimmed.startsWith("{")) {
        pos++;
        arr.push(parseBlock());
      } else {
        const parts = trimmed.split(",");
        for (const part of parts) {
          const clean = part.trim();
          if (clean && clean !== "]" && clean !== "-") {
            const v = parseScalar(clean);
            if (v !== null) arr.push(v);
          }
        }
        pos++;
      }
    }
    return arr;
  }

  return parseBlock();
}

// ── Text file helpers ────────────────────────────────────────

function extractResourceTextInfo(gameId, filename) {
  const candidates = [
    `data/assets/text/resource/${gameId}.txt`,
    `data/assets/text/resource/${filename}.txt`,
  ];
  for (const path of candidates) {
    const content = unzipFile(DATA_ZIP, path);
    if (!content) continue;
    const data = parseSosFormat(content);
    return {
      name: data.NAME || null,
      desc: data.DESC || null,
    };
  }
  return null;
}

function extractRoomTextInfo(roomFile) {
  const path = `data/assets/text/room/${roomFile}.txt`;
  const content = unzipFile(DATA_ZIP, path);
  if (!content) return null;
  const data = parseSosFormat(content);
  const info = data.INFO || data;
  return {
    name: info.NAME || null,
    desc: info.DESC || null,
  };
}

// ── Extract Resources ───────────────────────────────────────

const TAG_SUBDIRS = ["edible", "drinkable", "growable", "minable", "supply", "work"];

function deriveCategory(tags, catDefault) {
  if (tags.includes("drinkable")) return "drink";
  if (tags.includes("edible")) return "food";
  if (catDefault === 4) return "military";
  return "material";
}

function extractResources() {
  console.log("Extracting resources...");

  const tagsByGameId = new Map();
  for (const subdir of TAG_SUBDIRS) {
    const paths = listZipPaths(
      DATA_ZIP,
      new RegExp(`^data/assets/init/resource/${subdir}/.*\\.txt$`)
    );
    for (const p of paths) {
      const name = p.split("/").pop().replace(".txt", "");
      if (!tagsByGameId.has(name)) tagsByGameId.set(name, []);
      tagsByGameId.get(name).push(subdir);
    }
  }

  const mainPaths = listZipPaths(
    DATA_ZIP,
    /^data\/assets\/init\/resource\/[A-Z_]+\.txt$/
  );

  const resources = [];

  for (const path of mainPaths) {
    const filename = path.split("/").pop().replace(".txt", "");

    const content = unzipFile(DATA_ZIP, path);
    if (!content) continue;

    const data = parseSosFormat(content);
    const catDefault = data.CATEGORY_DEFAULT;
    const degradeRate = data.DEGRADE_RATE;
    const priceCap = data.PRICE_CAP;

    const gameId = filename.startsWith("_") ? filename.slice(1) : filename;

    const tags = [...(tagsByGameId.get(filename) || []), ...(tagsByGameId.get(gameId) || [])];
    const uniqueTags = [...new Set(tags)].sort();

    const category = deriveCategory(uniqueTags, catDefault);

    const id = gameId.toLowerCase();

    const textInfo = extractResourceTextInfo(gameId, filename);
    const name = (textInfo && textInfo.name) || gameId;
    const desc = (textInfo && textInfo.desc) || null;

    const res = { id, name, category, tags: uniqueTags, degradeRate };
    if (desc) res.desc = desc;
    if (priceCap != null) res.priceCap = priceCap;
    resources.push(res);
  }

  const catOrder = { material: 0, food: 1, drink: 2, military: 3 };
  resources.sort(
    (a, b) => (catOrder[a.category] ?? 9) - (catOrder[b.category] ?? 9) || a.id.localeCompare(b.id)
  );

  return resources;
}

// ── PNG Tile Helpers ────────────────────────────────────────

/**
 * Crop a rectangular region from a source PNG into a new PNG.
 * srcX/srcY = top-left of source region; w/h = output dimensions.
 */
/**
 * Crop a tile from a spritesheet, replacing frame indicator colors with transparency.
 *
 * The game's spritesheet cells have a decorative frame with 3 indicator colors:
 *   1. Chroma key background (detected from cell corner)
 *   2. Frame border accent (detected from position (1, bodyStartY) in cell)
 *   3. Frame fill (detected from position (2, bodyStartY) in cell)
 * These vary per sheet (e.g., blue key + red border + magenta fill is standard,
 * but Fish uses blue key + green border + green fill).
 *
 * @param {PNG} src - source spritesheet
 * @param {number} srcX, srcY - top-left of the crop region
 * @param {number} w, h - dimensions to crop
 * @param {Array} frameColors - array of [r,g,b] colors to key out (±2 tolerance each)
 */
/**
 * Replace a specific color with transparency in a PNG (for composite icon backgrounds).
 * Only used for BG/FG compositing where the key color must become transparent.
 */
function chromaKey(png, keyR, keyG, keyB, tolerance = 2) {
  for (let i = 0; i < png.data.length; i += 4) {
    if (Math.abs(png.data[i] - keyR) <= tolerance &&
        Math.abs(png.data[i + 1] - keyG) <= tolerance &&
        Math.abs(png.data[i + 2] - keyB) <= tolerance) {
      png.data[i] = 0;
      png.data[i + 1] = 0;
      png.data[i + 2] = 0;
      png.data[i + 3] = 0;
    }
  }
}

/**
 * Alpha-composite fg over bg (both PNG objects, same size expected).
 * Writes result into bg in-place.
 */
function alphaComposite(bg, fg, offX = 0, offY = 0) {
  for (let y = 0; y < fg.height; y++) {
    const dy = y + offY;
    if (dy < 0 || dy >= bg.height) continue;
    for (let x = 0; x < fg.width; x++) {
      const dx = x + offX;
      if (dx < 0 || dx >= bg.width) continue;
      const fi = (y * fg.width + x) * 4;
      const bi = (dy * bg.width + dx) * 4;
      const fgA = fg.data[fi + 3] / 255;
      const bgA = bg.data[bi + 3] / 255;
      const outA = fgA + bgA * (1 - fgA);
      if (outA === 0) continue;
      bg.data[bi] = (fg.data[fi] * fgA + bg.data[bi] * bgA * (1 - fgA)) / outA;
      bg.data[bi + 1] = (fg.data[fi + 1] * fgA + bg.data[bi + 1] * bgA * (1 - fgA)) / outA;
      bg.data[bi + 2] = (fg.data[fi + 2] * fgA + bg.data[bi + 2] * bgA * (1 - fgA)) / outA;
      bg.data[bi + 3] = outA * 255;
    }
  }
}

/**
 * Parse an icon reference string like "24->resource->Alcohol->0" or "32->BG->3".
 * Returns { size, path, index } where path is the zip path segments between size and index.
 * For 3-part refs (buildings): size->CATEGORY->INDEX → { size, category, name: null, index }
 * For 4-part refs (resources): size->type->name->INDEX → { size, category, name, index }
 */
function parseIconRef(s) {
  if (!s || typeof s !== "string") return null;
  const parts = s.trim().replace(/,\s*$/, "").split("->");
  if (parts.length === 3) {
    // 32->CATEGORY->INDEX (building simple)
    return { size: parseInt(parts[0]), category: parts[1], name: null, index: parseInt(parts[2]) };
  }
  if (parts.length === 4) {
    // 24->resource->Name->INDEX
    return { size: parseInt(parts[0]), category: parts[1], name: parts[2], index: parseInt(parts[3]) };
  }
  return null;
}

// Sprite sheet cache: zipPath → PNG object
const sheetCache = new Map();

function loadSheet(zipPath) {
  if (sheetCache.has(zipPath)) return sheetCache.get(zipPath);
  const buf = unzipBinary(DATA_ZIP, zipPath);
  if (!buf) { sheetCache.set(zipPath, null); return null; }
  const png = PNG.sync.read(buf);
  sheetCache.set(zipPath, png);
  return png;
}

/**
 * Get a single tile from a spritesheet.
 *
 * All sprite sheets use the same pattern: a decorative frame surrounds the icon body.
 * The icon body starts at offset (6, 6) within each cell.
 *
 * 32px building sheets: 88px wide = 2 cols × 44px. Col 0 = icon, Col 1 = normal map.
 *   Cell = 44×44. Icon body at (6, idx*44 + 6), size 32×32.
 *
 * 24px resource sheets: 72px wide = 2 cols × 36px. Col 0 = icon, Col 1 = normal map.
 *   Cell = 36×rowPitch. Icon body at (6, idx*rowPitch + topOffset), size 24×24.
 *   topOffset = 6 for first row, 3 for subsequent rows.
 *
 * No color processing — raw RGBA pixels are copied as-is.
 *
 * @param {object} ref - parsed icon reference { size, category, name, index }
 * @param {number} maxIndex - max index in this sheet (for row pitch in resource sheets)
 * @returns {PNG|null}
 */
function getTile(ref, maxIndex) {
  if (!ref) return null;
  const tileSize = ref.size; // 24 or 32

  // Build zip path to the spritesheet
  let zipPath;
  if (ref.name) {
    zipPath = `data/assets/sprite/icon/${ref.size}/${ref.category}/${ref.name}.png`;
  } else {
    zipPath = `data/assets/sprite/icon/${ref.size}/${ref.category}.png`;
  }

  const sheet = loadSheet(zipPath);
  if (!sheet) return null;

  let srcX, srcY;

  if (tileSize === 24) {
    // 24px sheets: 2 cols × 36px = 72px. Icon body at (6, idx*rowPitch + topOffset).
    const numRows = (maxIndex || 0) + 1;
    const rowPitch = Math.floor(sheet.height / numRows);
    srcX = 6;
    srcY = ref.index * rowPitch + (ref.index === 0 ? 6 : 3);
  } else {
    // 32px sheets: rows at 38px pitch (6px frame + 32px body, no bottom frame per cell).
    // Sheet height = numIcons * 38 + 6 (trailing frame). Icon body at (6, idx*38 + 6).
    srcX = 6;
    srcY = ref.index * 38 + 6;
  }

  // Bounds check — skip if less than half the tile is available
  if (srcX >= sheet.width || srcY >= sheet.height) return null;
  const cropW = Math.min(tileSize, sheet.width - srcX);
  const cropH = Math.min(tileSize, sheet.height - srcY);
  if (cropW < tileSize / 2 || cropH < tileSize / 2) return null;

  // Simple pixel copy — preserve original RGBA, no color processing
  const out = new PNG({ width: tileSize, height: tileSize });
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const si = ((srcY + y) * sheet.width + (srcX + x)) * 4;
      const di = (y * tileSize + x) * 4;
      out.data[di] = sheet.data[si];
      out.data[di + 1] = sheet.data[si + 1];
      out.data[di + 2] = sheet.data[si + 2];
      out.data[di + 3] = sheet.data[si + 3];
    }
  }
  return out;
}

// ── Extract Icons ───────────────────────────────────────────

function extractIcons(resources) {
  console.log("Extracting resource icons...");

  const iconDir = resolve(PROJECT_ROOT, "data/icons");
  if (!existsSync(iconDir)) {
    mkdirSync(iconDir, { recursive: true });
  }

  // Parse ICON fields from resource .txt files
  const resIconRefs = new Map(); // resourceId → parsed ref
  const mainPaths = listZipPaths(DATA_ZIP, /^data\/assets\/init\/resource\/[A-Z_]+\.txt$/);
  for (const path of mainPaths) {
    const content = unzipFile(DATA_ZIP, path);
    if (!content) continue;
    const filename = path.split("/").pop().replace(".txt", "");
    const gameId = filename.startsWith("_") ? filename.slice(1) : filename;
    const id = gameId.toLowerCase();
    const iconMatch = content.match(/^ICON\s*:\s*(\d+->[\w/]+->[\w]+(?:->\d+)?)/m);
    if (iconMatch) {
      resIconRefs.set(id, parseIconRef(iconMatch[1]));
    }
  }

  // Find max index per sheet name (for row pitch calculation)
  const maxIndexPerSheet = new Map();
  for (const [, ref] of resIconRefs) {
    if (!ref || !ref.name) continue;
    const key = `${ref.category}/${ref.name}`;
    const cur = maxIndexPerSheet.get(key) || 0;
    if (ref.index > cur) maxIndexPerSheet.set(key, ref.index);
  }

  const iconMapping = new Map();
  let extracted = 0;

  for (const r of resources) {
    const ref = resIconRefs.get(r.id);
    if (!ref) {
      console.warn(`  Warning: No ICON field for resource "${r.id}"`);
      continue;
    }
    const sheetKey = `${ref.category}/${ref.name}`;
    const maxIdx = maxIndexPerSheet.get(sheetKey) || 0;
    const tile = getTile(ref, maxIdx);
    if (!tile) {
      console.warn(`  Warning: Could not extract icon for resource "${r.id}"`);
      continue;
    }
    const outFile = `${r.id}.png`;
    writeFileSync(resolve(iconDir, outFile), PNG.sync.write(tile));
    iconMapping.set(r.id, outFile);
    extracted++;
  }

  console.log(`  Extracted ${extracted} resource icons to data/icons/`);
  return iconMapping;
}

// ── Extract Building Icons ──────────────────────────────────

function extractBuildingIcons(buildings) {
  console.log("Extracting building icons...");

  const iconDir = resolve(PROJECT_ROOT, "data/icons");
  if (!existsSync(iconDir)) {
    mkdirSync(iconDir, { recursive: true });
  }

  const buildingIconMapping = new Map();
  let extracted = 0;

  for (const b of buildings) {
    const initPath = `data/assets/init/room/${b.id.toUpperCase()}.txt`;
    // Some building files start with underscore
    const content = unzipFile(DATA_ZIP, initPath) ||
      unzipFile(DATA_ZIP, `data/assets/init/room/_${b.id.toUpperCase().replace(/^_/, "")}.txt`);
    if (!content) continue;

    // Try simple ICON: 32->CAT->N
    const simpleMatch = content.match(/^ICON\s*:\s*(\d+->[\w]+->[\d]+)/m);
    if (simpleMatch) {
      const ref = parseIconRef(simpleMatch[1]);
      if (ref) {
        const tile = getTile(ref, ref.index); // maxIndex not needed for 32px (fixed 2-col grid)
        if (tile) {
          const outFile = `${b.id}.png`;
          writeFileSync(resolve(iconDir, outFile), PNG.sync.write(tile));
          buildingIconMapping.set(b.id, outFile);
          extracted++;
          continue;
        }
      }
    }

    // Try composite ICON: { BG: ..., FG: ... }
    const blockMatch = content.match(/^ICON\s*:\s*\{([\s\S]*?)\}/m);
    if (blockMatch) {
      const block = blockMatch[1];
      const bgStr = block.match(/BG\s*:\s*([^,\n}]+)/);
      const fgStr = block.match(/FG\s*:\s*([^,\n}]+)/);
      const offxMatch = block.match(/OFFX\s*:\s*(-?\d+)/);
      const offyMatch = block.match(/OFFY\s*:\s*(-?\d+)/);

      if (bgStr && fgStr) {
        const bgRef = parseIconRef(bgStr[1].trim());
        const fgRef = parseIconRef(fgStr[1].trim());
        if (!bgRef || !fgRef) continue;

        // For resource/race FG refs, look up max index
        let bgMaxIdx = bgRef.index;
        let fgMaxIdx = fgRef.index;
        // Resource sheets need proper maxIndex for row pitch
        if (bgRef.name) {
          bgMaxIdx = 0;
        }
        if (fgRef.name) {
          fgMaxIdx = 0;
        }

        const bgTile = getTile(bgRef, bgMaxIdx);
        const fgTile = getTile(fgRef, fgMaxIdx);
        if (!bgTile || !fgTile) continue;

        // For compositing, key out the background color on each tile so
        // alpha compositing works correctly (corner pixel = key color).
        chromaKey(bgTile, bgTile.data[0], bgTile.data[1], bgTile.data[2]);
        chromaKey(fgTile, fgTile.data[0], fgTile.data[1], fgTile.data[2]);

        // Create output at 32x32
        const out = new PNG({ width: 32, height: 32 });

        // Paint BG (may be 24 or 32)
        const bgOffX = bgRef.size === 24 ? Math.floor((32 - 24) / 2) : 0;
        const bgOffY = bgRef.size === 24 ? Math.floor((32 - 24) / 2) : 0;
        alphaComposite(out, bgTile, bgOffX, bgOffY);

        // Paint FG centered, with game offsets
        const fgCenterX = Math.floor((32 - fgRef.size) / 2);
        const fgCenterY = Math.floor((32 - fgRef.size) / 2);
        const offx = offxMatch ? parseInt(offxMatch[1]) : 0;
        const offy = offyMatch ? parseInt(offyMatch[1]) : 0;
        alphaComposite(out, fgTile, fgCenterX + offx, fgCenterY + offy);

        const outFile = `${b.id}.png`;
        writeFileSync(resolve(iconDir, outFile), PNG.sync.write(out));
        buildingIconMapping.set(b.id, outFile);
        extracted++;
      }
    }
  }

  console.log(`  Extracted ${extracted} building icons to data/icons/`);
  return buildingIconMapping;
}

// ── Needs Extraction ────────────────────────────────────────

function extractNeeds() {
  console.log("Extracting needs...");
  const needPaths = listZipPaths(
    DATA_ZIP,
    /^data\/assets\/init\/stats\/need\/[A-Z_]+\.txt$/
  );
  const needs = new Map(); // needId → { rate, event?, name?, rateName? }
  for (const path of needPaths) {
    const filename = path.split("/").pop().replace(".txt", "");
    const id = filename.startsWith("_") ? filename.slice(1) : filename;
    const content = unzipFile(DATA_ZIP, path);
    if (!content) continue;
    const data = parseSosFormat(content);
    const need = { rate: data.RATE || 0 };
    if (data.EVENT != null) need.event = data.EVENT;

    // Read display name from text file
    const textPath = `data/assets/text/stats/need/${filename}.txt`;
    const textContent = unzipFile(DATA_ZIP, textPath);
    if (textContent) {
      const textData = parseSosFormat(textContent);
      if (textData.NAME_NEED) need.name = textData.NAME_NEED;
      if (textData.NAME_RATE) need.rateName = textData.NAME_RATE;
    }

    needs.set(id, need);
  }
  console.log(`  Found ${needs.size} needs: ${[...needs.keys()].sort().join(", ")}`);
  return needs;
}

// ── Building Auto-Discovery ─────────────────────────────────

// Extract the icon category from the ICON field (format: "32->CATEGORY->N")
function getIconCategory(data) {
  if (typeof data.ICON === "string") {
    const m = data.ICON.match(/->(\w+)->/);
    if (m) return m[1];
  }
  return null;
}

// Game icon categories → visualization categories
const ICON_TO_CATEGORY = {
  TRAINING: "military",
  WATER: "infrastructure",
  LOGISTICS: "infrastructure",
  WORK: "infrastructure",
  INFRA: "infrastructure",
};

// Icon categories that indicate service buildings (when no stronger signal exists)
const ICON_SERVICE_CATS = new Set([
  "DEATH", "HEALTH", "HOME", "KNOWLEDGE", "LAW", "SERVICE", "THRONE",
]);

function autoCategorizeBuildingFile(filename, data) {
  // 1. Filename-based rules (most specific, highest priority)
  if (filename.startsWith("MINE_")) return "extraction";
  if (filename.startsWith("FARM_")) return "extraction";
  if (filename.startsWith("ORCHARD_")) return "extraction";
  if (filename.startsWith("PASTURE_")) return "husbandry";
  if (filename.startsWith("REFINER_")) return "refining";
  if (filename.startsWith("WORKSHOP_")) return "crafting";
  if (filename.startsWith("SHRINE_")) return "service";
  if (filename.startsWith("TEMPLE_")) return "service";
  if (filename.startsWith("MONUMENT_")) return "service";
  if (filename.startsWith("NURSERY_")) return "service";
  if (filename.startsWith("BARRACKS_")) return "military";
  if (filename.startsWith("POOL_")) return "service";

  // 2. Unique data-field signals
  if (data.MINABLE != null) return "extraction";
  if (data.GROWABLE != null) return "extraction";
  if (data.ANIMAL != null) return "husbandry";
  if (data.TRAINING != null) return "military";
  if (data.PROJECTILE != null) return "military";

  // 3. Specific filename rules
  if (filename === "_IMPORT" || filename === "_EXPORT") return "trade";
  if (filename === "_MILITARY_SUPPLY") return "military";
  if (filename === "_CANNIBAL") return "extraction";

  // 4. Need fulfillment: SERVICE.NEED is the definitive service signal
  if (data.SERVICE && typeof data.SERVICE === "object" && data.SERVICE.NEED) {
    return "service";
  }

  // 5. INDUSTRIES/INDUSTRY with outputs → production building (before SERVICE check)
  if (data.INDUSTRIES && Array.isArray(data.INDUSTRIES)) {
    let hasCrafting = false;
    let hasOutput = false;
    for (const entry of data.INDUSTRIES) {
      const ind = entry.INDUSTRY || entry;
      if (ind.OUT && Object.keys(ind.OUT).length > 0) hasOutput = true;
      if (ind.IN && Object.keys(ind.IN).length > 0 && ind.OUT && Object.keys(ind.OUT).length > 0) hasCrafting = true;
    }
    if (hasCrafting) return "crafting";
    if (hasOutput) return "extraction";
  }
  if (data.INDUSTRY && data.INDUSTRY.OUT) {
    const outKeys = Object.keys(data.INDUSTRY.OUT);
    if (outKeys.length > 0) return "extraction";
  }

  // 6. SERVICE block with STANDING or meaningful content → service
  if (data.SERVICE && typeof data.SERVICE === "object") {
    const keys = Object.keys(data.SERVICE);
    // Skip empty or sound-only SERVICE blocks (barracks, dump_corpse)
    const meaningful = keys.filter(k => k !== "SOUND");
    if (meaningful.length > 0) return "service";
  }

  // 7. Top-level STANDING (monuments, graveyard, tomb) → service
  if (data.STANDING != null) return "service";

  // 8. BOOSTING (admin) → service
  if (data.BOOSTING != null) return "service";

  // 9. LEARNING_SPEED (school) → service
  if (data.LEARNING_SPEED != null) return "service";

  // 10. Icon category for non-service types (military, infrastructure)
  //    Embassy (INFRA icon), guard (TRAINING icon), waterpump (WATER icon), etc.
  const iconCat = getIconCategory(data);
  if (iconCat && ICON_TO_CATEGORY[iconCat]) return ICON_TO_CATEGORY[iconCat];

  // 11. Industry with inputs but no outputs (consumption pattern)
  if (data.INDUSTRY && data.INDUSTRY.IN && Object.keys(data.INDUSTRY.IN).length > 0) {
    const outKeys = data.INDUSTRY.OUT ? Object.keys(data.INDUSTRY.OUT) : [];
    if (outKeys.length === 0) return "service";
  }

  // 12. Icon category for service types (weaker signal)
  if (iconCat && ICON_SERVICE_CATS.has(iconCat)) return "service";

  // 13. EMPLOYMENT without industry → service (resthome)
  if (data.EMPLOYMENT != null) return "service";

  return "infrastructure";
}

function discoverBuildings() {
  console.log("Discovering buildings...");

  const roomPaths = listZipPaths(
    DATA_ZIP,
    /^data\/assets\/init\/room\/[A-Z_]+\.txt$/
  );

  const defs = [];
  for (const path of roomPaths) {
    const filename = path.split("/").pop().replace(".txt", "");

    const content = unzipFile(DATA_ZIP, path);
    if (!content) continue;

    const data = parseSosFormat(content);
    const category = autoCategorizeBuildingFile(filename, data);

    defs.push({ file: filename, category });
  }

  console.log(`  Discovered ${defs.length} buildings`);
  return defs;
}

// ── Extract Buildings ───────────────────────────────────────

let resourceNameById = new Map();

function friendlyResourceName(id) {
  return resourceNameById.get(id) || id;
}

function recipeName(buildingName, inputs, outputs, category, filename) {
  if (outputs.length === 0 && inputs.length > 0) {
    const prefix = (category === "logistics" || filename === "_MILITARY_SUPPLY") ? "Supply" : "Consume";
    return inputs.length === 1
      ? `${prefix} ${friendlyResourceName(inputs[0].resource)}`
      : inputs.map((i) => friendlyResourceName(i.resource)).join(" + ");
  }
  if (outputs.length > 0) {
    const outNames = outputs.map((o) => friendlyResourceName(o.resource));
    return outNames.join(" + ");
  }
  return buildingName;
}

function extractOutputAmount(val) {
  if (typeof val === "number") return val;
  if (typeof val === "object" && val !== null) {
    if ("PLAYER" in val) return val.PLAYER;
    for (const v of Object.values(val)) {
      if (typeof v === "number") return v;
    }
  }
  return 0;
}

function extractRecipesFromIndustries(data) {
  const recipes = [];

  // Normalize INDUSTRY (single) and INDUSTRIES (array) into one list
  const industryList = data.INDUSTRIES && Array.isArray(data.INDUSTRIES)
    ? data.INDUSTRIES.map(e => e.INDUSTRY || e)
    : data.INDUSTRY ? [data.INDUSTRY] : [];

  for (const ind of industryList) {
    const inputs = [];
    const outputs = [];

    if (ind.IN) {
      for (const [res, amount] of Object.entries(ind.IN)) {
        if (typeof amount === "number" || typeof amount === "object") {
          inputs.push({
            resource: res.toLowerCase(),
            amount: typeof amount === "number" ? amount : extractOutputAmount(amount),
          });
        }
      }
    }

    if (ind.OUT) {
      for (const [res, amount] of Object.entries(ind.OUT)) {
        outputs.push({
          resource: res.toLowerCase(),
          amount: extractOutputAmount(amount),
        });
      }
    }

    recipes.push({ inputs, outputs });
  }

  if (data.MINABLE && data.YEILD_WORKER_DAILY) {
    recipes.push({
      inputs: [],
      outputs: [
        {
          resource: data.MINABLE.toLowerCase(),
          amount: data.YEILD_WORKER_DAILY,
        },
      ],
    });
  }

  if (data.CONSUMPTION) {
    const inputs = [];
    for (const [res, config] of Object.entries(data.CONSUMPTION)) {
      if (typeof config === "object" && config !== null && config.RATE != null) {
        inputs.push({ resource: res.toLowerCase(), amount: config.RATE });
      }
    }
    if (inputs.length > 0) {
      recipes.push({ inputs, outputs: [] });
    }
  }

  return recipes;
}

// _CANNIBAL.txt has no INDUSTRY block — butcher yields come from race files
// (data/assets/init/race/*.txt RESOURCE block). One recipe per race.
function buildCannibalRecipes() {
  const racePaths = listZipPaths(
    DATA_ZIP,
    /^data\/assets\/init\/race\/[A-Z_]+\.txt$/
  );

  const recipes = [];
  for (const path of racePaths) {
    const filename = path.split("/").pop().replace(".txt", "");
    const content = unzipFile(DATA_ZIP, path);
    if (!content) continue;

    const data = parseSosFormat(content);
    if (!data.RESOURCE || typeof data.RESOURCE !== "object") continue;

    const outputs = [];
    for (const [res, amount] of Object.entries(data.RESOURCE)) {
      if (typeof amount === "number" && amount > 0) {
        outputs.push({ resource: res.toLowerCase(), amount });
      }
    }
    if (outputs.length === 0) continue;

    // Read race display name from text file
    const textPath = `data/assets/text/race/${filename}.txt`;
    const textContent = unzipFile(DATA_ZIP, textPath);
    let raceName = filename;
    if (textContent) {
      const textData = parseSosFormat(textContent);
      if (textData.NAME) raceName = textData.NAME;
    }

    recipes.push({
      inputs: [],
      outputs,
      raceName,
      raceFile: filename,
    });
  }

  recipes.sort((a, b) => a.raceName.localeCompare(b.raceName));
  return recipes;
}

function buildMilitarySupplyRecipes(resources) {
  const supplyResources = resources
    .filter((r) =>
      r.tags.includes("supply") ||
      r.tags.includes("drinkable") ||
      r.category === "military"
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  return supplyResources.map((r) => ({
    inputs: [{ resource: r.id, amount: 1 }],
    outputs: [],
  }));
}

function extractItems(data) {
  const resTypes = data.RESOURCES;
  if (!Array.isArray(resTypes) || !Array.isArray(data.ITEMS)) return [];

  const items = [];
  for (const item of data.ITEMS) {
    const costsArr = item.COSTS;
    const statsArr = item.STATS;
    const costs = [];
    if (Array.isArray(costsArr)) {
      for (let i = 0; i < resTypes.length && i < costsArr.length; i++) {
        const resName = typeof resTypes[i] === "string" ? resTypes[i] : String(resTypes[i]);
        const amount = typeof costsArr[i] === "number" ? costsArr[i] : 0;
        if (amount > 0) {
          costs.push({ resource: resName.toLowerCase(), amount });
        }
      }
    }
    const stats = Array.isArray(statsArr) ? statsArr.filter(v => typeof v === "number") : [];
    items.push({ costs, stats });
  }
  return items;
}

/** Property names that belong to a sprite variant, not a sprite type category */
const SPRITE_VARIANT_PROPS = new Set([
  "FPS", "SHADOW_LENGTH", "SHADOW_HEIGHT", "ROTATES", "FRAMES",
  "TINT", "CIRCULAR", "COLOR", "RESOURCES",
]);

/**
 * Parse size info from a sprite type name.
 * E.g. "CHAIR_1X1" → {w:1,h:1}, "AUX_BIG_2X2" → {w:2,h:2},
 *      "TABLE_COMBO" → null, "GATE_TOP_3X3" → {w:3,h:3}
 * @param {string} name
 * @returns {{w: number, h: number}|null}
 */
function parseSpriteSize(name) {
  const m = name.match(/(\d+)[Xx](\d+)$/);
  if (m) return { w: Number(m[1]), h: Number(m[2]) };
  return null;
}

/**
 * Extract a single sprite variant object, keeping only gameplay-relevant fields.
 * @param {Object} entry - Raw parsed sprite variant
 * @returns {Object}
 */
function extractSpriteVariant(entry) {
  const v = {};
  if (entry.ROTATES != null) v.rotates = entry.ROTATES;
  if (entry.FPS != null && entry.FPS !== 0) v.fps = entry.FPS;
  if (entry.SHADOW_LENGTH != null) v.shadowLength = entry.SHADOW_LENGTH;
  if (entry.SHADOW_HEIGHT != null) v.shadowHeight = entry.SHADOW_HEIGHT;
  if (entry.TINT != null) v.tint = entry.TINT;
  if (entry.CIRCULAR != null) v.circular = entry.CIRCULAR;
  if (entry.COLOR != null && entry.COLOR.R != null) {
    v.color = { r: entry.COLOR.R, g: entry.COLOR.G, b: entry.COLOR.B };
  }
  if (Array.isArray(entry.FRAMES)) {
    v.frames = entry.FRAMES;
  }
  if (entry.RESOURCES != null) v.resources = entry.RESOURCES;
  return v;
}

/**
 * Extract full sprite/furniture data from a building's SPRITES block.
 * Each sprite type key maps to one or more visual variants.
 * @param {Object} data - Parsed room data
 * @returns {Array<{type: string, size: {w:number,h:number}|null, variants: Object[]}>}
 */
function extractSpritesFull(data) {
  if (!data.SPRITES || typeof data.SPRITES !== "object") return [];

  // Detect flat SPRITES: the object itself is a single sprite variant
  // (has FRAMES/ROTATES/FPS directly, no named sprite category sub-objects)
  const spriteKeys = Object.keys(data.SPRITES);
  const isFlat = spriteKeys.some(k => SPRITE_VARIANT_PROPS.has(k)) &&
    !spriteKeys.some(k => !SPRITE_VARIANT_PROPS.has(k) && !/^\d+$/.test(k));

  if (isFlat) {
    const variant = extractSpriteVariant(data.SPRITES);
    return [{ type: "_flat", variants: [variant] }];
  }

  const sprites = [];
  for (const [key, value] of Object.entries(data.SPRITES)) {
    const size = parseSpriteSize(key);
    const variants = [];

    if (Array.isArray(value)) {
      // Array of variant objects
      for (const entry of value) {
        if (entry && typeof entry === "object") {
          variants.push(extractSpriteVariant(entry));
        }
      }
    } else if (value && typeof value === "object") {
      // Single variant object (might have numeric keys for sub-variants, or be a direct entry)
      if (value.FRAMES != null || value.ROTATES != null || value.FPS != null || value.SHADOW_LENGTH != null) {
        // Direct sprite entry
        variants.push(extractSpriteVariant(value));
      } else {
        // Numeric-keyed sub-variants (0, 1, 2, ...)
        const numericKeys = Object.keys(value).filter(k => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
        if (numericKeys.length > 0) {
          for (const k of numericKeys) {
            const entry = value[k];
            if (entry && typeof entry === "object") {
              variants.push(extractSpriteVariant(entry));
            }
          }
        }
        // Also check for non-numeric top-level fields that might be a direct entry
        const nonNumeric = Object.keys(value).filter(k => !/^\d+$/.test(k));
        if (nonNumeric.length > 0 && numericKeys.length === 0) {
          variants.push(extractSpriteVariant(value));
        }
      }
    }

    if (variants.length > 0) {
      const sprite = { type: key, variants };
      if (size) sprite.size = size;
      sprites.push(sprite);
    }
  }
  return sprites;
}

function extractAreaCosts(data) {
  const resTypes = data.RESOURCES;
  if (!Array.isArray(resTypes) || !Array.isArray(data.AREA_COSTS)) return [];

  const result = [];
  for (let i = 0; i < resTypes.length && i < data.AREA_COSTS.length; i++) {
    const resName = typeof resTypes[i] === "string" ? resTypes[i] : String(resTypes[i]);
    const amount = typeof data.AREA_COSTS[i] === "number" ? data.AREA_COSTS[i] : 0;
    if (amount > 0) {
      result.push({ resource: resName.toLowerCase(), amount });
    }
  }
  return result;
}

function extractUpgradeBoosts(data) {
  if (!Array.isArray(data.UPGRADES)) return [];
  const boosts = data.UPGRADES.map(u => u.BOOST ?? 0);
  // Only include if there's at least one non-zero boost
  if (boosts.every(b => b === 0)) return [];
  return boosts;
}

function extractConstructionCosts(data) {
  const resTypes = data.RESOURCES;
  if (!Array.isArray(resTypes)) return [];

  let costs;
  if (data.UPGRADES && Array.isArray(data.UPGRADES) && data.UPGRADES.length > 0) {
    costs = data.UPGRADES[0].RESOURCE_MASK;
  } else if (data.ITEMS && Array.isArray(data.ITEMS) && data.ITEMS.length > 0) {
    costs = data.ITEMS[0].COSTS;
  }
  if (!Array.isArray(costs)) return [];

  const result = [];
  for (let i = 0; i < resTypes.length && i < costs.length; i++) {
    const resName = typeof resTypes[i] === "string" ? resTypes[i] : String(resTypes[i]);
    const amount = typeof costs[i] === "number" ? costs[i] : 0;
    if (amount > 0) {
      result.push({ resource: resName.toLowerCase(), amount });
    }
  }
  return result;
}

function extractUpgradeCosts(data) {
  const resTypes = data.RESOURCES;
  const upgrades = data.UPGRADES;
  if (!Array.isArray(resTypes) || !Array.isArray(upgrades) || upgrades.length < 2) return [];

  const tiers = [];
  for (let t = 1; t < upgrades.length; t++) {
    const mask = upgrades[t].RESOURCE_MASK;
    if (!Array.isArray(mask)) continue;
    const costs = [];
    for (let i = 0; i < resTypes.length && i < mask.length; i++) {
      const resName = typeof resTypes[i] === "string" ? resTypes[i] : String(resTypes[i]);
      const amount = typeof mask[i] === "number" ? mask[i] : 0;
      if (amount > 0) {
        costs.push({ resource: resName.toLowerCase(), amount });
      }
    }
    if (costs.length > 0) tiers.push(costs);
  }
  return tiers;
}

function extractBuildingMetadata(data) {
  const meta = {};
  const work = data.WORK || {};

  if (data.STORAGE != null) meta.storage = data.STORAGE;
  const fulfillment = work.FULFILLMENT ?? work.FULLFILLMENT;
  if (fulfillment != null) meta.fulfillment = fulfillment;
  if (work.ACCIDENTS_PER_YEAR != null) meta.accidentsPerYear = work.ACCIDENTS_PER_YEAR;
  if (work.HEALTH_FACTOR != null) meta.healthFactor = work.HEALTH_FACTOR;
  if (work.USES_TOOL != null) meta.usesTool = work.USES_TOOL;
  if (data.GROWABLE != null) meta.growable = data.GROWABLE;
  if (data.ANIMAL != null) meta.animal = data.ANIMAL;
  if (data.INDOORS != null) meta.indoors = data.INDOORS;

  // Environment noise
  const envEmit = data.ENVIRONMENT_EMIT;
  if (envEmit && envEmit._NOISE && envEmit._NOISE.VALUE) {
    meta.noise = true;
  }

  // Climate bonuses (farms, some pastures)
  const bonus = data.BONUS;
  if (bonus && bonus.CLIMATE) {
    meta.climateBonus = bonus.CLIMATE;
  }

  // Work sub-fields
  if (work.NIGHT_SHIFT != null) meta.nightShift = work.NIGHT_SHIFT;

  // EMPLOYMENT sub-fields (mirror WORK extraction for buildings that use EMPLOYMENT instead)
  const employ = data.EMPLOYMENT;
  if (employ && typeof employ === "object") {
    const empFulfill = employ.FULFILLMENT ?? employ.FULLFILLMENT;
    if (empFulfill != null && meta.fulfillment == null) meta.fulfillment = empFulfill;
    if (employ.USES_TOOL != null && meta.usesTool == null) meta.usesTool = employ.USES_TOOL;
    if (employ.NIGHT_SHIFT != null && meta.nightShift == null) meta.nightShift = employ.NIGHT_SHIFT;
    if (employ.ACCIDENTS_PER_YEAR != null && meta.accidentsPerYear == null) meta.accidentsPerYear = employ.ACCIDENTS_PER_YEAR;
    if (employ.HEALTH_FACTOR != null && meta.healthFactor == null) meta.healthFactor = employ.HEALTH_FACTOR;
    if (employ.SHIFT_OFFSET != null) meta.employShiftOffset = employ.SHIFT_OFFSET;
  }

  // Service block
  if (data.SERVICE && typeof data.SERVICE === "object") {
    if (data.SERVICE.RADIUS != null) meta.serviceRadius = data.SERVICE.RADIUS;
    if (data.SERVICE.NEED) meta.need = data.SERVICE.NEED;
    if (data.SERVICE.DEFAULT_ACCESS != null) meta.serviceDefaultAccess = data.SERVICE.DEFAULT_ACCESS;
    if (data.SERVICE.DEFAULT_VALUE != null) meta.serviceDefaultValue = data.SERVICE.DEFAULT_VALUE;
    // SERVICE.STANDING — who can use the service
    if (data.SERVICE.STANDING && typeof data.SERVICE.STANDING === "object") {
      meta.serviceStanding = data.SERVICE.STANDING;
    }
  }

  // BOOSTING — array of room patterns this building boosts (e.g., Admin Center)
  if (data.BOOSTING && Array.isArray(data.BOOSTING)) {
    meta.boosting = data.BOOSTING.filter(s => typeof s === "string");
  }

  // Boost parameters (Admin Center style)
  if (data.BOOST_FROM != null) meta.boostFrom = data.BOOST_FROM;
  if (data.BOOST_TO != null) meta.boostTo = data.BOOST_TO;
  if (data.INCREASE_POW != null) meta.increasePow = data.INCREASE_POW;

  // POP_MIN — minimum population to justify building
  if (data.POP_MIN != null) meta.popMin = data.POP_MIN;

  // REQUIRES.GREATER — population prerequisite thresholds
  if (data.REQUIRES && typeof data.REQUIRES === "object") {
    const greater = data.REQUIRES.GREATER;
    if (greater && typeof greater === "object") {
      const req = {};
      for (const [k, v] of Object.entries(greater)) {
        if (typeof v === "number") req[k] = v;
      }
      if (Object.keys(req).length > 0) meta.requires = req;
    }
  }

  // STANDING — top-level standing values (monuments, graveyards, etc.)
  if (data.STANDING && typeof data.STANDING === "object") {
    meta.standing = data.STANDING;
  }

  // Floor type
  if (data.FLOOR != null) {
    meta.floorType = data.FLOOR;
  }

  // Mini-map color
  if (data.MINI_COLOR != null) {
    meta.miniColor = String(data.MINI_COLOR);
  }

  // Value degradation rate (building maintenance/decay)
  if (data.VALUE_DEGRADE_PER_YEAR != null) {
    meta.valueDegradePerYear = data.VALUE_DEGRADE_PER_YEAR;
  }

  // Race (nurseries)
  if (data.RACE != null) meta.race = String(data.RACE);

  // Religion (shrines, temples)
  if (data.RELIGION != null) meta.religion = String(data.RELIGION);

  // Incubation time (nurseries)
  if (data.INCUBATION_DAYS != null) meta.incubationDays = data.INCUBATION_DAYS;

  // Education speed (school, university)
  if (data.LEARNING_SPEED != null) meta.learningSpeed = data.LEARNING_SPEED;

  // Fulfillment bonus (monuments) — can be number or object with boost keys
  if (data.FULFILLMENT_BONUS != null) {
    if (typeof data.FULFILLMENT_BONUS === "object") {
      if (Object.keys(data.FULFILLMENT_BONUS).length > 0) meta.fulfillmentBonus = data.FULFILLMENT_BONUS;
    } else {
      meta.fulfillmentBonus = data.FULFILLMENT_BONUS;
    }
  }

  // Maximum monument value
  if (data.MAX_VALUE != null) meta.maxValue = data.MAX_VALUE;

  // Value generation per worker
  if (data.VALUE_PER_WORKER != null) meta.valuePerWorker = data.VALUE_PER_WORKER;

  // Experience bonus (lab, library) — can be number or object with BONUS/MAX_EMPLOYEES
  if (data.EXPERIENCE_BONUS != null) {
    if (typeof data.EXPERIENCE_BONUS === "object") {
      if (Object.keys(data.EXPERIENCE_BONUS).length > 0) meta.experienceBonus = data.EXPERIENCE_BONUS;
    } else {
      meta.experienceBonus = data.EXPERIENCE_BONUS;
    }
  }

  // Projectile resource (artillery)
  if (data.PROJECTILE_RESOURCE != null) meta.projectileResource = String(data.PROJECTILE_RESOURCE).toLowerCase();

  // Equipment to use (guard)
  if (data.EQUIPMENT_TO_USE != null) meta.equipmentToUse = String(data.EQUIPMENT_TO_USE).toLowerCase();

  // Sacrifice resource and type (temples)
  if (data.SACRIFICE_RESOURCE != null) meta.sacrificeResource = String(data.SACRIFICE_RESOURCE).toLowerCase();
  if (data.SACRIFICE_TYPE != null) meta.sacrificeType = String(data.SACRIFICE_TYPE);

  // Max employed workers (hunter)
  if (data.MAX_EMPLOYED != null) meta.maxEmployed = data.MAX_EMPLOYED;

  // Full training duration in days (barracks)
  if (data.FULL_TRAINING_IN_DAYS != null) meta.fullTrainingDays = data.FULL_TRAINING_IN_DAYS;

  // Deposit degradation rate (mines)
  if (data.DEGRADE_RATE != null) meta.degradeRate = data.DEGRADE_RATE;

  // Extra resource production (orchard wood byproduct)
  if (data.EXTRA_RESOURCE != null) meta.extraResource = String(data.EXTRA_RESOURCE).toLowerCase();
  if (data.EXTRA_RESOURCE_AMOUNT != null) meta.extraResourceAmount = data.EXTRA_RESOURCE_AMOUNT;

  // Growth and harvest timing (orchards)
  if (data.DAYS_TILL_GROWTH != null) meta.daysTillGrowth = data.DAYS_TILL_GROWTH;
  if (data.RIPE_AT_PART_OF_YEAR != null) meta.ripeAtPartOfYear = data.RIPE_AT_PART_OF_YEAR;

  // Pasture fence type
  if (data.FENCE != null) meta.fence = String(data.FENCE);

  // Work speed for value buildings
  if (data.VALUE_WORK_SPEED != null) meta.valueWorkSpeed = data.VALUE_WORK_SPEED;

  // Temple sacrifice timing
  if (data.SACRIFICE_TIME != null) meta.sacrificeTime = data.SACRIFICE_TIME;

  // Barber service time
  if (data.WORK_TIME_IN_DAYS != null) meta.workTimeInDays = data.WORK_TIME_IN_DAYS;

  // Building subtype
  if (data.TYPE != null) meta.buildingType = String(data.TYPE);

  // Race preference
  if (data.RACE_PREFERENCE != null) meta.racePreference = String(data.RACE_PREFERENCE);

  // Training block (military)
  if (data.TRAINING && typeof data.TRAINING === "object") {
    const training = {};
    if (data.TRAINING.FULL_DAYS != null) training.fullDays = data.TRAINING.FULL_DAYS;
    if (data.TRAINING.BOOST != null) training.boost = data.TRAINING.BOOST;
    if (Object.keys(training).length > 0) meta.training = training;
  }

  // Sprite type names (kept for backward compat; full data via extractSpritesFull)
  if (data.SPRITES && typeof data.SPRITES === "object") {
    const spriteTypes = Object.keys(data.SPRITES).filter(k => !SPRITE_VARIANT_PROPS.has(k));
    if (spriteTypes.length > 0) meta.spriteTypes = spriteTypes;
  }

  return meta;
}

function extractBuildings(resources) {
  console.log("Extracting buildings...");
  const buildings = [];

  // Discover buildings from zip instead of using hardcoded BUILDING_DEFS
  const buildingDefs = discoverBuildings();

  const militarySupplyRecipes = buildMilitarySupplyRecipes(resources);

  for (const def of buildingDefs) {
    const initPath = `data/assets/init/room/${def.file}.txt`;
    const content = unzipFile(DATA_ZIP, initPath);

    const id = def.file.toLowerCase();

    const textInfo = extractRoomTextInfo(def.file);
    const name = (textInfo && textInfo.name) || def.file;
    const desc = (textInfo && textInfo.desc) || null;

    let recipes;
    let constructionCosts = [];
    let metadata = {};
    let upgradeCosts = [];

    let items = [];
    let sprites = [];
    let areaCosts = [];
    let upgradeBoosts = [];

    if (def.file === "_MILITARY_SUPPLY") {
      recipes = militarySupplyRecipes;
      if (content) {
        const data = parseSosFormat(content);
        constructionCosts = extractConstructionCosts(data);
        upgradeCosts = extractUpgradeCosts(data);
        items = extractItems(data);
        sprites = extractSpritesFull(data);
        areaCosts = extractAreaCosts(data);
        upgradeBoosts = extractUpgradeBoosts(data);
        metadata = extractBuildingMetadata(data);
      }
    } else if (def.file === "_CANNIBAL") {
      recipes = buildCannibalRecipes();
      if (content) {
        const data = parseSosFormat(content);
        constructionCosts = extractConstructionCosts(data);
        upgradeCosts = extractUpgradeCosts(data);
        items = extractItems(data);
        sprites = extractSpritesFull(data);
        areaCosts = extractAreaCosts(data);
        upgradeBoosts = extractUpgradeBoosts(data);
        metadata = extractBuildingMetadata(data);
      }
    } else if (content) {
      const data = parseSosFormat(content);
      recipes = extractRecipesFromIndustries(data);
      constructionCosts = extractConstructionCosts(data);
      upgradeCosts = extractUpgradeCosts(data);
      items = extractItems(data);
      sprites = extractSpritesFull(data);
      areaCosts = extractAreaCosts(data);
      upgradeBoosts = extractUpgradeBoosts(data);
      metadata = extractBuildingMetadata(data);
    } else {
      console.warn(`  Warning: Could not read ${initPath}`);
      recipes = [];
    }

    const namedRecipes = recipes.map((r, i) => {
      const idPrefix = (def.category === "logistics" || def.file === "_MILITARY_SUPPLY") ? "supply" : "consume";

      let recipeId, rName;
      if (r.raceFile) {
        // Cannibal per-race recipe: use race filename for unique id, race name for display
        recipeId = `${id}_${r.raceFile.toLowerCase()}`;
        rName = `Butcher ${r.raceName}`;
      } else {
        const outPart =
          r.outputs.length > 0
            ? r.outputs.map((o) => o.resource).join("_")
            : r.inputs.length > 0
              ? `${idPrefix}_` + r.inputs[0].resource
              : "recipe";
        recipeId = `${id}_${outPart}${recipes.length > 1 && recipes.filter((r2) => r2.outputs.map((o) => o.resource).join("_") === r.outputs.map((o) => o.resource).join("_")).length > 1 ? "_" + i : ""}`;
        rName = recipeName(name, r.inputs, r.outputs, def.category, def.file);
      }

      return {
        id: recipeId,
        name: rName,
        inputs: r.inputs,
        outputs: r.outputs,
      };
    });

    // Deduplicate recipe IDs
    const seenIds = new Map();
    for (const r of namedRecipes) {
      if (seenIds.has(r.id)) {
        const count = seenIds.get(r.id) + 1;
        seenIds.set(r.id, count);
        r.id = `${r.id}_${count}`;
      } else {
        seenIds.set(r.id, 1);
      }
    }

    const building = {
      id,
      name,
      category: def.category,
      recipes: namedRecipes,
      constructionCosts,
    };
    if (upgradeCosts.length > 0) building.upgradeCosts = upgradeCosts;
    if (items.length > 0) building.items = items;
    if (sprites.length > 0) building.sprites = sprites;
    if (areaCosts.length > 0) building.areaCosts = areaCosts;
    if (upgradeBoosts.length > 0) building.upgradeBoosts = upgradeBoosts;

    if (desc) building.desc = desc;
    Object.assign(building, metadata);

    buildings.push(building);
  }

  // Sort buildings by category order, then by name
  const catOrder = {
    extraction: 0, husbandry: 1, refining: 2, crafting: 3,
    logistics: 4, military: 5, service: 6, trade: 7, infrastructure: 8,
  };
  buildings.sort(
    (a, b) => (catOrder[a.category] ?? 99) - (catOrder[b.category] ?? 99) || a.name.localeCompare(b.name)
  );

  return buildings;
}

// ── Extract Tech Trees ──────────────────────────────────────

function extractTechTrees() {
  console.log("Extracting tech trees...");

  const techPaths = listZipPaths(
    DATA_ZIP,
    /^data\/assets\/init\/tech\/[A-Z0-9_]+\.txt$/
  );

  const techTrees = [];

  for (const path of techPaths) {
    const filename = path.split("/").pop().replace(".txt", "");
    const content = unzipFile(DATA_ZIP, path);
    if (!content) continue;

    const data = parseSosFormat(content);

    // Read display name from text file
    const textPath = `data/assets/text/tech/${filename}.txt`;
    const textContent = unzipFile(DATA_ZIP, textPath);
    let treeName = filename;
    const techNames = {};
    if (textContent) {
      const textData = parseSosFormat(textContent);
      if (textData.NAME) treeName = textData.NAME;
      // Extract per-tech names
      if (textData.TECHS) {
        for (const [techId, techText] of Object.entries(textData.TECHS)) {
          if (typeof techText === "object" && techText.NAME) {
            techNames[techId] = techText.NAME;
          }
        }
      }
    }

    // Parse color
    let color = null;
    if (data.COLOR) {
      const parts = String(data.COLOR).split("_");
      if (parts.length === 3) {
        color = { R: Number(parts[0]), G: Number(parts[1]), B: Number(parts[2]) };
      }
    }

    // Parse techs
    const techs = {};
    if (data.TECHS) {
      for (const [techId, techData] of Object.entries(data.TECHS)) {
        if (typeof techData !== "object" || techData === null) continue;

        const tech = {
          name: techNames[techId] || techId,
        };

        if (techData.LEVEL_MAX != null) tech.levelMax = techData.LEVEL_MAX;
        if (techData.LEVEL_COST_INC != null) tech.levelCostInc = techData.LEVEL_COST_INC;

        // Costs
        if (techData.COSTS && typeof techData.COSTS === "object") {
          tech.costs = {};
          for (const [k, v] of Object.entries(techData.COSTS)) {
            if (typeof v === "number") tech.costs[k] = v;
          }
        }

        // Requirements
        if (techData.REQUIRES_TECH_LEVEL && typeof techData.REQUIRES_TECH_LEVEL === "object") {
          const reqTech = {};
          for (const [k, v] of Object.entries(techData.REQUIRES_TECH_LEVEL)) {
            if (typeof v === "number") reqTech[k] = v;
          }
          if (Object.keys(reqTech).length > 0) tech.requiresTechLevel = reqTech;
        }

        // Population requirements
        if (techData.REQUIRES && typeof techData.REQUIRES === "object") {
          const greater = techData.REQUIRES.GREATER;
          if (greater && typeof greater === "object") {
            tech.requiresPopulation = {};
            for (const [k, v] of Object.entries(greater)) {
              if (typeof v === "number") tech.requiresPopulation[k] = v;
            }
          }
        }

        // Unlocks
        if (techData.UNLOCKS_FACTION && Array.isArray(techData.UNLOCKS_FACTION)) {
          const unlocks = techData.UNLOCKS_FACTION.filter(u => typeof u === "string" && u.length > 0);
          if (unlocks.length > 0) tech.unlocksFaction = unlocks;
        }

        // Boost
        if (techData.BOOST && typeof techData.BOOST === "object") {
          const boosts = {};
          for (const [k, v] of Object.entries(techData.BOOST)) {
            if (typeof v === "number") boosts[k] = v;
          }
          if (Object.keys(boosts).length > 0) tech.boost = boosts;
        }

        techs[techId] = tech;
      }
    }

    techTrees.push({
      id: filename.toLowerCase(),
      name: treeName,
      color,
      techs,
    });
  }

  // Sort by name
  techTrees.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`  Found ${techTrees.length} tech trees with ${techTrees.reduce((s, t) => s + Object.keys(t.techs).length, 0)} techs`);
  return techTrees;
}

// ── Link tech unlocks to buildings ──────────────────────────

function linkTechToBuildings(techTrees, buildings) {
  // Build a map of building filename (uppercase) → building object
  const buildingByFile = new Map();
  for (const b of buildings) {
    buildingByFile.set(b.id.toUpperCase(), b);
  }

  for (const tree of techTrees) {
    for (const [techId, tech] of Object.entries(tree.techs)) {
      if (!tech.unlocksFaction) continue;

      for (const unlock of tech.unlocksFaction) {
        // Parse ROOM_X_UPGRADE_N or ROOM_X patterns
        const upgradeMatch = unlock.match(/^ROOM_(.+)_UPGRADE_(\d+)$/);
        const roomMatch = unlock.match(/^ROOM_(.+)$/);

        if (upgradeMatch) {
          const roomFile = upgradeMatch[1];
          const tier = parseInt(upgradeMatch[2], 10);
          const building = buildingByFile.get(roomFile) || buildingByFile.get("_" + roomFile);
          if (building) {
            if (!building.upgradesUnlockedBy) building.upgradesUnlockedBy = [];
            building.upgradesUnlockedBy.push({
              tier,
              techTree: tree.id,
              techTreeName: tree.name,
              techId,
              techName: tech.name,
              costs: tech.costs || null,
              requiresTechLevel: tech.requiresTechLevel || null,
              requiresPopulation: tech.requiresPopulation || null,
            });
          }
        } else if (roomMatch && !upgradeMatch) {
          const roomFile = roomMatch[1];
          const building = buildingByFile.get(roomFile) || buildingByFile.get("_" + roomFile);
          if (building) {
            building.unlockedBy = {
              techTree: tree.id,
              techTreeName: tree.name,
              techId,
              techName: tech.name,
              costs: tech.costs || null,
              requiresTechLevel: tech.requiresTechLevel || null,
              requiresPopulation: tech.requiresPopulation || null,
            };
          }
        }
      }
    }
  }

  // Sort upgradesUnlockedBy by tier
  for (const b of buildings) {
    if (b.upgradesUnlockedBy) {
      b.upgradesUnlockedBy.sort((a, b2) => a.tier - b2.tier);
    }
  }
}

// ── Extract Equipment ────────────────────────────────────────

function extractEquipment() {
  console.log("Extracting equipment...");

  const equipment = [];
  const subdirs = ["civic", "battle", "ranged"];

  for (const subdir of subdirs) {
    const paths = listZipPaths(
      DATA_ZIP,
      new RegExp(`^data/assets/init/stats/equip/${subdir}/[A-Z_]+\\.txt$`)
    );

    for (const path of paths) {
      const filename = path.split("/").pop().replace(".txt", "");
      if (filename === "_EXAMPLE") continue; // skip example files

      const content = unzipFile(DATA_ZIP, path);
      if (!content) continue;

      const data = parseSosFormat(content);

      const id = filename.startsWith("_") ? filename.slice(1).toLowerCase() : filename.toLowerCase();
      const equip = { id, type: subdir };

      if (data.RESOURCE) equip.resource = data.RESOURCE.toLowerCase();
      if (data.WEAR_RATE != null) equip.wearRate = data.WEAR_RATE;
      if (data.MAX_AMOUNT != null) equip.maxAmount = data.MAX_AMOUNT;
      if (data.ARRIVAL_AMOUNT != null) equip.arrivalAmount = data.ARRIVAL_AMOUNT;
      if (data.DEFAULT_TARGET != null) equip.defaultTarget = data.DEFAULT_TARGET;
      if (data.EXPO != null) equip.expo = data.EXPO;
      if (data.AMOUNT_IN_GARRISON != null) equip.amountInGarrison = data.AMOUNT_IN_GARRISON;
      if (data.EQUIP_GUARDS != null) equip.equipGuards = data.EQUIP_GUARDS;

      // Standing requirements (civic equipment like clothes, jewelry)
      if (data.STANDING && typeof data.STANDING === "object") {
        equip.standing = data.STANDING;
      }

      // Stat boosts
      if (data.BOOST && typeof data.BOOST === "object") {
        const boosts = {};
        for (const [k, v] of Object.entries(data.BOOST)) {
          if (typeof v === "number") boosts[k] = v;
        }
        if (Object.keys(boosts).length > 0) equip.boost = boosts;
      }

      equipment.push(equip);
    }
  }

  equipment.sort((a, b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id));
  console.log(`  Found ${equipment.length} equipment types: ${equipment.map(e => e.id).join(", ")}`);
  return equipment;
}

// ── Extract Races ────────────────────────────────────────

function extractRaces() {
  console.log("Extracting races...");

  const racePaths = listZipPaths(
    DATA_ZIP,
    /^data\/assets\/init\/race\/[A-Z_]+\.txt$/
  );

  const races = [];
  for (const path of racePaths) {
    const filename = path.split("/").pop().replace(".txt", "");
    const content = unzipFile(DATA_ZIP, path);
    if (!content) continue;

    const data = parseSosFormat(content);
    const id = filename.toLowerCase();
    const playable = data.PLAYABLE === true;

    // Read display name from text file
    const textPath = `data/assets/text/race/${filename}.txt`;
    const textContent = unzipFile(DATA_ZIP, textPath);
    let name = filename;
    if (textContent) {
      const textData = parseSosFormat(textContent);
      if (textData.NAME) name = textData.NAME;
    }

    const race = { id, name, playable };

    // Preferred food
    if (data.PREFERRED && data.PREFERRED.FOOD) {
      const foods = data.PREFERRED.FOOD;
      if (Array.isArray(foods)) {
        race.preferredFood = foods
          .filter(f => typeof f === "string")
          .map(f => f === "*" ? "*" : f.toLowerCase());
      }
    }

    // Preferred drink
    if (data.PREFERRED && data.PREFERRED.DRINK) {
      const drinks = data.PREFERRED.DRINK;
      if (Array.isArray(drinks)) {
        race.preferredDrink = drinks
          .filter(f => typeof f === "string")
          .map(f => f === "*" ? "*" : f.toLowerCase());
      }
    }

    // Equipment not enabled
    if (data.EQUIPMENT_NOT_ENABLED && Array.isArray(data.EQUIPMENT_NOT_ENABLED)) {
      const disabled = data.EQUIPMENT_NOT_ENABLED
        .filter(e => typeof e === "string" && e.length > 0)
        .map(e => e.toLowerCase());
      if (disabled.length > 0) race.equipmentDisabled = disabled;
    }

    // Military supply use overrides
    if (data.MILITARY_SUPPLY_USE && typeof data.MILITARY_SUPPLY_USE === "object") {
      const overrides = {};
      for (const [k, v] of Object.entries(data.MILITARY_SUPPLY_USE)) {
        if (typeof v === "number") overrides[k.toLowerCase()] = v;
      }
      if (Object.keys(overrides).length > 0) race.militarySupplyUse = overrides;
    }

    // Need rate multipliers from BOOST entries matching RATES_*>MUL
    if (data.BOOST && typeof data.BOOST === "object") {
      const rateMultipliers = {};
      for (const [k, v] of Object.entries(data.BOOST)) {
        const m = k.match(/^RATES_(\w+)>MUL$/);
        if (m && typeof v === "number") {
          rateMultipliers[m[1].toLowerCase()] = v;
        }
      }
      if (Object.keys(rateMultipliers).length > 0) race.needRateMultipliers = rateMultipliers;
    }

    // Population block
    if (data.POPULATION && typeof data.POPULATION === "object") {
      race.population = {};
      if (data.POPULATION.MAX != null) race.population.max = data.POPULATION.MAX;
      if (data.POPULATION.GROWTH != null) race.population.growth = data.POPULATION.GROWTH;
      if (data.POPULATION.IMMIGRATION_RATE != null) race.population.immigrationRate = data.POPULATION.IMMIGRATION_RATE;
      if (data.POPULATION.CLIMATE) race.population.climate = data.POPULATION.CLIMATE;
      if (data.POPULATION.TERRAIN) race.population.terrain = data.POPULATION.TERRAIN;
    }

    races.push(race);
  }

  races.sort((a, b) => a.name.localeCompare(b.name));
  console.log(`  Found ${races.length} playable races: ${races.map(r => r.name).join(", ")}`);
  return races;
}

// ── Extract Settlement ────────────────────────────────────────

function extractSettlement() {
  console.log("Extracting settlement data...");

  const result = { structures: [], floors: [], fences: [], fortifications: [] };

  // Helper to read text name
  function getTextName(textDir, filename) {
    const textPath = `data/assets/text/settlement/${textDir}/${filename}.txt`;
    const textContent = unzipFile(DATA_ZIP, textPath);
    if (!textContent) return null;
    const textData = parseSosFormat(textContent);
    return textData.NAME || null;
  }

  // Structures (wall types)
  const structPaths = listZipPaths(DATA_ZIP, /^data\/assets\/init\/settlement\/structure\/[A-Z_]+\.txt$/);
  for (const path of structPaths) {
    const filename = path.split("/").pop().replace(".txt", "");
    const content = unzipFile(DATA_ZIP, path);
    if (!content) continue;
    const data = parseSosFormat(content);
    const id = filename.toLowerCase();
    const entry = { id };
    const name = getTextName("structure", filename);
    if (name) entry.name = name;
    if (data.RESOURCE) entry.resource = String(data.RESOURCE).toLowerCase();
    if (data.RESOURCE_AMOUNT != null) entry.resourceAmount = data.RESOURCE_AMOUNT;
    if (data.DURABILITY != null) entry.durability = data.DURABILITY;
    if (data.BUILD_TIME != null) entry.buildTime = data.BUILD_TIME;
    if (data.PREFERENCE != null) entry.preference = data.PREFERENCE;
    result.structures.push(entry);
  }

  // Floors (data nested under ROAD block)
  const floorPaths = listZipPaths(DATA_ZIP, /^data\/assets\/init\/settlement\/floor\/[A-Z_]+\.txt$/);
  for (const path of floorPaths) {
    const filename = path.split("/").pop().replace(".txt", "");
    const content = unzipFile(DATA_ZIP, path);
    if (!content) continue;
    const data = parseSosFormat(content);
    const road = data.ROAD || data;
    const id = filename.toLowerCase();
    const entry = { id };
    const name = getTextName("floor", filename);
    if (name) entry.name = name;
    if (road.IS_GRASS === true || data.IS_GRASS === true) entry.isGrass = true;
    if (road.RESOURCE) entry.resource = String(road.RESOURCE).toLowerCase();
    if (road.RESOURCE_AMOUNT != null) entry.resourceAmount = road.RESOURCE_AMOUNT;
    if (road.SPEED != null) entry.speed = road.SPEED;
    if (road.DURABILITY != null) entry.durability = road.DURABILITY;
    result.floors.push(entry);
  }

  // Fences
  const fencePaths = listZipPaths(DATA_ZIP, /^data\/assets\/init\/settlement\/fence\/[A-Z_]+\.txt$/);
  for (const path of fencePaths) {
    const filename = path.split("/").pop().replace(".txt", "");
    const content = unzipFile(DATA_ZIP, path);
    if (!content) continue;
    const data = parseSosFormat(content);
    const id = filename.toLowerCase();
    const entry = { id };
    const name = getTextName("fence", filename);
    if (name) entry.name = name;
    if (data.RESOURCE) entry.resource = String(data.RESOURCE).toLowerCase();
    if (data.RESOURCE_AMOUNT != null) entry.resourceAmount = data.RESOURCE_AMOUNT;
    result.fences.push(entry);
  }

  // Fortifications
  const fortPaths = listZipPaths(DATA_ZIP, /^data\/assets\/init\/settlement\/fortification\/[A-Z_]+\.txt$/);
  for (const path of fortPaths) {
    const filename = path.split("/").pop().replace(".txt", "");
    const content = unzipFile(DATA_ZIP, path);
    if (!content) continue;
    const data = parseSosFormat(content);
    const id = filename.toLowerCase();
    const entry = { id };
    const name = getTextName("fortification", filename);
    if (name) entry.name = name;
    if (data.RESOURCE) entry.resource = String(data.RESOURCE).toLowerCase();
    if (data.RESOURCE_AMOUNT != null) entry.resourceAmount = data.RESOURCE_AMOUNT;
    if (data.DURABILITY != null) entry.durability = data.DURABILITY;
    if (data.HEIGHT != null) entry.height = data.HEIGHT;
    result.fortifications.push(entry);
  }

  // Sort each category by id
  result.structures.sort((a, b) => a.id.localeCompare(b.id));
  result.floors.sort((a, b) => a.id.localeCompare(b.id));
  result.fences.sort((a, b) => a.id.localeCompare(b.id));
  result.fortifications.sort((a, b) => a.id.localeCompare(b.id));

  console.log(`  Found ${result.structures.length} structures, ${result.floors.length} floors, ${result.fences.length} fences, ${result.fortifications.length} fortifications`);
  return result;
}

// ── Code Generation ─────────────────────────────────────────

function generateResourcesJS(resources, iconMapping) {
  let code = `// Songs of Syx – resource table (auto-generated from game data)
// Generated by scripts/extract-game-data.js
// Do not edit manually – re-run the script to update.

/** @type {import('../types.js').Resource[]} */
export const resources = [
`;

  let currentCat = null;
  for (const r of resources) {
    if (r.category !== currentCat) {
      currentCat = r.category;
      const label =
        currentCat === "material"
          ? "Materials"
          : currentCat === "food"
            ? "Food"
            : currentCat === "drink"
              ? "Drink"
              : currentCat === "military"
                ? "Military"
                : currentCat;
      code += `  // ${label}\n`;
    }
    const idPad = JSON.stringify(r.id).padEnd(20);
    const namePad = JSON.stringify(r.name).padEnd(20);
    const catPad = JSON.stringify(r.category).padEnd(12);
    const tagsStr = r.tags.length > 0 ? JSON.stringify(r.tags) : "[]";
    const degradeStr = r.degradeRate != null ? `, degradeRate: ${r.degradeRate}` : "";
    const descStr = r.desc ? `, desc: ${JSON.stringify(r.desc)}` : "";
    const priceCapStr = r.priceCap != null ? `, priceCap: ${r.priceCap}` : "";
    const iconFile = iconMapping.get(r.id);
    const iconStr = iconFile ? `, icon: ${JSON.stringify(iconFile)}` : "";
    code += `  { id: ${idPad}, name: ${namePad}, category: ${catPad}, tags: ${tagsStr}${degradeStr}${descStr}${priceCapStr}${iconStr} },\n`;
  }

  code += `];
`;
  return code;
}

function generateBuildingsJS(buildings, buildingIconMapping) {
  let code = `// Songs of Syx – building table with inlined recipes (auto-generated from game data)
// Generated by scripts/extract-game-data.js
// Do not edit manually – re-run the script to update.

/** @type {import('../types.js').Building[]} */
export const buildings = [
`;

  // Metadata fields to include in generated output
  const META_FIELDS = [
    "desc", "storage", "fulfillment", "accidentsPerYear", "healthFactor",
    "usesTool", "noise", "growable", "animal", "indoors", "climateBonus",
    "nightShift", "employShiftOffset",
    "serviceRadius", "need", "serviceDefaultAccess", "serviceDefaultValue", "serviceStanding",
    "boosting", "boostFrom", "boostTo", "increasePow",
    "popMin", "requires",
    "standing",
    "floorType", "miniColor",
    "valueDegradePerYear",
    "race", "religion", "incubationDays", "learningSpeed",
    "fulfillmentBonus", "maxValue", "valuePerWorker", "experienceBonus",
    "projectileResource", "equipmentToUse",
    "sacrificeResource", "sacrificeType",
    "maxEmployed", "fullTrainingDays",
    "degradeRate", "extraResource", "extraResourceAmount",
    "daysTillGrowth", "ripeAtPartOfYear",
    "fence", "valueWorkSpeed", "sacrificeTime", "workTimeInDays",
    "buildingType", "racePreference",
    "training", "spriteTypes",
  ];

  const CAT_LABELS = {
    extraction: "Extraction",
    husbandry: "Husbandry",
    refining: "Refining",
    crafting: "Crafting",
    logistics: "Logistics",
    military: "Military",
    service: "Service",
    trade: "Trade",
    infrastructure: "Infrastructure",
  };

  let currentCat = null;
  for (const b of buildings) {
    if (b.category !== currentCat) {
      currentCat = b.category;
      const label = CAT_LABELS[currentCat] || currentCat;
      code += `\n  // ── ${label} ${"─".repeat(50 - label.length)}──\n`;
    }

    code += `  {\n`;
    code += `    id: ${JSON.stringify(b.id)},\n`;
    code += `    name: ${JSON.stringify(b.name)},\n`;
    code += `    category: ${JSON.stringify(b.category)},\n`;
    const bldIcon = buildingIconMapping.get(b.id);
    if (bldIcon) {
      code += `    icon: ${JSON.stringify(bldIcon)},\n`;
    }
    code += `    recipes: [\n`;

    for (const r of b.recipes) {
      const inputsStr = r.inputs
        .map(
          (i) =>
            `{ resource: ${JSON.stringify(i.resource)}, amount: ${String(i.amount)} }`
        )
        .join(", ");
      const outputsStr = r.outputs
        .map(
          (o) =>
            `{ resource: ${JSON.stringify(o.resource)}, amount: ${String(o.amount)} }`
        )
        .join(", ");

      code += `      { id: ${JSON.stringify(r.id)}, name: ${JSON.stringify(r.name)}, inputs: [${inputsStr}], outputs: [${outputsStr}] },\n`;
    }

    code += `    ],\n`;

    // Construction costs
    if (b.constructionCosts && b.constructionCosts.length > 0) {
      const costsStr = b.constructionCosts
        .map(
          (c) =>
            `{ resource: ${JSON.stringify(c.resource)}, amount: ${String(c.amount)} }`
        )
        .join(", ");
      code += `    constructionCosts: [${costsStr}],\n`;
    }

    // Upgrade costs
    if (b.upgradeCosts && b.upgradeCosts.length > 0) {
      code += `    upgradeCosts: [\n`;
      for (const tier of b.upgradeCosts) {
        const tierStr = tier
          .map(
            (c) =>
              `{ resource: ${JSON.stringify(c.resource)}, amount: ${String(c.amount)} }`
          )
          .join(", ");
        code += `      [${tierStr}],\n`;
      }
      code += `    ],\n`;
    }

    // Items (room furniture)
    if (b.items && b.items.length > 0) {
      code += `    items: [\n`;
      for (const item of b.items) {
        const costsStr = item.costs
          .map(c => `{ resource: ${JSON.stringify(c.resource)}, amount: ${String(c.amount)} }`)
          .join(", ");
        const statsStr = JSON.stringify(item.stats);
        code += `      { costs: [${costsStr}], stats: ${statsStr} },\n`;
      }
      code += `    ],\n`;
    }

    // Sprites (full furniture data)
    if (b.sprites && b.sprites.length > 0) {
      code += `    sprites: ${JSON.stringify(b.sprites)},\n`;
    }

    // Area costs (per-tile)
    if (b.areaCosts && b.areaCosts.length > 0) {
      const acStr = b.areaCosts
        .map(c => `{ resource: ${JSON.stringify(c.resource)}, amount: ${String(c.amount)} }`)
        .join(", ");
      code += `    areaCosts: [${acStr}],\n`;
    }

    // Upgrade boosts
    if (b.upgradeBoosts && b.upgradeBoosts.length > 0) {
      code += `    upgradeBoosts: ${JSON.stringify(b.upgradeBoosts)},\n`;
    }

    // Tech unlock info
    if (b.unlockedBy) {
      code += `    unlockedBy: ${JSON.stringify(b.unlockedBy)},\n`;
    }
    if (b.upgradesUnlockedBy && b.upgradesUnlockedBy.length > 0) {
      code += `    upgradesUnlockedBy: ${JSON.stringify(b.upgradesUnlockedBy)},\n`;
    }

    // Metadata fields
    for (const field of META_FIELDS) {
      if (b[field] != null) {
        code += `    ${field}: ${JSON.stringify(b[field])},\n`;
      }
    }

    code += `  },\n`;
  }

  code += `];
`;
  return code;
}

function generateNeedsJS(needs) {
  let code = `// Songs of Syx – needs table (auto-generated from game data)
// Generated by scripts/extract-game-data.js
// Do not edit manually – re-run the script to update.

/** @type {import('../types.js').Need[]} */
export const needs = [
`;

  const sorted = [...needs.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [id, need] of sorted) {
    const fields = [`id: ${JSON.stringify(id.toLowerCase())}`];
    if (need.name) fields.push(`name: ${JSON.stringify(need.name)}`);
    fields.push(`rate: ${need.rate}`);
    if (need.event != null) fields.push(`event: ${need.event}`);
    if (need.rateName) fields.push(`rateName: ${JSON.stringify(need.rateName)}`);
    code += `  { ${fields.join(", ")} },\n`;
  }

  code += `];
`;
  return code;
}

function generateTechJS(techTrees) {
  let code = `// Songs of Syx – tech trees (auto-generated from game data)
// Generated by scripts/extract-game-data.js
// Do not edit manually – re-run the script to update.

/** @type {import('../types.js').TechTree[]} */
export const techTrees = `;
  code += JSON.stringify(techTrees, null, 2);
  code += `;\n`;
  return code;
}

function generateEquipmentJS(equipment) {
  let code = `// Songs of Syx – equipment wear rates (auto-generated from game data)
// Generated by scripts/extract-game-data.js
// Do not edit manually – re-run the script to update.

/** @type {import('../types.js').Equipment[]} */
export const equipment = [
`;

  let currentType = null;
  for (const e of equipment) {
    if (e.type !== currentType) {
      currentType = e.type;
      const label = currentType.charAt(0).toUpperCase() + currentType.slice(1);
      code += `  // ${label}\n`;
    }
    code += `  ${JSON.stringify(e)},\n`;
  }

  code += `];
`;
  return code;
}

function generateSettlementJS(settlement) {
  let code = `// Songs of Syx – settlement infrastructure (auto-generated from game data)
// Generated by scripts/extract-game-data.js
// Do not edit manually – re-run the script to update.

/** @type {import('../types.js').Settlement} */
export const settlement = `;
  code += JSON.stringify(settlement, null, 2);
  code += `;\n`;
  return code;
}

function generateRacesJS(races) {
  let code = `// Songs of Syx – race data (auto-generated from game data)
// Generated by scripts/extract-game-data.js
// Do not edit manually – re-run the script to update.

export const races = `;
  code += JSON.stringify(races, null, 2);
  code += `;\n`;
  return code;
}

// ── Audit Mode ──────────────────────────────────────────────

function runAudit() {
  console.log("=== AUDIT MODE ===\n");

  // 1. List all directories under data/assets/init/
  console.log("── Directories under data/assets/init/ ──");
  const allPaths = listZipPaths(DATA_ZIP, /^data\/assets\/init\//);
  const dirs = new Set();
  for (const p of allPaths) {
    const parts = p.replace("data/assets/init/", "").split("/");
    if (parts.length > 1) dirs.add(parts[0]);
  }
  for (const d of [...dirs].sort()) {
    console.log(`  ${d}/`);
  }

  // 2. For each building, dump all top-level keys
  console.log("\n── Building top-level keys ──");
  const roomPaths = listZipPaths(DATA_ZIP, /^data\/assets\/init\/room\/[A-Z_]+\.txt$/);
  const fieldCounts = new Map(); // fieldName → count

  for (const path of roomPaths) {
    const filename = path.split("/").pop().replace(".txt", "");
    const content = unzipFile(DATA_ZIP, path);
    if (!content) continue;
    const data = parseSosFormat(content);
    const keys = Object.keys(data).sort();
    console.log(`  ${filename}: ${keys.join(", ")}`);
    for (const k of keys) {
      fieldCounts.set(k, (fieldCounts.get(k) || 0) + 1);
    }
  }

  // 3. Field frequency analysis
  console.log("\n── Field frequency analysis ──");
  const sortedFields = [...fieldCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [field, count] of sortedFields) {
    console.log(`  ${field.padEnd(30)}: ${count} buildings`);
  }

  // 4. Equipment file summary
  console.log("\n── Equipment files ──");
  for (const subdir of ["civic", "battle", "ranged", "mount"]) {
    const paths = listZipPaths(
      DATA_ZIP,
      new RegExp(`^data/assets/init/stats/equip/${subdir}/[A-Z_]+\\.txt$`)
    );
    if (paths.length > 0) {
      console.log(`  ${subdir}/: ${paths.map(p => p.split("/").pop().replace(".txt", "")).join(", ")}`);
    } else {
      console.log(`  ${subdir}/: (empty)`);
    }
  }

  // 5. Need files summary
  console.log("\n── Need files ──");
  const needPaths = listZipPaths(DATA_ZIP, /^data\/assets\/init\/stats\/need\/[A-Z_]+\.txt$/);
  console.log(`  ${needPaths.length} needs: ${needPaths.map(p => p.split("/").pop().replace(".txt", "")).join(", ")}`);

  console.log("\n=== AUDIT COMPLETE ===");
}

// ── Validation ──────────────────────────────────────────────

const VALID_RESOURCE_CATEGORIES = new Set(["material", "food", "drink", "military"]);
const VALID_BUILDING_CATEGORIES = new Set([
  "extraction", "husbandry", "refining", "crafting",
  "military", "service", "trade", "infrastructure",
]);

function validateExtractedData(resources, buildings) {
  let errors = 0;
  let warnings = 0;

  const resourceIds = new Set();
  const buildingIds = new Set();

  // ── Validate resources ──
  for (const r of resources) {
    // Required fields
    if (!r.id || typeof r.id !== "string") {
      console.error(`  ERROR: Resource missing/invalid id: ${JSON.stringify(r)}`);
      errors++;
    }
    if (!r.name || typeof r.name !== "string") {
      console.error(`  ERROR: Resource ${r.id} missing/invalid name`);
      errors++;
    }
    if (!r.category || !VALID_RESOURCE_CATEGORIES.has(r.category)) {
      console.error(`  ERROR: Resource ${r.id} invalid category "${r.category}"`);
      errors++;
    }
    if (!Array.isArray(r.tags)) {
      console.error(`  ERROR: Resource ${r.id} tags is not an array`);
      errors++;
    }
    if (r.degradeRate != null && typeof r.degradeRate !== "number") {
      console.error(`  ERROR: Resource ${r.id} degradeRate is not a number`);
      errors++;
    }

    // Duplicate check
    if (resourceIds.has(r.id)) {
      console.warn(`  WARN: Duplicate resource id "${r.id}"`);
      warnings++;
    }
    resourceIds.add(r.id);
  }

  // ── Validate buildings ──
  for (const b of buildings) {
    // Required fields
    if (!b.id || typeof b.id !== "string") {
      console.error(`  ERROR: Building missing/invalid id: ${JSON.stringify(b)}`);
      errors++;
    }
    if (!b.name || typeof b.name !== "string") {
      console.error(`  ERROR: Building ${b.id} missing/invalid name`);
      errors++;
    }
    if (!b.category || !VALID_BUILDING_CATEGORIES.has(b.category)) {
      console.error(`  ERROR: Building ${b.id} invalid category "${b.category}"`);
      errors++;
    }
    if (!Array.isArray(b.recipes)) {
      console.error(`  ERROR: Building ${b.id} recipes is not an array`);
      errors++;
    }

    // Duplicate check
    if (buildingIds.has(b.id)) {
      console.warn(`  WARN: Duplicate building id "${b.id}"`);
      warnings++;
    }
    buildingIds.add(b.id);

    // Referential integrity: recipe resources
    if (Array.isArray(b.recipes)) {
      for (const r of b.recipes) {
        if (!r.id || typeof r.id !== "string") {
          console.error(`  ERROR: Building ${b.id} has recipe with missing/invalid id`);
          errors++;
        }
        for (const io of [...(r.inputs || []), ...(r.outputs || [])]) {
          if (!io.resource || typeof io.resource !== "string") {
            console.error(`  ERROR: Building ${b.id} recipe "${r.id}" has empty resource ref`);
            errors++;
          }
          if (typeof io.amount !== "number" || isNaN(io.amount)) {
            console.error(`  ERROR: Building ${b.id} recipe "${r.id}" has NaN amount for "${io.resource}"`);
            errors++;
          }
          if (io.resource && !resourceIds.has(io.resource)) {
            console.warn(`  WARN: Building ${b.id} recipe "${r.id}" references unknown resource "${io.resource}"`);
            warnings++;
          }
        }
      }
    }

    // Referential integrity: construction costs
    if (Array.isArray(b.constructionCosts)) {
      for (const c of b.constructionCosts) {
        if (c.resource && !resourceIds.has(c.resource)) {
          console.warn(`  WARN: Building ${b.id} constructionCost references unknown resource "${c.resource}"`);
          warnings++;
        }
        if (typeof c.amount !== "number" || isNaN(c.amount)) {
          console.error(`  ERROR: Building ${b.id} constructionCost has NaN amount for "${c.resource}"`);
          errors++;
        }
      }
    }

    // Referential integrity: items
    if (Array.isArray(b.items)) {
      for (const item of b.items) {
        for (const c of item.costs) {
          if (c.resource && !resourceIds.has(c.resource)) {
            console.warn(`  WARN: Building ${b.id} item cost references unknown resource "${c.resource}"`);
            warnings++;
          }
        }
      }
    }

    // Referential integrity: area costs
    if (Array.isArray(b.areaCosts)) {
      for (const c of b.areaCosts) {
        if (c.resource && !resourceIds.has(c.resource)) {
          console.warn(`  WARN: Building ${b.id} areaCost references unknown resource "${c.resource}"`);
          warnings++;
        }
      }
    }

    // Referential integrity: extra resource
    if (b.extraResource && !resourceIds.has(b.extraResource)) {
      console.warn(`  WARN: Building ${b.id} extraResource references unknown resource "${b.extraResource}"`);
      warnings++;
    }
  }

  console.log(`\nValidation: ${errors} error(s), ${warnings} warning(s)`);
  if (errors > 0) {
    console.error("Validation FAILED — fix errors before using generated data.");
    process.exit(1);
  }
}

// ── Sprite/Furniture Dump ────────────────────────────────────

function dumpSprites() {
  console.log("=== SPRITE/FURNITURE DUMP ===\n");

  const roomPaths = listZipPaths(DATA_ZIP, /^data\/assets\/init\/room\/[A-Z_]+\.txt$/);

  // Sample buildings to dump in full detail
  const sampleBuildings = new Set([
    "WELL_NORMAL", "_HEARTH", "WORKSHOP_CARPENTER", "WORKSHOP_HUNTER",
    "MINE_CLAY", "LABORATORY_NORMAL", "_CANNIBAL", "_TAVERN",
  ]);

  // Frequency maps for field analysis
  const itemFieldFreq = new Map();   // field name → count of buildings
  const spriteFieldFreq = new Map(); // field name → count of buildings
  const spriteEntryFieldFreq = new Map(); // inner field name → count across all entries

  let buildingsWithItems = 0;
  let buildingsWithSprites = 0;
  let totalItems = 0;
  let totalSpriteEntries = 0;

  for (const path of roomPaths) {
    const filename = path.split("/").pop().replace(".txt", "");
    const content = unzipFile(DATA_ZIP, path);
    if (!content) continue;
    const data = parseSosFormat(content);

    const isSample = sampleBuildings.has(filename);

    // ── ITEMS analysis ──
    if (data.ITEMS && Array.isArray(data.ITEMS) && data.ITEMS.length > 0) {
      buildingsWithItems++;
      totalItems += data.ITEMS.length;

      // Track which fields appear in this building's ITEMS
      const fieldsInBuilding = new Set();
      for (const item of data.ITEMS) {
        if (item && typeof item === "object") {
          for (const key of Object.keys(item)) {
            fieldsInBuilding.add(key);
          }
        }
      }
      for (const f of fieldsInBuilding) {
        itemFieldFreq.set(f, (itemFieldFreq.get(f) || 0) + 1);
      }

      if (isSample) {
        console.log(`── ${filename} ITEMS (${data.ITEMS.length} entries) ──`);
        console.log(JSON.stringify(data.ITEMS, null, 2));
        console.log();
      }
    }

    // ── SPRITES analysis ──
    if (data.SPRITES && typeof data.SPRITES === "object") {
      const spriteKeys = Object.keys(data.SPRITES);
      if (spriteKeys.length > 0) {
        buildingsWithSprites++;
        totalSpriteEntries += spriteKeys.length;

        // Track top-level keys in SPRITES object
        const fieldsInBuilding = new Set();
        for (const key of spriteKeys) {
          fieldsInBuilding.add(key);
          // Also analyze inner structure of each sprite entry
          const entry = data.SPRITES[key];
          if (entry && typeof entry === "object") {
            for (const innerKey of Object.keys(entry)) {
              spriteEntryFieldFreq.set(innerKey, (spriteEntryFieldFreq.get(innerKey) || 0) + 1);
            }
          }
        }
        for (const f of fieldsInBuilding) {
          spriteFieldFreq.set(f, (spriteFieldFreq.get(f) || 0) + 1);
        }

        if (isSample) {
          console.log(`── ${filename} SPRITES (${spriteKeys.length} entries) ──`);
          console.log(JSON.stringify(data.SPRITES, null, 2));
          console.log();
        }
      }
    }

    // ── Other furniture-related keys ──
    if (isSample) {
      const furnitureKeys = Object.keys(data).filter(k =>
        /FURNITURE|PLACEMENT|STAT_NAME|MUST|WALKAB|ROTATIONS|PLACER|FLOOR_REQ/.test(k)
      );
      if (furnitureKeys.length > 0) {
        console.log(`── ${filename} other furniture-related keys ──`);
        for (const k of furnitureKeys) {
          console.log(`  ${k}: ${JSON.stringify(data[k], null, 2)}`);
        }
        console.log();
      }

      // Also dump RESOURCES array (needed to interpret COSTS indices)
      if (data.RESOURCES) {
        console.log(`── ${filename} RESOURCES ──`);
        console.log(`  ${JSON.stringify(data.RESOURCES)}`);
        console.log();
      }
    }
  }

  // ── Frequency analysis ──
  console.log("══════════════════════════════════════════════");
  console.log(`\n── ITEMS field frequency (${buildingsWithItems} buildings, ${totalItems} total items) ──`);
  const sortedItemFields = [...itemFieldFreq.entries()].sort((a, b) => b[1] - a[1]);
  for (const [field, count] of sortedItemFields) {
    console.log(`  ${field.padEnd(30)}: ${count} buildings`);
  }

  console.log(`\n── SPRITES top-level key frequency (${buildingsWithSprites} buildings, ${totalSpriteEntries} total entries) ──`);
  const sortedSpriteFields = [...spriteFieldFreq.entries()].sort((a, b) => b[1] - a[1]);
  for (const [field, count] of sortedSpriteFields) {
    console.log(`  ${field.padEnd(30)}: ${count} buildings`);
  }

  console.log(`\n── SPRITES inner field frequency (across all sprite entries) ──`);
  const sortedInnerFields = [...spriteEntryFieldFreq.entries()].sort((a, b) => b[1] - a[1]);
  for (const [field, count] of sortedInnerFields) {
    console.log(`  ${field.padEnd(30)}: ${count} entries`);
  }

  // ── Item-to-Sprite correlation ──
  console.log("\n── ITEMS count vs SPRITES count per building ──");
  for (const path of roomPaths) {
    const filename = path.split("/").pop().replace(".txt", "");
    const content = unzipFile(DATA_ZIP, path);
    if (!content) continue;
    const data = parseSosFormat(content);
    const itemCount = (data.ITEMS && Array.isArray(data.ITEMS)) ? data.ITEMS.length : 0;
    const spriteCount = (data.SPRITES && typeof data.SPRITES === "object") ? Object.keys(data.SPRITES).length : 0;
    if (itemCount > 0 || spriteCount > 0) {
      const match = itemCount === spriteCount ? "" : " *** MISMATCH";
      console.log(`  ${filename.padEnd(35)}: ITEMS=${itemCount}  SPRITES=${spriteCount}${match}`);
    }
  }

  console.log("\n=== DUMP COMPLETE ===");
}

// ── Room Sprite Extraction ───────────────────────────────────

/**
 * Parse a frame reference string like "COMBO_TABLES: 1" or "STORAGE: 0".
 * @param {string} frameStr
 * @returns {{ sheetName: string, index: number } | null}
 */
function parseFrameRef(frameStr) {
  if (!frameStr || typeof frameStr !== "string") return null;
  const match = frameStr.match(/^([A-Za-z0-9_x]+)\s*:\s*(\d+)$/);
  if (!match) return null;
  return { sheetName: match[1], index: parseInt(match[2]) };
}

/**
 * Per-directory base tile sizes (width × height).
 * Derived empirically from sheet dimensions and max frame indices:
 * - 1x1:  44×22 (isometric 1-tile), width GCD=44, most sheets height%22==0
 * - 2x2:  88×44 (2×2 isometric tiles)
 * Sheets have 2 halves: left = icon, right = normal map.
 * Each half has cells stacked vertically with a frame border around each.
 * Frame border contains indicator colors (red/green/pink/black/blue/purple).
 *
 * - 1x1:   22×22 cell, 3px frame → 16×16 body
 * - 2x2:   44×44 cell, 6px frame → 32×32 body
 * - 3x3:   60×60 cell, 6px frame → 48×48 body
 * - box:   76×76 cell, 6px frame → 64×64 body
 * - combo: 72×72 cell, 2px frame → 48×48 main tile (internal 4px separator + 16×16 sub-tile ignored)
 * - texture: not used for extraction
 *
 * Compound 1x1 sheets (2xROOF, MECHx2, STORAGEx3, 4xTEMPLE_DECOR, etc.) have
 * taller cells containing N stacked 16px sub-tiles. Cell pitch = N*16 + 6.
 * The frame ref index addresses sub-tiles sequentially across compound cells.
 */
const ROOM_SPRITE_TILE_SIZES = {
  "1x1":  { cell: 22, frame: 3 },   // body 16×16 (compound sheets override cell height)
  "2x2":  { cell: 44, frame: 6 },   // body 32×32
  "3x3":  { cell: 60, frame: 6 },   // body 48×48
  "box":  { cell: 76, frame: 6 },   // body 64×64
  "combo": { cell: 72, frame: 2 },  // body 48×48 (main tile only, skip internal separator)
};

/** @type {Map<string, Array<{zipPath: string, dir: string}>>} sheetName → all locations (built once) */
let roomSpriteIndex = null;

/**
 * Build an index of all available room sprite sheet PNGs.
 * Maps sheet name (e.g. "COMBO_TABLES") to all matching zip paths + directories.
 * Some sheets exist in multiple dirs (e.g. FENCE in both 1x1 and combo).
 */
function buildRoomSpriteIndex() {
  if (roomSpriteIndex) return;
  roomSpriteIndex = new Map();

  const allPaths = listZipPaths(DATA_ZIP, /^data\/assets\/sprite\/game\/.*\.png$/);
  for (const p of allPaths) {
    const parts = p.split("/");
    const filename = parts[parts.length - 1];
    const dir = parts[parts.length - 2];
    const sheetName = filename.replace(".png", "");
    if (!roomSpriteIndex.has(sheetName)) {
      roomSpriteIndex.set(sheetName, []);
    }
    roomSpriteIndex.get(sheetName).push({ zipPath: p, dir });
  }
}

/**
 * Find all locations of a room sprite sheet PNG in the game data ZIP.
 * @param {string} sheetName - e.g. "COMBO_TABLES", "STORAGE"
 * @returns {Array<{zipPath: string, dir: string}>}
 */
function findRoomSpriteSheets(sheetName) {
  buildRoomSpriteIndex();
  return roomSpriteIndex.get(sheetName) || [];
}

/**
 * Detect compound multiplier from a 1x1 sheet name.
 * Compound sheets (2xROOF, MECHx2, STORAGEx3, 4xTEMPLE_DECOR) contain
 * N stacked 16px sub-tiles per cell. Returns 1 for normal sheets.
 * @param {string} sheetName
 * @returns {number}
 */
function getCompoundMultiplier(sheetName) {
  const prefix = sheetName.match(/^(\d+)x/);
  if (prefix) return parseInt(prefix[1]);
  const suffix = sheetName.match(/x(\d+)$/);
  if (suffix) return parseInt(suffix[1]);
  return 1;
}

/**
 * Crop a single room sprite tile from a spritesheet.
 * Sheets have 2 halves (left=icon, right=normal map). We use left half only.
 * Each cell has a decorative frame border that must be skipped.
 *
 * For compound 1x1 sheets (2x, x2, x3, 4x), cells are taller (N*16+6) and
 * the index addresses individual 16px sub-tiles across compound cells.
 *
 * For combo sheets, only the 48×48 main tile is extracted (internal
 * red/green separators and 16×16 sub-tile are skipped).
 *
 * @param {string} sheetName - e.g. "COMBO_TABLES"
 * @param {number} index - row index (or sub-tile index for compound sheets)
 * @returns {PNG|null}
 */
function getRoomSpriteTile(sheetName, index) {
  const locations = findRoomSpriteSheets(sheetName);
  if (locations.length === 0) return null;

  // Try each location — handles sheets that exist in multiple dirs (e.g. FENCE in 1x1 + combo)
  for (const found of locations) {
    const result = tryExtractSpriteTile(found, sheetName, index);
    if (result) return result;
  }
  return null;
}

/**
 * Try to extract a sprite tile from a specific sheet location.
 * @param {{ zipPath: string, dir: string }} found
 * @param {string} sheetName
 * @param {number} index
 * @returns {PNG|null}
 */
function tryExtractSpriteTile(found, sheetName, index) {
  const sheet = loadSheet(found.zipPath);
  if (!sheet) return null;

  const tileSize = ROOM_SPRITE_TILE_SIZES[found.dir];
  if (!tileSize) return null;

  const { cell, frame } = tileSize;
  const halfWidth = Math.floor(sheet.width / 2);

  let srcX, srcY, bodyW, bodyH;

  if (found.dir === "combo") {
    // Combo cells: 72×72 cell, 2px frame, but internal structure has
    // 48×48 main tile + 4px separator + 16×16 sub-tile. Extract main only.
    const numRows = Math.floor(sheet.height / cell);
    if (index >= numRows) return null;
    srcX = frame;
    srcY = index * cell + frame;
    bodyW = 48;
    bodyH = 48;
  } else if (found.dir === "1x1") {
    // Check for compound sheets (2xROOF, MECHx2, STORAGEx3, etc.)
    const N = getCompoundMultiplier(sheetName);
    const subTileH = 16;

    if (N > 1) {
      // Compound: cell pitch = N*16 + 6, contains N stacked 16px sub-tiles
      const compoundCellH = N * subTileH + 2 * frame;
      const compoundCell = Math.floor(index / N);
      const subTile = index % N;
      srcX = frame;
      srcY = compoundCell * compoundCellH + frame + subTile * subTileH;
      bodyW = cell - 2 * frame;
      bodyH = subTileH;
    } else {
      // Normal 1x1: standard cell=22, body=16×16
      const numRows = Math.floor(sheet.height / cell);
      if (index >= numRows) return null;
      srcX = frame;
      srcY = index * cell + frame;
      bodyW = cell - 2 * frame;
      bodyH = cell - 2 * frame;
    }
  } else {
    // 2x2, 3x3, box: standard cell layout
    const numRows = Math.floor(sheet.height / cell);
    if (index >= numRows) return null;
    srcX = frame;
    srcY = index * cell + frame;
    bodyW = cell - 2 * frame;
    bodyH = cell - 2 * frame;
  }

  // Clamp to left half of sheet
  bodyW = Math.min(bodyW, halfWidth - srcX);
  if (bodyW < 4 || bodyH < 4) return null;
  if (srcX + bodyW > halfWidth || srcY + bodyH > sheet.height) return null;

  const out = new PNG({ width: bodyW, height: bodyH });
  for (let y = 0; y < bodyH; y++) {
    for (let x = 0; x < bodyW; x++) {
      const si = ((srcY + y) * sheet.width + (srcX + x)) * 4;
      const di = (y * bodyW + x) * 4;
      out.data[di] = sheet.data[si];
      out.data[di + 1] = sheet.data[si + 1];
      out.data[di + 2] = sheet.data[si + 2];
      out.data[di + 3] = sheet.data[si + 3];
    }
  }
  return out;
}

/**
 * Extract room sprite tiles for all buildings and write to data/sprites/.
 * For each building's sprite types, takes the first variant's first frame.
 * @param {Array} buildings
 */
function extractRoomSprites(buildings) {
  console.log("Extracting room sprites...");

  const spriteDir = resolve(PROJECT_ROOT, "data/sprites");
  if (!existsSync(spriteDir)) {
    mkdirSync(spriteDir, { recursive: true });
  }

  let totalExtracted = 0;
  let totalFailed = 0;
  let buildingsProcessed = 0;

  for (const b of buildings) {
    if (!b.sprites || b.sprites.length === 0) continue;
    buildingsProcessed++;

    const buildingDir = resolve(spriteDir, b.id);
    if (!existsSync(buildingDir)) {
      mkdirSync(buildingDir, { recursive: true });
    }

    for (const sprite of b.sprites) {
      // Find the first non-empty frame from the first variant
      let frameRef = null;
      for (const variant of sprite.variants) {
        if (Array.isArray(variant.frames) && variant.frames.length > 0) {
          frameRef = variant.frames[0];
          break;
        }
      }
      if (!frameRef) continue;

      const parsed = parseFrameRef(frameRef);
      if (!parsed) continue;

      const tile = getRoomSpriteTile(parsed.sheetName, parsed.index);
      if (!tile) {
        totalFailed++;
        if (totalFailed <= 5) {
          console.warn(`  Warning: Could not extract sprite "${sprite.type}" for "${b.id}" (sheet: ${parsed.sheetName}:${parsed.index})`);
        }
        continue;
      }

      const outFile = resolve(buildingDir, `${sprite.type.toLowerCase()}.png`);
      writeFileSync(outFile, PNG.sync.write(tile));
      totalExtracted++;
    }
  }

  console.log(`  Extracted ${totalExtracted} room sprites across ${buildingsProcessed} buildings (${totalFailed} failed)`);
}

// ── Discover Room Sprite Paths ───────────────────────────────

function discoverRoomSpritePaths() {
  console.log("=== ROOM SPRITE PATH DISCOVERY ===\n");

  const patterns = [
    { label: "settlement/room/", re: /^data\/assets\/sprite\/settlement\/room\// },
    { label: "settlement/", re: /^data\/assets\/sprite\/settlement\// },
    { label: "sprite/room/", re: /^data\/assets\/sprite\/room\// },
    { label: "COMBO_TABLES", re: /COMBO_TABLES/i },
    { label: "STORAGE.png", re: /STORAGE\.png$/i },
    { label: "sprite/ .png files", re: /^data\/assets\/sprite\/.*\.png$/ },
  ];

  for (const { label, re } of patterns) {
    const paths = listZipPaths(DATA_ZIP, re);
    if (paths.length > 0) {
      console.log(`Pattern "${label}" (${re}): ${paths.length} matches`);
      for (const p of paths.slice(0, 30)) console.log(`  ${p}`);
      if (paths.length > 30) console.log(`  ... and ${paths.length - 30} more`);
      console.log();
    } else {
      console.log(`Pattern "${label}" (${re}): 0 matches\n`);
    }
  }

  // Also dump the SPRITES data from a few buildings to correlate sheet names with paths
  console.log("── Sample building SPRITES for correlation ──\n");
  const sampleFiles = ["_CANNIBAL", "WELL_NORMAL", "WORKSHOP_CARPENTER", "MINE_CLAY"];
  for (const filename of sampleFiles) {
    const content = unzipFile(DATA_ZIP, `data/assets/init/room/${filename}.txt`);
    if (!content) { console.log(`  ${filename}: not found`); continue; }
    const data = parseSosFormat(content);
    if (data.SPRITES) {
      const keys = Object.keys(data.SPRITES);
      console.log(`  ${filename}: SPRITES keys = [${keys.join(", ")}]`);
      for (const key of keys.slice(0, 5)) {
        const entry = data.SPRITES[key];
        console.log(`    ${key}: ${JSON.stringify(entry)}`);
      }
    } else {
      console.log(`  ${filename}: no SPRITES block`);
    }
    console.log();
  }

  console.log("=== DISCOVERY COMPLETE ===");
}

// ── Main ────────────────────────────────────────────────────

// Handle --discover-sprites flag
if (process.argv.includes("--discover-sprites")) {
  discoverRoomSpritePaths();
  process.exit(0);
}

// Handle --audit flag
if (process.argv.includes("--audit")) {
  runAudit();
  process.exit(0);
}

// Handle --dump-sprites flag
if (process.argv.includes("--dump-sprites")) {
  dumpSprites();
  process.exit(0);
}

console.log(`Reading game data from: ${DATA_ZIP}`);

const resources = extractResources();
console.log(`  Found ${resources.length} resources`);

// Extract needs system
const needs = extractNeeds();

// Extract equipment wear rates
const equipment = extractEquipment();

// Extract race data
const races = extractRaces();

// Extract settlement infrastructure
const settlement = extractSettlement();

// Build resource name lookup for recipe naming
resourceNameById = new Map(resources.map((r) => [r.id, r.name]));

// Extract icons
const iconMapping = extractIcons(resources);

const buildings = extractBuildings(resources);
const totalRecipes = buildings.reduce((sum, b) => sum + b.recipes.length, 0);
console.log(`  Found ${buildings.length} buildings with ${totalRecipes} recipes`);

// Extract building icons
const buildingIconMapping = extractBuildingIcons(buildings);

// Extract room sprites
extractRoomSprites(buildings);

// Extract tech trees and link to buildings
const techTrees = extractTechTrees();
linkTechToBuildings(techTrees, buildings);

// Validate extracted data
validateExtractedData(resources, buildings);

// Write output files
const resourcesPath = resolve(PROJECT_ROOT, "data/resources.js");
const buildingsPath = resolve(PROJECT_ROOT, "data/buildings.js");
const needsPath = resolve(PROJECT_ROOT, "data/needs.js");
const techPath = resolve(PROJECT_ROOT, "data/tech.js");
const equipmentPath = resolve(PROJECT_ROOT, "data/equipment.js");
const racesPath = resolve(PROJECT_ROOT, "data/races.js");
const settlementPath = resolve(PROJECT_ROOT, "data/settlement.js");

writeFileSync(resourcesPath, generateResourcesJS(resources, iconMapping));
console.log(`Wrote ${resourcesPath}`);

writeFileSync(buildingsPath, generateBuildingsJS(buildings, buildingIconMapping));
console.log(`Wrote ${buildingsPath}`);

writeFileSync(needsPath, generateNeedsJS(needs));
console.log(`Wrote ${needsPath}`);

writeFileSync(techPath, generateTechJS(techTrees));
console.log(`Wrote ${techPath}`);

writeFileSync(equipmentPath, generateEquipmentJS(equipment));
console.log(`Wrote ${equipmentPath}`);

writeFileSync(racesPath, generateRacesJS(races));
console.log(`Wrote ${racesPath}`);

writeFileSync(settlementPath, generateSettlementJS(settlement));
console.log(`Wrote ${settlementPath}`);

// Summary
console.log("\n── Summary ──");
console.log(`Resources: ${resources.length}`);
console.log(
  `  material: ${resources.filter((r) => r.category === "material").length}`
);
console.log(
  `  food:     ${resources.filter((r) => r.category === "food").length}`
);
console.log(
  `  drink:    ${resources.filter((r) => r.category === "drink").length}`
);
console.log(
  `  military: ${resources.filter((r) => r.category === "military").length}`
);
console.log(`Resource icons: ${iconMapping.size}`);
console.log(`Building icons: ${buildingIconMapping.size}`);
console.log(`Buildings: ${buildings.length}`);
for (const cat of [
  "extraction", "husbandry", "refining", "crafting",
  "logistics", "military", "service", "trade", "infrastructure",
]) {
  const count = buildings.filter((b) => b.category === cat).length;
  if (count > 0) console.log(`  ${cat.padEnd(16)}: ${count}`);
}
console.log(`Total recipes: ${totalRecipes}`);
console.log(`Needs: ${needs.size}`);
const needBuildings = buildings.filter(b => b.need);
console.log(`  Buildings with need fulfillment: ${needBuildings.length}`);
console.log(`Equipment: ${equipment.length}`);
console.log(`  civic: ${equipment.filter(e => e.type === "civic").length}, battle: ${equipment.filter(e => e.type === "battle").length}, ranged: ${equipment.filter(e => e.type === "ranged").length}`);
console.log(`Tech trees: ${techTrees.length}`);
console.log(`  Total techs: ${techTrees.reduce((s, t) => s + Object.keys(t.techs).length, 0)}`);
const linkedUnlocks = buildings.filter(b => b.unlockedBy).length;
const linkedUpgrades = buildings.filter(b => b.upgradesUnlockedBy).length;
console.log(`  Buildings with unlock info: ${linkedUnlocks}`);
console.log(`  Buildings with upgrade unlock info: ${linkedUpgrades}`);
// New field counts
const boostingCount = buildings.filter(b => b.boosting).length;
const popMinCount = buildings.filter(b => b.popMin != null).length;
const requiresCount = buildings.filter(b => b.requires).length;
const standingCount = buildings.filter(b => b.standing).length;
const serviceStandingCount = buildings.filter(b => b.serviceStanding).length;
console.log(`  Buildings with boosting: ${boostingCount}`);
console.log(`  Buildings with popMin: ${popMinCount}`);
console.log(`  Buildings with requires: ${requiresCount}`);
console.log(`  Buildings with standing: ${standingCount}`);
console.log(`  Buildings with serviceStanding: ${serviceStandingCount}`);
// Part 2 fields
const raceCount = buildings.filter(b => b.race).length;
const religionCount = buildings.filter(b => b.religion).length;
const incubationCount = buildings.filter(b => b.incubationDays != null).length;
const learningCount = buildings.filter(b => b.learningSpeed != null).length;
const fulfillBonusCount = buildings.filter(b => b.fulfillmentBonus != null).length;
const maxValueCount = buildings.filter(b => b.maxValue != null).length;
const valuePerWorkerCount = buildings.filter(b => b.valuePerWorker != null).length;
const expBonusCount = buildings.filter(b => b.experienceBonus != null).length;
const projectileCount = buildings.filter(b => b.projectileResource).length;
const equipUseCount = buildings.filter(b => b.equipmentToUse).length;
const sacrificeCount = buildings.filter(b => b.sacrificeResource).length;
const maxEmployedCount = buildings.filter(b => b.maxEmployed != null).length;
const trainingCount = buildings.filter(b => b.fullTrainingDays != null).length;
console.log(`  Buildings with race: ${raceCount}`);
console.log(`  Buildings with religion: ${religionCount}`);
console.log(`  Buildings with incubationDays: ${incubationCount}`);
console.log(`  Buildings with learningSpeed: ${learningCount}`);
console.log(`  Buildings with fulfillmentBonus: ${fulfillBonusCount}`);
console.log(`  Buildings with maxValue: ${maxValueCount}`);
console.log(`  Buildings with valuePerWorker: ${valuePerWorkerCount}`);
console.log(`  Buildings with experienceBonus: ${expBonusCount}`);
console.log(`  Buildings with projectileResource: ${projectileCount}`);
console.log(`  Buildings with equipmentToUse: ${equipUseCount}`);
console.log(`  Buildings with sacrificeResource: ${sacrificeCount}`);
console.log(`  Buildings with maxEmployed: ${maxEmployedCount}`);
console.log(`  Buildings with fullTrainingDays: ${trainingCount}`);
// Items / area costs / upgrade boosts
const itemsCount = buildings.filter(b => b.items).length;
const areaCostsCount = buildings.filter(b => b.areaCosts).length;
const upgradeBoostsCount = buildings.filter(b => b.upgradeBoosts).length;
const spriteTypesCount = buildings.filter(b => b.spriteTypes).length;
const extraResCount = buildings.filter(b => b.extraResource).length;
console.log(`  Buildings with items: ${itemsCount}`);
console.log(`  Buildings with areaCosts: ${areaCostsCount}`);
console.log(`  Buildings with upgradeBoosts: ${upgradeBoostsCount}`);
console.log(`  Buildings with spriteTypes: ${spriteTypesCount}`);
const spritesCount = buildings.filter(b => b.sprites).length;
const totalSpriteTypes = buildings.reduce((sum, b) => sum + (b.sprites ? b.sprites.length : 0), 0);
console.log(`  Buildings with sprites: ${spritesCount} (${totalSpriteTypes} total sprite types)`);
console.log(`  Buildings with extraResource: ${extraResCount}`);
console.log(`Settlement: ${settlement.structures.length} structures, ${settlement.floors.length} floors, ${settlement.fences.length} fences, ${settlement.fortifications.length} fortifications`);
console.log(`Races: ${races.length}`);
const racesWithFood = races.filter(r => r.preferredFood).length;
const racesWithEquipDisabled = races.filter(r => r.equipmentDisabled).length;
const racesWithRateMultipliers = races.filter(r => r.needRateMultipliers).length;
console.log(`  With food prefs: ${racesWithFood}, equip disabled: ${racesWithEquipDisabled}, rate multipliers: ${racesWithRateMultipliers}`);

// Precompute graph layout (uses freshly-written data files via dynamic import)
console.log("\nPrecomputing graph layout...");
const { buildGraph } = await import("../derive/graph.js");
const { computeLayout } = await import("../derive/layout.js");
const { nodes: graphNodes, edges: graphEdges } = buildGraph();
const layoutEdges = graphEdges.filter(e => e.direction !== "upgrade");
const positions = computeLayout(graphNodes, layoutEdges, layoutEdges);

const layoutEntries = [];
for (const [id, pos] of positions) {
  layoutEntries.push(`  ${JSON.stringify(id)}: { x: ${pos.x}, y: ${pos.y}, column: ${pos.column}, band: ${pos.band} }`);
}
const layoutPath = resolve(PROJECT_ROOT, "data/layout.js");
const layoutJS = `// auto-generated by extract-game-data.js — do not edit manually\nexport const layout = {\n${layoutEntries.join(",\n")}\n};\n`;
writeFileSync(layoutPath, layoutJS);
console.log(`Wrote ${layoutPath} (${positions.size} node positions)`);
