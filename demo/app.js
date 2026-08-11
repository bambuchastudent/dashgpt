import {
  exportVaultBundle,
  importVaultBundle,
  loadBrowserVault,
  materializeResults,
  mergeVaults,
  putResult,
  recordResultActivity,
  saveBrowserVault,
  setFavorite,
  vaultStatus
} from "./vault.js";
import { rankResults, semanticTerms } from "./semantic-dashes.js";
import { createSemanticDashUi } from "./semantic-dash-ui.js";
import { appendContinuationActivity, createContinuationController } from "./continuation.js";
import {
  createGalleryZoomController,
  gallerySelectionKey,
  loadGalleryState,
  orderGalleryResults,
  rememberGalleryOrder,
  rememberedOrder,
  saveGalleryState,
  semanticHue
} from "./semantic-gallery.js";

const DURABLE_FIELDS = [
  "id", "title", "goal", "summary", "currentState", "category", "tags", "decisions", "facts",
  "constraints", "userPreferences", "openQuestions", "next", "suggestedNextStep", "links",
  "relatedMaterials", "language", "continuationContext", "source"
];
const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;
const LEGACY_SEED_IDS = new Set(["dashgpt-product", "development-workflow", "deployment"]);

let results = [];
let vault;
let vaultLoadInfo;
let galleryState = loadGalleryState(globalThis.localStorage);
let galleryZoomController;
let dashGalleryZoomController;
let activeCategory = galleryState.activeCategory;
let favoritesOnly = galleryState.favoritesOnly;
let routeOpenRecorded = false;
let galleryFocusRestored = false;
let dashUi;
let continuationController;

const vaultAdapter = {
  type: "browser-local",
  load: options => loadBrowserVault(localStorage, options),
  save: currentVault => saveBrowserVault(localStorage, currentVault),
  status: currentVault => vaultStatus(currentVault)
};

const resultsGrid = document.querySelector("#resultsGrid");
const resultCount = document.querySelector("#resultCount");
const resultsTitle = document.querySelector("#resultsTitle");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");
const categoryFilters = document.querySelector("#categoryFilters");
const cardTemplate = document.querySelector("#resultCardTemplate");
const resultDialog = document.querySelector("#resultDialog");
const resultDialogContent = document.querySelector("#resultDialogContent");
const contextDialog = document.querySelector("#contextDialog");
const contextOutput = document.querySelector("#contextOutput");
const addDialog = document.querySelector("#addDialog");
const addResultForm = document.querySelector("#addResultForm");
const dashboardView = document.querySelector("#dashboardView");
const resultPage = document.querySelector("#resultPage");
const addResultButton = document.querySelector("#addResultButton");
const storageButton = document.querySelector("#storageButton");
const storageDialog = document.querySelector("#storageDialog");
const storageStatusText = document.querySelector("#storageStatusText");
const storageVaultId = document.querySelector("#storageVaultId");
const storageObjectCount = document.querySelector("#storageObjectCount");
const storageMigrationNote = document.querySelector("#storageMigrationNote");
const storageImportInput = document.querySelector("#storageImportInput");
const storageImportMessage = document.querySelector("#storageImportMessage");
const galleryRegion = document.querySelector("#galleryRegion");
const galleryZoom = document.querySelector("#galleryZoom");
const galleryZoomOut = document.querySelector("#galleryZoomOut");
const galleryZoomIn = document.querySelector("#galleryZoomIn");
const galleryZoomValue = document.querySelector("#galleryZoomValue");
const showFavoritesButton = document.querySelector("#showFavoritesButton");
const showAllButton = document.querySelector("#showAllButton");

if (searchInput) searchInput.value = galleryState.query;

function validResult(result) {
  return Boolean(result && typeof result.id === "string" && typeof result.title === "string" && typeof result.summary === "string");
}

function durablePayload(result) {
  const payload = {};
  for (const field of DURABLE_FIELDS) if (result[field] !== undefined) payload[field] = result[field];
  return payload;
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function hashResult(result) {
  const bytes = new TextEncoder().encode(canonicalize(durablePayload(result)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}

async function integrityStatus(result) {
  if (!result.immutable) return "local";
  if (!HASH_PATTERN.test(result.contentHash || "")) return "unverified";
  try {
    return (await hashResult(result)) === result.contentHash ? "verified" : "mismatch";
  } catch {
    return "unverified";
  }
}

async function attachIntegrity(items) {
  return Promise.all(items.map(async result => ({ ...result, _integrity: await integrityStatus(result) })));
}

async function loadPublishedResults() {
  try {
    const response = await fetch("/demo/data/results.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Published Result catalog returned ${response.status}`);
    const parsed = await response.json();
    return Array.isArray(parsed) ? parsed.filter(validResult) : [];
  } catch (error) {
    console.warn("DashGPT: published Result catalog unavailable; using local vault.", error);
    return [];
  }
}

function mergePublishedAndLocal(published, local) {
  const publishedById = new Map(published.map(result => [result.id, result]));
  const localById = new Map(local.map(result => [result.id, result]));
  const ids = new Set([...publishedById.keys(), ...localById.keys()]);
  const merged = [];

  for (const id of ids) {
    if (LEGACY_SEED_IDS.has(id) && !publishedById.has(id)) continue;
    const publishedResult = publishedById.get(id);
    const localResult = localById.get(id);
    if (!publishedResult) {
      merged.push(localResult);
      continue;
    }
    if (!localResult) {
      merged.push({ ...structuredClone(publishedResult), favorite: Boolean(publishedResult.favorite) });
      continue;
    }

    const localVersion = Number(localResult.contentVersion || 1);
    const publishedVersion = Number(publishedResult.contentVersion || 1);
    const chosen = localVersion > publishedVersion ? localResult : publishedResult;
    const favorite = typeof localResult.favorite === "boolean" ? localResult.favorite : Boolean(publishedResult.favorite);
    merged.push({ ...structuredClone(chosen), favorite });
  }

  return merged;
}

function persistRuntimeResults() {
  for (const result of results) {
    putResult(vault, result);
    setFavorite(vault, result.id, Boolean(result.favorite));
  }
  vaultAdapter.save(vault);
  renderStorageStatus();
  updateSummary();
}

function updateSummary() {
  const favorites = results.filter(result => result.favorite).length;
  const verified = results.filter(result => result._integrity === "verified").length;
  const summary = document.querySelector("#summaryText");
  if (summary) summary.textContent = `${results.length} results, ${favorites} favorites, ${verified} immutable verified. Stored in your local DashGPT Vault.`;
}

function currentGallerySelectionKey() {
  const dashId = dashUi?.routeDashId?.();
  if (dashId) return gallerySelectionKey({ scope: `dash:${dashId}` });
  return gallerySelectionKey({
    scope: galleryRegion?.dataset.galleryScope || "all",
    category: activeCategory,
    favoritesOnly,
    query: searchInput?.value || ""
  });
}

function persistGalleryView(options = {}) {
  const activeZoomController = dashUi?.routeDashId?.() ? dashGalleryZoomController : galleryZoomController;
  const densityIndex = Number.isInteger(options.densityIndex)
    ? options.densityIndex
    : activeZoomController?.getDensityIndex?.() ?? galleryState.densityIndex;
  galleryState = saveGalleryState(globalThis.localStorage, {
    ...galleryState,
    densityIndex,
    activeCategory,
    favoritesOnly,
    query: searchInput?.value || "",
    selectionKey: options.selectionKey || currentGallerySelectionKey()
  });
}

function recordActivity(resultId, kind) {
  if (!vault || !resultId) return;
  galleryState.focusedResultId = resultId;
  persistGalleryView();
  const previousCount = vault.events.length;
  recordResultActivity(vault, resultId, kind);
  if (vault.events.length === previousCount) return;
  vaultAdapter.save(vault);
  renderStorageStatus();
  if (dashboardView && !dashboardView.hidden) queueMicrotask(() => {
    if (!dashboardView.hidden) renderDashboard();
  });
  else {
    const dashId = dashUi?.routeDashId?.();
    if (dashId) queueMicrotask(() => dashUi?.renderDashPage?.(dashId));
  }
}

function recordContinuationSuccess(resultId) {
  if (!vault || !resultId) return;
  galleryState.focusedResultId = resultId;
  persistGalleryView();
  appendContinuationActivity(vault, resultId);
  vaultAdapter.save(vault);
  renderStorageStatus();
  if (dashboardView && !dashboardView.hidden) queueMicrotask(() => {
    if (!dashboardView.hidden) renderDashboard();
  });
  else {
    const dashId = dashUi?.routeDashId?.();
    if (dashId) queueMicrotask(() => dashUi?.renderDashPage?.(dashId));
  }
}

function categories() {
  return ["All", ...new Set(results.map(result => result.category).filter(Boolean))];
}

function renderCategoryFilters() {
  categoryFilters.replaceChildren();
  categories().forEach(category => {
    const button = document.createElement("button");
    button.className = `chip${activeCategory === category ? " active" : ""}`;
    button.type = "button";
    button.textContent = category;
    button.addEventListener("click", () => {
      activeCategory = category;
      persistGalleryView();
      renderDashboard();
    });
    categoryFilters.appendChild(button);
  });
}

function filteredResults() {
  return rankResults(results, searchInput.value.trim(), {
    category: activeCategory === "All" ? "" : activeCategory,
    favoritesOnly
  }).map((item) => item.result);
}

function resultPagePath(result) {
  return `/demo/result/${encodeURIComponent(result.id)}/`;
}

function applySemanticVisual(element, result) {
  const hue = semanticHue(result);
  element.style.setProperty("--semantic-hue", hue);
  element.style.setProperty("--semantic-hue-2", (hue + 28) % 360);
}

function semanticSignatureForResult(result) {
  const hue = semanticHue(result);
  const concepts = semanticTerms(`${result.category || ""} ${result.title || ""} ${(result.tags || []).join(" ")}`)
    .filter(term => term.startsWith("concept:"));
  if (!concepts.length) return null;
  const groupKey = concepts[0];
  let groupRank = 0;
  for (let index = 0; index < groupKey.length; index += 1) groupRank = (Math.imul(groupRank, 31) + groupKey.charCodeAt(index)) >>> 0;
  return { groupKey, groupRank, position: hue, hue };
}

function renderDashboard() {
  releaseDashMemberGallery();
  resultPage?.classList.remove("dash-gallery-page");
  if (galleryZoomController?.getDensityIndex?.() !== galleryState.densityIndex) {
    galleryZoomController?.setDensityIndex?.(galleryState.densityIndex);
  }
  renderCategoryFilters();
  const visible = filteredResults();
  const selectionKey = currentGallerySelectionKey();
  const ordered = orderGalleryResults(visible, {
    events: vault?.events || [],
    previousOrder: rememberedOrder(galleryState, selectionKey),
    semanticSignature: semanticSignatureForResult
  });
  resultsGrid.replaceChildren();
  ordered.forEach(result => resultsGrid.appendChild(createCard(result)));
  galleryState = rememberGalleryOrder(galleryState, selectionKey, ordered.map(result => result.id));
  persistGalleryView();
  if (!galleryFocusRestored && galleryState.focusedResultId) {
    const focusedCard = [...resultsGrid.querySelectorAll(".result-card")]
      .find(card => card.dataset.resultId === galleryState.focusedResultId);
    if (focusedCard) {
      focusedCard.dataset.galleryFocus = "true";
      requestAnimationFrame(() => {
        if (!document.activeElement || document.activeElement === document.body) focusedCard.focus({ preventScroll: true });
      });
    }
    galleryFocusRestored = true;
  }
  resultCount.textContent = `${visible.length} / ${results.length}`;
  resultsTitle.textContent = favoritesOnly ? "Favorites" : "Everything worth keeping";
  showFavoritesButton?.setAttribute("aria-pressed", String(favoritesOnly));
  showAllButton?.setAttribute("aria-pressed", String(!favoritesOnly && activeCategory === "All" && !searchInput.value.trim()));
  emptyState.hidden = visible.length !== 0;
  updateSummary();
}

function releaseDashMemberGallery() {
  dashGalleryZoomController?.destroy?.();
  dashGalleryZoomController = null;
}

function renderDashMemberGallery({ container, dashId, members, createMemberNode }) {
  releaseDashMemberGallery();
  const selectionKey = gallerySelectionKey({ scope: `dash:${dashId}` });
  const memberById = new Map(members.map(member => [member.result.id, member]));
  const ordered = orderGalleryResults(members.map(member => member.result), {
    events: vault?.events || [],
    previousOrder: rememberedOrder(galleryState, selectionKey),
    semanticSignature: semanticSignatureForResult
  });

  const root = document.createElement("div");
  root.className = "gallery-region dash-member-gallery";
  root.dataset.galleryScope = `dash:${dashId}`;
  const toolbar = document.createElement("div");
  toolbar.className = "dash-gallery-toolbar";
  const count = document.createElement("span");
  count.className = "count";
  count.textContent = `${ordered.length} Results`;
  const controls = document.createElement("div");
  controls.className = "gallery-zoom";
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Semantic Dash gallery density");
  const decrease = document.createElement("button");
  decrease.type = "button";
  decrease.className = "button small gallery-zoom-button";
  decrease.setAttribute("aria-label", "Show more, smaller Dash cards");
  decrease.textContent = "−";
  const rangeLabel = document.createElement("label");
  rangeLabel.className = "gallery-zoom-range";
  const rangeText = document.createElement("span");
  rangeText.className = "visually-hidden";
  rangeText.textContent = "Semantic Dash gallery density";
  const range = document.createElement("input");
  range.type = "range";
  range.setAttribute("aria-label", "Semantic Dash gallery density");
  rangeLabel.append(rangeText, range);
  const output = document.createElement("output");
  output.setAttribute("aria-live", "polite");
  const increase = document.createElement("button");
  increase.type = "button";
  increase.className = "button small gallery-zoom-button";
  increase.setAttribute("aria-label", "Show fewer, larger Dash cards");
  increase.textContent = "+";
  controls.append(decrease, rangeLabel, output, increase);
  toolbar.append(count, controls);

  const grid = document.createElement("div");
  grid.className = "results-grid dash-members-grid";
  for (const result of ordered) {
    const member = memberById.get(result.id);
    if (member) grid.append(createMemberNode(member));
  }
  root.append(toolbar, grid);
  container.append(root);

  galleryState = rememberGalleryOrder(galleryState, selectionKey, ordered.map(result => result.id));
  persistGalleryView({ densityIndex: galleryState.densityIndex, selectionKey });
  dashGalleryZoomController = createGalleryZoomController({
    root,
    range,
    decrease,
    increase,
    output,
    initialDensityIndex: galleryState.densityIndex,
    onCommit(index) {
      galleryState.densityIndex = index;
      persistGalleryView({ densityIndex: index, selectionKey });
    }
  });

  if (galleryState.focusedResultId) {
    const focusedCard = [...grid.querySelectorAll(".result-card")]
      .find(card => card.dataset.resultId === galleryState.focusedResultId);
    if (focusedCard) focusedCard.dataset.galleryFocus = "true";
  }
}

function createCard(result) {
  const node = cardTemplate.content.cloneNode(true);
  const card = node.querySelector(".result-card");
  card.dataset.resultId = result.id;
  card.setAttribute("aria-label", `Open ${result.title}`);
  applySemanticVisual(card, result);
  node.querySelector(".category").textContent = result.category || "Result";
  node.querySelector(".title").textContent = result.title;
  node.querySelector(".summary").textContent = result.summary;
  const status = node.querySelector(".card-status");
  status.textContent = result.status || (result.immutable ? "Saved" : "Draft");
  const next = node.querySelector(".card-next");
  next.textContent = result.next ? `Next: ${result.next}` : "";
  next.hidden = !result.next;
  const related = node.querySelector(".card-related");
  const relatedCount = [result.links, result.images, result.assets, result.relatedResults]
    .reduce((count, items) => count + (Array.isArray(items) ? items.length : 0), 0);
  related.textContent = relatedCount ? `${relatedCount} related ${relatedCount === 1 ? "material" : "materials"}` : "";
  related.hidden = relatedCount === 0;
  const favoriteButton = node.querySelector(".favorite-button");
  favoriteButton.textContent = result.favorite ? "★" : "☆";
  favoriteButton.setAttribute("aria-pressed", String(Boolean(result.favorite)));
  favoriteButton.addEventListener("click", () => toggleFavorite(result.id));
  const tags = node.querySelector(".tags");
  (result.tags || []).forEach(tag => tags.appendChild(tagNode(tag)));
  const pageLink = node.querySelector(".page-link");
  pageLink.href = resultPagePath(result);
  pageLink.setAttribute("aria-label", `Open ${result.title}`);
  pageLink.addEventListener("click", () => recordActivity(result.id, "opened"));
  node.querySelector(".open-button").addEventListener("click", () => openResult(result.id));
  const original = node.querySelector(".original-link");
  if (result.source?.url) {
    original.href = result.source.url;
    original.addEventListener("click", () => recordActivity(result.id, "source.open"));
  } else {
    original.hidden = true;
  }
  const continuation = node.querySelector(".continue-link");
  continuation.addEventListener("click", () => continuationController.continue(result.id));
  const openFromCard = (event) => {
    if (event.target.closest?.("a,button,input,summary,details")) return;
    if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
    if (event.type === "keydown") event.preventDefault();
    openResult(result.id);
  };
  card.addEventListener("click", openFromCard);
  card.addEventListener("keydown", openFromCard);
  return node;
}

function tagNode(tag) {
  const item = document.createElement("span");
  item.className = "tag";
  item.textContent = `#${tag}`;
  return item;
}

function toggleFavorite(id) {
  results = results.map(result => result.id === id ? { ...result, favorite: !result.favorite } : result);
  persistRuntimeResults();
  if (!resultPage.hidden) renderStandaloneResult(results.find(item => item.id === id));
  else renderDashboard();
}

function immutableBadge(result) {
  const badge = document.createElement("span");
  badge.className = "immutability-badge";
  if (!result.immutable) {
    badge.textContent = "LOCAL DRAFT";
    return badge;
  }
  if (result._integrity === "verified") {
    badge.classList.add("locked", "verified");
    badge.textContent = `🔒 IMMUTABLE · VERIFIED · v${result.contentVersion || 1}`;
  } else if (result._integrity === "mismatch") {
    badge.classList.add("mismatch");
    badge.textContent = "⚠ INTEGRITY MISMATCH";
  } else {
    badge.classList.add("locked");
    badge.textContent = `🔒 IMMUTABLE · UNVERIFIED · v${result.contentVersion || 1}`;
  }
  return badge;
}

function sourceBlock(source, resultId) {
  const block = document.createElement("div");
  block.className = "detail-block";
  const strong = document.createElement("strong");
  strong.textContent = "Source";
  const link = document.createElement("a");
  link.href = source.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = source.type === "chatgpt-share" ? "Open original chat ↗" : "Open source ↗";
  link.addEventListener("click", () => recordActivity(resultId, "source.open"));
  block.append(strong, link);
  return block;
}

function detailBlock(label, value) {
  const block = document.createElement("div");
  block.className = "detail-block";
  const strong = document.createElement("strong");
  strong.textContent = label;
  const text = document.createElement("div");
  text.textContent = value;
  block.append(strong, text);
  return block;
}

function actionBar(result, id) {
  const actions = document.createElement("div");
  actions.className = "dialog-actions primary-result-actions";
  if (result.source?.url) {
    const source = document.createElement("a");
    source.className = "button primary";
    source.href = result.source.url;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = "Original chat ↗";
    source.addEventListener("click", () => recordActivity(id, "source.open"));
    actions.appendChild(source);
  }
  const continuation = document.createElement("button");
  continuation.type = "button";
  continuation.className = "button primary";
  continuation.textContent = "Continue in new chat ↗";
  continuation.addEventListener("click", () => {
    resultDialog.close();
    continuationController.continue(id);
  });
  actions.appendChild(continuation);
  const more = document.createElement("details");
  more.className = "more-actions";
  const summary = document.createElement("summary");
  summary.className = "button ghost";
  summary.textContent = "More ···";
  const context = document.createElement("button");
  context.type = "button";
  context.className = "button ghost";
  context.textContent = "Context Pack";
  context.addEventListener("click", () => {
    resultDialog.close();
    openContext(id);
  });
  const preview = document.createElement("button");
  preview.type = "button";
  preview.className = "button ghost";
  preview.textContent = "Preview context";
  preview.addEventListener("click", () => {
    resultDialog.close();
    continuationController.preview(id);
  });
  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "button ghost";
  copy.textContent = "Copy continuation brief";
  copy.addEventListener("click", () => continuationController.copy(id));
  more.append(summary, preview, copy, context);
  actions.appendChild(more);
  return actions;
}

function openResult(id) {
  const result = results.find(item => item.id === id);
  if (!result) return;
  recordActivity(id, "opened");
  resultDialogContent.replaceChildren();
  const category = document.createElement("p");
  category.className = "eyebrow";
  category.textContent = result.category;
  const title = document.createElement("h2");
  title.textContent = result.title;
  const summary = document.createElement("p");
  summary.className = "muted";
  summary.textContent = result.summary;
  const badge = immutableBadge(result);
  const details = document.createElement("div");
  details.className = "detail-grid";
  details.appendChild(detailBlock("Decisions", (result.decisions || []).join(" • ") || "No decisions captured yet."));
  details.appendChild(detailBlock("Next", result.next || "No next step captured yet."));
  if (result.contentHash) details.appendChild(detailBlock("Content hash", result.contentHash));
  if (result._vaultConflictCount > 1) details.appendChild(detailBlock("Vault", `${result._vaultConflictCount} conflicting revisions preserved`));
  resultDialogContent.append(category, title, badge, summary, details, actionBar(result, id));
  resultDialog.showModal();
}

function makeContextPack(result) {
  return [
    "# DashGPT Context Pack v0.4", "", `TITLE: ${result.title}`, `CATEGORY: ${result.category}`,
    `CONTENT IMMUTABLE: ${Boolean(result.immutable)}`, `CONTENT VERSION: ${result.contentVersion || 1}`,
    `CONTENT HASH: ${result.contentHash || "Not captured."}`, `CONTENT INTEGRITY: ${(result._integrity || "unverified").toUpperCase()}`,
    `RESULT PAGE: ${new URL(resultPagePath(result), window.location.origin)}`, "", "SUMMARY:", result.summary, "", "DECISIONS:",
    ...(result.decisions || []).map(item => `- ${item}`), "", "TAGS:", (result.tags || []).map(tag => `#${tag}`).join(" ") || "none",
    "", "SOURCE:", result.source?.url || "Not captured.", "", "NEXT INTENDED ACTION:", result.next || "Not captured.", "",
    "CONTINUATION INSTRUCTION:", "Continue from this state. Preserve the immutable content above; create a new revision instead of silently rewriting it."
  ].join("\n");
}

function openContext(id) {
  const result = results.find(item => item.id === id);
  if (!result) return;
  contextOutput.value = makeContextPack(result);
  contextDialog.showModal();
}

async function copyContext() {
  try {
    await navigator.clipboard.writeText(contextOutput.value);
    const button = document.querySelector("#copyContextButton");
    button.textContent = "Copied ✓";
    setTimeout(() => { button.textContent = "Copy Context"; }, 1200);
  } catch {
    contextOutput.select();
    document.execCommand("copy");
  }
}

function addResult(formData) {
  const title = String(formData.get("title") || "").trim();
  const summary = String(formData.get("summary") || "").trim();
  const category = String(formData.get("category") || "Ideas").trim() || "Ideas";
  const tags = String(formData.get("tags") || "").split(",").map(tag => tag.trim()).filter(Boolean);
  const next = String(formData.get("next") || "").trim();
  const created = {
    id: `${Date.now()}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "result"}`,
    schemaVersion: 1,
    title,
    summary,
    category,
    tags,
    favorite: false,
    decisions: [],
    next,
    immutable: false,
    contentVersion: 1,
    _integrity: "local"
  };
  results.unshift(created);
  persistRuntimeResults();
  recordActivity(created.id, "created");
  activeCategory = "All";
  favoritesOnly = false;
  searchInput.value = "";
  renderDashboard();
}

function routeResultId() {
  const match = window.location.pathname.match(/^\/demo\/result\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function paragraph(text, className = "") {
  const p = document.createElement("p");
  p.className = className;
  p.textContent = text;
  return p;
}

function renderStandaloneResult(result) {
  dashboardView.hidden = true;
  resultPage.hidden = false;
  addResultButton.hidden = true;
  resultPage.replaceChildren();
  if (!result) {
    resultPage.append(paragraph("Result not found.", "muted"));
    return;
  }
  const article = document.createElement("article");
  article.className = "published-result";
  applySemanticVisual(article, result);
  const category = paragraph(result.category || "Result", "eyebrow");
  const title = document.createElement("h1");
  title.className = "result-page-title";
  title.textContent = result.title;
  const lead = paragraph(result.summary, "result-lead");
  article.append(category, title, immutableBadge(result), lead);
  const tags = document.createElement("div");
  tags.className = "tags page-tags";
  (result.tags || []).forEach(tag => tags.appendChild(tagNode(tag)));
  article.appendChild(tags);
  const details = document.createElement("div");
  details.className = "detail-grid page-details";
  details.appendChild(detailBlock("Decisions", (result.decisions || []).join(" • ") || "No decisions captured yet."));
  details.appendChild(detailBlock("Next", result.next || "No next step captured yet."));
  if (result.source?.url) details.appendChild(sourceBlock(result.source, result.id));
  article.append(details);
  const actions = document.createElement("div");
  actions.className = "page-actions";
  const back = document.createElement("a");
  back.className = "button ghost";
  back.href = "/demo/";
  back.textContent = "← Dashboard";
  actions.append(back);
  if (result.source?.url) {
    const source = document.createElement("a");
    source.className = "button primary";
    source.href = result.source.url;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = "Original chat ↗";
    source.addEventListener("click", () => recordActivity(result.id, "source.open"));
    actions.append(source);
  }
  const continuation = document.createElement("button");
  continuation.type = "button";
  continuation.className = "button primary";
  continuation.textContent = "Continue in new chat ↗";
  continuation.addEventListener("click", () => continuationController.continue(result.id));
  actions.append(continuation);
  const preview = document.createElement("button");
  preview.className = "button ghost";
  preview.type = "button";
  preview.textContent = "Preview context";
  preview.addEventListener("click", () => continuationController.preview(result.id));
  actions.append(preview);
  const copy = document.createElement("button");
  copy.className = "button ghost";
  copy.type = "button";
  copy.textContent = "Copy continuation brief";
  copy.addEventListener("click", () => continuationController.copy(result.id));
  actions.append(copy);
  const context = document.createElement("button");
  context.className = "button ghost";
  context.type = "button";
  context.textContent = "Context Pack";
  context.addEventListener("click", () => openContext(result.id));
  actions.append(context);
  resultPage.append(actions, article);
}

function renderStorageStatus() {
  if (!vault || !storageButton) return;
  const status = vaultAdapter.status(vault);
  storageButton.textContent = status.label;
  storageButton.dataset.state = status.remote;
  if (storageStatusText) storageStatusText.textContent = "This browser is the active local vault. No cloud provider is paired yet.";
  if (storageVaultId) storageVaultId.textContent = status.vaultId;
  if (storageObjectCount) storageObjectCount.textContent = `${status.resultObjects} result revisions · ${status.dashes} dashes · ${status.events} state events`;
  if (storageMigrationNote) {
    storageMigrationNote.hidden = !vaultLoadInfo?.migratedFrom;
    if (vaultLoadInfo?.migratedFrom) storageMigrationNote.textContent = `Migrated safely from ${vaultLoadInfo.migratedFrom}. The legacy copy was left untouched.`;
  }
}

function exportVaultFile() {
  const payload = exportVaultBundle(vault);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `dashgpt-vault-${vault.vaultId}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function reloadFromVault() {
  const published = await loadPublishedResults();
  const local = materializeResults(vault);
  results = await attachIntegrity(mergePublishedAndLocal(published, local));
  if (activeCategory !== "All" && !results.some(result => result.category === activeCategory)) activeCategory = "All";
  persistRuntimeResults();
  dashUi?.renderList();
  const dashId = dashUi?.routeDashId();
  if (dashId) {
    dashUi.renderDashPage(dashId);
    return;
  }
  const id = routeResultId();
  if (id) {
    if (!routeOpenRecorded && results.some(item => item.id === id)) {
      recordActivity(id, "opened");
      routeOpenRecorded = true;
    }
    renderStandaloneResult(results.find(item => item.id === id));
  }
  else renderDashboard();
}

async function importVaultFile(file) {
  storageImportMessage.textContent = "";
  try {
    const incoming = importVaultBundle(await file.text());
    const emptyCurrent = vault.results.length === 0 && vault.events.length === 0 && vault.profileRevisions.length === 0 && (vault.dashRevisions || []).length === 0;
    vault = emptyCurrent ? incoming : mergeVaults(vault, incoming);
    vaultLoadInfo = { migratedFrom: null, created: false };
    vaultAdapter.save(vault);
    await reloadFromVault();
    storageImportMessage.textContent = "Vault imported and merged. Existing immutable conflicts were preserved.";
  } catch (error) {
    storageImportMessage.textContent = `Import failed: ${error.message}`;
  }
}

async function init() {
  galleryZoomController = createGalleryZoomController({
    root: galleryRegion,
    range: galleryZoom,
    decrease: galleryZoomOut,
    increase: galleryZoomIn,
    output: galleryZoomValue,
    initialDensityIndex: galleryState.densityIndex,
    onCommit(index) {
      galleryState.densityIndex = index;
      persistGalleryView();
    }
  });
  vaultLoadInfo = vaultAdapter.load();
  vault = vaultLoadInfo.vault;
  continuationController = createContinuationController({
    getResult: id => results.find(item => item.id === id),
    onSuccess: ({ resultId }) => recordContinuationSuccess(resultId)
  });
  dashUi = createSemanticDashUi({
    getVault: () => vault,
    getResults: () => results,
    saveVault: currentVault => {
      vaultAdapter.save(currentVault);
      renderStorageStatus();
    },
    openResult,
    continueResult: id => continuationController.continue(id),
    recordActivity,
    decorateResultCard: applySemanticVisual,
    renderMemberGallery: renderDashMemberGallery,
    releaseMemberGallery: releaseDashMemberGallery,
    renderDashboard
  });
  renderStorageStatus();
  await reloadFromVault();
  dashUi.importFromHash();
}

searchInput?.addEventListener("input", () => {
  persistGalleryView();
  renderDashboard();
});
showFavoritesButton?.addEventListener("click", () => {
  favoritesOnly = true;
  persistGalleryView();
  renderDashboard();
});
showAllButton?.addEventListener("click", () => {
  favoritesOnly = false;
  activeCategory = "All";
  searchInput.value = "";
  persistGalleryView();
  renderDashboard();
});
resultDialog?.addEventListener("close", () => {
  const dashId = dashUi?.routeDashId?.();
  if (dashId) dashUi.renderDashPage(dashId);
  else renderDashboard();
});
addResultButton?.addEventListener("click", () => addDialog.showModal());
document.querySelector("#cancelAddButton")?.addEventListener("click", () => addDialog.close());
addResultForm?.addEventListener("submit", event => {
  event.preventDefault();
  addResult(new FormData(addResultForm));
  addResultForm.reset();
  addDialog.close();
});
document.querySelector("#copyContextButton")?.addEventListener("click", copyContext);
storageButton?.addEventListener("click", () => {
  renderStorageStatus();
  storageImportMessage.textContent = "";
  storageDialog.showModal();
});
document.querySelector("#exportVaultButton")?.addEventListener("click", exportVaultFile);
document.querySelector("#importVaultButton")?.addEventListener("click", () => storageImportInput.click());
storageImportInput?.addEventListener("change", async () => {
  const [file] = storageImportInput.files || [];
  if (file) await importVaultFile(file);
  storageImportInput.value = "";
});

init();
