// @ts-nocheck — DOM-heavy module, excluded from tsc
// Per-tab contextual help system

const TAB_TITLES = {
  graph: "Graph",
  population: "Population Needs",
  upkeep: "Building Upkeep",
  balancing: "Production Balancing",
  planner: "Room Planner",
};

// Help content is stored as static HTML in index.html (crawlable by search engines).
// Each tab has a hidden <div id="help-{tab}"> element whose innerHTML we read at runtime.
function getHelpContent(tab) {
  const src = document.getElementById("help-" + tab);
  return src ? src.innerHTML : "";
}

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
    el.querySelector(".help-modal-title").textContent = title;
    const body = getHelpContent(tab);
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
