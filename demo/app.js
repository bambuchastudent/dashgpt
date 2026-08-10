import {
  exportVaultBundle,
  importVaultBundle,
  loadBrowserVault,
  materializeResults,
  mergeVaults,
  putResult,
  saveBrowserVault,
  setFavorite,
  vaultStatus
} from "./vault.js";
import { rankResults } from "./semantic-dashes.js";
import { createSemanticDashUi } from "./semantic-dash-ui.js";

const DURABLE_FIELDS = ["id", "title", "summary", "category", "tags", "decisions", "next", "source"];
const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;
const LEGACY_SEED_IDS = new Set(["dashgpt-product", "development-workflow", "deployment"]);

let results = [];
let vault;
let vaultLoadInfo;
let activeCategory = "All";
let favoritesOnly = false;
let dashUi;

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

function stableHash(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function semanticHue(result) {
  const semantic = `${result.category || ""} ${result.title || ""} ${(result.tags || []).join(" ")}`.toLowerCase();
  const anchors = [
    { words: ["еда", "food", "recipe", "soup", "chicken", "kiev", "korean", "pechuga"], hue: 28 },
    { words: ["дом", "home", "air-conditioner", "cleaning", "drainage", "filter"], hue: 178 },
    { words: ["поезд", "trip", "travel", "camping", "fishing", "gva", "permit"], hue: 105 },
    { words: ["dashgpt", "product", "context", "openspec", "ai"], hue: 266 },
    { words: ["испан", "spanish", "language"], hue: 48 },
    { words: ["tech", "code", "dev", "github", "software"], hue: 220 }
  ];
  let weighted = 0;
  let total = 0;
  for (const anchor of anchors) {
    const hits = anchor.words.reduce((count, word) => count + (semantic.includes(word) ? 1 : 0), 0);
    if (hits) {
      weighted += anchor.hue * hits;
      total += hits;
    }
  }
  const perturb = (stableHash(`${result.title}|${(result.tags || []).join("|")}`) % 25) - 12;
  return Math.round(((total ? weighted / total : stableHash(semantic) % 360) + perturb + 360) % 360);
}

function applySemanticVisual(element, result) {
  const hue = semanticHue(result);
  element.style.setProperty("--semantic-hue", hue);
  element.style.setProperty("--semantic-hue-2", (hue + 28) % 360);
}

function renderDashboard() {
  renderCategoryFilters();
  const visible = filteredResults();
  resultsGrid.replaceChildren();
  visible.forEach(result => resultsGrid.appendChild(createCard(result)));
  resultCount.textContent = `${visible.length} / ${results.length}`;
  resultsTitle.textContent = favoritesOnly ? "Favorites" : "Everything worth keeping";
  emptyState.hidden = visible.length !== 0;
  updateSummary();
}

function createCard(result) {
  const node = cardTemplate.content.cloneNode(true);
  const card = node.querySelector(".result-card");
  applySemanticVisual(card, result);
  node.querySelector(".category").textContent = result.category;
  node.querySelector(".title").textContent = result.title;
  node.querySelector(".summary").textContent = result.summary;
  const favoriteButton = node.querySelector(".favorite-button");
  favoriteButton.textContent = result.favorite ? "★" : "☆";
  favoriteButton.setAttribute("aria-pressed", String(Boolean(result.favorite)));
  favoriteButton.addEventListener("click", () => toggleFavorite(result.id));
  const tags = node.querySelector(".tags");
  (result.tags || []).forEach(tag => tags.appendChild(tagNode(tag)));
  const pageLink = node.querySelector(".page-link");
  pageLink.href = resultPagePath(result);
  pageLink.setAttribute("aria-label", `Open ${result.title}`);
  node.querySelector(".open-button").addEventListener("click", () => openResult(result.id));
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

function sourceBlock(source) {
  const block = document.createElement("div");
  block.className = "detail-block";
  const strong = document.createElement("strong");
  strong.textContent = "Source";
  const link = document.createElement("a");
  link.href = source.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = source.type === "chatgpt-share" ? "Open original chat ↗" : "Open source ↗";
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

function continuationText(result) {
  return `Continue this work from the saved DashGPT Result.\n\nTitle: ${result.title}\nSummary: ${result.summary}\n\nDecisions:\n${(result.decisions || []).map(item => `- ${item}`).join("\n") || "- None captured"}\n\nNext intended action: ${result.next || "Continue from the summary."}`;
}

function continuationUrl(result) {
  return `https://chatgpt.com/?q=${encodeURIComponent(continuationText(result))}`;
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
    actions.appendChild(source);
  }
  const continuation = document.createElement("a");
  continuation.className = "button primary";
  continuation.href = continuationUrl(result);
  continuation.target = "_blank";
  continuation.rel = "noopener noreferrer";
  continuation.textContent = "Continue in new chat ↗";
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
  more.append(summary, context);
  actions.appendChild(more);
  return actions;
}

function openResult(id) {
  const result = results.find(item => item.id === id);
  if (!result) return;
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
  results.unshift({
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
  });
  persistRuntimeResults();
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
  if (result.source?.url) details.appendChild(sourceBlock(result.source));
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
    actions.append(source);
  }
  const continuation = document.createElement("a");
  continuation.className = "button primary";
  continuation.href = continuationUrl(result);
  continuation.target = "_blank";
  continuation.rel = "noopener noreferrer";
  continuation.textContent = "Continue in new chat ↗";
  actions.append(continuation);
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
  persistRuntimeResults();
  dashUi?.renderList();
  const dashId = dashUi?.routeDashId();
  if (dashId) {
    dashUi.renderDashPage(dashId);
    return;
  }
  const id = routeResultId();
  if (id) renderStandaloneResult(results.find(item => item.id === id));
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
  vaultLoadInfo = vaultAdapter.load();
  vault = vaultLoadInfo.vault;
  dashUi = createSemanticDashUi({
    getVault: () => vault,
    getResults: () => results,
    saveVault: currentVault => {
      vaultAdapter.save(currentVault);
      renderStorageStatus();
    },
    openResult,
    continuationUrl
  });
  renderStorageStatus();
  await reloadFromVault();
  dashUi.importFromHash();
}

searchInput?.addEventListener("input", renderDashboard);
document.querySelector("#showFavoritesButton")?.addEventListener("click", () => {
  favoritesOnly = true;
  renderDashboard();
});
document.querySelector("#showAllButton")?.addEventListener("click", () => {
  favoritesOnly = false;
  activeCategory = "All";
  searchInput.value = "";
  renderDashboard();
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
