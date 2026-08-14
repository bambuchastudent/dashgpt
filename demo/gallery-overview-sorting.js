export * from "./gallery-overview-sorting-base.js";

import {
  GALLERY_SORT_MODES,
  orderGalleryCards,
  planWholeBoardOverview,
  readGallerySortMode,
  semanticPaletteHueFromIndex,
  semanticPaletteIndex,
  writeGallerySortMode
} from "./gallery-overview-sorting-base.js";
import { loadBrowserVault, materializeResults } from "./vault.js";

const OVERVIEW_COMPACT_DESKTOP = Object.freeze({ width: 56, height: 42, gap: 4 });
const OVERVIEW_COMPACT_MOBILE = Object.freeze({ width: 44, height: 36, gap: 3 });
const OVERVIEW_MAP_DESKTOP = Object.freeze({ width: 5, height: 5, gap: 1 });
const OVERVIEW_MAP_MOBILE = Object.freeze({ width: 3, height: 3, gap: 1 });
const CUE_LIMIT = 96;

function normalizeCue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function galleryCardCue(result, maxLength = CUE_LIMIT) {
  const summary = normalizeCue(result?.summary);
  const title = normalizeCue(result?.title);
  const source = summary || title || "Card";
  const limit = Math.max(8, Math.floor(Number(maxLength) || CUE_LIMIT));
  if (source.length <= limit) return source;
  return `${source.slice(0, Math.max(1, limit - 1)).trimEnd()}…`;
}

function resultSnapshot() {
  try {
    const loaded = loadBrowserVault(globalThis.localStorage);
    const vault = loaded?.vault;
    if (!vault) return { byId: new Map(), events: [] };
    return {
      byId: new Map(materializeResults(vault).map(result => [result.id, result])),
      events: Array.isArray(vault.events) ? vault.events : []
    };
  } catch {
    return { byId: new Map(), events: [] };
  }
}

function injectStyles() {
  if (document.querySelector("style[data-gallery-f44]")) return;
  const style = document.createElement("style");
  style.dataset.galleryF44 = "true";
  style.textContent = `
.gallery-sort{display:flex;align-items:center;gap:6px;padding:5px;border:1px solid var(--line);border-radius:14px;background:rgba(11,18,32,.72)}
.gallery-sort-label{font-size:.72rem;color:var(--muted);padding:0 4px}
.gallery-sort .button{min-height:34px;padding:6px 10px}
.gallery-sort .button[aria-pressed="true"]{border-color:var(--accent);background:rgba(14,165,233,.16);color:#e0f2fe}
.gallery-region[data-f32-overview] .results-grid{grid-template-columns:repeat(var(--f32-overview-columns),minmax(0,1fr))!important;grid-auto-rows:var(--f32-overview-height);gap:var(--f32-overview-gap)!important;align-items:stretch;overflow-x:hidden}
.gallery-region[data-f32-overview] .result-card{min-height:0!important;height:100%;padding:clamp(3px,.42vw,6px)!important;border-radius:9px!important;overflow:hidden}
.gallery-region[data-f32-overview="compact"] .result-card .card-topline{min-height:0;margin:0}
.gallery-region[data-f32-overview="compact"] .result-card .category{font-size:clamp(6px,.6vw,9px)!important;line-height:1;padding:1px 3px!important;max-width:100%}
.gallery-region[data-f32-overview="compact"] .result-card .title{font-size:clamp(7px,.72vw,10px)!important;line-height:1!important;margin:3px 0 0!important;-webkit-line-clamp:1!important}
.gallery-region[data-f32-overview="compact"] .result-card .summary{display:-webkit-box!important;-webkit-box-orient:vertical;-webkit-line-clamp:1!important;overflow:hidden;font-size:clamp(6px,.58vw,9px)!important;line-height:1!important;margin:2px 0 0!important;opacity:.78}
.gallery-region[data-f32-overview="compact"] .result-card .tags,.gallery-region[data-f32-overview="compact"] .result-card .card-next,.gallery-region[data-f32-overview="compact"] .result-card .card-related,.gallery-region[data-f32-overview="compact"] .result-card .card-status,.gallery-region[data-f32-overview="compact"] .result-card .favorite-button,.gallery-region[data-f32-overview="compact"] .result-card .card-actions{display:none!important}
.gallery-region[data-f32-overview="heatmap"] .result-card,.gallery-region[data-f32-overview="overflow"] .result-card{position:relative;padding:0!important;border-radius:2px!important;background:hsl(var(--semantic-hue),72%,48%)!important;box-shadow:none!important;outline-offset:1px;overflow:hidden}
.gallery-region[data-f32-overview="heatmap"] .result-card::before,.gallery-region[data-f32-overview="overflow"] .result-card::before{height:100%;background:hsl(var(--semantic-hue),82%,58%)!important;box-shadow:none;opacity:.34}
.gallery-region[data-f32-overview="heatmap"] .result-card>* ,.gallery-region[data-f32-overview="overflow"] .result-card>*{display:none!important}
.gallery-region[data-f32-overview="heatmap"] .result-card::after,.gallery-region[data-f32-overview="overflow"] .result-card::after{content:attr(data-f44-cue);position:absolute;inset:0;z-index:1;display:block;overflow:hidden;white-space:nowrap;text-overflow:clip;font-size:clamp(3px,.34vw,5px);line-height:1;color:rgba(255,255,255,.88);pointer-events:none}
@media(max-width:620px){.gallery-sort{width:100%;justify-content:space-between}.gallery-sort-label{display:none}.gallery-sort .button{flex:1;padding-inline:7px;min-width:0}.gallery-region[data-f32-overview="compact"] .result-card .category{font-size:6px!important}.gallery-region[data-f32-overview="compact"] .result-card .title{font-size:7px!important}.gallery-region[data-f32-overview="compact"] .result-card .summary{font-size:6px!important}.gallery-region[data-f32-overview="heatmap"] .result-card::after,.gallery-region[data-f32-overview="overflow"] .result-card::after{font-size:3px}}
`;
  document.head.append(style);
}

function overviewFloors() {
  return globalThis.innerWidth <= 620
    ? { compact: OVERVIEW_COMPACT_MOBILE, heatmap: OVERVIEW_MAP_MOBILE }
    : { compact: OVERVIEW_COMPACT_DESKTOP, heatmap: OVERVIEW_MAP_DESKTOP };
}

function overviewHeight(grid) {
  const rect = grid.getBoundingClientRect();
  const top = Math.max(72, Math.min(rect.top, globalThis.innerHeight - 120));
  return Math.max(120, globalThis.innerHeight - top - 12);
}

function clearNativeTitles(cards) {
  for (const card of cards) {
    if (card.dataset.f32NativeTitle !== "true") continue;
    card.removeAttribute("title");
    delete card.dataset.f32NativeTitle;
  }
}

function fallbackResult(card) {
  return {
    id: card.dataset.resultId,
    title: card.querySelector(".title")?.textContent || "",
    summary: card.querySelector(".summary")?.textContent || "",
    category: card.querySelector(".category")?.textContent || "",
    tags: [...card.querySelectorAll(".tag")].map(node => node.textContent.replace(/^#/, "")),
    publishedAt: ""
  };
}

function applyPaletteAndCue(cards, snapshot, fallback) {
  for (const card of cards) {
    const result = snapshot.byId.get(card.dataset.resultId) || fallback.get(card.dataset.resultId);
    if (!result) continue;
    const slot = semanticPaletteIndex(result);
    const hue = semanticPaletteHueFromIndex(slot);
    card.dataset.semanticPalette = String(slot);
    card.dataset.f44Cue = galleryCardCue(result);
    card.style.setProperty("--semantic-hue", String(hue));
    card.style.setProperty("--semantic-hue-2", String(hue));
  }
}

function applyOverview(root, grid) {
  const density = root.querySelector('input[type="range"][aria-label*="density" i]')?.value;
  const isOverview = root.dataset.galleryDetail === "compact" || density === "0";
  const cards = [...grid.querySelectorAll(":scope > .result-card")];
  if (!isOverview) {
    delete root.dataset.f32Overview;
    delete root.dataset.f44Overview;
    root.style.removeProperty("--f32-overview-columns");
    root.style.removeProperty("--f32-overview-height");
    root.style.removeProperty("--f32-overview-gap");
    clearNativeTitles(cards);
    return;
  }

  const floors = overviewFloors();
  const plan = planWholeBoardOverview({
    width: Math.max(1, grid.clientWidth || root.clientWidth || globalThis.innerWidth),
    height: overviewHeight(grid),
    count: cards.length,
    gap: floors.compact.gap,
    minWidth: floors.compact.width,
    minHeight: floors.compact.height,
    mapGap: floors.heatmap.gap,
    mapMinWidth: floors.heatmap.width,
    mapMinHeight: floors.heatmap.height
  });
  root.dataset.f32Overview = plan.representation;
  root.dataset.f44Overview = plan.representation;
  root.style.setProperty("--f32-overview-columns", String(plan.columns));
  root.style.setProperty(
    "--f32-overview-height",
    `${Math.max(plan.tileHeight, plan.representation === "compact" ? floors.compact.height : floors.heatmap.height)}px`
  );
  root.style.setProperty("--f32-overview-gap", `${plan.gap}px`);

  if (plan.representation === "heatmap" || plan.representation === "overflow") {
    for (const card of cards) {
      const identity = card.querySelector(".title")?.textContent
        || card.getAttribute("aria-label")?.replace(/^Open\s+/, "")
        || "Card";
      card.title = identity;
      card.dataset.f32NativeTitle = "true";
    }
  } else {
    clearNativeTitles(cards);
  }
}

function controlHost(root) {
  return root.id === "galleryRegion"
    ? root.querySelector(".gallery-heading-actions")
    : root.querySelector(".dash-gallery-toolbar");
}

function ensureSortControl(root, currentMode, onChange) {
  const host = controlHost(root);
  if (!host) return;
  let control = host.querySelector(":scope > .gallery-sort");
  if (!control) {
    control = document.createElement("div");
    control.className = "gallery-sort";
    control.setAttribute("role", "group");
    control.setAttribute("aria-label", "Card order");
    const label = document.createElement("span");
    label.className = "gallery-sort-label";
    label.textContent = "Sort";
    control.append(label);
    for (const mode of GALLERY_SORT_MODES) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button small ghost";
      button.dataset.gallerySort = mode;
      button.textContent = mode[0].toUpperCase() + mode.slice(1);
      button.addEventListener("click", () => onChange(mode));
      control.append(button);
    }
    host.prepend(control);
  }
  for (const button of control.querySelectorAll("[data-gallery-sort]")) {
    button.setAttribute("aria-pressed", String(button.dataset.gallerySort === currentMode));
  }
}

function sortGrid(root, grid, mode, snapshot) {
  const cards = [...grid.querySelectorAll(":scope > .result-card")];
  const fallback = new Map(cards.map(card => [card.dataset.resultId, fallbackResult(card)]));
  applyPaletteAndCue(cards, snapshot, fallback);
  if (cards.length >= 2) {
    const items = cards.map(card => snapshot.byId.get(card.dataset.resultId) || fallback.get(card.dataset.resultId));
    const currentIds = cards.map(card => card.dataset.resultId);
    const orderedIds = orderGalleryCards(items, mode, snapshot.events).map(result => result.id);
    if (orderedIds.some((id, index) => id !== currentIds[index])) {
      const byId = new Map(cards.map(card => [card.dataset.resultId, card]));
      for (const id of orderedIds) {
        const card = byId.get(id);
        if (card) grid.append(card);
      }
    }
  }
  root.dataset.gallerySort = mode;
}

function directCardIdSet(grid) {
  return new Set(
    [...grid.querySelectorAll(":scope > .result-card")]
      .map(card => card.dataset.resultId)
      .filter(Boolean)
  );
}

function sameIds(left, right) {
  if (!left || !right || left.size !== right.size) return false;
  for (const id of left) if (!right.has(id)) return false;
  return true;
}

export function initializeGalleryOverviewSorting() {
  if (globalThis.__dashgptGalleryF44) return globalThis.__dashgptGalleryF44;
  injectStyles();
  let mode = readGallerySortMode();
  let scheduled = false;
  let pendingKind = "full";
  const selections = new WeakMap();
  const stats = { full: 0, overview: 0 };

  const roots = () => [...document.querySelectorAll(".gallery-region")];

  const rememberSelections = () => {
    for (const root of roots()) {
      const grid = root.querySelector(":scope > .results-grid, .results-grid");
      if (grid) selections.set(root, directCardIdSet(grid));
    }
  };

  const applyFull = () => {
    stats.full += 1;
    const snapshot = resultSnapshot();
    for (const root of roots()) {
      const grid = root.querySelector(":scope > .results-grid, .results-grid");
      if (!grid) continue;
      ensureSortControl(root, mode, nextMode => {
        mode = writeGallerySortMode(nextMode);
        schedule("full");
      });
      sortGrid(root, grid, mode, snapshot);
      applyOverview(root, grid);
      const control = controlHost(root)?.querySelector(":scope > .gallery-sort");
      for (const button of control?.querySelectorAll?.("[data-gallery-sort]") || []) {
        button.setAttribute("aria-pressed", String(button.dataset.gallerySort === mode));
      }
    }
    rememberSelections();
  };

  const applyOverviewOnly = () => {
    stats.overview += 1;
    for (const root of roots()) {
      const grid = root.querySelector(":scope > .results-grid, .results-grid");
      if (grid) applyOverview(root, grid);
    }
  };

  const selectionChanged = () => {
    for (const root of roots()) {
      const grid = root.querySelector(":scope > .results-grid, .results-grid");
      if (!grid) continue;
      if (!sameIds(selections.get(root), directCardIdSet(grid))) return true;
    }
    return false;
  };

  const apply = () => {
    scheduled = false;
    const kind = pendingKind;
    pendingKind = "overview";
    if (kind === "full" || (kind === "auto" && selectionChanged())) applyFull();
    else applyOverviewOnly();
  };

  const priority = { overview: 0, auto: 1, full: 2 };
  const schedule = (kind = "full") => {
    if (priority[kind] > priority[pendingKind]) pendingKind = kind;
    if (scheduled) return;
    scheduled = true;
    if (globalThis.requestAnimationFrame) globalThis.requestAnimationFrame(apply);
    else globalThis.setTimeout(apply, 0);
  };

  const observer = new MutationObserver(mutations => {
    let kind = "overview";
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        kind = "auto";
        break;
      }
    }
    schedule(kind);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-gallery-detail"]
  });
  const onResize = () => schedule("overview");
  globalThis.addEventListener("resize", onResize);
  schedule("full");

  const api = {
    getSortMode: () => mode,
    setSortMode(nextMode) {
      mode = writeGallerySortMode(nextMode);
      schedule("full");
      return mode;
    },
    getRefreshStats: () => ({ ...stats }),
    refresh: () => schedule("full"),
    destroy() {
      observer.disconnect();
      globalThis.removeEventListener("resize", onResize);
      delete globalThis.__dashgptGalleryF44;
      delete globalThis.__dashgptGalleryF32;
    }
  };
  globalThis.__dashgptGalleryF44 = api;
  globalThis.__dashgptGalleryF32 = api;
  return api;
}
