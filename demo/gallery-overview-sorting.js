import { semanticHue } from "./semantic-gallery.js";
import { loadBrowserVault, materializeResults } from "./vault.js";

export const GALLERY_SORT_STATE_VERSION = 2;
export const GALLERY_SORT_STATE_KEY = "dashgpt.demo.gallery-sort.v2";
export const GALLERY_SORT_MODES = Object.freeze(["color", "tag", "time"]);
export const SEMANTIC_PALETTE_SIZE = 32;
export const SEMANTIC_PALETTE_STEP = 360 / SEMANTIC_PALETTE_SIZE;

const OVERVIEW_COMPACT_DESKTOP = Object.freeze({ width: 56, height: 42, gap: 4 });
const OVERVIEW_COMPACT_MOBILE = Object.freeze({ width: 44, height: 36, gap: 3 });
const OVERVIEW_MAP_DESKTOP = Object.freeze({ width: 5, height: 5, gap: 1 });
const OVERVIEW_MAP_MOBILE = Object.freeze({ width: 3, height: 3, gap: 1 });

function finiteTimestamp(value) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), undefined, { sensitivity: "base" });
}

function compareTags(left, right) {
  if (left === "~untagged" && right !== "~untagged") return 1;
  if (right === "~untagged" && left !== "~untagged") return -1;
  return compareText(left, right);
}

function normalizedHue(value) {
  const hue = Number(value);
  return Number.isFinite(hue) ? ((hue % 360) + 360) % 360 : 0;
}

export function semanticPaletteIndex(result) {
  const hue = normalizedHue(semanticHue(result));
  return Math.round(hue / SEMANTIC_PALETTE_STEP) % SEMANTIC_PALETTE_SIZE;
}

export function semanticPaletteHueFromIndex(index) {
  const slot = ((Math.floor(Number(index) || 0) % SEMANTIC_PALETTE_SIZE) + SEMANTIC_PALETTE_SIZE) % SEMANTIC_PALETTE_SIZE;
  return slot * SEMANTIC_PALETTE_STEP;
}

export function semanticPaletteHue(result) {
  return semanticPaletteHueFromIndex(semanticPaletteIndex(result));
}

export function semanticPalette() {
  return Object.freeze(Array.from({ length: SEMANTIC_PALETTE_SIZE }, (_, index) => Object.freeze({
    index,
    hue: semanticPaletteHueFromIndex(index)
  })));
}

export function meaningfulCardTimestamp(result, events = []) {
  let latest = Math.max(
    finiteTimestamp(result?.updatedAt),
    finiteTimestamp(result?.publishedAt),
    finiteTimestamp(result?.createdAt)
  );
  for (const event of Array.isArray(events) ? events : []) {
    if (event?.resultId !== result?.id || event?.type !== "result.activity") continue;
    if (!["created", "updated", "dash.add", "dash.remove"].includes(event.value)) continue;
    latest = Math.max(latest, finiteTimestamp(event.createdAt));
  }
  return latest;
}

export function primaryTag(result) {
  for (const value of Array.isArray(result?.tags) ? result.tags : []) {
    const normalized = String(value || "").trim().toLocaleLowerCase();
    if (normalized) return normalized;
  }
  return "~untagged";
}

export function normalizeGallerySortMode(mode) {
  return GALLERY_SORT_MODES.includes(mode) ? mode : "color";
}

export function orderGalleryCards(items, mode = "color", events = []) {
  const safeMode = normalizeGallerySortMode(mode);
  const decorated = (Array.isArray(items) ? items : []).map((result, index) => ({
    result,
    index,
    time: meaningfulCardTimestamp(result, events),
    palette: semanticPaletteIndex(result),
    tag: primaryTag(result)
  }));

  decorated.sort((left, right) => {
    if (safeMode === "color") {
      if (left.palette !== right.palette) return left.palette - right.palette;
      const tag = compareTags(left.tag, right.tag);
      if (tag) return tag;
      if (left.time !== right.time) return right.time - left.time;
    } else if (safeMode === "tag") {
      const tag = compareTags(left.tag, right.tag);
      if (tag) return tag;
      if (left.palette !== right.palette) return left.palette - right.palette;
      if (left.time !== right.time) return right.time - left.time;
    } else {
      if (left.time !== right.time) return right.time - left.time;
      if (left.palette !== right.palette) return left.palette - right.palette;
      const tag = compareTags(left.tag, right.tag);
      if (tag) return tag;
    }

    const id = compareText(left.result?.id || "", right.result?.id || "");
    return id || left.index - right.index;
  });

  return decorated.map(entry => entry.result);
}

function bestOverviewFit({ width, height, count, gap, minWidth, minHeight }) {
  if (!count) return { columns: 1, rows: 0, tileWidth: width, tileHeight: minHeight, fits: true, score: Number.POSITIVE_INFINITY };
  let best = null;
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const tileWidth = (width - gap * (columns - 1)) / columns;
    const tileHeight = (height - gap * (rows - 1)) / rows;
    if (tileWidth <= 0 || tileHeight <= 0) continue;
    const score = Math.min(tileWidth / minWidth, tileHeight / minHeight);
    const candidate = {
      columns,
      rows,
      tileWidth,
      tileHeight,
      fits: tileWidth >= minWidth && tileHeight >= minHeight,
      score
    };
    if (!best || candidate.score > best.score || (candidate.score === best.score && candidate.columns < best.columns)) best = candidate;
  }
  return best || { columns: 1, rows: count, tileWidth: width, tileHeight: 0, fits: false, score: 0 };
}

export function planWholeBoardOverview({
  width,
  height,
  count,
  gap = OVERVIEW_COMPACT_DESKTOP.gap,
  minWidth = OVERVIEW_COMPACT_DESKTOP.width,
  minHeight = OVERVIEW_COMPACT_DESKTOP.height,
  mapGap = OVERVIEW_MAP_DESKTOP.gap,
  mapMinWidth = OVERVIEW_MAP_DESKTOP.width,
  mapMinHeight = OVERVIEW_MAP_DESKTOP.height
} = {}) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  const compactGap = Math.max(0, Number(gap) || 0);
  const compactWidth = Math.max(1, Number(minWidth) || OVERVIEW_COMPACT_DESKTOP.width);
  const compactHeight = Math.max(1, Number(minHeight) || OVERVIEW_COMPACT_DESKTOP.height);
  const heatGap = Math.max(0, Number(mapGap) || 0);
  const heatWidth = Math.max(1, Number(mapMinWidth) || OVERVIEW_MAP_DESKTOP.width);
  const heatHeight = Math.max(1, Number(mapMinHeight) || OVERVIEW_MAP_DESKTOP.height);

  const compact = bestOverviewFit({ width: safeWidth, height: safeHeight, count: safeCount, gap: compactGap, minWidth: compactWidth, minHeight: compactHeight });
  if (compact.fits) return { ...compact, representation: "compact", gap: compactGap };

  const heatmap = bestOverviewFit({ width: safeWidth, height: safeHeight, count: safeCount, gap: heatGap, minWidth: heatWidth, minHeight: heatHeight });
  if (heatmap.fits) return { ...heatmap, representation: "heatmap", gap: heatGap };

  const columns = Math.max(1, Math.min(safeCount || 1, Math.floor((safeWidth + heatGap) / (heatWidth + heatGap))));
  const rows = safeCount ? Math.ceil(safeCount / columns) : 0;
  const tileWidth = (safeWidth - heatGap * (columns - 1)) / columns;
  return {
    columns,
    rows,
    tileWidth,
    tileHeight: heatHeight,
    fits: false,
    score: Math.min(tileWidth / heatWidth, 1),
    representation: "overflow",
    gap: heatGap
  };
}

export function readGallerySortMode(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem?.(GALLERY_SORT_STATE_KEY) || "null");
    return Number(parsed?.version) === GALLERY_SORT_STATE_VERSION ? normalizeGallerySortMode(parsed?.sortMode) : "color";
  } catch {
    return "color";
  }
}

export function writeGallerySortMode(mode, storage = globalThis.localStorage) {
  const sortMode = normalizeGallerySortMode(mode);
  storage?.setItem?.(GALLERY_SORT_STATE_KEY, JSON.stringify({ version: GALLERY_SORT_STATE_VERSION, sortMode }));
  return sortMode;
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
  if (document.querySelector("style[data-gallery-f32]")) return;
  const style = document.createElement("style");
  style.dataset.galleryF32 = "true";
  style.textContent = `
.gallery-sort{display:flex;align-items:center;gap:6px;padding:5px;border:1px solid var(--line);border-radius:14px;background:rgba(11,18,32,.72)}
.gallery-sort-label{font-size:.72rem;color:var(--muted);padding:0 4px}
.gallery-sort .button{min-height:34px;padding:6px 10px}
.gallery-sort .button[aria-pressed="true"]{border-color:var(--accent);background:rgba(14,165,233,.16);color:#e0f2fe}
.gallery-region[data-f32-overview] .results-grid{grid-template-columns:repeat(var(--f32-overview-columns),minmax(0,1fr))!important;grid-auto-rows:var(--f32-overview-height);gap:var(--f32-overview-gap)!important;align-items:stretch;overflow-x:hidden}
.gallery-region[data-f32-overview] .result-card{min-height:0!important;height:100%;padding:clamp(4px,.55vw,8px)!important;border-radius:10px!important}
.gallery-region[data-f32-overview="compact"] .result-card .card-topline{min-height:0;margin:0}
.gallery-region[data-f32-overview="compact"] .result-card .category{font-size:clamp(7px,.72vw,10px)!important;line-height:1;padding:2px 4px!important;max-width:100%}
.gallery-region[data-f32-overview="compact"] .result-card .title{font-size:clamp(8px,.82vw,12px)!important;line-height:1.05!important;margin:4px 0 0!important;-webkit-line-clamp:2!important}
.gallery-region[data-f32-overview="compact"] .result-card .summary,.gallery-region[data-f32-overview="compact"] .result-card .tags,.gallery-region[data-f32-overview="compact"] .result-card .card-next,.gallery-region[data-f32-overview="compact"] .result-card .card-related,.gallery-region[data-f32-overview="compact"] .result-card .card-status,.gallery-region[data-f32-overview="compact"] .result-card .favorite-button,.gallery-region[data-f32-overview="compact"] .result-card .card-actions{display:none!important}
.gallery-region[data-f32-overview="heatmap"] .result-card,.gallery-region[data-f32-overview="overflow"] .result-card{padding:0!important;border-radius:2px!important;background:hsl(var(--semantic-hue),72%,48%)!important;box-shadow:none!important;outline-offset:1px}
.gallery-region[data-f32-overview="heatmap"] .result-card::before,.gallery-region[data-f32-overview="overflow"] .result-card::before{height:100%;background:hsl(var(--semantic-hue),82%,58%)!important;box-shadow:none;opacity:.34}
.gallery-region[data-f32-overview="heatmap"] .result-card>* ,.gallery-region[data-f32-overview="overflow"] .result-card>*{display:none!important}
@media(max-width:620px){.gallery-sort{width:100%;justify-content:space-between}.gallery-sort-label{display:none}.gallery-sort .button{flex:1;padding-inline:7px;min-width:0}.gallery-region[data-f32-overview="compact"] .result-card .category{font-size:7px!important}.gallery-region[data-f32-overview="compact"] .result-card .title{font-size:8px!important}}
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

function applyPalette(cards, snapshot, fallback) {
  for (const card of cards) {
    const result = snapshot.byId.get(card.dataset.resultId) || fallback.get(card.dataset.resultId);
    if (!result) continue;
    const slot = semanticPaletteIndex(result);
    const hue = semanticPaletteHueFromIndex(slot);
    card.dataset.semanticPalette = String(slot);
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
  root.style.setProperty("--f32-overview-columns", String(plan.columns));
  root.style.setProperty("--f32-overview-height", `${Math.max(plan.tileHeight, plan.representation === "compact" ? floors.compact.height : floors.heatmap.height)}px`);
  root.style.setProperty("--f32-overview-gap", `${plan.gap}px`);

  if (plan.representation === "heatmap" || plan.representation === "overflow") {
    for (const card of cards) {
      const identity = card.querySelector(".title")?.textContent || card.getAttribute("aria-label")?.replace(/^Open\s+/, "") || "Card";
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
  const fallback = new Map(cards.map(card => [card.dataset.resultId, {
    id: card.dataset.resultId,
    title: card.querySelector(".title")?.textContent || "",
    category: card.querySelector(".category")?.textContent || "",
    tags: [...card.querySelectorAll(".tag")].map(node => node.textContent.replace(/^#/, "")),
    publishedAt: ""
  }]));

  applyPalette(cards, snapshot, fallback);
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

export function initializeGalleryOverviewSorting() {
  if (globalThis.__dashgptGalleryF32) return globalThis.__dashgptGalleryF32;
  injectStyles();
  let mode = readGallerySortMode();
  let scheduled = false;

  const apply = () => {
    scheduled = false;
    const snapshot = resultSnapshot();
    for (const root of document.querySelectorAll(".gallery-region")) {
      const grid = root.querySelector(":scope > .results-grid, .results-grid");
      if (!grid) continue;
      ensureSortControl(root, mode, nextMode => {
        mode = writeGallerySortMode(nextMode);
        schedule();
      });
      sortGrid(root, grid, mode, snapshot);
      applyOverview(root, grid);
      const control = controlHost(root)?.querySelector(":scope > .gallery-sort");
      for (const button of control?.querySelectorAll?.("[data-gallery-sort]") || []) {
        button.setAttribute("aria-pressed", String(button.dataset.gallerySort === mode));
      }
    }
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    if (globalThis.requestAnimationFrame) globalThis.requestAnimationFrame(apply);
    else globalThis.setTimeout(apply, 0);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-gallery-detail"] });
  globalThis.addEventListener("resize", schedule);
  schedule();

  const api = {
    getSortMode: () => mode,
    setSortMode(nextMode) {
      mode = writeGallerySortMode(nextMode);
      schedule();
      return mode;
    },
    refresh: schedule,
    destroy() {
      observer.disconnect();
      globalThis.removeEventListener("resize", schedule);
      delete globalThis.__dashgptGalleryF32;
    }
  };
  globalThis.__dashgptGalleryF32 = api;
  return api;
}
