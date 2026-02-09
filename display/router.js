// Hash-based URL router for tab navigation + shareable room plans

const VALID_TABS = new Set(["graph", "population", "upkeep", "balancing", "planner"]);

/** @type {((tabId: string) => void)|null} */
let _switchTab = null;
/** @type {((encoded: string) => void)|null} */
let _restorePlan = null;

/**
 * Parse the current hash into {tab, planData}.
 * @returns {{ tab: string, planData: string|null }}
 */
function parseHash() {
  const raw = location.hash.replace(/^#/, "");
  if (!raw) return { tab: "graph", planData: null };

  const slash = raw.indexOf("/");
  const tab = slash >= 0 ? raw.slice(0, slash) : raw;
  const rest = slash >= 0 ? raw.slice(slash + 1) : null;

  if (!VALID_TABS.has(tab)) return { tab: "graph", planData: null };
  return { tab, planData: tab === "planner" && rest ? rest : null };
}

/** Handle hash changes (back/forward, manual edits). */
function onHashChange() {
  const { tab, planData } = parseHash();
  if (_switchTab) _switchTab(tab);
  if (planData && _restorePlan) _restorePlan(planData);
}

/**
 * Initialize the router. Call once after tabs are set up.
 * @param {(tabId: string) => void} switchTab
 * @param {(encoded: string) => void} restorePlan
 */
export function initRouter(switchTab, restorePlan) {
  _switchTab = switchTab;
  _restorePlan = restorePlan;

  window.addEventListener("hashchange", onHashChange);

  // Apply initial hash on page load
  const { tab, planData } = parseHash();
  if (tab !== "graph" || planData) {
    switchTab(tab);
    if (planData) restorePlan(planData);
  }
}

/**
 * Push a tab route to the URL (creates history entry for back button).
 * Called on user-initiated tab switches.
 * @param {string} tabId
 */
export function pushTabRoute(tabId) {
  const target = tabId === "graph" ? "" : `#${tabId}`;
  if (location.hash !== target && !(target === "" && !location.hash)) {
    history.pushState(null, "", target || location.pathname);
  }
}

/**
 * Replace the planner route with encoded state (no history entry).
 * Called by planner.js after its own debounce.
 * @param {string} encoded
 */
export function replacePlannerRoute(encoded) {
  history.replaceState(null, "", `#planner/${encoded}`);
}

/**
 * Reset to bare #planner (on Clear All, building change, grid resize).
 */
export function clearPlannerRoute() {
  history.replaceState(null, "", "#planner");
}
