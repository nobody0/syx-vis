// Production Balancing tab — calculate upstream chain requirements for target output
import { resources } from "../data/resources.js";
import { buildGraph } from "../derive/graph.js";
import { getRecipeWeight, setRecipeWeight, getResourceState, fireFilterChange, createAutocomplete } from "./filters.js";

let graphData = null;
let producers = null; // Map: resourceId → [{building, recipe, outputAmount}]

function ensureGraph() {
  if (graphData) return;
  graphData = buildGraph();

  // Build producer lookup: resource → ways to produce it
  producers = new Map();
  for (const [_id, node] of graphData.nodes) {
    if (node.type !== "building") continue;
    for (const recipe of node.recipes || []) {
      for (const out of recipe.outputs) {
        if (!producers.has(out.resource)) producers.set(out.resource, []);
        producers.get(out.resource).push({
          building: node,
          recipe,
          outputAmount: out.amount,
        });
      }
    }
  }
}

/**
 * Calculate the production chain for a target resource at a given rate,
 * respecting recipe weights from the filter panel.
 * Returns an array of steps.
 */
function calculateChain(targetResource, targetRate) {
  ensureGraph();

  const steps = [];
  const visited = new Set(); // prevent infinite recursion

  function resolve(resourceId, requiredRate, depth) {
    if (depth > 20) return; // safety limit

    // If resource is "bought", stop recursion (terminal node)
    const resState = getResourceState(resourceId);
    if (resState === "bought") {
      const resNode = graphData.nodes.get(resourceId);
      steps.push({
        terminal: true,
        resource: resourceId,
        resourceName: resNode ? resNode.name : resourceId,
        resourceIcon: resNode?.icon,
        rate: requiredRate,
        depth,
      });
      return;
    }

    const prods = producers.get(resourceId);
    if (!prods || prods.length === 0) return; // no producer — raw trade resource

    // Filter to active recipes (weight > 0)
    const activeProds = prods.filter(p =>
      p.building.id !== "_world_map" && getRecipeWeight(p.recipe.id) > 0
    );
    if (activeProds.length === 0) {
      steps.push({
        warning: true,
        resource: resourceId,
        resourceName: (graphData.nodes.get(resourceId)?.name) || resourceId,
        depth,
      });
      return;
    }

    // Split demand by relative weight
    const totalWeight = activeProds.reduce((s, p) => s + getRecipeWeight(p.recipe.id), 0);

    for (const prod of activeProds) {
      const weight = getRecipeWeight(prod.recipe.id);
      const pct = weight / totalWeight;
      const prodRate = requiredRate * pct;
      const workers = prodRate / prod.outputAmount;

      // Scale recipe inputs by workers needed
      const scaledInputs = prod.recipe.inputs.map(inp => ({
        resource: inp.resource,
        amount: inp.amount * workers,
      }));

      const scaledOutputs = prod.recipe.outputs.map(out => ({
        resource: out.resource,
        amount: out.amount * workers,
      }));

      steps.push({
        building: prod.building,
        recipe: prod.recipe,
        workers,
        inputs: scaledInputs,
        outputs: scaledOutputs,
        depth,
        splitPct: activeProds.length > 1 ? pct : null,
      });

      // Recursively resolve each input
      for (const inp of scaledInputs) {
        const key = `${inp.resource}@${prod.recipe.id}@${depth}`;
        if (visited.has(key)) continue;
        visited.add(key);
        resolve(inp.resource, inp.amount, depth + 1);
      }
    }
  }

  resolve(targetResource, targetRate, 0);

  return steps;
}

let activeResultsDiv = null;
let activeResourceId = null;
let activeRate = null;

// Subscribe to filter changes to auto-refresh
let filterListenerInstalled = false;

function installFilterListener() {
  if (filterListenerInstalled) return;
  filterListenerInstalled = true;
  // Store a refresh callback so filter changes can trigger re-calculation
  window._balancingRefresh = () => {
    if (activeResultsDiv && activeResourceId && activeRate) {
      runCalculation(activeResourceId, activeRate, activeResultsDiv);
    }
  };
}

export function renderBalancing(container) {
  const html = [];
  html.push(`<div class="calc-content">`);
  html.push(`<h2>Production Balancing</h2>`);
  html.push(`<p>Select a target resource and desired output rate. The calculator traces backwards through the production chain to show required buildings and workers at each step. Recipe weights from the filter panel control how demand is split between producers.</p>`);

  // Controls — resource autocomplete is inserted programmatically
  html.push(`<div class="calc-controls">`);
  html.push(`<label>Resource:</label>`);
  html.push(`<span id="bal-resource-wrap"></span>`);
  html.push(`<label for="bal-rate">Rate (units/day):</label>`);
  html.push(`<input type="number" id="bal-rate" value="1" min="0.01" step="0.1">`);
  html.push(`<button class="calc-btn" id="bal-calculate">Calculate</button>`);
  html.push(`</div>`);

  html.push(`<div id="bal-results"></div>`);
  html.push(`</div>`);

  container.innerHTML = html.join("\n");

  // Build autocomplete items from resources
  const items = resources.map(r => ({
    id: r.id,
    name: r.name,
    type: "resource",
    category: r.category,
    icon: r.icon,
  }));
  items.sort((a, b) => a.name.localeCompare(b.name));

  let selectedResourceId = null;
  const acWrap = container.querySelector("#bal-resource-wrap");
  const calcBtn = container.querySelector("#bal-calculate");
  const resultsDiv = container.querySelector("#bal-results");
  const rateInput = container.querySelector("#bal-rate");

  function tryCalculate() {
    if (!selectedResourceId) return;
    const rate = parseFloat(rateInput.value);
    if (isNaN(rate) || rate <= 0) return;
    activeResultsDiv = resultsDiv;
    activeResourceId = selectedResourceId;
    activeRate = rate;
    runCalculation(selectedResourceId, rate, resultsDiv);
  }

  createAutocomplete(acWrap, items, (id) => {
    selectedResourceId = id;
    tryCalculate();
  }, { placeholder: "Search resource...", keepValue: true });

  calcBtn.addEventListener("click", tryCalculate);

  // Also trigger on Enter in rate input
  rateInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") calcBtn.click();
  });

  installFilterListener();
}

function runCalculation(resourceId, rate, resultsDiv) {
  const steps = calculateChain(resourceId, rate);
  ensureGraph();
  const resNode = graphData.nodes.get(resourceId);
  const resName = resNode ? resNode.name : resourceId;

  if (steps.length === 0) {
    resultsDiv.innerHTML = `<div class="note">No production chain found for ${resName}. This resource may only be available via trade or has no known producers.</div>`;
    return;
  }

  const html = [];
  html.push(`<h3>Production Chain: ${rate} ${resName}/day</h3>`);
  html.push(`<table class="calc-table">`);
  html.push(`<thead><tr>
    <th>Step</th>
    <th>Building</th>
    <th>Recipe</th>
    <th style="text-align:right">Workers</th>
    <th>Split</th>
    <th>Weight</th>
    <th>Inputs (/day)</th>
    <th>Outputs (/day)</th>
  </tr></thead><tbody>`);

  let stepNum = 0;
  for (const s of steps) {
    stepNum++;
    const indent = "\u00a0\u00a0".repeat(s.depth || 0);

    if (s.terminal) {
      html.push(`<tr class="terminal-row">
        <td class="num">${indent}${stepNum}</td>
        <td colspan="2"><span class="resource-name">${s.resourceIcon ? `<img src="data/icons/${s.resourceIcon}" alt="">` : ''}${s.resourceName}</span></td>
        <td colspan="5" style="color:var(--state-bought);font-style:italic">BOUGHT (${formatNum(s.rate)}/day)</td>
      </tr>`);
      continue;
    }

    if (s.warning) {
      html.push(`<tr>
        <td class="num">${indent}${stepNum}</td>
        <td colspan="7" style="color:var(--state-ignored)">No active producer for ${s.resourceName}</td>
      </tr>`);
      continue;
    }

    const inputStr = s.inputs.length > 0
      ? s.inputs.map(inp => {
          const n = graphData.nodes.get(inp.resource);
          const name = n ? n.name : inp.resource;
          return `<span class="resource-name"><img src="data/icons/${inp.resource}.png" alt="">${formatNum(inp.amount)} ${name}</span>`;
        }).join("<br>")
      : `<span style="color:var(--text-muted)">extraction</span>`;

    const outputStr = s.outputs.map(out => {
      const n = graphData.nodes.get(out.resource);
      const name = n ? n.name : out.resource;
      return `<span class="resource-name"><img src="data/icons/${out.resource}.png" alt="">${formatNum(out.amount)} ${name}</span>`;
    }).join("<br>");

    const splitStr = s.splitPct != null
      ? `<span style="color:var(--accent-gold)">${Math.round(s.splitPct * 100)}%</span>`
      : `<span style="color:var(--text-muted)">\u2014</span>`;

    const curWeight = getRecipeWeight(s.recipe.id);
    // Only show weight input when recipe has competing producers for any output
    const hasCompetition = s.recipe.outputs.some(out => {
      const prods = producers.get(out.resource);
      return prods && prods.filter(p => p.building.id !== "_world_map").length > 1;
    });
    const weightCell = hasCompetition
      ? `<input type="number" class="bal-weight-input" data-recipe-id="${s.recipe.id}" value="${curWeight}" min="0" step="0.5">`
      : `<span style="color:var(--text-muted)">\u2014</span>`;
    html.push(`<tr>
      <td class="num">${indent}${stepNum}</td>
      <td><span class="resource-name"><img src="data/icons/${s.building.icon}" alt="">${s.building.name}</span></td>
      <td>${s.recipe.name}</td>
      <td class="num">${formatNum(s.workers)}</td>
      <td class="num">${splitStr}</td>
      <td>${weightCell}</td>
      <td>${inputStr}</td>
      <td>${outputStr}</td>
    </tr>`);
  }

  html.push(`</tbody></table>`);

  // Summary: total workers (excluding terminals and warnings)
  const productionSteps = steps.filter(s => !s.terminal && !s.warning);
  const totalWorkers = productionSteps.reduce((sum, s) => sum + s.workers, 0);
  const boughtCount = steps.filter(s => s.terminal).length;
  const warningCount = steps.filter(s => s.warning).length;

  let summaryParts = [`Total workers across chain: <strong style="color:var(--text-primary)">${formatNum(totalWorkers)}</strong>`];
  if (boughtCount > 0) summaryParts.push(`${boughtCount} resource(s) marked as bought`);
  if (warningCount > 0) summaryParts.push(`<span style="color:var(--state-ignored)">${warningCount} resource(s) with no active producer</span>`);
  summaryParts.push("Workers are fractional \u2014 round up for the number of building instances needed.");

  html.push(`<div class="note">${summaryParts.join(". ")}.</div>`);

  resultsDiv.innerHTML = html.join("\n");

  // Wire up weight input handlers
  for (const input of resultsDiv.querySelectorAll(".bal-weight-input")) {
    input.addEventListener("change", () => {
      const recipeId = input.dataset.recipeId;
      const w = parseFloat(input.value);
      if (isNaN(w) || w < 0) {
        input.value = 1;
        setRecipeWeight(recipeId, 1);
      } else {
        setRecipeWeight(recipeId, w);
      }
      fireFilterChange();
      // Re-run calculation with updated weights
      runCalculation(activeResourceId, activeRate, resultsDiv);
    });
  }
}

function formatNum(n) {
  if (Number.isInteger(n)) return String(n);
  return n < 0.01 ? n.toExponential(2) : n.toFixed(2).replace(/\.?0+$/, "");
}
