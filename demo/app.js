const STORAGE_KEY = "dashgpt.demo.results.v2";
const LEGACY_STORAGE_KEY = "dashgpt.demo.results.v1";
const LEGACY_SEED_IDS = new Set(["dashgpt-product", "development-workflow", "deployment"]);

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

function saveResults() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  updateSummary();
}

function updateSummary() {
  const favorites = results.filter((r) => r.favorite).length;
  const summary = document.querySelector("#summaryText");
  if (summary) {
    summary.textContent = `${results.length} results, ${favorites} favorites. Search, open a result, or generate a portable Context Pack.`;
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
  node.querySelector(".category").textContent = result.category;
  node.querySelector(".title").textContent = result.title;
  node.querySelector(".summary").textContent = result.summary;

  const favoriteButton = node.querySelector(".favorite-button");
  favoriteButton.textContent = result.favorite ? "★" : "☆";
  favoriteButton.setAttribute("aria-pressed", String(Boolean(result.favorite)));
  favoriteButton.addEventListener("click", () => toggleFavorite(result.id));

  const tags = node.querySelector(".tags");
  (result.tags || []).forEach((tag) => tags.appendChild(tagNode(tag)));

  const pageLink = node.querySelector(".page-link");
  pageLink.href = resultPagePath(result);
  pageLink.setAttribute("aria-label", `Open permanent page for ${result.title}`);

  node.querySelector(".open-button").addEventListener("click", () => openResult(result.id));
  node.querySelector(".context-button").addEventListener("click", () => openContext(result.id));
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
  badge.className = result.immutable ? "immutability-badge locked" : "immutability-badge";
  badge.textContent = result.immutable
    ? `IMMUTABLE CONTENT · v${result.contentVersion || 1}`
    : "LOCAL DRAFT";
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
  if (result.source?.url) details.appendChild(sourceBlock(result.source));

  const actions = document.createElement("div");
  actions.className = "dialog-actions";
  const pageLink = document.createElement("a");
  pageLink.className = "button";
  pageLink.href = resultPagePath(result);
  pageLink.textContent = "Open Page";
  const contextButton = document.createElement("button");
  contextButton.type = "button";
  contextButton.className = "button primary";
  contextButton.textContent = "Generate Context Pack";
  contextButton.addEventListener("click", () => {
    resultDialog.close();
    openContext(id);
  });
  actions.append(pageLink, contextButton);

  resultDialogContent.append(category, title, badge, summary, details, actions);
  resultDialog.showModal();
}

function makeContextPack(result) {
  return [
    "# DashGPT Context Pack v0.3",
    "",
    `TITLE: ${result.title}`,
    `CATEGORY: ${result.category}`,
    `CONTENT IMMUTABLE: ${Boolean(result.immutable)}`,
    `CONTENT VERSION: ${result.contentVersion || 1}`,
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
    title,
    summary,
    category,
    tags,
    favorite: false,
    decisions: [],
    next,
    immutable: false,
    contentVersion: 1
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
  if (!list.children.length) list.appendChild(Object.assign(document.createElement("li"), { textContent: "No decisions captured yet." }));
  decisions.append(decisionsTitle, list);
  details.append(decisions, detailBlock("Next", result.next || "No next step captured yet."));
  if (result.source?.url) details.append(sourceBlock(result.source));
  article.append(details);

  const actions = document.createElement("div");
  actions.className = "page-actions";
  const contextButton = document.createElement("button");
  contextButton.className = "button primary";
  contextButton.type = "button";
  contextButton.textContent = "Generate Context Pack";
  contextButton.addEventListener("click", () => openContext(result.id));
  const favoriteButton = document.createElement("button");
  favoriteButton.className = "button";
  favoriteButton.type = "button";
  favoriteButton.textContent = result.favorite ? "★ Favorite" : "☆ Favorite";
  favoriteButton.addEventListener("click", () => toggleFavorite(result.id));
  actions.append(contextButton, favoriteButton);

  const immutabilityNote = paragraph(
    result.immutable
      ? "The content of this published Result is locked. DashGPT may update this page’s layout and renderer, but changing the knowledge requires a new content revision."
      : "This is a browser-local draft and is not an immutable published Result.",
    "immutability-note"
  );

  resultPage.append(nav, article, actions, immutabilityNote);
}

async function bootstrap() {
  const local = loadLocalResults();
  const published = await loadPublishedResults();
  results = mergePublishedAndLocal(published, local);
  saveResults();

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
