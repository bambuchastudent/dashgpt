const STORAGE_KEY = "dashgpt.demo.results.v3";
const LEGACY_STORAGE_KEYS = ["dashgpt.demo.results.v2", "dashgpt.demo.results.v1"];
const PUBLISHED_RESULTS_URL = "./data/results.json";

let publishedResults = [];
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
  addResultForm = document.querySelector("#addResultForm");

async function fetchPublishedResults() {
  const response = await fetch(PUBLISHED_RESULTS_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Published Results request failed: ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("Published Results payload must be an array");
  return data;
}

function loadLocalResults() {
  for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      // Try the next storage generation.
    }
  }
  return [];
}

function mergePublishedWithLocal(published, local) {
  const localById = new Map(local.map((result) => [result.id, result]));
  const publishedIds = new Set(published.map((result) => result.id));

  const merged = published.map((result) => {
    const existing = localById.get(result.id);
    return {
      ...structuredClone(result),
      favorite: existing ? Boolean(existing.favorite) : Boolean(result.favorite),
      published: true
    };
  });

  local.forEach((result) => {
    if (!publishedIds.has(result.id)) merged.push(result);
  });

  return merged;
}

function saveResults() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  updateSummary();
}

function updateSummary() {
  const favorites = results.filter((r) => r.favorite).length;
  const published = results.filter((r) => r.published).length;
  const local = results.length - published;
  document.querySelector("#summaryText").textContent =
    `${results.length} results: ${published} published, ${local} local, ${favorites} favorites. Search, open a result, or generate a portable Context Pack.`;
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
      render();
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
      result.source?.label,
      result.source?.url
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return categoryMatch && favoriteMatch && (!query || haystack.includes(query));
  });
}

function render() {
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
  (result.tags || []).forEach((tag) => {
    const item = document.createElement("span");
    item.className = "tag";
    item.textContent = `#${tag}`;
    tags.appendChild(item);
  });

  node.querySelector(".open-button").addEventListener("click", () => openResult(result.id));
  node.querySelector(".context-button").addEventListener("click", () => openContext(result.id));
  return node;
}

function toggleFavorite(id) {
  results = results.map((result) =>
    result.id === id ? { ...result, favorite: !result.favorite } : result
  );
  saveResults();
  render();
}

function openResult(id) {
  const result = results.find((item) => item.id === id);
  if (!result) return;

  resultDialogContent.innerHTML = "";
  const category = document.createElement("p");
  category.className = "eyebrow";
  category.textContent = result.published ? `${result.category} • PUBLISHED` : result.category;

  const title = document.createElement("h2");
  title.textContent = result.title;

  const summary = document.createElement("p");
  summary.className = "muted";
  summary.textContent = result.summary;

  const details = document.createElement("div");
  details.className = "detail-grid";
  details.appendChild(
    detailBlock("Decisions", (result.decisions || []).join(" • ") || "No decisions captured yet.")
  );
  details.appendChild(detailBlock("Next", result.next || "No next step captured yet."));

  const actions = document.createElement("div");
  actions.className = "dialog-actions";

  const contextButton = document.createElement("button");
  contextButton.className = "button primary";
  contextButton.textContent = "Generate Context Pack";
  contextButton.addEventListener("click", () => {
    resultDialog.close();
    openContext(id);
  });
  actions.appendChild(contextButton);

  if (result.source?.url) {
    const sourceLink = document.createElement("a");
    sourceLink.className = "button ghost";
    sourceLink.href = result.source.url;
    sourceLink.target = "_blank";
    sourceLink.rel = "noopener noreferrer";
    sourceLink.textContent = result.source.label || "Open source";
    actions.appendChild(sourceLink);
  }

  resultDialogContent.append(category, title, summary, details, actions);
  resultDialog.showModal();
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

function makeContextPack(result) {
  return [
    "# DashGPT Context Pack v0.2",
    "",
    `TITLE: ${result.title}`,
    `CATEGORY: ${result.category}`,
    result.source?.url ? `SOURCE: ${result.source.url}` : "",
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
    "NEXT INTENDED ACTION:",
    result.next || "Not captured.",
    "",
    "CONTINUATION INSTRUCTION:",
    "Continue from this state. Preserve the decisions above unless new evidence requires revisiting them."
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");
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
    published: false
  });

  saveResults();
  activeCategory = "All";
  favoritesOnly = false;
  searchInput.value = "";
  render();
}

async function bootstrap() {
  const local = loadLocalResults();
  try {
    publishedResults = await fetchPublishedResults();
  } catch (error) {
    console.warn("DashGPT could not refresh published Results; using local cache.", error);
    publishedResults = [];
  }

  results = mergePublishedWithLocal(publishedResults, local);
  saveResults();
  render();
}

searchInput.addEventListener("input", render);
document.querySelector("#showFavoritesButton").addEventListener("click", () => {
  favoritesOnly = true;
  render();
});
document.querySelector("#showAllButton").addEventListener("click", () => {
  favoritesOnly = false;
  render();
});
document.querySelector("#copyContextButton").addEventListener("click", copyContext);
document.querySelector("#addResultButton").addEventListener("click", () => addDialog.showModal());
document.querySelector("#cancelAddButton").addEventListener("click", () => addDialog.close());
addResultForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addResult(new FormData(addResultForm));
  addResultForm.reset();
  addDialog.close();
});

bootstrap();
