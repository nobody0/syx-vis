// Build bipartite dependency graph from resource + building data
import { resources } from "../data/resources.js";
import { buildings } from "../data/buildings.js";
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

  // ── World Map pseudo-building: break construction-cost cycles ──
  addGatheringRecipes(nodes, edges);

  return { nodes, edges };
}

/**
 * Detect construction-cost cycles and add a "World Map" pseudo-building
 * that produces gatherable resources at a slow rate (0.1/day).
 * This breaks cycles like: Stone Mine needs stone → stone comes from Stone Mine.
 * @param {Map<string, Object>} nodes
 * @param {import('../types.js').GraphEdge[]} edges
 */
function addGatheringRecipes(nodes, edges) {
  // Build a directed graph: resource → (via construction cost) → building → (via output) → resource
  // A cycle means a resource is needed to construct a building that produces it (directly or transitively).

  // Map: resource → set of buildings that need it for construction
  const constructionConsumers = new Map();
  // Map: building → set of resources it produces
  const buildingOutputs = new Map();

  for (const e of edges) {
    if (e.direction === "construction") {
      if (!constructionConsumers.has(e.from)) constructionConsumers.set(e.from, new Set());
      constructionConsumers.get(e.from).add(e.to);
    }
    if (e.direction === "output") {
      if (!buildingOutputs.has(e.from)) buildingOutputs.set(e.from, new Set());
      buildingOutputs.get(e.from).add(e.to);
    }
  }

  // For each resource used in construction, BFS through production chains
  // to see if it (transitively) depends on itself.
  const cycleResources = new Set();

  for (const [resourceId] of constructionConsumers) {
    if (cycleResources.has(resourceId)) continue;
    // BFS: can producing this resource require this resource for construction?
    // Start from all buildings that produce this resource, follow their construction
    // cost resources to their producers, and see if we reach back to resourceId.
    const visited = new Set();
    const queue = [resourceId];

    while (queue.length > 0) {
      const res = queue.shift();
      if (visited.has(res)) continue;
      visited.add(res);

      // Which buildings need this resource for construction?
      const consumers = constructionConsumers.get(res);
      if (!consumers) continue;

      for (const buildingId of consumers) {
        // What does this building produce?
        const outputs = buildingOutputs.get(buildingId);
        if (!outputs) continue;

        for (const outputRes of outputs) {
          if (outputRes === resourceId) {
            // Found a cycle!
            cycleResources.add(resourceId);
          }
          if (!visited.has(outputRes)) {
            queue.push(outputRes);
          }
        }
      }
    }
  }

  // CURATED: no game data source for world-map foraging rates.
  // The world map _GEN.txt files reference settlement buildings, not tile-level
  // gathering. These rates are hand-tuned to reflect relative early-game
  // availability and are NOT extracted from game files.
  // Only raw/natural resources belong here — never manufactured goods.
  const WORLD_MAP_GATHERING = {
    stone: 0.5,       // surface stone
    wood: 0.5,        // forest timber
    grain: 0.3,       // common crop (needs processing, not directly edible)
    fruit: 0.3,       // common food
    vegetable: 0.3,   // common food
    meat: 0.3,        // hunting
    mushroom: 0.2,    // forest foraging
    cotton: 0.2,      // fibre gathering
    herb: 0.15,       // less common
    egg: 0.1,         // wild nests
    leather: 0.1,     // hunting by-product
    opiates: 0.05,    // rare, late-game irrelevant
    livestock: 0.05,  // initial seed for pastures
  };

  // Gather only explicitly listed resources (cycle detection just validates they exist)
  const gatherResources = new Map();
  for (const [resId, rate] of Object.entries(WORLD_MAP_GATHERING)) {
    if (nodes.has(resId)) {
      gatherResources.set(resId, rate);
    }
  }

  if (gatherResources.size === 0) return;

  // Add World Map pseudo-building
  const recipes = [];
  for (const [resId, rate] of gatherResources) {
    const resNode = nodes.get(resId);
    const resName = resNode ? resNode.name : resId;
    recipes.push({
      id: `_world_map_${resId}`,
      name: `Gather ${resName}`,
      inputs: [],
      outputs: [{ resource: resId, amount: rate }],
      source: "curated",
    });
  }

  const worldMap = {
    id: "_world_map",
    type: "building",
    name: "World Map",
    category: "extraction",
    band: "production",
    recipes,
    desc: "Resources gathered from the world map. Rates reflect early-game availability.",
  };

  nodes.set(worldMap.id, worldMap);

  for (const recipe of recipes) {
    for (const out of recipe.outputs) {
      edges.push({
        from: worldMap.id,
        to: out.resource,
        recipe: recipe.name,
        recipeId: recipe.id,
        amount: out.amount,
        direction: "output",
      });
    }
  }
}
