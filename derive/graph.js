// Build bipartite dependency graph from resource + building data
import { buildings } from "../data/buildings.js";
import { resources } from "../data/resources.js";
import { BUILDING_BAND, SERVICE_BAND_BY_MINICOLOR } from "../display/config.js";

/**
 * Compute the band for a building based on its category and miniColor.
 * @param {Object} b - building data
 * @returns {string}
 */
function computeBuildingBand(b) {
  const fixedBand = BUILDING_BAND[b.category];
  if (fixedBand !== null && fixedBand !== undefined) return fixedBand;
  // Service buildings: embassy hardcode → civic, then miniColor lookup
  if (b.id === "_embassy") return "civic";
  const mcBand = b.miniColor ? SERVICE_BAND_BY_MINICOLOR[b.miniColor] : null;
  return mcBand || "lifestyle";
}

/**
 * Build the graph: { nodes: Map<id, node>, edges: Array<edge> }
 *
 * Node types:
 *   resource: { id, type:"resource", name, category, desc?, degradeRate?, priceCap?, tags? }
 *   building: { id, type:"building", name, category, band, recipes, desc?, storage?, fulfillment?, ... }
 *
 * Edge shape:
 *   { from, to, recipe, amount, direction:"input"|"output"|"construction"|"upgrade" }
 *
 * @returns {{ nodes: Map<string, import('../types.js').GraphNode & (import('../types.js').Resource | import('../types.js').Building)>, edges: import('../types.js').GraphEdge[] }}
 */
export function buildGraph() {
  const nodes = new Map();
  /** @type {import('../types.js').GraphEdge[]} */
  const edges = [];

  // Add all resource nodes (pass through all metadata)
  for (const r of resources) {
    nodes.set(r.id, { ...r, type: "resource" });
  }

  // Add all building nodes and derive edges from recipes (pass through all metadata)
  for (const b of buildings) {
    nodes.set(b.id, { ...b, type: "building", band: computeBuildingBand(b) });

    for (const recipe of b.recipes) {
      // Input edges: resource → building
      for (const inp of recipe.inputs) {
        edges.push({
          from: inp.resource,
          to: b.id,
          recipe: recipe.name,
          recipeId: recipe.id,
          amount: inp.amount,
          direction: "input",
        });
      }

      // Output edges: building → resource
      for (const out of recipe.outputs) {
        edges.push({
          from: b.id,
          to: out.resource,
          recipe: recipe.name,
          recipeId: recipe.id,
          amount: out.amount,
          direction: "output",
        });
      }
    }

    // Construction cost edges: resource → building
    if (b.constructionCosts) {
      for (const cost of b.constructionCosts) {
        edges.push({
          from: cost.resource,
          to: b.id,
          recipe: "Construction",
          amount: cost.amount,
          direction: "construction",
        });
      }
    }

    // Upgrade cost edges: resource → building
    if (b.upgradeCosts) {
      for (let tier = 0; tier < b.upgradeCosts.length; tier++) {
        for (const cost of b.upgradeCosts[tier]) {
          edges.push({
            from: cost.resource,
            to: b.id,
            recipe: `Upgrade ${tier + 1}`,
            amount: cost.amount,
            direction: "upgrade",
          });
        }
      }
    }

    // Equipment dependency edge: resource → building
    if (b.equipmentToUse && nodes.has(b.equipmentToUse)) {
      edges.push({
        from: b.equipmentToUse,
        to: b.id,
        recipe: "Equipment",
        amount: 0,
        direction: "equipment",
      });
    }

    // Projectile resource edge: resource → building
    if (b.projectileResource && nodes.has(b.projectileResource)) {
      edges.push({
        from: b.projectileResource,
        to: b.id,
        recipe: "Ammo",
        amount: 0,
        direction: "ammo",
      });
    }

    // Sacrifice resource edge: resource → building
    if (b.sacrificeResource && nodes.has(b.sacrificeResource)) {
      edges.push({
        from: b.sacrificeResource,
        to: b.id,
        recipe: "Sacrifice",
        amount: 0,
        direction: "sacrifice",
      });
    }

    // Area cost edges: resource → building (per-tile costs for farms/pastures)
    if (b.areaCosts) {
      for (const cost of b.areaCosts) {
        edges.push({
          from: cost.resource,
          to: b.id,
          recipe: "Per-Tile Cost",
          amount: cost.amount,
          direction: "area",
        });
      }
    }

    // Extra resource output edge: building → resource (e.g., orchard wood byproduct)
    if (b.extraResource && nodes.has(b.extraResource)) {
      edges.push({
        from: b.id,
        to: b.extraResource,
        recipe: "Byproduct",
        amount: b.extraResourceAmount || 0,
        direction: "output",
      });
    }
  }

  return { nodes, edges };
}

// CURATED: no game data source for world-map foraging rates.
// The world map _GEN.txt files reference settlement buildings, not tile-level
// gathering. These rates are hand-tuned to reflect relative early-game
// availability and are NOT extracted from game files.
// Only raw/natural resources belong here — never manufactured goods.
// Used by layout.js as virtual producers to break construction-cost cycles.
export const GATHERING_RATES = {
  stone: 0.5, // surface stone
  wood: 0.5, // forest timber
};
