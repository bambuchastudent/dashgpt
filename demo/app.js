const STORAGE_KEY = "dashgpt.demo.results.v3";
const LEGACY_STORAGE_KEYS = ["dashgpt.demo.results.v2", "dashgpt.demo.results.v1"];
const LEGACY_SEED_IDS = new Set(["dashgpt-product", "development-workflow", "deployment"]);
const DURABLE_FIELDS = ["id", "title", "summary", "category", "tags", "decisions", "next", "source"];
const LATEST_LIMIT = 3;

const fallbackResults = [
  {
    id: "dashgpt-first-live-demo",
    title: "DashGPT — от идеи до первой живой демки",
    summary: "DashGPT хранит полезные результаты и переносимый контекст вместо необходимости перечитывать сырые чаты.",
    category: "DashGPT",
    tags: ["product", "context"],
    favorite: true,
    decisions: ["Result-first, not chat-first.", "Core остаётся local-first и provider-independent."],
    next: "Продолжить проверять продукт на реальных Results."
  },
  {
    id: "cold-soups-chogyetang",
    title: "Холодные супы на бульоне: чогетхан и другие варианты",
    summary: "Подборка холодных супов на курином бульоне с фокусом на корейский чогетхан.",
    category: "Еда",
    tags: ["cold-soup", "korean"],
    favorite: false,
    decisions: ["Чогетхан — основной домашний вариант."],
    next: "Собрать рецепт под конкретные продукты."
  }
];

let results = [];
let activeCategory = "All";
let favoritesOnly = false;
const integrityCache = new Map();

const dashboardView = document.querySelector("#dashboardView");
const resultPageView = document.querySelector("#resultPageView");
const resultsGrid = document.querySelector("#resultsGrid");
const latestGrid = document.querySelector("#latestGrid");
const topicMap = document.querySelector("#topicMap");
const resultCount = document.querySelector("#resultCount");
const resultsTitle = document.querySelector("#resultsTitle");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");
const categoryFilters = document.querySelector("#categoryFilters");
const cardTemplate = document.querySelector("#resultCardTemplate");
const contextDialog = document.querySelector("#contextDialog");
const contextOutput = document.querySelector("#contextOutput");
const addDialog = document.querySelector("#addDialog");
const addResultForm = document.querySelector("#addResultForm");

function validResult(result) {
  return Boolean(result && typeof result.id === "string" && typeof result.title === "string" && typeof result.summary === "string");
}

async function loadPublishedResults() {
  try {
    const response = await fetch("./data/results.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Published Result catalog returned ${response.status}`);
    const parsed = await response.json();
    return Array.isArray(parsed) ? parsed.filter(validResult) : [];
  } catch (error) {
    console.warn("DashGPT: published Result catalog unavailable, using fallback data.", error);
    return [];
  }
}

function loadLocalResults() {
  for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(parsed)) {
        return parsed.filter((result) => validResult(result) && !LEGACY_SEED_IDS.has(result.id));
      }
    } catch {
      // Try the next storage generation.
    }
  }
  return [];
}

function mergePublishedAndLocal(published, local) {
  const localById = new Map(local.map((result) => [result.id, result]));
  const merged = new Map();

  published.forEach((publishedResult) => {
    const localResult = localById.get(publishedResult.id);
    merged.set(publishedResult.id, {
      ...structuredClone(publishedResult),
      favorite: localResult && typeof localResult.favorite === "boolean"
        ? localResult.favorite
        : Boolean(publishedResult.favorite)
    });
  });

  local.forEach((localResult) => {
    if (!merged.has(localResult.id) && !LEGACY_SEED_IDS.has(localResult.id)) merged.set(localResult.id, localResult);
  });

  return [...merged.values()];
}

function saveResults() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  updateSummary();
}

function publishedTime(result) {
  const value = result.publishedAt ? Date.parse(result.publishedAt) : Number.NaN;
  return Number.isFinite(value) ? value : 0;
}

function newestResults(limit = LATEST_LIMIT) {
  return [...results].sort((a, b) => publishedTime(b) - publishedTime(a)).slice(0, limit);
}

function updateSummary() {
  const favorites = results.filter((r) => r.favorite).length;
  const categories = new Set(results.map((r) => r.category).filter(Boolean)).size;
  document.querySelector("#summaryText").textContent = `${results.length} Results • ${categories} тем • ${favorites} в избранном.`;
}

function categories() {
  return ["All", ...new Set(results.map((r) => r.category).filter(Boolean))];
}

function selectCategory(category) {
  activeCategory = category;
  favoritesOnly = false;
  searchInput.value = "";
  renderResults();
  document.querySelector("#allResultsSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCategoryFilters() {
  categoryFilters.replaceChildren();
  categories().forEach((category) => {
    const button = document.createElement("button");
    button.className = `chip${activeCategory === category ? " active" : ""}`;
    button.type = "button";
    button.textContent = category === "All" ? "Все" : category;
    button.addEventListener("click", () => {
      activeCategory = category;
      renderResults();
    });
    categoryFilters.appendChild(button);
  });
}

function filteredResults() {
  const query = searchInput.value.trim().toLowerCase();
  return results.filter((result) => {
    const categoryMatch = activeCategory === "All" || result.category === activeCategory;
    const favoriteMatch = !favoritesOnly || result.favorite;
    const haystack = [result.title, result.summary, result.category, ...(result.tags || []), ...(result.decisions || []), result.next, result.source?.url]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return categoryMatch && favoriteMatch && (!query || haystack.includes(query));
  });
}

function renderDashboard() {
  renderLatest();
  renderTopicMap();
  renderResults();
  updateSummary();
}

function renderLatest() {
  latestGrid.replaceChildren();
  newestResults().forEach((result) => latestGrid.appendChild(createCard(result, true)));
}

function renderTopicMap() {
  topicMap.replaceChildren();

  const hub = document.createElement("div");
  hub.className = "topic-hub";
  hub.innerHTML = `<strong>DashGPT memory</strong><span>${results.length} Results</span>`;
  topicMap.appendChild(hub);

  const indexed = [...new Set(results.map((result) => result.category).filter(Boolean))]
    .map((category) => {
      const items = results.filter((result) => result.category === category).sort((a, b) => publishedTime(b) - publishedTime(a));
      const tags = [...new Set(items.flatMap((item) => item.tags || []))].slice(0, 3);
      return { category, items, tags, newest: Math.max(...items.map(publishedTime), 0) };
    })
    .sort((a, b) => b.newest - a.newest);

  const branches = document.createElement("div");
  branches.className = "topic-branches";
  indexed.forEach(({ category, items, tags }, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `topic-node${index === 0 ? " current" : ""}`;
    button.innerHTML = `<span class="topic-node-title">${escapeHtml(category)}</span><strong>${items.length}</strong><small>${escapeHtml(tags.join(" • ") || "без тегов")}</small>`;
    button.addEventListener("click", () => selectCategory(category));
    branches.appendChild(button);
  });
  topicMap.appendChild(branches);
}

function renderResults() {
  renderCategoryFilters();
  const visible = filteredResults();
  resultsGrid.replaceChildren();
  visible.forEach((result) => resultsGrid.appendChild(createCard(result)));
  resultCount.textContent = `${visible.length} / ${results.length}`;
  resultsTitle.textContent = favoritesOnly ? "Избранное" : activeCategory === "All" ? "Всё сохранённое" : activeCategory;
  emptyState.hidden = visible.length !== 0;
}

function createCard(result, compact = false) {
  const node = cardTemplate.content.cloneNode(true);
  const card = node.querySelector(".result-card");
  if (compact) card.classList.add("latest-card");
  node.querySelector(".category").textContent = result.category;
  node.querySelector(".title").textContent = result.title;
  node.querySelector(".summary").textContent = result.summary;

  const integrityDot = node.querySelector(".integrity-dot");
  setIntegrityDot(integrityDot, result);

  const favoriteButton = node.querySelector(".favorite-button");
  favoriteButton.textContent = result.favorite ? "★" : "☆";
  favoriteButton.setAttribute("aria-pressed", String(Boolean(result.favorite)));
  favoriteButton.addEventListener("click", () => toggleFavorite(result.id));

  const tags = node.querySelector(".tags");
  (result.tags || []).slice(0, compact ? 3 : 6).forEach((tag) => {
    const item = document.createElement("span");
    item.className = "tag";
    item.textContent = `#${tag}`;
    tags.appendChild(item);
  });

  node.querySelector(".open-button").addEventListener("click", () => navigateToResult(result.id));
  node.querySelector(".context-button").addEventListener("click", () => openContext(result.id));
  return node;
}

function toggleFavorite(id) {
  results = results.map((result) => result.id === id ? { ...result, favorite: !result.favorite } : result);
  saveResults();
  renderDashboard();
  if (currentResultId()) renderResultPage(currentResultId());
}

function resultHref(id) {
  const encoded = encodeURIComponent(id);
  if (["localhost", "127.0.0.1"].includes(location.hostname)) return `/demo/?result=${encoded}`;
  return `/demo/result/${encoded}`;
}

function currentResultId() {
  const queryId = new URLSearchParams(location.search).get("result");
  if (queryId) return queryId;
  const match = location.pathname.match(/^\/demo\/result\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function navigateToResult(id) {
  history.pushState({}, "", resultHref(id));
  renderRoute();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function navigateHome() {
  history.pushState({}, "", "/demo/");
  renderRoute();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderRoute() {
  const id = currentResultId();
  if (id) {
    dashboardView.hidden = true;
    resultPageView.hidden = false;
    renderResultPage(id);
  } else {
    resultPageView.hidden = true;
    dashboardView.hidden = false;
    document.title = "DashGPT Demo";
    renderDashboard();
  }
}

async function renderResultPage(id) {
  const result = results.find((item) => item.id === id);
  resultPageView.replaceChildren();

  const back = document.createElement("button");
  back.className = "button ghost back-button";
  back.textContent = "← DashGPT";
  back.addEventListener("click", navigateHome);
  resultPageView.appendChild(back);

  if (!result) {
    const missing = document.createElement("section");
    missing.className = "result-page-card";
    missing.innerHTML = "<p class='eyebrow'>404</p><h1>Result не найден</h1><p class='muted'>Возможно, он ещё не опубликован или был открыт по неверной ссылке.</p>";
    resultPageView.appendChild(missing);
    return;
  }

  document.title = `${result.title} — DashGPT`;
  const article = document.createElement("article");
  article.className = "result-page-card";

  const header = document.createElement("div");
  header.className = "result-page-header";
  const heading = document.createElement("div");
  heading.innerHTML = `<p class="eyebrow">${escapeHtml(result.category)}</p><h1>${escapeHtml(result.title)}</h1>`;
  const badge = document.createElement("span");
  badge.className = "integrity-badge checking";
  badge.textContent = result.immutable ? "Immutable • checking…" : "Local • mutable";
  header.append(heading, badge);

  const summary = document.createElement("p");
  summary.className = "result-lead";
  summary.textContent = result.summary;

  const tags = document.createElement("div");
  tags.className = "tags result-tags";
  (result.tags || []).forEach((tag) => {
    const item = document.createElement("span");
    item.className = "tag";
    item.textContent = `#${tag}`;
    tags.appendChild(item);
  });

  const decisions = document.createElement("section");
  decisions.className = "result-section";
  decisions.innerHTML = "<p class='eyebrow'>СОХРАНЕНО</p><h2>Ключевые выводы</h2>";
  const list = document.createElement("ul");
  list.className = "decision-list";
  (result.decisions || []).forEach((decision) => {
    const item = document.createElement("li");
    item.textContent = decision;
    list.appendChild(item);
  });
  decisions.appendChild(list);

  const next = document.createElement("section");
  next.className = "result-section next-block";
  next.innerHTML = `<p class="eyebrow">NEXT</p><h2>Следующий шаг</h2><p>${escapeHtml(result.next || "Не зафиксирован.")}</p>`;

  const footer = document.createElement("div");
  footer.className = "result-page-actions";
  const contextButton = document.createElement("button");
  contextButton.className = "button primary";
  contextButton.textContent = "Context Pack";
  contextButton.addEventListener("click", () => openContext(id));
  footer.appendChild(contextButton);

  if (result.source?.url) {
    const source = document.createElement("a");
    source.className = "button ghost source-link";
    source.href = result.source.url;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = "Исходный чат ↗";
    footer.appendChild(source);
  }

  article.append(header, summary, tags, decisions, next, footer);
  resultPageView.appendChild(article);

  const status = await verifyIntegrity(result);
  updateIntegrityBadge(badge, result, status);
}

function durablePayload(result) {
  const payload = {};
  DURABLE_FIELDS.forEach((field) => {
    if (result[field] !== undefined) payload[field] = result[field];
  });
  return payload;
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyIntegrity(result) {
  if (!result.immutable || !result.contentHash) return "mutable";
  if (integrityCache.has(result.id)) return integrityCache.get(result.id);
  try {
    const actual = `sha256:${await sha256Hex(canonicalize(durablePayload(result)))}`;
    const status = actual === result.contentHash ? "verified" : "mismatch";
    integrityCache.set(result.id, status);
    return status;
  } catch {
    return "unavailable";
  }
}

function setIntegrityDot(dot, result) {
  dot.className = `integrity-dot ${result.immutable ? "checking" : "mutable"}`;
  dot.title = result.immutable ? "Immutable content: checking integrity" : "Local mutable Result";
  verifyIntegrity(result).then((status) => {
    dot.className = `integrity-dot ${status}`;
    dot.title = status === "verified" ? "Immutable content verified" : status === "mismatch" ? "Content hash mismatch" : "Local mutable Result";
  });
}

function updateIntegrityBadge(badge, result, status) {
  badge.className = `integrity-badge ${status}`;
  if (!result.immutable) {
    badge.textContent = "Local • mutable";
  } else if (status === "verified") {
    badge.textContent = `Immutable • verified • content v${result.contentVersion || 1}`;
  } else if (status === "mismatch") {
    badge.textContent = "⚠ Immutable • hash mismatch";
  } else {
    badge.textContent = "Immutable • verification unavailable";
  }
}

function makeContextPack(result) {
  return [
    "# DashGPT Context Pack v0.3",
    "",
    `TITLE: ${result.title}`,
    `CATEGORY: ${result.category}`,
    `CONTENT INTEGRITY: ${result.immutable ? result.contentHash || "immutable" : "mutable local result"}`,
    "",
    "SUMMARY:", result.summary,
    "",
    "DECISIONS:", ...(result.decisions || []).map((item) => `- ${item}`),
    "",
    "TAGS:", (result.tags || []).map((tag) => `#${tag}`).join(" ") || "none",
    "",
    "SOURCE:", result.source?.url || "Not captured.",
    "",
    "NEXT INTENDED ACTION:", result.next || "Not captured.",
    "",
    "CONTINUATION INSTRUCTION:",
    "Continue from this state. Preserve the immutable content above unless creating an explicit new Result/version."
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
  const title = String(formData.get("title") || "").trim();
  const summary = String(formData.get("summary") || "").trim();
  const category = String(formData.get("category") || "Идеи").trim() || "Идеи";
  const tags = String(formData.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean);
  const next = String(formData.get("next") || "").trim();
  results.unshift({
    id: `${Date.now()}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "result"}`,
    title, summary, category, tags, favorite: false, decisions: [], next, immutable: false
  });
  saveResults();
  activeCategory = "All";
  favoritesOnly = false;
  searchInput.value = "";
  renderDashboard();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

async function bootstrap() {
  const local = loadLocalResults();
  const published = await loadPublishedResults();
  const canonical = published.length ? published : fallbackResults;
  results = mergePublishedAndLocal(canonical, local);
  saveResults();
  renderRoute();
}

searchInput.addEventListener("input", renderResults);
document.querySelector("#showFavoritesButton").addEventListener("click", () => { favoritesOnly = true; renderResults(); });
document.querySelector("#showAllButton").addEventListener("click", () => { favoritesOnly = false; activeCategory = "All"; searchInput.value = ""; renderResults(); });
document.querySelector("#copyContextButton").addEventListener("click", copyContext);
document.querySelector("#addResultButton").addEventListener("click", () => addDialog.showModal());
document.querySelector("#cancelAddButton").addEventListener("click", () => addDialog.close());
addResultForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addResult(new FormData(addResultForm));
  addResultForm.reset();
  addDialog.close();
});
window.addEventListener("popstate", renderRoute);

bootstrap();
