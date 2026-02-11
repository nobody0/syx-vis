// @ts-nocheck — DOM-heavy module, excluded from tsc
// Per-tab contextual help system

const TAB_TITLES = {
  graph: "Graph",
  population: "Population Needs",
  upkeep: "Building Upkeep",
  balancing: "Production Balancing",
  planner: "Room Planner",
};

const HELP_CONTENT = {
  graph() {
    return `
      <div class="help-description">
        Explore the full production chain of Songs of Syx &mdash; see what every building needs and produces at a glance.
      </div>
      <div class="help-description" style="margin-top:12px">
        <strong>The Layout</strong><br>
        The graph reads left to right: basic resources and extraction on the left, advanced production on the right.
        Rows are grouped into bands &mdash; materials at the top, civilian and services in the middle, military at the bottom.
        Basic resources and extraction buildings appear on the left, advanced production chains on the right.
      </div>
      <div class="help-getting-started" style="margin-top:14px">
        <div class="help-section-label">Getting Started</div>
        <table class="shortcut-table">
          <tr>
            <td style="width:1%;padding-right:12px"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#5a9eff;box-shadow:0 0 3px rgba(0,0,0,0.4);vertical-align:middle"></span></td>
            <td><strong style="color:var(--text-primary)">Circle = Resource</strong> (colored by category: material, food, drink, military)</td>
          </tr>
          <tr>
            <td><span style="display:inline-block;width:14px;height:10px;border-radius:2px;background:#d88848;box-shadow:0 0 3px rgba(0,0,0,0.4);vertical-align:middle"></span></td>
            <td><strong style="color:var(--text-primary)">Rectangle = Building</strong> (colored by category: extraction, crafting, service, ...)</td>
          </tr>
          <tr><td></td><td>Click a node to see details, recipes, and supply chain</td></tr>
          <tr><td></td><td>Hover an edge to see per-worker-per-day rates</td></tr>
        </table>
      </div>
      <div class="help-section-label" style="margin-top:16px">Edge Modes</div>
      <table class="shortcut-table">
        <tr><td class="shortcut-key"><kbd>1</kbd></td><td>Production &mdash; resource input/output flows</td></tr>
        <tr><td class="shortcut-key"><kbd>2</kbd></td><td>Construction &mdash; building material costs</td></tr>
        <tr><td class="shortcut-key"><kbd>3</kbd></td><td>Upgrade &mdash; upgrade material costs</td></tr>
        <tr><td class="shortcut-key"><kbd>4</kbd></td><td>All &mdash; every edge type at once</td></tr>
      </table>
      <div class="help-description" style="margin-top:14px">
        <strong>City Mode</strong><br>
        Track your settlement's production chain. Click a building and mark it <strong>Built</strong> &mdash; its recipe outputs gain a green ring showing they're available.
        Click a resource and mark it <strong>Bought</strong> to hide its upstream producers (you're importing it via trade).
        Use the city selector in the header to manage multiple settlement profiles.
      </div>
      <div class="help-section-label" style="margin-top:16px">Shortcuts</div>
      <table class="shortcut-table">
        <tr><td class="shortcut-key"><kbd>Ctrl+F</kbd></td><td>Search nodes</td></tr>
        <tr><td class="shortcut-key"><kbd>F</kbd></td><td>Focus on selected node</td></tr>
        <tr><td class="shortcut-key"><kbd>Esc</kbd></td><td>Exit focus / deselect</td></tr>
        <tr><td class="shortcut-key"><kbd>Alt+1</kbd>&ndash;<kbd>5</kbd></td><td>Switch tabs</td></tr>
        <tr><td class="shortcut-key"><kbd>?</kbd></td><td>This help</td></tr>
      </table>`;
  },

  population() {
    return `
      <div class="help-description">
        Per-capita consumption rates and species data extracted from game files. Shows equipment wear rates,
        need fulfillment, food/drink preferences by species, and military supply overrides.
        Still a work in progress &mdash; more features coming.
      </div>`;
  },

  upkeep() {
    return `
      <div class="help-description">
        Buildings with value degradation consume construction materials over time to maintain their value.
        Shows annual maintenance costs (construction cost &times; degrade rate).
        Still a work in progress &mdash; more features coming.
      </div>`;
  },

  balancing() {
    return `
      <div class="help-description">
        Calculate how many workers and buildings you need to produce a target resource at a given rate.
        Traces the full upstream chain and respects recipe weights from the Graph tab's filter panel.
        Still a work in progress &mdash; more features coming.
      </div>`;
  },

  planner() {
    return `
      <div class="help-description">
        Design and optimize room layouts for any building. Select a building from the dropdown,
        draw the room shape, then place furniture from the palette.
      </div>
      <div class="help-section-label" style="margin-top:14px">Controls</div>
      <table class="shortcut-table">
        <tr><td class="shortcut-key"><kbd>D</kbd></td><td>Draw room tiles</td></tr>
        <tr><td class="shortcut-key"><kbd>E</kbd></td><td>Erase room tiles</td></tr>
        <tr><td class="shortcut-key"><kbd>W</kbd></td><td>Toggle door placement</td></tr>
        <tr><td class="shortcut-key"><kbd>R</kbd></td><td>Rotate furniture</td></tr>
        <tr><td class="shortcut-key"><kbd>V</kbd></td><td>Toggle sprite view</td></tr>
        <tr><td class="shortcut-key"><kbd>Ctrl+Z</kbd></td><td>Undo</td></tr>
      </table>
      <div class="help-section-label" style="margin-top:14px">Mouse</div>
      <table class="shortcut-table">
        <tr><td class="shortcut-key">Click</td><td>Place furniture / paint tiles</td></tr>
        <tr><td class="shortcut-key">Shift+Click</td><td>Remove furniture</td></tr>
        <tr><td class="shortcut-key">Ctrl+Click</td><td>Copy furniture under cursor</td></tr>
        <tr><td class="shortcut-key">Drag</td><td>Move placed furniture</td></tr>
      </table>
      <div class="help-description" style="margin-top:14px">
        <strong>Auto-Optimize</strong><br>
        Fills the room with furniture to maximize stats (employees, services, efficiency).
        Draw or import a room shape, then click <strong>Auto-Optimize</strong>. The result is undoable with Ctrl+Z.
      </div>
      <div class="help-description" style="margin-top:10px">
        <strong>Sharing</strong><br>
        <strong>Copy Link</strong> generates a shareable URL encoding the full room &mdash; building, shape, doors, and furniture.
        Anyone with the link sees your exact layout.
      </div>
      <div class="help-description" style="margin-top:10px">
        <strong>Blueprints</strong><br>
        <strong>Save</strong> stores layouts in your browser. The blueprint manager can <strong>import</strong> from
        the game's <code>SavedPrints.txt</code> and <strong>export</strong> back to game format &mdash; design here,
        use in Songs of Syx.
      </div>`;
  },
};

let overlay = null;

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.className = "shortcut-overlay";
  overlay.innerHTML = `
    <div class="shortcut-modal">
      <div class="shortcut-modal-header">
        <span class="help-modal-title">Help</span>
        <button class="shortcut-close">\u00D7</button>
      </div>
      <div class="help-modal-body"></div>
    </div>`;
  document.body.appendChild(overlay);

  // Close on backdrop click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) toggleHelp();
  });
  // Close button
  overlay.querySelector(".shortcut-close").addEventListener("click", toggleHelp);

  return overlay;
}

function getActiveTab() {
  const active = document.querySelector("#tab-bar .tab.active");
  return active ? active.dataset.tab : "graph";
}

function toggleHelp() {
  const el = ensureOverlay();
  const isVisible = el.classList.contains("visible");

  if (!isVisible) {
    // Update content for current tab
    const tab = getActiveTab();
    const title = TAB_TITLES[tab] || "Help";
    const contentFn = HELP_CONTENT[tab];
    el.querySelector(".help-modal-title").textContent = title;
    const body = contentFn ? contentFn() : "";
    const footer = `<div class="help-footer" style="margin-top:18px;padding-top:12px;border-top:1px solid var(--border-subtle);font-size:12px;color:var(--text-muted)">
      Found a bug or have a suggestion? <a href="https://github.com/nobody0/syx-vis/issues" target="_blank" rel="noopener" style="color:var(--accent-gold)">Report it on GitHub</a>.
    </div>`;
    el.querySelector(".help-modal-body").innerHTML = body + footer;
  }

  el.classList.toggle("visible");
}

export function initHelp() {
  // ? key
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === "?") {
      e.preventDefault();
      toggleHelp();
    }
  });

  // Escape closes modal (with stopPropagation so graph doesn't deselect)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay && overlay.classList.contains("visible")) {
      e.stopPropagation();
      toggleHelp();
    }
  });

  // Help button in header
  const helpBtn = document.getElementById("help-btn");
  if (helpBtn) helpBtn.addEventListener("click", toggleHelp);
}
