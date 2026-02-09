/**
 * Extract furniture placement data from decompiled Java Constructor classes.
 *
 * Usage:
 *   1. Decompile SongsOfSyx.jar constructors using CFR:
 *      java -jar cfr.jar SongsOfSyx.jar --outputdir /tmp/cfr_constructors \
 *        settlement.room.industry.workshop.Constructor [... all classes ...]
 *   2. Run this script:
 *      node scripts/extract-furniture.js /tmp/cfr_constructors
 *
 * Output: data/furniture.js
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ─── Constructor → building ID mapping ──────────────────────────────────
// Derived from ROOMS.java: RoomsCreator prefix or hardcoded filenames.
// Key = relative java package path under settlement/room/
// Value = { prefix, ids? } or { file, id }

const CONSTRUCTOR_MAP = [
  // Industry (prefix-based via RoomsCreator)
  { java: "industry/workshop/Constructor.java", prefix: "workshop" },
  { java: "industry/mine/Constructor.java", prefix: "mine" },
  { java: "industry/refiner/Constructor.java", prefix: "refiner" },
  { java: "industry/woodcutter/Constructor.java", file: "_woodcutter" },

  // Food production
  { java: "food/farm/Constructor.java", prefix: "farm" },
  { java: "food/fish/Constructor.java", prefix: "fishery" },
  { java: "food/hunter/Constructor.java", prefix: "hunter" },
  { java: "food/orchard/Constructor.java", prefix: "orchard" },
  { java: "food/pasture/Constructor.java", prefix: "pasture" },
  { java: "food/cannibal/Constructor.java", file: "_cannibal" },

  // Health
  { java: "health/asylum/Constructor.java", file: "_asylum" },
  { java: "health/hospital/Constructor.java", file: "_hospital" },
  { java: "health/physician/Constructor.java", prefix: "physician" },

  // Home
  { java: "home/chamber/Constructor.java", file: "_home_chamber" },
  { java: "home/house/HomeContructor.java", file: "_home" },

  // Knowledge
  { java: "knowledge/laboratory/Constructor.java", prefix: "laboratory" },
  { java: "knowledge/library/Constructor.java", prefix: "library" },
  { java: "knowledge/school/SchoolConstructor.java", prefix: "school" },
  { java: "knowledge/university/UniversityConstructor.java", prefix: "university" },

  // Infrastructure
  { java: "infra/admin/Constructor.java", prefix: "admin" },
  { java: "infra/elderly/ResthomeConstructor.java", prefix: "resthome" },
  { java: "infra/embassy/Constructor.java", file: "_embassy" },
  { java: "infra/export/Constructor.java", file: "_export" },
  { java: "infra/hauler/Constructor.java", file: "_hauler" },
  { java: "infra/importt/Constructor.java", file: "_import" },
  { java: "infra/inn/Constructor.java", file: "_inn" },
  { java: "infra/janitor/Constructor.java", file: "_janitor" },
  { java: "infra/monument/MConstructor.java", prefix: "monument" },
  { java: "infra/station/Constructor.java", file: "_station" },
  { java: "infra/stockpile/Constructor.java", file: "_stockpile" },
  { java: "infra/transport/Constructor.java", file: "_transport" },
  { java: "infra/gate/ROOM_GATE.java", prefix: "gatehouse", innerClass: "MConstructor" },

  // Law
  { java: "law/court/Constructor.java", file: "_court" },
  { java: "law/execution/Constructor.java", file: "_execution" },
  { java: "law/guard/Constructor.java", file: "_guard" },
  { java: "law/prison/Constructor.java", file: "_prison" },
  { java: "law/slaver/Constructor.java", file: "_slaver" },
  { java: "law/stockade/Constructor.java", file: "_stockade" },
  { java: "law/stocks/MConstructor.java", file: "_stocks" },

  // Military
  { java: "military/artillery/Constructor.java", prefix: "artillery" },
  { java: "military/supply/Constructor.java", file: "_military_supply" },
  { java: "military/training/archery/Constructor.java", prefix: "archery" },
  { java: "military/training/barracks/Constructor.java", prefix: "barracks" },

  // Service
  { java: "service/arena/grand/ArenaConstructor.java", prefix: "arenag" },
  { java: "service/arena/pit/ArenaConstructor.java", prefix: "fightpit" },
  { java: "service/barber/Constructor.java", prefix: "barber" },
  { java: "service/food/canteen/Constructor.java", prefix: "canteen" },
  { java: "service/food/eatery/Constructor.java", prefix: "eatery" },
  { java: "service/food/tavern/Constructor.java", prefix: "tavern" },
  { java: "service/hearth/Constructor.java", file: "_hearth" },
  { java: "service/hygine/bath/Constructor.java", prefix: "bath" },
  { java: "service/hygine/well/Constructor.java", prefix: "well" },
  { java: "service/lavatory/Constructor.java", prefix: "lavatory" },
  { java: "service/market/Constructor.java", prefix: "market" },
  { java: "service/nursery/NurseryConstructor.java", prefix: "nursery" },
  { java: "service/pleasure/Constructor.java", prefix: "pleasure" },
  { java: "service/speaker/SpeakerConstructor.java", prefix: "speaker" },
  { java: "service/stage/StageConstructor.java", prefix: "stage" },

  // Spirit
  { java: "spirit/dump/Constructor.java", file: "_dump_corpse" },
  { java: "spirit/grave/CGraveyard.java", prefix: "graveyard" },
  { java: "spirit/grave/CTomb.java", prefix: "tomb" },
  { java: "spirit/shrine/Constructor.java", prefix: "shrine" },
  { java: "spirit/temple/TempleConstructor.java", prefix: "temple" },

  // Water
  { java: "water/PumpConstructor.java", file: "_waterpump" },
];

// ─── Stat extraction ────────────────────────────────────────────────────

/** Map of FurnisherStat inner class names to canonical type strings */
const STAT_TYPE_MAP = {
  FurnisherStatEmployees: "employees",
  FurnisherStatServices: "services",
  FurnisherStatEfficiency: "efficiency",
  FurnisherStatRelative: "relative",
  FurnisherStatProduction: "production",
  FurnisherStatProduction2: "production",
  FurnisherStatI: "integer",
  FurnisherStatIrrigation: "irrigation",
  FurnisherStatEmployeesR: "employeesRelative",
};

/**
 * Extract FurnisherStat declarations from a Java constructor.
 * Stats auto-register in declaration order (index 0, 1, 2, ...).
 * Returns array of { name, type } in registration order.
 * @param {string} code - Java source code
 * @returns {{ name: string, type: string }[]}
 */
function extractStats(code) {
  // Collect all stat creation sites with their source position.
  // Two patterns:
  //   (A) Field declaration:  [final] FurnisherStat NAME = new FurnisherStat[.TYPE](...
  //   (B) Constructor init:   this.NAME = new FurnisherStat[.TYPE](...
  const stats = [];

  // Pattern A: field-level declaration (with or without 'final')
  // e.g. "final FurnisherStat workers = new FurnisherStat.FurnisherStatEmployees(this)"
  // e.g. "final FurnisherStat workers = new FurnisherStat(this, 1.0){"
  const fieldRegex = /(?:final\s+)?FurnisherStat\s+(\w+)\s*=\s*new\s+FurnisherStat(?:\.(\w+))?\s*\(/g;
  let m;
  while ((m = fieldRegex.exec(code)) !== null) {
    const name = m[1];
    const innerClass = m[2] || null;
    const type = innerClass ? (STAT_TYPE_MAP[innerClass] || "custom") : "custom";
    stats.push({ name, type, pos: m.index });
  }

  // Pattern B: constructor-body init
  // e.g. "this.priests = new FurnisherStat.FurnisherStatEmployees(this)"
  const ctorRegex = /this\.(\w+)\s*=\s*new\s+FurnisherStat(?:\.(\w+))?\s*\(/g;
  while ((m = ctorRegex.exec(code)) !== null) {
    const name = m[1];
    const innerClass = m[2] || null;
    const type = innerClass ? (STAT_TYPE_MAP[innerClass] || "custom") : "custom";
    // Avoid duplicates (field decl + constructor init of same field)
    if (!stats.some((s) => s.name === name)) {
      stats.push({ name, type, pos: m.index });
    }
  }

  // Sort by source position (registration order)
  stats.sort((a, b) => a.pos - b.pos);

  // Return without pos
  return stats.map(({ name, type }) => ({ name, type }));
}

// ─── Sprite variable mapping ────────────────────────────────────────────

/**
 * Build a map from sprite variable names to SPRITES key names.
 * Handles direct declarations, clones, and inner class constructors.
 * @param {string} code - Java source code
 * @returns {Object<string, string>} varName → spriteKey
 */
function extractSpriteMap(code) {
  /** @type {Object<string, string>} */
  const varToKey = {};
  /** @type {Object<string, string>} */
  const classToKey = {};
  let m;

  // 1. Direct sprite declarations: TYPE var = new RoomSprite*(json, "KEY"...)
  //    e.g. RoomSprite1x1 sChair = new RoomSprite1x1(js, "CHAIR_1X1")
  //    e.g. RoomSpriteCombo sTable = new RoomSpriteCombo(sp, "TABLE_COMBO")
  const directRegex = /(\w+)\s*=\s*new\s+RoomSprite\w*\([^,)]+,\s*"([^"]+)"/g;
  while ((m = directRegex.exec(code)) !== null) {
    varToKey[m[1]] = m[2];
  }

  // 2. Inner classes extending RoomSprite*: extract primary key from super() call
  //    e.g. class STable extends RoomSpriteCombo { STable(Json json) { super(json, "TABLE_COMBO"); } }
  const innerClassRegex = /class\s+(\w+)\s+extends\s+RoomSprite\w+\s*\{[\s\S]*?super\([^,)]+,\s*"([^"]+)"/g;
  while ((m = innerClassRegex.exec(code)) !== null) {
    classToKey[m[1]] = m[2];
  }

  // 3. Instances of inner classes: TYPE var = new ClassName(...)
  //    e.g. STable spriteWork = new STable(js, js, sChair)
  for (const [className, key] of Object.entries(classToKey)) {
    const instanceRegex = new RegExp(`(\\w+)\\s*=\\s*new\\s+${className}\\(`, "g");
    while ((m = instanceRegex.exec(code)) !== null) {
      if (!varToKey[m[1]]) {
        varToKey[m[1]] = key;
      }
    }
  }

  // 4. Clone patterns: TYPE var = new RoomSprite*(otherVar[, ...])
  //    e.g. RoomSpriteCombo sService = new RoomSpriteCombo(sTable)
  //    e.g. RoomSprite1xN sSB = new RoomSprite1xN(sSA, true)
  //    e.g. RoomSpriteBoxN sCa = new RoomSpriteBoxN(sPedistal)
  //    e.g. RoomSpriteCombo sTableMisc = new RoomSpriteCombo(sTable, sp){...}  (clone + json)
  //    e.g. RoomSpriteBoxN sEmblemS = new RoomSpriteBoxN(sAltar, sj){...}  (clone + json)
  const cloneRegex = /(\w+)\s*=\s*new\s+RoomSprite\w*\((\w+)(?:,\s*[^)]+)?\)\s*[{;]/g;
  while ((m = cloneRegex.exec(code)) !== null) {
    const varName = m[1];
    const parentVar = m[2];
    // Only treat as clone if parentVar is a known sprite (not json/init)
    if (varToKey[parentVar] && !varToKey[varName]) {
      varToKey[varName] = varToKey[parentVar];
    }
  }

  // 5. FurnisherItemTools.makeUnder creates sprites from SPRITES key
  //    e.g. FurnisherItemTools.makeUnder(this, sp, "CARPET_COMBO")
  //    The internal tile variable is "cc" but we handle this via synthetic tile names

  return varToKey;
}

/**
 * Extract the sprite variable name from FurnisherItemTile constructor args.
 * 5-arg: (this, mustBeReachable, sprite, AVAILABILITY.XXX, canGoCandle)
 * 4-arg: (this, sprite, AVAILABILITY.XXX, canGoCandle)
 * @param {string} argsBeforeAvail - Everything before AVAILABILITY.XXX
 * @returns {string|null} sprite variable name or null
 */
function extractSpriteVarFromArgs(argsBeforeAvail) {
  // Split args by comma, trim
  const args = argsBeforeAvail.split(",").map((s) => s.trim()).filter(Boolean);
  // Remove the "this" or "(Furnisher)this" or "parent.this" first arg
  if (args.length === 0) return null;
  const shifted = args.slice(1); // drop "this" / "(Furnisher)this" / etc.
  if (shifted.length === 0) return null;

  // 5-arg form: [mustBeReachable, sprite, ""] — shifted[0] is bool, shifted[1] is sprite
  // 4-arg form: [sprite, ""] — shifted[0] is sprite
  if (shifted[0] === "true" || shifted[0] === "false") {
    // 5-arg form: sprite is the next arg
    return shifted.length > 1 ? shifted[1].replace(/^this\./, "") : null;
  }
  // 4-arg form: sprite is the first arg after "this"
  const spriteRef = shifted[0].replace(/^this\./, "");
  // Skip if it looks like a boolean or null
  if (spriteRef === "null" || spriteRef === "true" || spriteRef === "false") return null;
  return spriteRef;
}

// ─── Item extraction ────────────────────────────────────────────────────

/** Grid content regex: matches rows like {a, b, c}, {d, e, f} */
const GRID_CONTENT =
  /\{[^{}]*\}(?:\s*,\s*\{[^{}]*\})*/;

/**
 * The standard 16 area-fill items generated by FurnisherItemTools.makeArea().
 * Always the same rectangles: 1×1 through 7×3.
 * @param {string} tileName - The tile type variable name used for all cells
 */
function makeAreaItems(tileName) {
  const sizes = [
    [1,1],[2,1],[3,1],[4,1],[5,1],[6,1],
    [2,2],[3,2],[4,2],[5,2],[6,2],
    [3,3],[4,3],[5,3],[6,3],[7,3],
  ];
  return sizes.map(([w,h]) => ({
    tiles: Array.from({length: h}, () => Array(w).fill(tileName)),
    multiplier: w * h,
    multiplierStats: w * h,
  }));
}

/**
 * Resolve the correct tile name for a variable at a given source position.
 * If the variable was reassigned since its first definition, creates a new
 * synthetic tile type with the properties from the most recent assignment.
 * @param {object} result - Parser result (tileTypes will be mutated)
 * @param {Array<{name: string, props: object, pos: number}>} allTileDefs - All tile definitions
 * @param {string} varName - Variable name to resolve
 * @param {number} callPos - Source position of the call site
 * @param {string} suffix - Unique suffix for synthetic tile name
 * @returns {string} Tile name to use (original or synthetic)
 */
function resolveTileAtPos(result, allTileDefs, varName, callPos, suffix) {
  // Find the most recent definition of this variable before callPos
  let latest = null;
  for (const def of allTileDefs) {
    if (def.name === varName && def.pos < callPos) {
      latest = def;
    }
  }
  if (!latest) return varName;

  // Check if this is the first (original) definition
  const firstDef = allTileDefs.find((d) => d.name === varName);
  if (firstDef === latest) return varName; // no reassignment, use original name

  // Reassigned — create synthetic tile type with unique name
  const syntheticName = `${varName}${suffix}`;
  result.tileTypes[syntheticName] = { ...latest.props };
  return syntheticName;
}

/**
 * Extract all FurnisherItem definitions from code, including wrapper methods.
 * Returns items with their source position for group assignment.
 */
function extractAllItems(code, tileTypes) {
  const items = [];

  // Pattern 1: new FurnisherItem(new FurnisherItemTile[][]{{...}}, VAL[, VAL2])
  const directRegex = new RegExp(
    `new\\s+FurnisherItem\\(new\\s+FurnisherItemTile\\[\\]\\[\\]\\{(${GRID_CONTENT.source})\\}\\s*,\\s*([\\d.]+)(?:\\s*,\\s*([\\d.]+))?\\)`,
    "g",
  );
  let m;
  while ((m = directRegex.exec(code)) !== null) {
    const grid = parseGrid(m[1]);
    if (grid) {
      const mult = parseFloat(m[2]);
      items.push({
        tiles: grid,
        multiplier: mult,
        multiplierStats: m[3] ? parseFloat(m[3]) : mult,
        pos: m.index,
      });
    }
  }

  // Pattern 2: this.make(new FurnisherItemTile[][]{{...}})
  // make() computes multiplier from walkable tile count
  const makeRegex = new RegExp(
    `this\\.make\\(new\\s+FurnisherItemTile\\[\\]\\[\\]\\{(${GRID_CONTENT.source})\\}\\)`,
    "g",
  );
  while ((m = makeRegex.exec(code)) !== null) {
    const grid = parseGrid(m[1]);
    if (grid) {
      // Compute multiplier like make() does: count of non-null tiles
      const area = grid.reduce(
        (acc, row) => acc + row.filter((t) => t !== null).length,
        0,
      );
      items.push({
        tiles: grid,
        multiplier: area * 0.75,
        multiplierStats: area,
        pos: m.index,
      });
    }
  }

  // Pattern 3: this.create(new FurnisherItemTile[][]{{...}}, VAL)
  // create() method: creates base item (mult=1), then loops i=2..am generating
  // wider variants by repeating the base grid's columns (tn[y][x] = tt[y][x % baseWidth]).
  const createRegex = new RegExp(
    `this\\.create\\(new\\s+FurnisherItemTile\\[\\]\\[\\]\\{(${GRID_CONTENT.source})\\}\\s*,\\s*([\\d.]+)\\)`,
    "g",
  );
  while ((m = createRegex.exec(code)) !== null) {
    const baseGrid = parseGrid(m[1]);
    if (baseGrid) {
      const am = parseInt(m[2]) + 1; // create() does ++am first
      const baseW = baseGrid[0].length;
      // Generate all width variants: i=1 (base) through i=am-1
      for (let i = 1; i < am; i++) {
        const newW = baseW * i;
        const tiledGrid = baseGrid.map((row) => {
          const newRow = [];
          for (let x = 0; x < newW; x++) {
            newRow.push(row[x % baseW]);
          }
          return newRow;
        });
        items.push({
          tiles: tiledGrid,
          multiplier: i,
          multiplierStats: i,
          pos: m.index,
        });
      }
    }
  }

  // Pattern 4: Loop-generated items (new FurnisherItem(tiles, expr))
  const loopItems = parseLoopItems(code, tileTypes);
  if (loopItems.length > 0) {
    const loopPos = code.match(/new\s+FurnisherItem\(tiles,/);
    const pos = loopPos ? loopPos.index : 0;
    for (const item of loopItems) {
      items.push({ ...item, pos });
    }
  }

  return items;
}

// ─── Parser ─────────────────────────────────────────────────────────────

/**
 * Parse a decompiled Constructor.java file and extract furniture data.
 * @param {string} code - Java source code
 * @param {object} mapEntry - CONSTRUCTOR_MAP entry
 * @returns {object} Parsed furniture data
 */
function parseConstructor(code, mapEntry) {
  // If innerClass specified, extract just that section
  if (mapEntry.innerClass) {
    const classPattern = new RegExp(
      `class\\s+${mapEntry.innerClass}[\\s\\S]*?extends\\s+Furnisher\\s*\\{`,
    );
    const match = code.match(classPattern);
    if (match) {
      // Find the matching constructor body from the inner class start
      const startIdx = match.index;
      code = code.slice(startIdx);
    }
  }

  const result = {
    tileTypes: {},
    groups: [],
    stats: [],
    usesArea: false,
    mustBeIndoors: false,
    mustBeOutdoors: false,
  };

  // ── 0. Extract stat definitions ──
  result.stats = extractStats(code);

  // ── 0b. Build sprite variable → SPRITES key map ──
  const spriteMap = extractSpriteMap(code);

  // ── 1. Parse tile type definitions ──
  // Handles: FurnisherItemTile/Aux/Tile XX = new CLASS(parent, [bool,] sprite, AVAIL, bool)[.setData(N)]
  // Also: this.XX = new CLASS(...)
  // Also: XX = new FurnisherItemTile(...) (reassignment without type declaration)
  // Also: Object __ = null;  and  FurnisherItemTile __ = new ...(this, false, null, AVAIL, false)  (dummy tiles)
  //
  // Strategy: find lines with AVAILABILITY.XXX and extract the variable name assigned to.
  // Variables can be reassigned, so we track ALL definitions with their source position.
  // For tileTypes we keep the first definition; reassignments create positional variants
  // (used by makeArea to resolve the correct tile at each call site).
  const lines = code.split("\n");
  let m;
  /** @type {Array<{name: string, props: object, pos: number}>} */
  const allTileDefs = [];
  let charOffset = 0;
  for (const line of lines) {
    // Match tile variable assignment with AVAILABILITY
    // Captures: TYPE name = new ..., this.name = new ..., OR name = new FurnisherItemTile(...)
    const tileMatch = line.match(
      /(?:(?:FurnisherItemTile|Aux|Tile)\s+(\w+)|this\.(\w+)|(\w+))\s*=\s*new\s+(?:FurnisherItemTile|Aux|Tile)\s*\((.+?)AVAILABILITY\.(\w+),\s*(true|false)\)(?:\s*\{)?(?:\s*\.setData\((\d+)\))?/,
    );
    if (tileMatch) {
      const name = tileMatch[1] || tileMatch[2] || tileMatch[3];
      if (name) {
        const argsBeforeAvail = tileMatch[4];
        const availability = tileMatch[5];
        const canGoCandle = tileMatch[6] === "true";
        const data = tileMatch[7] ? parseInt(tileMatch[7]) : 0;

        const reachableMatch = argsBeforeAvail.match(
          /(?:this|\w+\.this)\s*,\s*(true|false)\s*,/,
        );
        const mustBeReachable = reachableMatch
          ? reachableMatch[1] === "true"
          : false;

        // Extract sprite reference from constructor args
        const spriteVar = extractSpriteVarFromArgs(argsBeforeAvail);
        const sprite = spriteVar ? (spriteMap[spriteVar] || null) : null;

        const props = { mustBeReachable, availability, canGoCandle, data, sprite };
        allTileDefs.push({ name, props, pos: charOffset });

        // First definition goes into tileTypes (for items that use the original variable)
        if (!result.tileTypes[name]) {
          result.tileTypes[name] = props;
        }
      }
    }
    charOffset += line.length + 1;
  }

  // Handle separate setData calls on their own line: XX.setData(N);
  // Updates the positional allTileDefs entry, and only updates tileTypes
  // if the setData applies to the first (original) definition of the variable.
  const setDataRegex = /(\w+)\.setData\((\d+)\);/g;
  while ((m = setDataRegex.exec(code)) !== null) {
    const name = m[1];
    const data = parseInt(m[2]);
    const setDataPos = m.index;
    // Find the most recent allTileDefs entry for this variable before the setData
    let latestDef = null;
    for (const def of allTileDefs) {
      if (def.name === name && def.pos < setDataPos) {
        latestDef = def;
      }
    }
    if (latestDef) {
      latestDef.props = { ...latestDef.props, data };
      // Only update tileTypes if this setData applies to the first definition
      const firstDef = allTileDefs.find((d) => d.name === name);
      if (latestDef === firstDef && result.tileTypes[name] && result.tileTypes[name].data === 0) {
        result.tileTypes[name].data = data;
      }
    }
  }

  // Null tile: Object __ = null;
  const nullTileRegex = /Object\s+(\w+)\s*=\s*null;/g;
  while ((m = nullTileRegex.exec(code)) !== null) {
    result.tileTypes[m[1]] = null; // null means empty tile
  }

  // Handle inner Tile subclass: Tile XX = new Tile(sprite);
  // Used by ROOM_GATE — the Tile class extends FurnisherItemTile with fixed args.
  // Detect the subclass pattern and apply its fixed properties.
  const innerClassMatch = code.match(
    /class\s+Tile\s+extends\s+FurnisherItemTile\b[\s\S]*?super\([^)]*AVAILABILITY\.(\w+),\s*(true|false)\)/,
  );
  if (innerClassMatch) {
    const avail = innerClassMatch[1];
    const canGoCandle = innerClassMatch[2] === "true";
    // Tile subclass passes sprite as first arg: new Tile(spriteVar)
    const tileSubclassRegex = /Tile\s+(\w+)\s*=\s*new\s+Tile\((\w+)\)/g;
    while ((m = tileSubclassRegex.exec(code)) !== null) {
      const name = m[1];
      const spriteVar = m[2];
      const sprite = spriteMap[spriteVar] || null;
      if (!result.tileTypes[name]) {
        result.tileTypes[name] = {
          mustBeReachable: false,
          availability: avail,
          canGoCandle,
          data: 0,
          sprite,
        };
      }
    }
  }

  // ── 2. Extract all items with positions ──
  // Matches: new FurnisherItem(new FurnisherItemTile[][]{{...}}, VAL[, VAL2])
  //          this.make(new FurnisherItemTile[][]{{...}})
  //          this.create(new FurnisherItemTile[][]{{...}}, VAL)
  const allItemsWithPos = extractAllItems(code, result.tileTypes);

  // ── 3. Parse group boundaries ──
  // Group boundaries come from multiple sources:
  //   a) this.flush(min, max, rots) — explicit flush
  //   b) FurnisherItemTools.makeArea(this, tile) — generates 16 area-fill items + flush(1)
  //   c) FurnisherItemTools.makeUnder(this, json, key) — creates tile + makeArea
  //   d) FurnisherItemTools.makeFloor(this, floor) — creates tile + makeArea
  //   e) this.create(tiles, val) in HomeContructor — calls flush(3) internally
  // All are collected as group boundaries with their position, min/max/rots, and optional synthetic items.

  const groupBoundaries = [];

  // (a) Explicit flush calls
  const flushRegex =
    /(?:this|f)\.flush\((\d+)(?:,\s*(\d+))?(?:,\s*(\d+))?\)/g;
  while ((m = flushRegex.exec(code)) !== null) {
    let min, max, rots;
    if (m[3] !== undefined) {
      min = parseInt(m[1]);
      max = parseInt(m[2]);
      rots = parseInt(m[3]);
    } else if (m[2] !== undefined) {
      min = parseInt(m[1]);
      max = null;
      rots = parseInt(m[2]);
    } else {
      min = 0;
      max = null;
      rots = parseInt(m[1]);
    }
    groupBoundaries.push({ min, max, rots, pos: m.index, items: null });
  }

  // (b) FurnisherItemTools.makeArea(this, TILE)
  const makeAreaRegex = /FurnisherItemTools\.makeArea\((?:this|\w+),\s*(\w+)\)/g;
  let makeAreaCount = 0;
  while ((m = makeAreaRegex.exec(code)) !== null) {
    const varName = m[1];
    const callPos = m.index;
    // Resolve tile properties from the most recent assignment to this variable
    // before the makeArea call (handles variable reassignment)
    const tileName = resolveTileAtPos(result, allTileDefs, varName, callPos, `_area_${makeAreaCount++}`);
    groupBoundaries.push({
      min: 1, max: null, rots: 0,
      pos: callPos,
      items: makeAreaItems(tileName),
    });
  }

  // (c) FurnisherItemTools.makeUnder(this, json, key)
  // Creates a combo sprite tile with AVAILABILITY.ROOM, then calls makeArea.
  // The tile variable is internal (cc), so we generate a synthetic name.
  const makeUnderRegex = /FurnisherItemTools\.makeUnder\((?:this|\w+),\s*\w+,\s*"([^"]+)"\)/g;
  while ((m = makeUnderRegex.exec(code)) !== null) {
    const spriteKey = m[1];
    const tileName = `_${spriteKey.toLowerCase()}`;
    // Register the synthetic tile type — sprite key comes directly from the argument
    result.tileTypes[tileName] = {
      mustBeReachable: false,
      availability: "ROOM",
      canGoCandle: false,
      data: 0,
      sprite: spriteKey,
    };
    groupBoundaries.push({
      min: 1, max: null, rots: 0,
      pos: m.index,
      items: makeAreaItems(tileName),
    });
  }

  // (d) FurnisherItemTools.makeFloor(this, floor)
  // Creates a floor tile with AVAILABILITY.ROOM, then calls makeArea.
  const makeFloorRegex = /FurnisherItemTools\.makeFloor\((?:this|\w+),\s*(\w+)\)/g;
  while ((m = makeFloorRegex.exec(code)) !== null) {
    const floorVar = m[1];
    const tileName = `_floor_${floorVar}`;
    result.tileTypes[tileName] = {
      mustBeReachable: false,
      availability: "ROOM",
      canGoCandle: false,
      data: 0,
    };
    groupBoundaries.push({
      min: 1, max: null, rots: 0,
      pos: m.index,
      items: makeAreaItems(tileName),
    });
  }

  // (e) this.create() in HomeContructor — each call internally calls flush(3)
  // Detect by checking if the code defines a create(FurnisherItemTile[][], int) method with flush inside
  const hasInternalFlush = /private\s+void\s+create\(FurnisherItemTile\[\]\[\][\s\S]*?this\.flush\(/s.test(code);
  if (hasInternalFlush) {
    // Each this.create() call is its own group boundary.
    // Extract the flush args from the create() method body.
    const createFlushMatch = code.match(
      /private\s+void\s+create\(FurnisherItemTile\[\]\[\][\s\S]*?this\.flush\((\d+)(?:,\s*(\d+))?(?:,\s*(\d+))?\)/s,
    );
    let cMin = 0, cMax = null, cRots = 0;
    if (createFlushMatch) {
      if (createFlushMatch[3] !== undefined) {
        cMin = parseInt(createFlushMatch[1]);
        cMax = parseInt(createFlushMatch[2]);
        cRots = parseInt(createFlushMatch[3]);
      } else if (createFlushMatch[2] !== undefined) {
        cMin = parseInt(createFlushMatch[1]);
        cRots = parseInt(createFlushMatch[2]);
      } else {
        cRots = parseInt(createFlushMatch[1]);
      }
    }
    // Find all this.create(...) call sites
    const createCallRegex = new RegExp(
      `this\\.create\\(new\\s+FurnisherItemTile\\[\\]\\[\\]\\{(${GRID_CONTENT.source})\\}\\s*,\\s*([\\d.]+)\\)`,
      "g",
    );
    while ((m = createCallRegex.exec(code)) !== null) {
      // Remove any flush boundaries that were found inside the create() method definition
      // (they belong to the method, not the calling scope)
      // Instead, add a boundary for each call site
      groupBoundaries.push({
        min: cMin, max: cMax, rots: cRots,
        pos: m.index + m[0].length, // boundary is AFTER the create call
        items: null, // items extracted by extractAllItems via Pattern 3
      });
    }
    // Remove flush boundaries from inside the create() method definition
    const methodStart = code.indexOf("private void create(FurnisherItemTile[][]");
    if (methodStart !== -1) {
      const methodEnd = code.indexOf("\n    }\n", methodStart);
      if (methodEnd !== -1) {
        for (let i = groupBoundaries.length - 1; i >= 0; i--) {
          const gb = groupBoundaries[i];
          if (gb.items === null && gb.pos > methodStart && gb.pos < methodEnd) {
            groupBoundaries.splice(i, 1);
          }
        }
      }
    }
  }

  // Sort all boundaries by position
  groupBoundaries.sort((a, b) => a.pos - b.pos);

  // ── 4. Assign items to groups based on boundaries ──
  allItemsWithPos.sort((a, b) => a.pos - b.pos);

  let groupIdx = 0;
  for (const item of allItemsWithPos) {
    while (
      groupIdx < groupBoundaries.length &&
      item.pos > groupBoundaries[groupIdx].pos
    ) {
      groupIdx++;
    }
    while (result.groups.length <= groupIdx) {
      const boundary = groupBoundaries[result.groups.length];
      const syntheticItems = boundary && boundary.items ? boundary.items : [];
      result.groups.push({
        min: boundary ? boundary.min : 0,
        max: boundary ? boundary.max : null,
        rotations: boundary ? boundary.rots : 0,
        items: [...syntheticItems],
      });
    }
    const { pos: _pos, ...itemData } = item;
    result.groups[groupIdx].items.push(itemData);
  }

  // Create remaining groups from unprocessed boundaries (e.g. makeArea with no preceding items)
  while (result.groups.length < groupBoundaries.length) {
    const boundary = groupBoundaries[result.groups.length];
    const syntheticItems = boundary.items ? boundary.items : [];
    result.groups.push({
      min: boundary.min,
      max: boundary.max,
      rotations: boundary.rots,
      items: [...syntheticItems],
    });
  }

  // ── 6. Parse room flags ──
  if (/usesArea\(\)\s*\{[^}]*return\s+true/s.test(code)) {
    result.usesArea = true;
  }
  if (/mustBeIndoors\(\)\s*\{[^}]*return\s+true/s.test(code)) {
    result.mustBeIndoors = true;
  }
  if (/mustBeOutdoors\(\)\s*\{[^}]*return\s+true/s.test(code)) {
    result.mustBeOutdoors = true;
  }

  return result;
}

/**
 * Parse a grid string like "{xx, yy, __}, {zz, ww, null}" into 2D array.
 */
function parseGrid(gridStr) {
  const rows = [];
  // Match each row: {tile1, tile2, ...}
  const rowRegex = /\{([^}]*)\}/g;
  let m;
  while ((m = rowRegex.exec(gridStr)) !== null) {
    const cells = m[1].split(",").map((s) => {
      const trimmed = s.trim();
      if (
        trimmed === "null" ||
        trimmed === "__" ||
        trimmed === "" ||
        trimmed === "Object"
      ) {
        return null;
      }
      // Handle this.XX references
      return trimmed.replace(/^this\./, "");
    });
    rows.push(cells);
  }
  return rows.length > 0 ? rows : null;
}

/**
 * Try to parse loop-generated FurnisherItems from the code.
 * Handles the common pattern of nested while loops creating rectangular grids.
 */
function parseLoopItems(code, tileTypes) {
  const items = [];

  // Pattern: nested loops generating tiles[y][x] = expression
  // Look for: while (height <= N) { while (width <= M) { ... tiles[y][x] = ...; new FurnisherItem(tiles, ...); } }
  const loopPattern =
    /int\s+(\w+)\s*=\s*(\d+);\s*while\s*\(\1\s*<=\s*(\d+)\)\s*\{[^}]*int\s+(\w+)\s*=\s*(\w+);\s*while\s*\(\4\s*<=\s*(\w+)\)\s*\{[^}]*FurnisherItemTile\[\]\[\]\s+tiles\s*=\s*new\s+FurnisherItemTile\[(\w+)\]\[(\w+)\];([\s\S]*?)new\s+FurnisherItem\(tiles,\s*([^)]+)\)/g;
  let m;
  while ((m = loopPattern.exec(code)) !== null) {
    const _outerVar = m[1];
    const outerStart = parseInt(m[2]);
    const outerEnd = parseInt(m[3]);
    const _innerVar = m[4];
    const innerStartVar = m[5];
    const innerEndVar = m[6];
    const _heightVar = m[7];
    const _widthVar = m[8];
    const body = m[9];
    const multiplierExpr = m[10].trim();

    // Resolve inner start/end
    const innerStart = resolveVar(code, innerStartVar);
    const innerEnd = resolveVar(code, innerEndVar);
    if (innerStart === null || innerEnd === null) continue;

    // Parse tile assignment: tiles[y][x] = expression
    const assignRegex =
      /tiles\[\w+\]\[\w+\]\s*=\s*(.+?);/g;
    let assignMatch;
    const assignments = [];
    while ((assignMatch = assignRegex.exec(body)) !== null) {
      assignments.push(assignMatch[1].trim());
    }
    if (assignments.length === 0) continue;

    // Generate items for each combination
    for (let h = outerStart; h <= outerEnd; h++) {
      for (let w = innerStart; w <= innerEnd; w++) {
        const grid = [];
        for (let y = 0; y < h; y++) {
          const row = [];
          for (let x = 0; x < w; x++) {
            // Evaluate assignment expression
            const tile = evaluateTileExpr(assignments[0], x, y, tileTypes);
            row.push(tile);
          }
          grid.push(row);
        }
        // Evaluate multiplier
        const mult = evaluateMultiplierExpr(multiplierExpr, w, h);
        items.push({ tiles: grid, multiplier: mult, multiplierStats: mult });
      }
    }
  }

  // Simpler pattern: single while loop
  const simpleLoopPattern =
    /int\s+(\w+)\s*=\s*(\d+);\s*while\s*\(\1\s*<=\s*(\d+)\)\s*\{[^}]*FurnisherItemTile\[\]\[\]\s+tiles\s*=\s*new\s+FurnisherItemTile\[(\d+)\]\[(\w+)\];([\s\S]*?)new\s+FurnisherItem\(tiles,\s*([^)]+)\)/g;
  while ((m = simpleLoopPattern.exec(code)) !== null) {
    const loopVar = m[1];
    const start = parseInt(m[2]);
    const end = parseInt(m[3]);
    const height = parseInt(m[4]);
    const widthVar = m[5];
    const body = m[6];
    const multiplierExpr = m[7].trim();

    // Check if this was already matched by the nested pattern
    // Skip if widthVar is a loop variable reference
    if (widthVar === loopVar) {
      for (let w = start; w <= end; w++) {
        const grid = [];
        const assignRegex = /tiles\[\w+\]\[\w+\]\s*=\s*(.+?);/g;
        let assignMatch;
        const assignments = [];
        while ((assignMatch = assignRegex.exec(body)) !== null) {
          assignments.push(assignMatch[1].trim());
        }
        if (assignments.length === 0) continue;
        for (let y = 0; y < height; y++) {
          const row = [];
          for (let x = 0; x < w; x++) {
            const tile = evaluateTileExpr(assignments[0], x, y, {});
            row.push(tile);
          }
          grid.push(row);
        }
        const mult = evaluateMultiplierExpr(multiplierExpr, w, height);
        items.push({ tiles: grid, multiplier: mult, multiplierStats: mult });
      }
    }
  }

  return items;
}

function resolveVar(code, varName) {
  if (/^\d+$/.test(varName)) return parseInt(varName);
  const re = new RegExp(`int\\s+${varName}\\s*=\\s*(\\d+)`);
  const m = code.match(re);
  return m ? parseInt(m[1]) : null;
}

function evaluateTileExpr(expr, x, _y, _tileTypes) {
  // Handle ternary: x == 0 ? s1 : s2
  const ternaryMatch = expr.match(
    /(\w+)\s*==\s*(\d+)\s*\?\s*(\w+)\s*:\s*(\w+)/,
  );
  if (ternaryMatch) {
    const _varName = ternaryMatch[1];
    const val = parseInt(ternaryMatch[2]);
    const trueResult = ternaryMatch[3].replace(/^this\./, "");
    const falseResult = ternaryMatch[4].replace(/^this\./, "");
    // Assume varName is x
    return x === val ? trueResult : falseResult;
  }
  // Simple variable reference
  return expr.replace(/^this\./, "");
}

function evaluateMultiplierExpr(expr, w, h) {
  // Handle common expressions: "width * height", "width", number
  const num = parseFloat(expr);
  if (!isNaN(num)) return num;
  // Try to evaluate simple expressions
  const replaced = expr
    .replace(/\bwidth\b/g, w)
    .replace(/\bheight\b/g, h);
  try {
    return eval(replaced);
  } catch {
    return 1.0;
  }
}

// ─── Building ID resolution ────────────────────────────────────────────

function resolveBuildingIds(mapEntry, allBuildingIds) {
  if (mapEntry.file) {
    // Single-file room
    const id = mapEntry.file.toLowerCase();
    return allBuildingIds.includes(id) ? [id] : [];
  }
  if (mapEntry.prefix) {
    // Prefix-based rooms
    const prefix = mapEntry.prefix.toLowerCase() + "_";
    return allBuildingIds.filter((id) => id.startsWith(prefix));
  }
  return [];
}

// ─── Output generation ─────────────────────────────────────────────────

function serializeTileTypes(tileTypes) {
  const entries = Object.entries(tileTypes);
  if (entries.length === 0) return "{}";
  const lines = entries.map(([name, props]) => {
    if (props === null) return `      ${name}: null`;
    const parts = [];
    if (props.mustBeReachable) parts.push("mustBeReachable: true");
    parts.push(`availability: "${props.availability}"`);
    if (props.canGoCandle) parts.push("canGoCandle: true");
    if (props.data !== 0) parts.push(`data: ${props.data}`);
    if (props.sprite) parts.push(`sprite: "${props.sprite}"`);
    return `      ${name}: { ${parts.join(", ")} }`;
  });
  return `{\n${lines.join(",\n")}\n    }`;
}

function serializeGrid(grid) {
  const rows = grid.map((row) => {
    const cells = row.map((c) => (c === null ? "_" : c));
    return `[${cells.map((c) => (c === "_" ? "null" : `"${c}"`)).join(", ")}]`;
  });
  return `[${rows.join(", ")}]`;
}

function serializeItem(item) {
  const parts = [`tiles: ${serializeGrid(item.tiles)}`];
  parts.push(`multiplier: ${item.multiplier}`);
  if (item.multiplierStats !== item.multiplier) {
    parts.push(`multiplierStats: ${item.multiplierStats}`);
  }
  return `{ ${parts.join(", ")} }`;
}

function serializeGroup(group) {
  const lines = [];
  lines.push(`      min: ${group.min}`);
  if (group.max !== null) lines.push(`      max: ${group.max}`);
  lines.push(`      rotations: ${group.rotations}`);
  const itemLines = group.items.map((item) => `        ${serializeItem(item)}`);
  lines.push(`      items: [\n${itemLines.join(",\n")}\n      ]`);
  return `    {\n${lines.join(",\n")}\n    }`;
}

function generateOutput(allFurniture) {
  const lines = [];
  lines.push("/** @type {import('../types.js').FurnitureSet[]} */");
  lines.push("export const furniture = [");

  for (const entry of allFurniture) {
    const parts = [];
    parts.push(`    id: "${entry.id}"`);
    parts.push(
      `    buildingIds: [${entry.buildingIds.map((id) => `"${id}"`).join(", ")}]`,
    );
    if (entry.usesArea) parts.push("    usesArea: true");
    if (entry.mustBeIndoors) parts.push("    mustBeIndoors: true");
    if (entry.mustBeOutdoors) parts.push("    mustBeOutdoors: true");
    if (entry.stats.length > 0) {
      const statEntries = entry.stats.map(
        (s) => `{ name: "${s.name}", type: "${s.type}" }`,
      );
      parts.push(`    stats: [${statEntries.join(", ")}]`);
    }
    parts.push(`    tileTypes: ${serializeTileTypes(entry.tileTypes)}`);
    const groupLines = entry.groups.map((g) => serializeGroup(g));
    parts.push(`    groups: [\n${groupLines.join(",\n")}\n    ]`);
    lines.push(`  {\n${parts.join(",\n")}\n  },`);
  }

  lines.push("];");
  return lines.join("\n") + "\n";
}

// ─── Main ───────────────────────────────────────────────────────────────

function main() {
  const cfr_dir = process.argv[2];
  if (!cfr_dir) {
    console.error(
      "Usage: node scripts/extract-furniture.js <cfr-output-dir>",
    );
    console.error(
      "  e.g. node scripts/extract-furniture.js /tmp/cfr_constructors",
    );
    process.exit(1);
  }

  // Load building IDs from buildings.js
  const buildingsPath = join(ROOT, "data", "buildings.js");
  const buildingsCode = readFileSync(buildingsPath, "utf-8");
  const idRegex = /id:\s*"([^"]+)"/g;
  const allBuildingIds = [];
  let bm;
  while ((bm = idRegex.exec(buildingsCode)) !== null) {
    allBuildingIds.push(bm[1]);
  }
  console.log(`Loaded ${allBuildingIds.length} building IDs`);

  const allFurniture = [];
  let parsed = 0;
  let skipped = 0;
  let totalGroups = 0;
  let totalItems = 0;

  for (const mapEntry of CONSTRUCTOR_MAP) {
    const javaPath = join(
      cfr_dir,
      "settlement",
      "room",
      ...mapEntry.java.split("/"),
    );
    if (!existsSync(javaPath)) {
      console.warn(`SKIP: ${mapEntry.java} — file not found`);
      skipped++;
      continue;
    }

    const code = readFileSync(javaPath, "utf-8");
    const buildingIds = resolveBuildingIds(mapEntry, allBuildingIds);

    // Derive constructor ID from java path
    const id = mapEntry.file
      ? mapEntry.file.replace(/^_/, "")
      : mapEntry.prefix;

    try {
      const data = parseConstructor(code, mapEntry);
      const entry = {
        id,
        buildingIds,
        ...data,
      };

      // Only include if there's actual furniture data
      const itemCount = entry.groups.reduce(
        (acc, g) => acc + g.items.length,
        0,
      );
      if (itemCount > 0 || Object.keys(entry.tileTypes).length > 0) {
        allFurniture.push(entry);
        totalGroups += entry.groups.length;
        totalItems += itemCount;
        parsed++;
        console.log(
          `  ${id}: ${entry.stats.length} stats, ${Object.keys(entry.tileTypes).length} tile types, ${entry.groups.length} groups, ${itemCount} items → ${buildingIds.length} buildings`,
        );
      } else {
        console.log(`  ${id}: no furniture data (${buildingIds.length} buildings)`);
        skipped++;
      }
    } catch (err) {
      console.error(`ERROR parsing ${mapEntry.java}: ${err.message}`);
      skipped++;
    }
  }

  // Sort by id
  allFurniture.sort((a, b) => a.id.localeCompare(b.id));

  // Write output
  const output = generateOutput(allFurniture);
  const outPath = join(ROOT, "data", "furniture.js");
  writeFileSync(outPath, output, "utf-8");

  console.log(`\nSummary:`);
  console.log(`  Parsed: ${parsed} constructors`);
  console.log(`  Skipped: ${skipped} (no furniture or missing file)`);
  console.log(`  Total groups: ${totalGroups}`);
  console.log(`  Total items: ${totalItems}`);
  console.log(`  Output: ${outPath}`);
}

main();
