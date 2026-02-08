// Centralized color configuration for resource and building categories.
// All category→color mappings live here; consumers import from this module.

/** @type {Record<string, string>} */
export const RESOURCE_COLORS = {
  material: "#5a9eff",
  food: "#6cd45a",
  drink: "#ffaa44",
  military: "#ff5555",
};

/** @type {Record<string, string>} */
export const BUILDING_COLORS = {
  extraction: "#5ab858",
  husbandry: "#48c8a0",
  refining: "#7070cc",
  crafting: "#d88848",
  logistics: "#5890bb",
  military: "#d04848",
  service: "#9870c8",
  trade: "#98c050",
  infrastructure: "#888888",
};

// Gradient colors for SVG node fills (light = top-left highlight, dark = bottom-right shadow)
/** @type {Record<string, {light: string, dark: string}>} */
export const RESOURCE_GRAD_COLORS = {
  material: { light: "#78b4ff", dark: "#3870c0" },
  food:     { light: "#80e070", dark: "#44a030" },
  drink:    { light: "#ffc060", dark: "#c07820" },
  military: { light: "#ff7070", dark: "#b03030" },
};

// PixiJS resource node colors — "Engraved Cartography" style
// fill = main disc, rim = outer ring, glow = halo, light = inner highlight, mid = concentric detail ring
/** @type {Record<string, {fill: number, rim: number, glow: number, light: number, mid: number}>} */
export const RESOURCE_NODE_COLORS = {
  material: { fill: 0x1e4878, rim: 0x5a9eff, glow: 0x3868a8, light: 0x90c8ff, mid: 0x2a5c96 },
  food:     { fill: 0x1e5420, rim: 0x6cd45a, glow: 0x3c8838, light: 0x90e880, mid: 0x2a6c2a },
  drink:    { fill: 0x6e4810, rim: 0xffaa44, glow: 0xa87828, light: 0xffc868, mid: 0x8a5c18 },
  military: { fill: 0x6e1e1e, rim: 0xff5555, glow: 0xa83030, light: 0xff8888, mid: 0x882828 },
};


// Band configuration for Y-axis layout (top to bottom)
/** @type {string[]} */
export const BAND_ORDER = ["production", "manufacturing", "infrastructure", "civic", "lifestyle", "order"];

// Map building categories to bands (null = sub-assigned by miniColor in layout.js)
/** @type {Record<string, string | null>} */
export const BUILDING_BAND = {
  extraction: "production",
  husbandry: "production",
  refining: "manufacturing",
  crafting: "manufacturing",
  logistics: "infrastructure",
  military: "order",
  service: null,       // sub-assigned by miniColor in layout.js
  trade: "infrastructure",
  infrastructure: "infrastructure",
};

// Representative colors per band (for legend display)
/** @type {Record<string, string>} */
export const BAND_COLORS = {
  production:     "rgb(74,119,14)",   // olive green (extraction/husbandry)
  manufacturing:  "rgb(226,195,38)",  // golden (refining/crafting)
  infrastructure: "rgb(48,139,204)",  // blue (monuments/pools)
  civic:          "rgb(134,184,184)", // teal (education/religion)
  lifestyle:      "rgb(70,0,255)",    // purple (entertainment/food service)
  order:          "rgb(100,10,10)",   // dark red (military/law enforcement)
};

// Map service building miniColors to bands
/** @type {Record<string, string>} */
export const SERVICE_BAND_BY_MINICOLOR = {
  "70_70_70":    "order",          // asylum, court, dungeon, scaffolds, slaver, stockade
  "134_184_184": "civic",          // admin, lab, library, school, university
  "0_255_255":   "civic",          // nurseries
  "173_107_165": "civic",          // hospital, shrines, temples
  "20_20_255":   "civic",          // physician
  "0_100_100":   "civic",          // resthome
  "255_0_220":   "civic",          // throne
  "70_0_255":    "lifestyle",      // barber, bath, chamber, arena, inn, etc.
  "198_106_0":   "lifestyle",      // food stall, market, restaurant, tavern
  "255_200_0":   "lifestyle",      // hearth, stock, well
  "120_120_120": "lifestyle",      // house
  "40_40_40":    "lifestyle",      // mass grave
  "48_139_204":  "infrastructure", // monuments
  "226_195_38":  "infrastructure", // pools (moat, pond, pool)
};

/**
 * @param {string} s
 * @returns {string}
 */
export function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * @param {string} id
 * @returns {string}
 */
export function formatResourceName(id) {
  return capitalize(id.replace(/_/g, " "));
}
