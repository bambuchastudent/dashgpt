const STORAGE_KEY = "dashgpt.demo.results.v2";
const LEGACY_STORAGE_KEY = "dashgpt.demo.results.v1";
const LEGACY_SEED_IDS = new Set(["dashgpt-product", "development-workflow", "deployment"]);

const seedResults = [
  {
    id: "dashgpt-first-live-demo",
    title: "DashGPT — от идеи до первой живой демки",
    summary:
      "DashGPT задуман как приватный result-first дашборд: сохранять не сырые чаты, а полезные результаты, решения и переносимый контекст, чтобы продолжать работу в любом AI-агенте. Мы зафиксировали продукт и процесс разработки в GitHub, выбрали OpenSpec для spec-driven workflow, сделали M1 vertical slice и выкатили первую демку через Cloudflare Workers.",
    category: "DashGPT",
    tags: ["product", "m1", "cloudflare", "context", "openspec"],
    favorite: true,
    decisions: [
      "Result-first, not chat-first: сырой чат — источник, а не главная сущность.",
      "Контекст принадлежит пользователю и должен переноситься между ChatGPT, Claude, Codex, OpenCode и другими агентами.",
      "Core остаётся local-first и cloud-optional; Cloudflare и GitHub — удобные адаптеры, а не обязательная зависимость.",
      "Разработка spec-driven; durable project state хранится в репозитории, агенты взаимозаменяемы.",
      "Первый M1 доказывает цикл Result → поиск/избранное → детали → Context Pack."
    ],
    next:
      "Проверить демку как реальный пользователь, закрыть доступ через Cloudflare Access, затем перейти от browser-only localStorage к общей persistence и импорту настоящих Results из AI-чатов."
  },
  {
    id: "cold-soups-chogyetang",
    title: "Холодные супы на бульоне: чогетхан и другие варианты",
    summary:
      "Искали холодные супы на курином бульоне по разным кухням: французские, европейские, азиатские и кавказские. Отдельно разобрали корейские нэнмён и чогетхан. Для домашнего варианта особенно подходит чогетхан — холодный куриный суп с лапшой; имеющуюся рисовую лапшу можно использовать как практичную замену традиционной.",
    category: "Еда",
    tags: ["cold-soup", "korean", "chogyetang", "naengmyeon", "rice-noodles"],
    favorite: false,
    decisions: [
      "Чогетхан — основной кандидат, когда нужен именно холодный суп на курином бульоне.",
      "Рисовая лапша подходит для домашней версии, даже если это не самый традиционный вариант.",
      "Нэнмён оставить альтернативой, если хочется более яркого корейского холодного супа."
    ],
    next:
      "Собрать короткий финальный рецепт чогетхана под конкретный объём бульона и продукты, которые есть дома."
  }
];

let results = loadResults();
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

function mergeSeeds(existing = []) {
  const merged = new Map(seedResults.map((result) => [result.id, structuredClone(result)]));
  existing.forEach((result) => {
    if (!merged.has(result.id)) merged.set(result.id, result);
  });
  return [...merged.values()];
}

function loadResults() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(current) && current.length) return mergeSeeds(current);

    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    const userCreated = Array.isArray(legacy)
      ? legacy.filter((result) => !LEGACY_SEED_IDS.has(result.id))
      : [];
    const migrated = mergeSeeds(userCreated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return structuredClone(seedResults);
  }
}

function saveResults() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  updateSummary();
}

function updateSummary() {
  const favorites = results.filter((r) => r.favorite).length;
  document.querySelector("#summaryText").textContent =
    `${results.length} results, ${favorites} favorites. Search, open a result, or generate a portable Context Pack.`;
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
      result.next
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
  category.textContent = result.category;

  const title = document.createElement("h2");
  title.textContent = result.title;

  const summary = document.createElement("p");
  summary.className = "muted";
  summary.textContent = result.summary;

  const details = document.createElement("div");
  details.className = "detail-grid";
  details.appendChild(detailBlock("Decisions", (result.decisions || []).join(" • ") || "No decisions captured yet."));
  details.appendChild(detailBlock("Next", result.next || "No next step captured yet."));

  const contextButton = document.createElement("button");
  contextButton.className = "button primary";
  contextButton.textContent = "Generate Context Pack";
  contextButton.addEventListener("click", () => {
    resultDialog.close();
    openContext(id);
  });

  resultDialogContent.append(category, title, summary, details, contextButton);
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
    "# DashGPT Context Pack v0.1",
    "",
    `TITLE: ${result.title}`,
    `CATEGORY: ${result.category}`,
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
    next
  });

  saveResults();
  activeCategory = "All";
  favoritesOnly = false;
  searchInput.value = "";
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

render();
