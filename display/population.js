// Population Needs tab — equipment wear rates + need fulfillment tables + species awareness
import { equipment } from "../data/equipment.js";
import { needs } from "../data/needs.js";
import { buildings } from "../data/buildings.js";
import { races } from "../data/races.js";
import { capitalize } from "./config.js";
import { createAutocomplete } from "./filters.js";

export function renderPopulation(container) {
  buildPopulationContent(container, null);
}

function buildPopulationContent(container, selectedSpeciesId) {
  const selectedSpecies = selectedSpeciesId
    ? races.find(r => r.id === selectedSpeciesId)
    : null;

  const html = [];
  html.push(`<div class="calc-content">`);
  html.push(`<h2>Population Needs</h2>`);
  html.push(`<p>Per-capita consumption rates extracted from game data. Equipment degrades at a fixed daily rate; needs drive demand for service buildings.</p>`);

  // ── Species Comparison Matrix ──
  html.push(buildSpeciesComparisonMatrix());

  // ── Species Selector ──
  html.push(`<div class="calc-controls">`);
  html.push(`<label>Species:</label>`);
  html.push(`<span id="species-select-wrap"></span>`);
  html.push(`</div>`);

  // ── Food/Drink Preferences (species-specific) ──
  if (selectedSpecies) {
    html.push(`<h3>${selectedSpecies.name} — Food & Drink Preferences</h3>`);
    html.push(`<table class="calc-table">`);
    html.push(`<thead><tr><th>Type</th><th>Preferred</th></tr></thead><tbody>`);

    const foodList = (selectedSpecies.preferredFood || []).map(f =>
      f === "*" ? "All foods" : formatResourceName(f)
    ).join(", ") || "None specified";
    html.push(`<tr><td><strong>Food</strong></td><td>${foodList}</td></tr>`);

    const drinkList = (selectedSpecies.preferredDrink || []).map(f =>
      f === "*" ? "All drinks" : formatResourceName(f)
    ).join(", ") || "None specified";
    html.push(`<tr><td><strong>Drink</strong></td><td>${drinkList}</td></tr>`);

    html.push(`</tbody></table>`);

    // Military supply overrides
    if (selectedSpecies.militarySupplyUse) {
      html.push(`<h3>${selectedSpecies.name} — Military Supply Overrides</h3>`);
      html.push(`<table class="calc-table">`);
      html.push(`<thead><tr><th>Resource</th><th style="text-align:right">Multiplier</th><th>Effect</th></tr></thead><tbody>`);
      for (const [res, mult] of Object.entries(selectedSpecies.militarySupplyUse)) {
        const effect = mult === 0 ? "No consumption" : `${mult}x normal`;
        const cls = mult === 0 ? ' style="color:var(--state-ignored)"' : "";
        html.push(`<tr><td>${formatResourceName(res)}</td><td class="num">${mult}</td><td${cls}>${effect}</td></tr>`);
      }
      html.push(`</tbody></table>`);
    }

    // Population traits
    if (selectedSpecies.population) {
      html.push(`<h3>${selectedSpecies.name} — Population</h3>`);
      html.push(`<table class="calc-table">`);
      html.push(`<thead><tr><th>Trait</th><th style="text-align:right">Value</th></tr></thead><tbody>`);
      const pop = selectedSpecies.population;
      if (pop.max != null) html.push(`<tr><td>Max population multiplier</td><td class="num">${pop.max}</td></tr>`);
      if (pop.growth != null) html.push(`<tr><td>Growth rate</td><td class="num">${pop.growth}</td></tr>`);
      if (pop.immigrationRate != null) html.push(`<tr><td>Immigration rate</td><td class="num">${pop.immigrationRate}</td></tr>`);
      if (pop.climate) {
        for (const [k, v] of Object.entries(pop.climate)) {
          html.push(`<tr><td>Climate: ${capitalize(k.toLowerCase())}</td><td class="num">${v}</td></tr>`);
        }
      }
      if (pop.terrain) {
        for (const [k, v] of Object.entries(pop.terrain)) {
          html.push(`<tr><td>Terrain: ${capitalize(k.toLowerCase())}</td><td class="num">${v}</td></tr>`);
        }
      }
      html.push(`</tbody></table>`);
    }
  }

  // ── Equipment Consumption ──
  html.push(`<h3>Equipment Consumption</h3>`);
  html.push(`<table class="calc-table">`);

  const hasSpecies = !!selectedSpecies;
  const disabledSet = new Set(selectedSpecies?.equipmentDisabled || []);
  const allDisabled = disabledSet.has("*");

  html.push(`<thead><tr>
    <th>Equipment</th>
    <th>Resource</th>
    <th>Type</th>
    <th style="text-align:right">Wear Rate (/day)</th>
    <th style="text-align:right">Max per person</th>
    ${hasSpecies ? '<th>Status</th>' : ''}
  </tr></thead><tbody>`);

  // Group by type
  const typeOrder = ["civic", "battle", "ranged"];
  const grouped = new Map();
  for (const eq of equipment) {
    if (!grouped.has(eq.type)) grouped.set(eq.type, []);
    grouped.get(eq.type).push(eq);
  }

  for (const type of typeOrder) {
    const items = grouped.get(type);
    if (!items) continue;
    html.push(`<tr class="group-header"><td colspan="${hasSpecies ? 6 : 5}">${capitalize(type)}</td></tr>`);
    for (const eq of items) {
      const resName = formatResourceName(eq.resource);
      const isDisabled = allDisabled || disabledSet.has(eq.id);
      const rowClass = isDisabled ? ' class="equip-disabled"' : "";
      const statusCell = hasSpecies
        ? `<td>${isDisabled ? '<span style="color:var(--state-ignored)">Disabled</span>' : '<span style="color:var(--state-produced)">Available</span>'}</td>`
        : "";
      html.push(`<tr${rowClass}>
        <td>${capitalize(eq.id.replace(/_/g, " "))}</td>
        <td><span class="resource-name"><img src="data/icons/${eq.resource}.png" alt="">${resName}</span></td>
        <td>${capitalize(eq.type)}</td>
        <td class="num">${eq.wearRate}</td>
        <td class="num">${eq.maxAmount}</td>
        ${statusCell}
      </tr>`);
    }
  }

  html.push(`</tbody></table>`);
  html.push(`<div class="note">Wear rate is the fraction of one unit consumed per person per day. A wear rate of 0.25 means each person consumes 0.25 units/day when fully equipped.</div>`);

  // ── Need Fulfillment ──
  html.push(`<h3>Need Fulfillment</h3>`);
  html.push(`<table class="calc-table">`);
  html.push(`<thead><tr>
    <th>Need</th>
    <th style="text-align:right">Base Rate (/day)</th>
    ${hasSpecies ? '<th style="text-align:right">Species Rate</th>' : ''}
    <th style="text-align:right">Event Size</th>
    <th>Service Buildings</th>
  </tr></thead><tbody>`);

  // Build need → buildings lookup
  const needBuildings = new Map();
  for (const b of buildings) {
    if (b.need) {
      const needId = b.need.toLowerCase();
      if (!needBuildings.has(needId)) needBuildings.set(needId, []);
      needBuildings.get(needId).push(b.name);
    }
  }

  const rateMultipliers = selectedSpecies?.needRateMultipliers || {};

  for (const need of needs) {
    const serviceList = needBuildings.get(need.id) || [];
    const mult = rateMultipliers[need.id];
    const hasOverride = mult != null && mult !== 1;
    const speciesRate = mult != null ? need.rate * mult : need.rate;
    const rateClass = hasOverride ? (mult > 1 ? "rate-increased" : "rate-decreased") : "";

    html.push(`<tr>
      <td><strong>${need.name}</strong><br><span style="color:var(--text-muted);font-size:11px">${need.rateName}</span></td>
      <td class="num">${need.rate}</td>
      ${hasSpecies ? `<td class="num ${rateClass}">${formatNum(speciesRate)}${hasOverride ? ` (${mult}x)` : ''}</td>` : ''}
      <td class="num">${need.event || "\u2014"}</td>
      <td>${serviceList.length > 0 ? serviceList.join(", ") : `<span style="color:var(--text-muted);font-style:italic">none linked</span>`}</td>
    </tr>`);
  }

  html.push(`</tbody></table>`);
  html.push(`<div class="note">Rate is the per-capita daily consumption of the need. Event size indicates how many people attend a single service event (arenas, speakers, stages).${hasSpecies ? ` Species rates show ${selectedSpecies.name}-specific multipliers applied to the base rate.` : ''}</div>`);

  html.push(`</div>`);
  container.innerHTML = html.join("\n");

  // Wire up species autocomplete
  const acWrap = container.querySelector("#species-select-wrap");
  if (acWrap) {
    const speciesItems = [
      { id: "", name: "All Species (universal rates)", type: "species", category: "all" },
      ...races.map(r => ({
        id: r.id,
        name: r.name + (r.playable ? "" : " (NPC)"),
        type: "species",
        category: r.playable ? "playable" : "npc",
      })),
    ];
    const ac = createAutocomplete(acWrap, speciesItems, (id) => {
      buildPopulationContent(container, id || null);
    }, { placeholder: "Search species...", keepValue: true, showAllOnEmpty: true });
    // Pre-fill with current selection
    if (selectedSpecies) {
      ac.input.value = selectedSpecies.name;
    } else {
      ac.input.value = "All Species (universal rates)";
    }
  }
}

// ── Species Comparison Matrix ────────────────────────────────

/** @returns {string} CSS class for climate/terrain heatmap value */
function heatClass(v) {
  if (v == null) return "";
  if (v >= 1.0) return "matrix-heat-good";
  if (v >= 0.5) return "matrix-heat-moderate";
  if (v >= 0.2) return "matrix-heat-poor";
  return "matrix-heat-bad";
}

/** @returns {string} CSS class for need rate multiplier */
function needClass(mult) {
  if (mult == null || mult === 1) return "";
  return mult < 1 ? "matrix-need-reduced" : "matrix-need-increased";
}

/** Format a heatmap value cell */
function heatCell(v) {
  if (v == null) return `<td class="matrix-cell matrix-na">\u2014</td>`;
  return `<td class="matrix-cell num ${heatClass(v)}">${v}</td>`;
}

/** Build the species comparison matrix HTML */
function buildSpeciesComparisonMatrix() {
  // Column order: playable alphabetical, then NPC alphabetical
  const playable = races.filter(r => r.playable).sort((a, b) => a.name.localeCompare(b.name));
  const npc = races.filter(r => !r.playable).sort((a, b) => a.name.localeCompare(b.name));
  const ordered = [...playable, ...npc];

  const html = [];
  html.push(`<div class="species-matrix-container">`);
  html.push(`<h3>Species Comparison</h3>`);
  html.push(`<div class="species-matrix-scroll">`);
  html.push(`<table class="species-matrix">`);

  // ── Header ──
  html.push(`<thead><tr><th class="matrix-row-label"></th>`);
  for (const r of ordered) {
    const cls = r.playable ? "" : " npc-species";
    html.push(`<th class="matrix-col-header${cls}">${r.name}</th>`);
  }
  html.push(`</tr></thead>`);

  html.push(`<tbody>`);

  // ── Section: Overview ──
  html.push(sectionHeader("Overview", ordered.length));

  // Max population
  html.push(`<tr><td class="matrix-row-label">Max pop</td>`);
  for (const r of ordered) {
    const v = r.population?.max;
    html.push(v != null ? `<td class="matrix-cell num">${v}</td>` : `<td class="matrix-cell matrix-na">\u2014</td>`);
  }
  html.push(`</tr>`);

  // Growth rate
  html.push(`<tr><td class="matrix-row-label">Growth rate</td>`);
  for (const r of ordered) {
    const v = r.population?.growth;
    html.push(v != null ? `<td class="matrix-cell num">${v}</td>` : `<td class="matrix-cell matrix-na">\u2014</td>`);
  }
  html.push(`</tr>`);

  // Immigration rate
  html.push(`<tr><td class="matrix-row-label">Immigration rate</td>`);
  for (const r of ordered) {
    const v = r.population?.immigrationRate;
    html.push(v != null ? `<td class="matrix-cell num">${v}</td>` : `<td class="matrix-cell matrix-na">\u2014</td>`);
  }
  html.push(`</tr>`);

  // ── Section: Food & Drink ──
  html.push(sectionHeader("Food & Drink", ordered.length));

  html.push(`<tr><td class="matrix-row-label">Preferred food</td>`);
  for (const r of ordered) {
    const foods = (r.preferredFood || []).map(f =>
      f === "*" ? `<span class="matrix-pref-all" title="All">All</span>`
        : `<img class="matrix-pref-icon" src="data/icons/${f}.png" alt="${formatResourceName(f)}" title="${formatResourceName(f)}">`
    ).join(" ");
    html.push(`<td class="matrix-cell matrix-pref-cell">${foods || "\u2014"}</td>`);
  }
  html.push(`</tr>`);

  html.push(`<tr><td class="matrix-row-label">Preferred drink</td>`);
  for (const r of ordered) {
    const drinks = (r.preferredDrink || []).map(f =>
      f === "*" ? `<span class="matrix-pref-all" title="All">All</span>`
        : `<img class="matrix-pref-icon" src="data/icons/${f}.png" alt="${formatResourceName(f)}" title="${formatResourceName(f)}">`
    ).join(" ");
    html.push(`<td class="matrix-cell matrix-pref-cell">${drinks || "\u2014"}</td>`);
  }
  html.push(`</tr>`);

  // ── Section: Climate ──
  html.push(sectionHeader("Climate", ordered.length));

  for (const climate of ["COLD", "TEMPERATE", "HOT"]) {
    html.push(`<tr><td class="matrix-row-label">${capitalize(climate.toLowerCase())}</td>`);
    for (const r of ordered) {
      const v = r.population?.climate?.[climate];
      html.push(heatCell(v));
    }
    html.push(`</tr>`);
  }

  // ── Section: Terrain ──
  html.push(sectionHeader("Terrain", ordered.length));

  // Collect all terrain keys across species
  const terrainKeys = [];
  const seenTerrain = new Set();
  for (const r of ordered) {
    if (r.population?.terrain) {
      for (const k of Object.keys(r.population.terrain)) {
        if (!seenTerrain.has(k)) {
          seenTerrain.add(k);
          terrainKeys.push(k);
        }
      }
    }
  }

  for (const terrain of terrainKeys) {
    html.push(`<tr><td class="matrix-row-label">${capitalize(terrain.toLowerCase())}</td>`);
    for (const r of ordered) {
      const v = r.population?.terrain?.[terrain];
      html.push(heatCell(v));
    }
    html.push(`</tr>`);
  }

  // ── Section: Need Rates ──
  html.push(sectionHeader("Need Rates", ordered.length));

  for (const need of needs) {
    html.push(`<tr><td class="matrix-row-label">${need.name} <span class="matrix-base-rate">${need.rate}/d</span></td>`);
    for (const r of ordered) {
      const mult = r.needRateMultipliers?.[need.id];
      const effective = need.rate * (mult != null ? mult : 1);
      const cls = needClass(mult);

      if (mult != null && mult <= 0.01) {
        html.push(`<td class="matrix-cell num matrix-need-reduced">~0</td>`);
      } else if (cls) {
        html.push(`<td class="matrix-cell num ${cls}">${formatNum(effective)}</td>`);
      } else {
        html.push(`<td class="matrix-cell num matrix-need-base">${formatNum(need.rate)}</td>`);
      }
    }
    html.push(`</tr>`);
  }

  // ── Section: Equipment ──
  html.push(sectionHeader("Equipment", ordered.length));

  const typeOrder = ["civic", "battle", "ranged"];
  const grouped = new Map();
  for (const eq of equipment) {
    if (!grouped.has(eq.type)) grouped.set(eq.type, []);
    grouped.get(eq.type).push(eq);
  }

  for (const type of typeOrder) {
    const items = grouped.get(type);
    if (!items) continue;
    for (const eq of items) {
      const eqName = capitalize(eq.id.replace(/_/g, " "));
      html.push(`<tr><td class="matrix-row-label">${eqName}</td>`);
      for (const r of ordered) {
        const disabledSet = new Set(r.equipmentDisabled || []);
        const allDisabled = disabledSet.has("*");
        const isDisabled = allDisabled || disabledSet.has(eq.id);
        if (isDisabled) {
          html.push(`<td class="matrix-cell matrix-equip-disabled">\u2717</td>`);
        } else {
          html.push(`<td class="matrix-cell matrix-equip-available">\u2713</td>`);
        }
      }
      html.push(`</tr>`);
    }
  }

  html.push(`</tbody></table>`);
  html.push(`</div>`); // scroll
  html.push(`</div>`); // container

  return html.join("\n");
}

/** Section header row spanning the full table */
function sectionHeader(label, speciesCount) {
  return `<tr class="matrix-section-header"><td colspan="${speciesCount + 1}">${label}</td></tr>`;
}

function formatResourceName(id) {
  return capitalize(id.replace(/_/g, " "));
}

function formatNum(n) {
  if (Number.isInteger(n)) return String(n);
  return n < 0.01 ? n.toExponential(2) : n.toFixed(3).replace(/\.?0+$/, "");
}
