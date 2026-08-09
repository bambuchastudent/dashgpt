const STORAGE_KEY = "dashgpt.demo.results.v2";
const LEGACY_STORAGE_KEY = "dashgpt.demo.results.v1";
const LEGACY_SEED_IDS = new Set(["dashgpt-product", "development-workflow", "deployment"]);
const DURABLE_FIELDS = ["id", "title", "summary", "category", "tags", "decisions", "next", "source"];
const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;
const SEMANTIC_COLOR_VERSION = 1;
const SEMANTIC_COLOR_ANCHORS = [
  { hue: 18, terms: ["car", "cars", "auto", "automobile", "vehicle", "авто", "автомоб", "машин", "coche", "vehículo"] },
  { hue: 48, terms: ["transport", "transit", "route", "metro", "bus", "train", "mobility", "транспорт", "маршрут", "метро", "автобус", "поезд", "ruta"] },
  { hue: 78, terms: ["travel", "trip", "flight", "hotel", "tour", "поездк", "путешеств", "рейс", "отел", "viaje"] },
  { hue: 112, terms: ["food", "recipe", "cook", "еда", "рецепт", "готов", "comida", "receta"] },
  { hue: 148, terms: ["nature", "camp", "garden", "plant", "природ", "кемп", "растен", "naturaleza"] },
  { hue: 188, terms: ["project", "product", "design", "проект", "продукт", "дизайн"] },
  { hue: 218, terms: ["code", "software", "api", "agent", "ai", "код", "разработ", "ии", "агент"] },
  { hue: 252, terms: ["work", "business", "career", "работ", "бизнес", "карьер"] },
  { hue: 286, terms: ["home", "housing", "repair", "дом", "жиль", "ремонт", "casa"] },
  { hue: 324, terms: ["health", "medical", "wellness", "здоров", "медиц", "salud"] },
  { hue: 352, terms: ["people", "family", "relationship", "люд", "семь", "отношен"] }
];

let results = [];
let activeCategory = "All";
let favoritesOnly = false;

const resultsGrid = document.querySelector("#resultsGrid"),
  resultCount = document.querySelector("#resultCount"),
  resultsTitle = document.querySelector("#resultsTitle"),
  emptyState = document.querySelector("#emptyState"),
  searchInput = document.querySelector("#searchInput"),
  categoryFilters = document.querySelector("#categoryFilters"),
  cardTemplate = document.querySelector("#resultCardTemplate"),
  resultDialog = document.querySelector("#resultDialog"),
  resultDialogContent = document.querySelector("#resultDialogContent"),
  contextDialog = document.querySelector("#contextDialog"),
  contextOutput = document.querySelector("#contextOutput"),
  addDialog = document.querySelector("#addDialog"),
  addResultForm = document.querySelector("#addResultForm"),
  dashboardView = document.querySelector("#dashboardView"),
  resultPage = document.querySelector("#resultPage"),
  addResultButton = document.querySelector("#addResultButton");

function validResult(result) {
  return Boolean(
    result &&
      typeof result.id === "string" &&
      typeof result.title === "string" &&
      typeof result.summary === "string"
  );
}

function durablePayload(result) {
  const payload = {};
  for (const field of DURABLE_FIELDS) {
    if (result[field] !== undefined) payload[field] = result[field];
  }
  return payload;
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function hashResult(result) {
  const bytes = new TextEncoder().encode(canonicalize(durablePayload(result)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
  return Promise.all(
    items.map(async (result) => ({ ...result, _integrity: await integrityStatus(result) }))
  );
}

async function loadPublishedResults() {
  try {
    const response = await fetch("/demo/data/results.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Published Result catalog returned ${response.status}`);
    const parsed = await response.json();
    return Array.isArray(parsed) ? parsed.filter(validResult) : [];
  } catch (error) {
    console.warn("DashGPT: published Result catalog unavailable; using browser-local cache.", error);
    return [];
  }
}

function loadLocalResults() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(current)) return current.filter(validResult);

    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    return Array.isArray(legacy)
      ? legacy.filter((result) => validResult(result) && !LEGACY_SEED_IDS.has(result.id))
      : [];
  } catch {
    return [];
  }
}

function mergePublishedAndLocal(published, local) {
  const localById = new Map(local.map((result) => [result.id, result]));
  const merged = new Map();

  published.forEach((publishedResult) => {
    const localResult = localById.get(publishedResult.id);
    const favorite =
      localResult && typeof localResult.favorite === "boolean"
        ? localResult.favorite
        : Boolean(publishedResult.favorite);

    merged.set(publishedResult.id, {
      ...structuredClone(publishedResult),
      favorite
    });
  });

  local.forEach((localResult) => {
    if (!merged.has(localResult.id) && !LEGACY_SEED_IDS.has(localResult.id)) {
      merged.set(localResult.id, localResult);
    }
  });

  return [...merged.values()];
}

function serializableResults() {
  return results.map(({ _integrity, ...result }) => result);
}

function saveResults() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableResults()));
  updateSummary();
}

function updateSummary() {
  const favorites = results.filter((r) => r.favorite).length;
  const verified = results.filter((r) => r._integrity === "verified").length;
  const summary = document.querySelector("#summaryText");
  if (summary) {
    summary.textContent = `${results.length} results, ${favorites} favorites, ${verified} immutable verified. Search, open a result, or generate a portable Context Pack.`;
  }
}

function categories() {
  return ["All", ...new Set(results.map((r) => r.category).filter(Boolean))];
}

function renderCategoryFilters() {
  categoryFilters.replaceChildren();
  categories().forEach((category) => {
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
  const query = searchInput.value.trim().toLowerCase();
  return results.filter((result) => {
    const categoryMatch = activeCategory === "All" || result.category === activeCategory;
    const favoriteMatch = !favoritesOnly || result.favorite;
    const haystack = [
      result.title,
      result.summary,
      result.category,
      ...(result.tags || []),
      ...(result.decisions || []),
      result.next,
      result.source?.url
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return categoryMatch && favoriteMatch && (!query || haystack.includes(query));
  });
}

function resultPagePath(result) {
  return `/demo/result/${encodeURIComponent(result.id)}/`;
}

function semanticText(result) {
  return [
    result.title,
    result.summary,
    result.category,
    ...(result.tags || []),
    ...(result.decisions || []),
    result.next
  ].filter(Boolean).join(" ").toLowerCase();
}

function semanticColorFor(result) {
  if (result.semanticColor?.version === SEMANTIC_COLOR_VERSION) return result.semanticColor;
  const text = semanticText(result);
  const matches = SEMANTIC_COLOR_ANCHORS
    .map((anchor) => ({
      ...anchor,
      weight: anchor.terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0)
    }))
    .filter((anchor) => anchor.weight > 0);

  if (!matches.length) {
    const seed = [...String(result.category || result.title)].reduce(
      (hash, character) => ((hash * 31) + character.codePointAt(0)) >>> 0,
      17
    );
    return { hue: seed % 360, saturation: 48, lightness: 42, version: SEMANTIC_COLOR_VERSION };
  }

  const vector = matches.reduce(
    (sum, anchor) => {
      const radians = anchor.hue * Math.PI / 180;
      sum.x += Math.cos(radians) * anchor.weight;
      sum.y += Math.sin(radians) * anchor.weight;
      sum.weight += anchor.weight;
      return sum;
    },
    { x: 0, y: 0, weight: 0 }
  );
  const hue = Math.round((Math.atan2(vector.y, vector.x) * 180 / Math.PI + 360) % 360);
  const diversity = Math.min(matches.length, 4);
  return {
    hue,
    saturation: Math.max(44, 64 - diversity * 4),
    lightness: 42,
    version: SEMANTIC_COLOR_VERSION
  };
}

function applySemanticColor(element, result) {
  const color = semanticColorFor(result);
  element.style.setProperty("--card-hue", String(color.hue));
  element.style.setProperty("--card-saturation", `${color.saturation}%`);
  element.style.setProperty("--card-lightness", `${color.lightness}%`);
}

function continuationPrompt(result) {
  return [
    "Continue this work from the saved DashGPT Result.",
    "",
    `Title: ${result.title}`,
    `Summary: ${result.summary}`,
    "",
    "Decisions:",
    ...(result.decisions || []).map((item) => `- ${item}`),
    "",
    `Next intended action: ${result.next || "Decide the best next step."}`,
    "",
    "Do not restart the topic from scratch. Ask only for information that is genuinely missing."
  ].join("\n");
}

function continueChatUrl(result) {
  const url = new URL("https://chatgpt.com/");
  url.searchParams.set("q", continuationPrompt(result));
  return url.toString();
}

function moreMenu(result) {
  const menu = document.createElement("details");
  menu.className = "more-menu";
  const summary = document.createElement("summary");
  summary.className = "button ghost";
  summary.textContent = "More";
  const panel = document.createElement("div");
  panel.className = "more-menu-panel";
  const contextButton = document.createElement("button");
  contextButton.type = "button";
  contextButton.className = "button ghost";
  contextButton.textContent = "Context Pack";
  contextButton.addEventListener("click", () => openContext(result.id));
  panel.append(contextButton);
  menu.append(summary, panel);
  return menu;
}

function renderDashboard() {
  renderCategoryFilters();
  const visible = filteredResults();
  resultsGrid.replaceChildren();
  visible.forEach((result) => resultsGrid.appendChild(createCard(result)));
  resultCount.textContent = `${visible.length} / ${results.length}`;
  resultsTitle.textContent = favoritesOnly ? "Favorites" : "Everything worth keeping";
  emptyState.hidden = visible.length !== 0;
  updateSummary();
}

function createCard(result) {
  const node = cardTemplate.content.cloneNode(true);
  const card = node.querySelector(".result-card");
  applySemanticColor(card, result);
  node.querySelector(".category").textContent = result.category;
  node.querySelector(".title").textContent = result.title;
  node.querySelector(".summary").textContent = result.summary;
  node.querySelector(".decision-preview").textContent =
    (result.decisions || [])[0] || "No key decision captured yet.";
  node.querySelector(".next-preview").textContent =
    result.next || "No next action captured yet.";

  const favoriteButton = node.querySelector(".favorite-button");
  favoriteButton.textContent = result.favorite ? "★" : "☆";
  favoriteButton.setAttribute("aria-pressed", String(Boolean(result.favorite)));
  favoriteButton.addEventListener("click", () => toggleFavorite(result.id));

  const tags = node.querySelector(".tags");
  (result.tags || []).forEach((tag) => tags.appendChild(tagNode(tag)));

  const pageLink = node.querySelector(".page-link");
  pageLink.href = resultPagePath(result);
  pageLink.setAttribute("aria-label", `Open ${result.title}`);

  return node;
}

function tagNode(tag) {
  const item = document.createElement("span");
  item.className = "tag";
  item.textContent = `#${tag}`;
  return item;
}

function toggleFavorite(id) {
  results = results.map((result) =>
    result.id === id ? { ...result, favorite: !result.favorite } : result
  );
  saveResults();
  if (!resultPage.hidden) {
    renderStandaloneResult(results.find((item) => item.id === id));
  } else {
    renderDashboard();
  }
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
  link.textContent = source.type === "chatgpt-share" ? "Open source chat ↗" : "Open source ↗";

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

function openResult(id) {
  const result = results.find((item) => item.id === id);
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
  details.appendChild(
    detailBlock("Decisions", (result.decisions || []).join(" • ") || "No decisions captured yet.")
  );
  details.appendChild(detailBlock("Next", result.next || "No next step captured yet."));
  if (result.contentHash) details.appendChild(detailBlock("Content hash", result.contentHash));
  if (result.source?.url) details.appendChild(sourceBlock(result.source));

  const actions = document.createElement("div");
  actions.className = "dialog-actions";
  const pageLink = document.createElement("a");
  pageLink.className = "button";
  pageLink.href = resultPagePath(result);
  pageLink.textContent = "Open Page";
  const continueLink = document.createElement("a");
  continueLink.className = "button primary";
  continueLink.href = continueChatUrl(result);
  continueLink.target = "_blank";
  continueLink.rel = "noopener noreferrer";
  continueLink.textContent = "Continue in new chat";
  actions.append(pageLink, continueLink, moreMenu(result));

  resultDialogContent.append(category, title, badge, summary, details, actions);
  resultDialog.showModal();
}

function makeContextPack(result) {
  return [
    "# DashGPT Context Pack v0.4",
    "",
    `TITLE: ${result.title}`,
    `CATEGORY: ${result.category}`,
    `CONTENT IMMUTABLE: ${Boolean(result.immutable)}`,
    `CONTENT VERSION: ${result.contentVersion || 1}`,
    `CONTENT HASH: ${result.contentHash || "Not captured."}`,
    `CONTENT INTEGRITY: ${(result._integrity || "unverified").toUpperCase()}`,
    `RESULT PAGE: ${new URL(resultPagePath(result), window.location.origin)}`,
    "",
    "SUMMARY:",
    result.summary,
    "",
    "DECISIONS:",
    ...(result.decisions || []).map((item) => `- ${item}`),
    "",
    "TAGS:",
    (result.tags || []).map((tag) => `#${tag}`).join(" ") || "none",
    "",
    "SOURCE:",
    result.source?.url || "Not captured.",
    "",
    "NEXT INTENDED ACTION:",
    result.next || "Not captured.",
    "",
    "CONTINUATION INSTRUCTION:",
    "Continue from this state. Preserve the immutable content above; create a new revision instead of silently rewriting it."
  ].join("\n");
}

function openContext(id) {
  const result = results.find((item) => item.id === id);
  if (!result) return;
  contextOutput.value = makeContextPack(result);
  contextDialog.showModal();
}

async function copyContext() {
  try {
    await navigator.clipboard.writeText(contextOutput.value);
    const button = document.querySelector("#copyContextButton");
    button.textContent = "Copied ✓";
    setTimeout(() => (button.textContent = "Copy Context"), 1200);
  } catch {
    contextOutput.select();
    document.execCommand("copy");
  }
}

function addResult(formData) {
  const title = String(formData.get("title") || "").trim(),
    summary = String(formData.get("summary") || "").trim(),
    category = String(formData.get("category") || "Ideas").trim() || "Ideas",
    tags = String(formData.get("tags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    next = String(formData.get("next") || "").trim();

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
    semanticColor: semanticColorFor({ title, summary, category, tags, decisions: [], next }),
    immutable: false,
    contentVersion: 1,
    _integrity: "local"
  });

  saveResults();
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
    const back = document.createElement("a");
    back.href = "/demo/";
    back.className = "button";
    back.textContent = "← Dashboard";
    const title = document.createElement("h2");
    title.textContent = "Result not found";
    resultPage.append(back, title, paragraph("This Result is not available in the published catalog or this browser."));
    document.title = "Result not found — DashGPT";
    return;
  }

  document.title = `${result.title} — DashGPT`;

  const nav = document.createElement("div");
  nav.className = "page-nav";
  const back = document.createElement("a");
  back.href = "/demo/";
  back.className = "button ghost";
  back.textContent = "← Dashboard";
  nav.append(back, immutableBadge(result));

  const article = document.createElement("article");
  article.className = "published-result";
  applySemanticColor(article, result);
  article.append(paragraph(result.category || "Result", "eyebrow"));

  const title = document.createElement("h2");
  title.className = "result-page-title";
  title.textContent = result.title;
  article.append(title, paragraph(result.summary, "result-lead"));

  const tags = document.createElement("div");
  tags.className = "tags page-tags";
  (result.tags || []).forEach((tag) => tags.appendChild(tagNode(tag)));
  article.append(tags);

  const details = document.createElement("div");
  details.className = "detail-grid page-details";

  const decisions = document.createElement("div");
  decisions.className = "detail-block";
  const decisionsTitle = document.createElement("strong");
  decisionsTitle.textContent = "Decisions";
  const list = document.createElement("ul");
  (result.decisions || []).forEach((decision) => {
    const li = document.createElement("li");
    li.textContent = decision;
    list.appendChild(li);
  });
  if (!list.children.length) {
    list.appendChild(Object.assign(document.createElement("li"), { textContent: "No decisions captured yet." }));
  }
  decisions.append(decisionsTitle, list);
  details.append(decisions, detailBlock("Next", result.next || "No next step captured yet."));
  if (result.contentHash) details.append(detailBlock("Content hash", result.contentHash));
  if (result.source?.url) details.append(sourceBlock(result.source));
  article.append(details);

  const actions = document.createElement("div");
  actions.className = "page-actions";
  if (result.source?.url) {
    const sourceLink = document.createElement("a");
    sourceLink.className = "button";
    sourceLink.href = result.source.url;
    sourceLink.target = "_blank";
    sourceLink.rel = "noopener noreferrer";
    sourceLink.textContent = result.source.type === "chatgpt-share" ? "Open original chat ↗" : "Open source ↗";
    actions.append(sourceLink);
  }
  const continueLink = document.createElement("a");
  continueLink.className = "button primary";
  continueLink.href = continueChatUrl(result);
  continueLink.target = "_blank";
  continueLink.rel = "noopener noreferrer";
  continueLink.textContent = "Continue in new chat";
  actions.append(continueLink);
  const favoriteButton = document.createElement("button");
  favoriteButton.className = "button";
  favoriteButton.type = "button";
  favoriteButton.textContent = result.favorite ? "★ Favorite" : "☆ Favorite";
  favoriteButton.addEventListener("click", () => toggleFavorite(result.id));
  actions.append(favoriteButton, moreMenu(result));

  const immutabilityNote = paragraph(
    result._integrity === "verified"
      ? "Verified immutable content. DashGPT may update this page’s shared renderer and visual design, but these knowledge fields are protected by the content hash. A knowledge change requires an explicit new revision."
      : result._integrity === "mismatch"
        ? "Integrity check failed. This page is refusing to describe the content as verified; compare it with its published source before relying on it."
        : result.immutable
          ? "This Result is marked immutable, but its content hash could not be verified in this browser."
          : "This is a browser-local draft and is not an immutable published Result.",
    `immutability-note${result._integrity === "mismatch" ? " danger" : ""}`
  );

  resultPage.append(nav, article, actions, immutabilityNote);
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function importPayloadFromHash() {
  if (!window.location.hash.startsWith("#import=")) return null;
  const encoded = window.location.hash.slice("#import=".length);
  if (!encoded || encoded.length > 20000) throw new Error("Import payload is missing or too large.");
  const parsed = JSON.parse(decodeBase64Url(encoded));
  if (!validResult(parsed)) throw new Error("Import payload is not a valid DashGPT Result.");
  return parsed;
}

async function importResultFromHash() {
  const imported = importPayloadFromHash();
  if (!imported) return null;
  if (imported.schemaVersion !== 1) throw new Error("Unsupported Result schema version.");
  if (imported.immutable !== true) throw new Error("Plugin imports must be immutable Results.");
  if (!HASH_PATTERN.test(imported.contentHash || "")) throw new Error("Imported Result has no valid content hash.");

  const status = await integrityStatus(imported);
  if (status !== "verified") throw new Error("Imported Result failed its integrity check.");

  const existing = results.find((item) => item.id === imported.id);
  const stored = {
    ...imported,
    favorite: existing && typeof existing.favorite === "boolean" ? existing.favorite : Boolean(imported.favorite),
    _integrity: "verified"
  };
  results = [stored, ...results.filter((item) => item.id !== imported.id)];
  saveResults();
  history.replaceState({}, "", resultPagePath(stored));
  return stored;
}

function renderImportError(error) {
  dashboardView.hidden = true;
  resultPage.hidden = false;
  addResultButton.hidden = true;
  resultPage.replaceChildren();
  const back = document.createElement("a");
  back.href = "/demo/";
  back.className = "button";
  back.textContent = "← Dashboard";
  const title = document.createElement("h2");
  title.textContent = "DashGPT import rejected";
  const detail = paragraph(error instanceof Error ? error.message : "Invalid Result import.", "immutability-note danger");
  resultPage.append(back, title, detail);
  document.title = "Import rejected — DashGPT";
}

async function bootstrap() {
  const local = loadLocalResults();
  const published = await loadPublishedResults();
  results = await attachIntegrity(mergePublishedAndLocal(published, local));
  saveResults();

  try {
    const imported = await importResultFromHash();
    if (imported) {
      renderStandaloneResult(imported);
      return;
    }
  } catch (error) {
    renderImportError(error);
    return;
  }

  const resultId = routeResultId();
  if (resultId) {
    renderStandaloneResult(results.find((item) => item.id === resultId));
  } else {
    dashboardView.hidden = false;
    resultPage.hidden = true;
    addResultButton.hidden = false;
    renderDashboard();
  }
}

searchInput.addEventListener("input", renderDashboard);
document.querySelector("#showFavoritesButton").addEventListener("click", () => {
  favoritesOnly = true;
  renderDashboard();
});
document.querySelector("#showAllButton").addEventListener("click", () => {
  favoritesOnly = false;
  renderDashboard();
});
document.querySelector("#copyContextButton").addEventListener("click", copyContext);
addResultButton.addEventListener("click", () => addDialog.showModal());
document.querySelector("#cancelAddButton").addEventListener("click", () => addDialog.close());
addResultForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addResult(new FormData(addResultForm));
  addResultForm.reset();
  addDialog.close();
});

bootstrap();
