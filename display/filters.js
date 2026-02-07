// Filter panel: search autocomplete, category toggles, cost edge toggles, resource state grid
import { RESOURCE_COLORS, BAND_COLORS, capitalize } from "./config.js";

// Filter state
const filterState = {
  buildingCategories: {},    // { [cat]: boolean }
  resourceCategories: {},    // { [cat]: boolean }
  edgeMode: "construction",  // "production"|"construction"|"upgrade"|"all"
  showFiltered: false,
  resourceStates: new Map(),  // Map<resourceId, "bought"|"produced"|"ignored">
  recipeStates: new Map(),    // Map<recipeId, number> (weight; 0 = disabled, absent = default 1)
  focusMode: null,            // null | { targetId: string, upstreamDepth: number|Infinity, downstreamDepth: number }
};

const STORAGE_KEY = "syx-vis-filters";

function saveFilterState() {
  const data = {
    buildingCategories: filterState.buildingCategories,
    resourceCategories: filterState.resourceCategories,
    edgeMode: filterState.edgeMode,
    showFiltered: filterState.showFiltered,
    resourceStates: Object.fromEntries(filterState.resourceStates),
    recipeStates: Object.fromEntries(filterState.recipeStates),
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* localStorage unavailable */ }
}

function loadFilterState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.buildingCategories) Object.assign(filterState.buildingCategories, data.buildingCategories);
    if (data.resourceCategories) Object.assign(filterState.resourceCategories, data.resourceCategories);
    if (typeof data.edgeMode === "string" && ["production", "construction", "upgrade", "all"].includes(data.edgeMode)) {
      filterState.edgeMode = data.edgeMode;
    }
    if (typeof data.showFiltered === "boolean") filterState.showFiltered = data.showFiltered;
    if (data.resourceStates) {
      for (const [id, state] of Object.entries(data.resourceStates)) {
        filterState.resourceStates.set(id, state);
      }
    }
    if (data.recipeStates) {
      for (const [id, weight] of Object.entries(data.recipeStates)) {
        filterState.recipeStates.set(id, weight);
      }
    }
  } catch { /* localStorage unavailable */ }
}

loadFilterState();

// ── Resource state API (exported for render.js) ──

/**
 * @param {string} id
 * @param {string|null} state
 */
export function setResourceState(id, state) {
  if (state) {
    filterState.resourceStates.set(id, state);
  } else {
    filterState.resourceStates.delete(id);
  }
}

/**
 * @param {string} id
 * @returns {string|null}
 */
export function getResourceState(id) {
  return filterState.resourceStates.get(id) || null;
}

export function isShowFiltered() {
  return filterState.showFiltered;
}

// ── Edge mode API (exported for render.js) ──

export function getEdgeMode() {
  return filterState.edgeMode;
}

/**
 * @param {string} mode
 */
export function setEdgeMode(mode) {
  filterState.edgeMode = mode;
}

export function getVisibleDirections() {
  switch (filterState.edgeMode) {
    case "production": return new Set(["input", "output"]);
    case "construction": return new Set(["construction", "area"]);
    case "upgrade": return new Set(["upgrade"]);
    case "all": return new Set(["input", "output", "construction", "upgrade", "equipment", "ammo", "sacrifice", "area"]);
    default: return new Set(["construction"]);
  }
}

// ── Recipe state API (exported for balancing.js, render.js) ──

/**
 * @param {string} recipeId
 * @param {number} weight
 */
export function setRecipeWeight(recipeId, weight) {
  if (weight === 1 || weight == null) {
    filterState.recipeStates.delete(recipeId);
  } else {
    filterState.recipeStates.set(recipeId, weight);
  }
}

/**
 * @param {string} recipeId
 * @returns {number}
 */
export function getRecipeWeight(recipeId) {
  const w = filterState.recipeStates.get(recipeId);
  return w != null ? w : 1;
}

/**
 * Get active producers for a resource with their weights and percentages.
 * @param {string} resourceId
 * @param {Map} fullNodes - from buildGraph()
 * @param {Array} fullEdges - from buildGraph()
 * @returns {Array<{recipeId, buildingId, buildingName, recipeName, outputAmount, weight, pct}>}
 */
export function getActiveProducers(resourceId, fullNodes, fullEdges) {
  const producers = [];
  for (const e of fullEdges) {
    if (e.to === resourceId && e.direction === "output") {
      const building = fullNodes.get(e.from);
      if (!building) continue;
      const weight = getRecipeWeight(e.recipeId);
      producers.push({
        recipeId: e.recipeId,
        buildingId: e.from,
        buildingName: building.name,
        recipeName: e.recipe,
        outputAmount: e.amount,
        weight,
      });
    }
  }
  // Calculate percentages based on active (weight > 0) producers
  const totalWeight = producers.reduce((s, p) => s + (p.weight > 0 ? p.weight : 0), 0);
  for (const p of producers) {
    p.pct = totalWeight > 0 && p.weight > 0 ? p.weight / totalWeight : 0;
  }
  return producers;
}

// Keep reference for rebuilding active states summary from render.js
let _refreshActiveStates = null;
let _currentOnFilterChange = null;

export function refreshResourceGrid() {
  if (_refreshActiveStates) _refreshActiveStates();
}

export function clearAllResourceStates() {
  filterState.resourceStates.clear();
}

export function getResourceStates() {
  return filterState.resourceStates;
}

// ── Focus mode API ──

export function getFocusMode() {
  return filterState.focusMode;
}

/**
 * @param {{ targetId: string, upstreamDepth: number, downstreamDepth: number } | null} mode
 */
export function setFocusMode(mode) {
  filterState.focusMode = mode;
}

export function clearFocusMode() {
  filterState.focusMode = null;
}

export function fireFilterChange() {
  setTimeout(saveFilterState, 0);
  if (_currentOnFilterChange) _currentOnFilterChange();
}

/**
 * Reusable autocomplete component.
 * @param {HTMLElement} container - parent to append into
 * @param {Array} items - [{id, name, type, category, icon?}]
 * @param {Function} onSelect - called with (id) when user picks an item
 * @param {Object} options - { placeholder, filterFn }
 * @returns {{ focus(), clear() }}
 */
export function createAutocomplete(container, items, onSelect, options = {}) {
  const wrap = el("div", "search-autocomplete");

  // Search icon
  const searchIcon = el("span", "search-icon");
  searchIcon.innerHTML = "&#x1F50D;";
  wrap.appendChild(searchIcon);

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = options.placeholder || "Search...";
  input.setAttribute("autocomplete", "off");
  wrap.appendChild(input);

  const dropdown = el("div", "search-dropdown");
  dropdown.style.display = "none";
  wrap.appendChild(dropdown);

  let activeIndex = -1;
  let filteredItems = [];

  function getFilteredItems(query) {
    let pool = options.filterFn ? items.filter(options.filterFn) : items;
    if (!query) return options.showAllOnEmpty ? pool.slice(0, 20) : [];
    const q = query.toLowerCase();
    const prefix = [];
    const substring = [];
    for (const item of pool) {
      const name = item.name.toLowerCase();
      if (name.startsWith(q)) {
        prefix.push(item);
      } else if (name.includes(q)) {
        substring.push(item);
      }
    }
    prefix.sort((a, b) => a.name.localeCompare(b.name));
    substring.sort((a, b) => a.name.localeCompare(b.name));
    return [...prefix, ...substring].slice(0, 10);
  }

  function renderDropdown() {
    dropdown.innerHTML = "";
    if (filteredItems.length === 0) {
      dropdown.style.display = "none";
      return;
    }
    dropdown.style.display = "";
    for (let i = 0; i < filteredItems.length; i++) {
      const item = filteredItems[i];
      const row = el("div", "search-result");
      if (i === activeIndex) row.classList.add("active");

      // Use game icon when available, color swatch fallback
      if (item.icon) {
        const icon = document.createElement("img");
        icon.src = `data/icons/${item.icon}`;
        icon.className = "search-res-icon";
        icon.alt = item.name;
        row.appendChild(icon);
      } else {
        const swatch = el("span", "search-swatch");
        if (item.type === "resource") {
          swatch.classList.add("circle");
          swatch.style.backgroundColor = RESOURCE_COLORS[item.category] || "#666";
        } else {
          swatch.classList.add("rect");
          swatch.style.backgroundColor = BAND_COLORS[item.band] || "#666";
        }
        row.appendChild(swatch);
      }

      // Name
      row.appendChild(elText("span", item.name, "search-result-name"));

      // Type label
      row.appendChild(elText("span", item.type, "search-result-type"));

      row.addEventListener("mousedown", (e) => {
        e.preventDefault(); // prevent blur before click fires
        selectItem(item);
      });
      row.addEventListener("mouseenter", () => {
        activeIndex = i;
        updateActiveClass();
      });
      dropdown.appendChild(row);
    }
  }

  function updateActiveClass() {
    const rows = dropdown.querySelectorAll(".search-result");
    rows.forEach((r, i) => r.classList.toggle("active", i === activeIndex));
  }

  function selectItem(item) {
    onSelect(item.id);
    input.value = options.keepValue ? item.name : "";
    filteredItems = [];
    activeIndex = -1;
    dropdown.style.display = "none";
    input.blur();
  }

  input.addEventListener("input", () => {
    const q = input.value.trim();
    filteredItems = getFilteredItems(q);
    activeIndex = -1;
    renderDropdown();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredItems.length > 0) {
        activeIndex = Math.min(activeIndex + 1, filteredItems.length - 1);
        updateActiveClass();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredItems.length > 0) {
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActiveClass();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredItems.length) {
        selectItem(filteredItems[activeIndex]);
      } else if (filteredItems.length > 0) {
        selectItem(filteredItems[0]);
      }
    } else if (e.key === "Escape") {
      input.value = "";
      filteredItems = [];
      activeIndex = -1;
      dropdown.style.display = "none";
      input.blur();
    }
  });

  input.addEventListener("blur", () => {
    // Delay to allow mousedown on dropdown items to fire
    setTimeout(() => {
      dropdown.style.display = "none";
    }, 150);
  });

  input.addEventListener("focus", () => {
    if (options.showAllOnEmpty && filteredItems.length === 0 && !input.value.trim()) {
      filteredItems = getFilteredItems("");
      renderDropdown();
    } else if (filteredItems.length > 0) {
      dropdown.style.display = "";
    }
  });

  container.appendChild(wrap);

  return {
    focus() { input.focus(); },
    clear() { input.value = ""; filteredItems = []; activeIndex = -1; dropdown.style.display = "none"; },
    input
  };
}

/**
 * Build the filter panel DOM inside #filter-panel.
 * @param {Map} fullNodes
 * @param {Array} fullEdges
 * @param {Function} onFilterChange - called when any filter changes
 * @param {Function} navigateToNode - called with nodeId to pan/zoom/highlight
 */
export function buildFilterPanel(fullNodes, fullEdges, onFilterChange, navigateToNode) {
  _currentOnFilterChange = onFilterChange;
  const panel = document.getElementById("filter-panel");
  panel.innerHTML = "";

  // Derive categories and counts + build item list for autocomplete
  const buildingBands = {};
  const resourceCats = {};
  const allItems = []; // for search autocomplete
  const resourceItems = []; // resources only, for active states summary

  for (const [_id, node] of fullNodes) {
    if (node.type === "building") {
      const band = node.band || "lifestyle";
      buildingBands[band] = (buildingBands[band] || 0) + 1;
    } else {
      resourceCats[node.category] = (resourceCats[node.category] || 0) + 1;
    }
    allItems.push({ id: node.id, name: node.name, type: node.type, category: node.category, band: node.band, icon: node.icon });
    if (node.type === "resource") {
      resourceItems.push({ id: node.id, name: node.name, category: node.category, icon: node.icon });
    }
  }
  allItems.sort((a, b) => a.name.localeCompare(b.name));
  resourceItems.sort((a, b) => a.name.localeCompare(b.name));

  // Build resource lookup for active states summary
  const resourceById = new Map();
  for (const res of resourceItems) resourceById.set(res.id, res);

  // Init filter state defaults
  for (const cat of Object.keys(buildingBands)) {
    if (!(cat in filterState.buildingCategories)) {
      filterState.buildingCategories[cat] = true;
    }
  }
  for (const cat of Object.keys(resourceCats)) {
    if (!(cat in filterState.resourceCategories)) {
      filterState.resourceCategories[cat] = true;
    }
  }

  function updateFilterBadge() {
    let count = 0;
    // Count non-default resource states
    count += filterState.resourceStates.size;
    // Count hidden building categories
    for (const v of Object.values(filterState.buildingCategories)) {
      if (!v) count++;
    }
    // Count hidden resource categories
    for (const v of Object.values(filterState.resourceCategories)) {
      if (!v) count++;
    }
    // Count disabled recipes
    for (const w of filterState.recipeStates.values()) {
      if (w === 0) count++;
    }
    if (count > 0) {
      badge.textContent = String(count);
      badge.style.display = "";
    } else {
      badge.style.display = "none";
    }
  }

  const fire = () => { saveFilterState(); updateFilterBadge(); onFilterChange(); };

  // ── Header ──
  const header = el("div", "filter-header");
  const titleWrap = el("span", "filter-title-wrap");
  titleWrap.appendChild(elText("span", "Filters", "filter-title"));
  const badge = el("span", "filter-badge");
  badge.style.display = "none";
  titleWrap.appendChild(badge);
  header.appendChild(titleWrap);
  const collapseBtn = elText("button", "\u00AB", "filter-collapse-btn");
  collapseBtn.title = "Collapse filters";
  collapseBtn.addEventListener("click", () => {
    panel.classList.toggle("collapsed");
    collapseBtn.textContent = panel.classList.contains("collapsed") ? "\u00BB" : "\u00AB";
  });
  header.appendChild(collapseBtn);
  panel.appendChild(header);

  // ── Collapsible body ──
  const body = el("div", "filter-body");

  // ── Search autocomplete ──
  const searchWrap = el("div", "filter-search");
  const searchAC = createAutocomplete(searchWrap, allItems, (id) => {
    if (navigateToNode) navigateToNode(id);
  }, { placeholder: "Search... (Ctrl+F)" });
  body.appendChild(searchWrap);

  // Store reference for Ctrl+F focus
  panel._searchAC = searchAC;

  // ── Focus mode indicator (shown when focus mode is active) ──
  if (filterState.focusMode) {
    const focusInd = el("div", "focus-indicator");
    focusInd.appendChild(elText("span", "FOCUS", "focus-indicator-label"));
    const targetNode = fullNodes.get(filterState.focusMode.targetId);
    const targetSpan = el("span", "focus-indicator-target");
    if (targetNode && targetNode.icon) {
      const img = document.createElement("img");
      img.src = `data/icons/${targetNode.icon}`;
      img.alt = targetNode ? targetNode.name : "";
      targetSpan.appendChild(img);
    }
    targetSpan.appendChild(elText("span", targetNode ? targetNode.name : filterState.focusMode.targetId));
    focusInd.appendChild(targetSpan);
    const exitBtn = elText("button", "\u00D7", "focus-indicator-exit");
    exitBtn.title = "Exit focus mode";
    exitBtn.addEventListener("click", () => {
      filterState.focusMode = null;
      // Rebuild panel to remove indicator
      buildFilterPanel(fullNodes, fullEdges, onFilterChange, navigateToNode);
      fire();
    });
    focusInd.appendChild(exitBtn);
    body.appendChild(focusInd);
  }

  // ── Categories (disclosure toggle, collapsed by default) ──
  const catToggle = el("div", "disclosure-toggle");
  catToggle.appendChild(elText("span", "\u25B6", "disclosure-arrow"));
  catToggle.appendChild(elText("span", "CATEGORIES", "filter-section-label disclosure-label"));
  catToggle.addEventListener("click", () => {
    catToggle.classList.toggle("open");
  });
  body.appendChild(catToggle);

  const catContent = el("div", "disclosure-content");

  const catGrid = el("div", "filter-categories-grid");

  // Left column: Buildings (by band)
  const bldCol = el("div", "filter-cat-column");
  bldCol.appendChild(elText("div", "BUILDINGS", "filter-col-label"));
  for (const [band, count] of Object.entries(buildingBands).sort((a, b) => a[0].localeCompare(b[0]))) {
    const row = buildCategoryRow(band, count, BAND_COLORS[band] || "#666",
      filterState.buildingCategories[band],
      (checked) => { filterState.buildingCategories[band] = checked; fire(); }
    );
    bldCol.appendChild(row);
  }
  catGrid.appendChild(bldCol);

  // Right column: Resources
  const resCol = el("div", "filter-cat-column");
  resCol.appendChild(elText("div", "RESOURCES", "filter-col-label"));
  for (const [cat, count] of Object.entries(resourceCats).sort((a, b) => a[0].localeCompare(b[0]))) {
    const row = buildCategoryRow(cat, count, RESOURCE_COLORS[cat] || "#666",
      filterState.resourceCategories[cat],
      (checked) => { filterState.resourceCategories[cat] = checked; fire(); }
    );
    resCol.appendChild(row);
  }
  catGrid.appendChild(resCol);

  catContent.appendChild(catGrid);
  body.appendChild(catContent);

  // ── Edge Mode bar ──
  body.appendChild(elText("div", "EDGES", "filter-section-label"));
  const modeBar = el("div", "edge-mode-bar");
  const modes = [
    { key: "production", label: "Production", shortcut: "1" },
    { key: "construction", label: "Construction", shortcut: "2" },
    { key: "upgrade", label: "Upgrade", shortcut: "3" },
    { key: "all", label: "All", shortcut: "4" },
  ];
  const modeBtns = [];
  for (const mode of modes) {
    const btn = elText("button", mode.label, "edge-mode-btn");
    btn.title = `${mode.label} edges (${mode.shortcut})`;
    btn.dataset.mode = mode.key;
    if (filterState.edgeMode === mode.key) btn.classList.add("active");
    btn.addEventListener("click", () => {
      filterState.edgeMode = mode.key;
      for (const b of modeBtns) b.classList.toggle("active", b.dataset.mode === mode.key);
      fire();
    });
    modeBtns.push(btn);
    modeBar.appendChild(btn);
  }
  body.appendChild(modeBar);
  // Store reference for keyboard shortcut updates
  panel._edgeModeBtns = modeBtns;

  // ── Display section ──
  body.appendChild(elText("div", "DISPLAY", "filter-section-label"));
  const displaySection = el("div", "filter-categories");
  displaySection.appendChild(buildCategoryRow("Show filtered", "", "#666",
    filterState.showFiltered,
    (checked) => { filterState.showFiltered = checked; fire(); }
  ));
  body.appendChild(displaySection);

  // ── Active States Summary ──
  const statesSection = el("div", "filter-section-label");
  statesSection.id = "active-states-label";
  body.appendChild(statesSection);

  const statesContainer = el("div", "active-states-summary");
  body.appendChild(statesContainer);

  function refreshActiveStates() {
    // Update section label with count
    const count = filterState.resourceStates.size;
    statesSection.textContent = "";
    statesSection.appendChild(document.createTextNode(`ACTIVE STATES`));
    if (count > 0) {
      const countSpan = elText("span", ` (${count})`, "active-states-count");
      statesSection.appendChild(countSpan);
    }

    statesContainer.innerHTML = "";

    if (count === 0) {
      statesContainer.appendChild(elText("div", "No resource states set. Use detail panel to mark resources as Bought, Producing, or Ignored.", "active-states-empty"));
      return;
    }

    // Header with clear button
    const hdr = el("div", "active-states-header");
    const clearBtn = elText("button", "Clear All", "active-states-clear");
    clearBtn.addEventListener("click", () => {
      filterState.resourceStates.clear();
      refreshActiveStates();
      fire();
    });
    hdr.appendChild(clearBtn);
    statesContainer.appendChild(hdr);

    // Group by state
    const groups = { bought: [], produced: [], ignored: [] };
    for (const [id, state] of filterState.resourceStates) {
      if (groups[state]) groups[state].push(id);
    }

    for (const [state, ids] of Object.entries(groups)) {
      if (ids.length === 0) continue;
      const group = el("div", "active-states-group");
      const labels = { bought: "Bought", produced: "Producing", ignored: "Ignored" };
      group.appendChild(elText("div", labels[state], `active-states-group-label state-${state}`));

      const pills = el("div", "active-states-pills");
      for (const id of ids) {
        const res = resourceById.get(id);
        const pill = el("span", "active-state-pill");
        if (res && res.icon) {
          const img = document.createElement("img");
          img.src = `data/icons/${res.icon}`;
          img.alt = res ? res.name : id;
          pill.appendChild(img);
        }
        pill.appendChild(elText("span", res ? res.name : id));
        pill.addEventListener("click", () => {
          if (navigateToNode) navigateToNode(id);
        });
        pills.appendChild(pill);
      }
      group.appendChild(pills);
      statesContainer.appendChild(group);
    }
  }

  _refreshActiveStates = refreshActiveStates;
  refreshActiveStates();

  // ── Reset button ──
  const resetBtn = elText("button", "Reset All", "filter-reset-btn");
  resetBtn.addEventListener("click", () => {
    for (const cat of Object.keys(filterState.buildingCategories)) {
      filterState.buildingCategories[cat] = true;
    }
    for (const cat of Object.keys(filterState.resourceCategories)) {
      filterState.resourceCategories[cat] = true;
    }
    filterState.edgeMode = "construction";
    filterState.showFiltered = false;
    filterState.resourceStates.clear();
    filterState.recipeStates.clear();

    // Re-build panel to reset all checkbox states
    buildFilterPanel(fullNodes, fullEdges, onFilterChange, navigateToNode);
    fire();
  });
  body.appendChild(resetBtn);

  panel.appendChild(body);

  // Set initial badge state
  updateFilterBadge();
}

/**
 * Focus the search input (for Ctrl+F shortcut).
 */
export function focusSearch() {
  const panel = document.getElementById("filter-panel");
  if (panel._searchAC) panel._searchAC.focus();
}

/**
 * Pure filter function. Returns filtered { nodes, edges, layoutEdges, filteredOutNodes, filteredOutEdges }.
 * @param {Map<string, Object>} fullNodes
 * @param {import('../types.js').GraphEdge[]} fullEdges
 * @returns {{ nodes: Map<string, Object>, edges: import('../types.js').GraphEdge[], layoutEdges: import('../types.js').GraphEdge[], filteredOutNodes: Map<string, {node: Object, reason: string, filterType: string}>, filteredOutEdges: import('../types.js').GraphEdge[] }}
 */
export function applyFilters(fullNodes, fullEdges) {
  const visibleNodeIds = new Set();
  const nodes = new Map();
  const filteredOutNodes = new Map(); // nodeId → {node, reason, filterType}

  // Step 1: Category/band-based node visibility
  for (const [id, node] of fullNodes) {
    let visible = false;
    if (node.type === "building") {
      const band = node.band || "lifestyle";
      visible = filterState.buildingCategories[band] !== false;
    } else {
      visible = filterState.resourceCategories[node.category] !== false;
    }
    if (visible) {
      visibleNodeIds.add(id);
      nodes.set(id, node);
    } else {
      const label = node.type === "building" ? (node.band || "lifestyle") : node.category;
      filteredOutNodes.set(id, { node, reason: `Category hidden: ${label}`, filterType: "category" });
    }
  }

  // Step 1b: Focus mode — restrict to upstream/downstream chain
  if (filterState.focusMode) {
    const { targetId, upstreamDepth, downstreamDepth } = filterState.focusMode;
    const chainIds = computeFocusChain(targetId, upstreamDepth, downstreamDepth, fullNodes, fullEdges);
    // Remove nodes not in the focus chain
    for (const id of [...visibleNodeIds]) {
      if (!chainIds.has(id)) {
        const node = nodes.get(id);
        nodes.delete(id);
        visibleNodeIds.delete(id);
        if (node) filteredOutNodes.set(id, { node, reason: "Outside focus chain", filterType: "focus" });
      }
    }
  }

  // Snapshot category-visible ids before bought/ignored removal (used for orphan pruning baseline)
  const categoryVisibleIds = new Set(visibleNodeIds);

  // Step 2: Hide ignored resources
  const ignoredResources = new Set();
  for (const [id, state] of filterState.resourceStates) {
    if (state === "ignored") {
      ignoredResources.add(id);
      nodes.delete(id);
      visibleNodeIds.delete(id);
      const node = fullNodes.get(id);
      if (node) filteredOutNodes.set(id, { node, reason: "Ignored", filterType: "ignored" });
    }
  }

  // Step 2b: Hide buildings that require an ignored resource for construction
  if (ignoredResources.size > 0) {
    for (const [id, node] of [...nodes]) {
      if (node.type !== "building" || !node.constructionCosts) continue;
      const ignoredRes = node.constructionCosts.find(c => ignoredResources.has(c.resource));
      if (ignoredRes) {
        nodes.delete(id);
        visibleNodeIds.delete(id);
        const resName = fullNodes.get(ignoredRes.resource)?.name || ignoredRes.resource;
        filteredOutNodes.set(id, { node, reason: `Requires ignored resource: ${resName}`, filterType: "cascaded" });
      }
    }
  }

  // Step 3: Recipe suppression for ignored resources
  // Find all recipeIds that involve any ignored resource, then suppress all edges of those recipes
  const suppressedRecipeIds = new Set();
  if (ignoredResources.size > 0) {
    for (const e of fullEdges) {
      if (!e.recipeId) continue; // construction/upgrade edges have no recipeId
      if (ignoredResources.has(e.from) || ignoredResources.has(e.to)) {
        suppressedRecipeIds.add(e.recipeId);
      }
    }
  }

  // Step 3b: Recipe plan suppression (user-disabled recipes with weight=0)
  for (const [recipeId, weight] of filterState.recipeStates) {
    if (weight === 0) {
      suppressedRecipeIds.add(recipeId);
    }
  }

  // Step 4: Filter edges
  const boughtSet = new Set();
  for (const [id, state] of filterState.resourceStates) {
    if (state === "bought") boughtSet.add(id);
  }

  // Find recipes where ALL outputs go to bought resources — suppress entire recipe
  if (boughtSet.size > 0) {
    // Collect output targets per recipe
    const recipeOutputs = new Map(); // recipeId → [resourceId, ...]
    for (const e of fullEdges) {
      if (e.recipeId && e.direction === "output") {
        if (!recipeOutputs.has(e.recipeId)) recipeOutputs.set(e.recipeId, []);
        recipeOutputs.get(e.recipeId).push(e.to);
      }
    }
    for (const [recipeId, outputs] of recipeOutputs) {
      if (outputs.length > 0 && outputs.every(r => boughtSet.has(r))) {
        suppressedRecipeIds.add(recipeId);
      }
    }
  }

  const visibleDirs = getVisibleDirections();
  const edges = fullEdges.filter(e => {
    if (!visibleNodeIds.has(e.from) || !visibleNodeIds.has(e.to)) return false;
    if (!visibleDirs.has(e.direction)) return false;

    // Recipe suppression for ignored/bought resources
    if (e.recipeId && suppressedRecipeIds.has(e.recipeId)) return false;

    return true;
  });

  // Step 5: Orphan pruning (buildings that lost all edges due to bought/ignored/weight suppression)
  // Only prune when recipe edges are visible (production/all mode). In construction/upgrade mode,
  // buildings stay visible since they have visible cost edges.
  const shouldPrune = filterState.edgeMode === "production" || filterState.edgeMode === "all";
  if (shouldPrune && (boughtSet.size > 0 || ignoredResources.size > 0 || suppressedRecipeIds.size > 0)) {
    // Count original production edges per building (before bought/ignored suppression)
    // Uses categoryVisibleIds (before Step 2 removed ignored resources) as baseline
    const origEdgesPerBuilding = new Map();
    for (const e of fullEdges) {
      if (!categoryVisibleIds.has(e.from) || !categoryVisibleIds.has(e.to)) continue;
      if (e.direction === "construction" || e.direction === "upgrade") continue;
      const fromNode = fullNodes.get(e.from);
      const toNode = fullNodes.get(e.to);
      if (fromNode && fromNode.type === "building") {
        origEdgesPerBuilding.set(e.from, (origEdgesPerBuilding.get(e.from) || 0) + 1);
      }
      if (toNode && toNode.type === "building") {
        origEdgesPerBuilding.set(e.to, (origEdgesPerBuilding.get(e.to) || 0) + 1);
      }
    }

    // Count remaining edges per building (after suppression)
    const remainingEdgesPerBuilding = new Map();
    for (const e of edges) {
      const fromNode = fullNodes.get(e.from);
      const toNode = fullNodes.get(e.to);
      if (fromNode && fromNode.type === "building") {
        remainingEdgesPerBuilding.set(e.from, (remainingEdgesPerBuilding.get(e.from) || 0) + 1);
      }
      if (toNode && toNode.type === "building") {
        remainingEdgesPerBuilding.set(e.to, (remainingEdgesPerBuilding.get(e.to) || 0) + 1);
      }
    }

    // Prune buildings that originally had production edges but now have zero remaining
    const toPrune = new Set();
    for (const [bldId, origCount] of origEdgesPerBuilding) {
      if (!visibleNodeIds.has(bldId)) continue;
      if (origCount > 0 && (remainingEdgesPerBuilding.get(bldId) || 0) === 0) {
        toPrune.add(bldId);
      }
    }

    if (toPrune.size > 0) {
      for (const id of toPrune) {
        const node = nodes.get(id);
        nodes.delete(id);
        visibleNodeIds.delete(id);
        if (node) filteredOutNodes.set(id, { node, reason: "Orphaned: all recipes suppressed", filterType: "orphaned" });
      }
      // Re-filter edges to remove any pointing to pruned buildings
      const prunedEdges = edges.filter(e => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to));
      edges.length = 0;
      edges.push(...prunedEdges);
    }

    // Always run resource orphan pruning (catches resources orphaned by recipe suppression
    // even when no buildings were fully pruned)
    pruneOrphanResources(fullNodes, fullEdges, nodes, visibleNodeIds, edges, boughtSet, ignoredResources, filteredOutNodes);
  }

  // Step 5b: Edge collapsing through hidden resources (Feature 2)
  // When showFiltered is OFF and resource categories are hidden, create synthetic edges
  if (!filterState.showFiltered) {
    for (const [resId, info] of filteredOutNodes) {
      if (info.filterType !== "category" || info.node.type !== "resource") continue;

      // Find producer buildings: edges where output goes TO this resource
      const producers = [];
      for (const e of fullEdges) {
        if (e.to === resId && e.direction === "output" && visibleNodeIds.has(e.from) && !suppressedRecipeIds.has(e.recipeId)) {
          producers.push(e.from);
        }
      }

      // Find consumer buildings: edges where input comes FROM this resource
      const consumers = [];
      for (const e of fullEdges) {
        if (e.from === resId && e.direction === "input" && visibleNodeIds.has(e.to) && !suppressedRecipeIds.has(e.recipeId)) {
          consumers.push(e.to);
        }
      }

      // Create synthetic edges for each (producer, consumer) pair
      const resName = info.node.name || resId;
      for (const prod of producers) {
        for (const cons of consumers) {
          if (prod === cons) continue; // skip self-loops
          edges.push({
            from: prod,
            to: cons,
            recipe: `via ${resName}`,
            amount: null,
            direction: "synthetic",
            syntheticVia: resId,
          });
        }
      }
    }
  }

  // Step 5c: Focus mode edge-mode pruning
  // When in focus mode, hide nodes whose chain edges are all invisible under the current edge mode.
  // The focus target itself is always kept.
  if (filterState.focusMode) {
    const focusTarget = filterState.focusMode.targetId;
    const connectedInFocus = new Set();
    for (const e of edges) {
      connectedInFocus.add(e.from);
      connectedInFocus.add(e.to);
    }
    const toRemove = [];
    for (const id of visibleNodeIds) {
      if (id === focusTarget) continue;
      if (!connectedInFocus.has(id)) toRemove.push(id);
    }
    for (const id of toRemove) {
      const node = nodes.get(id);
      nodes.delete(id);
      visibleNodeIds.delete(id);
      if (node) filteredOutNodes.set(id, { node, reason: "No visible edges in focus", filterType: "focus" });
    }
    // Re-filter edges for pruned nodes
    if (toRemove.length > 0) {
      const kept = edges.filter(e => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to));
      edges.length = 0;
      edges.push(...kept);
    }
  }

  // Step 6: Layout edges
  const layoutEdges = fullEdges.filter(e => {
    if (!visibleNodeIds.has(e.from) || !visibleNodeIds.has(e.to)) return false;
    if (e.direction === "upgrade") return false;
    if (e.direction === "construction") {
      const target = fullNodes.get(e.to);
      if (target && target.band === "production") return false;
    }
    // Recipe suppression applies to layout too (covers both ignored and bought)
    if (e.recipeId && suppressedRecipeIds.has(e.recipeId)) return false;
    return true;
  });

  // Also include synthetic edges in layout
  const syntheticEdges = edges.filter(e => e.direction === "synthetic");
  layoutEdges.push(...syntheticEdges);

  // Collect filtered-out edges (edges where at least one endpoint is filtered)
  const filteredOutEdges = fullEdges.filter(e => {
    if (visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to)) return false;
    // At least one endpoint is in filteredOutNodes
    if (filteredOutNodes.has(e.from) || filteredOutNodes.has(e.to)) return true;
    return false;
  });

  return { nodes, edges, layoutEdges, filteredOutNodes, filteredOutEdges };
}

/**
 * Recursively prune resources that lost all edges due to cascading.
 * Only prunes resources that originally had edges (not base/raw resources with zero edges).
 */
function pruneOrphanResources(fullNodes, fullEdges, nodes, visibleNodeIds, edges, boughtSet, ignoredResources, filteredOutNodes) {
  // Don't prune bought resources — they stay visible
  const resourceIds = new Set();
  for (const [id, node] of nodes) {
    if (node.type === "resource" && !boughtSet.has(id) && !ignoredResources.has(id)) {
      resourceIds.add(id);
    }
  }

  // Check which of these resources still have visible edges
  const connectedResources = new Set();
  for (const e of edges) {
    if (resourceIds.has(e.from)) connectedResources.add(e.from);
    if (resourceIds.has(e.to)) connectedResources.add(e.to);
  }

  // Find resources that had edges originally but now don't
  const toPrune = new Set();
  for (const resId of resourceIds) {
    if (connectedResources.has(resId)) continue;
    const hadEdges = fullEdges.some(e =>
      (e.from === resId || e.to === resId) &&
      e.direction !== "construction" && e.direction !== "upgrade"
    );
    if (hadEdges) {
      toPrune.add(resId);
    }
  }

  if (toPrune.size > 0) {
    for (const id of toPrune) {
      const node = nodes.get(id);
      nodes.delete(id);
      visibleNodeIds.delete(id);
      if (node && filteredOutNodes) {
        filteredOutNodes.set(id, { node, reason: "Orphaned: all recipes suppressed", filterType: "orphaned" });
      }
    }
    const kept = edges.filter(e => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to));
    edges.length = 0;
    edges.push(...kept);
  }
}

/**
 * BFS to find all nodes in the upstream/downstream chain from a target node.
 * Edge-following rules vary by direction and distance from target:
 * - Primary target (first hop): follow ALL edge types both directions
 * - Upstream (beyond first hop): only follow input/output (production chain)
 * - Downstream: always follow input/output + construction/upgrade + equipment/ammo/sacrifice
 * @param {string} targetId
 * @param {number} upstreamDepth - max logical hops upstream (Infinity = full chain)
 * @param {number} downstreamDepth - max logical hops downstream
 * @param {Map<string, Object>} fullNodes
 * @param {import('../types.js').GraphEdge[]} fullEdges
 * @returns {Set<string>} - set of node IDs in the chain
 */
function computeFocusChain(targetId, upstreamDepth, downstreamDepth, fullNodes, fullEdges) {
  const chainIds = new Set([targetId]);
  const allDirs = new Set(["input", "output", "construction", "upgrade", "equipment", "ammo", "sacrifice", "area"]);
  const prodOnly = new Set(["input", "output"]);
  const downDirs = new Set(["input", "output", "construction", "upgrade", "equipment", "ammo", "sacrifice", "area"]);

  // Build adjacency storing direction so BFS can filter by edge type
  const outgoing = new Map(); // nodeId → [{to, direction}]
  const incoming = new Map(); // nodeId → [{from, direction}]
  for (const e of fullEdges) {
    if (!allDirs.has(e.direction)) continue;
    if (!outgoing.has(e.from)) outgoing.set(e.from, []);
    outgoing.get(e.from).push({ to: e.to, direction: e.direction });
    if (!incoming.has(e.to)) incoming.set(e.to, []);
    incoming.get(e.to).push({ from: e.from, direction: e.direction });
  }

  // BFS upstream (follow incoming edges: what does this node need?)
  // Primary (rawDist===0): follow all edge types; beyond: only input/output
  // Logical distance: resource→building→resource = 1 logical hop
  const upQueue = [[targetId, 0]]; // [nodeId, rawDist]
  const upVisited = new Map([[targetId, 0]]);
  while (upQueue.length > 0) {
    const [cur, rawDist] = upQueue.shift();
    const logDist = Math.ceil(rawDist / 2);
    if (logDist >= upstreamDepth) continue;
    const allowedDirs = rawDist === 0 ? allDirs : prodOnly;
    for (const e of incoming.get(cur) || []) {
      if (!allowedDirs.has(e.direction)) continue;
      if (upVisited.has(e.from)) continue;
      const nextRaw = rawDist + 1;
      upVisited.set(e.from, nextRaw);
      chainIds.add(e.from);
      upQueue.push([e.from, nextRaw]);
    }
  }

  // BFS downstream (follow outgoing edges: who uses this node's output?)
  // Always follow input/output + construction/upgrade + equipment/ammo/sacrifice
  const downQueue = [[targetId, 0]];
  const downVisited = new Map([[targetId, 0]]);
  while (downQueue.length > 0) {
    const [cur, rawDist] = downQueue.shift();
    const logDist = Math.ceil(rawDist / 2);
    if (logDist >= downstreamDepth) continue;
    for (const e of outgoing.get(cur) || []) {
      if (!downDirs.has(e.direction)) continue;
      if (downVisited.has(e.to)) continue;
      const nextRaw = rawDist + 1;
      downVisited.set(e.to, nextRaw);
      chainIds.add(e.to);
      downQueue.push([e.to, nextRaw]);
    }
  }

  return chainIds;
}

// ── DOM helpers ──

function el(tag, className) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function elText(tag, text, className) {
  const e = el(tag, className);
  e.textContent = text;
  return e;
}

function buildCategoryRow(cat, count, color, checked, onChange) {
  const row = el("label", "filter-cat-row");
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = checked;
  cb.addEventListener("change", () => onChange(cb.checked));
  row.appendChild(cb);

  const swatch = el("span", "cat-swatch");
  swatch.style.backgroundColor = color;
  row.appendChild(swatch);

  // Category name
  row.appendChild(elText("span", capitalize(cat), ""));

  // Count badge (right-aligned)
  if (count !== "") {
    row.appendChild(elText("span", String(count), "cat-count"));
  }

  return row;
}
