import {
  createDashRevision,
  latestDashRevisions,
  materializeDash,
  rankResults,
  reviseDash
} from "./semantic-dashes.js";
import {
  loadBrowserVault,
  materializeResults,
  putDashRevision,
  saveBrowserVault
} from "./vault.js";

export const UNIFIED_DASH_STRINGS = Object.freeze({
  en: Object.freeze({
    myDash: "My Dash",
    myDashes: "My Dashes",
    allCards: "All cards",
    cards: "Cards",
    selection: "Selection",
    notSaved: "Not saved",
    saveAsDash: "Save as Dash",
    backToMyDash: "Back to My Dash",
    savedDash: "Saved Dash",
    inThisDash: "In this Dash",
    allCardsScope: "All cards",
    search: "Search",
    searchPlaceholder: "Search cards, tags, decisions…",
    noCards: "No cards match this selection yet.",
    resetSearch: "Reset search",
    saveTitle: "Save this selection as a Dash",
    dashName: "Dash name",
    selectionCards: "{count} cards in this selection. The Dash stores references only; the cards are not copied.",
    confirmSave: "Save Dash",
    cancel: "Cancel",
    duplicateTitle: "This selection is already saved",
    duplicateText: "The same card set already exists as “{name}”. Choose what to do instead of creating a hidden duplicate.",
    openExisting: "Open existing Dash",
    updateExisting: "Update existing Dash",
    saveDifferent: "Save with another name",
    savedMeta: "Saved Dash · {count} cards",
    selectionMeta: "Not saved · {count} cards",
    allMeta: "All cards · {count}",
    searchThisDash: "Search in this Dash",
    searchAllHint: "Switching to All cards opens the same query in My Dash.",
    favorites: "Favorites",
    filtered: "Filtered cards",
    nameRequired: "Enter a Dash name."
  }),
  ru: Object.freeze({
    myDash: "Мой Dash",
    myDashes: "Мои Dash",
    allCards: "Все карточки",
    cards: "Карточки",
    selection: "Подборка",
    notSaved: "Не сохранено",
    saveAsDash: "Сохранить как Dash",
    backToMyDash: "Вернуться в Мой Dash",
    savedDash: "Сохранённый Dash",
    inThisDash: "В этом Dash",
    allCardsScope: "Во всех карточках",
    search: "Поиск",
    searchPlaceholder: "Искать карточки, теги, решения…",
    noCards: "Таких карточек пока нет.",
    resetSearch: "Сбросить поиск",
    saveTitle: "Сохранить подборку как Dash",
    dashName: "Название Dash",
    selectionCards: "В подборке {count} карточек. Dash хранит только ссылки — карточки не копируются.",
    confirmSave: "Сохранить Dash",
    cancel: "Отмена",
    duplicateTitle: "Такая подборка уже сохранена",
    duplicateText: "Тот же набор карточек уже сохранён как «{name}». Выберите действие, чтобы не создавать скрытый дубликат.",
    openExisting: "Открыть существующий Dash",
    updateExisting: "Обновить существующий Dash",
    saveDifferent: "Сохранить под другим именем",
    savedMeta: "Сохранённый Dash · {count} карточек",
    selectionMeta: "Не сохранено · {count} карточек",
    allMeta: "Все карточки · {count}",
    searchThisDash: "Искать в этом Dash",
    searchAllHint: "При выборе всех карточек тот же запрос откроется в Мой Dash.",
    favorites: "Избранное",
    filtered: "Отфильтрованные карточки",
    nameRequired: "Укажите название Dash."
  })
});

function format(template, values = {}) {
  return String(template).replace(/\{([^}]+)\}/g, (_, key) => String(values[key] ?? ""));
}

export function resolveUnifiedDashLocale(options = {}) {
  const explicit = String(options.documentLanguage || "").toLowerCase();
  const browser = String(options.browserLanguage || "").toLowerCase();
  if (explicit.startsWith("ru") || browser.startsWith("ru")) return "ru";
  return "en";
}

export function unifiedDashText(key, values = {}, options = {}) {
  const locale = options.locale || resolveUnifiedDashLocale(options);
  const dictionary = UNIFIED_DASH_STRINGS[locale] || UNIFIED_DASH_STRINGS.en;
  return format(dictionary[key] ?? UNIFIED_DASH_STRINGS.en[key] ?? key, values);
}

export function sameResultIds(left, right) {
  const a = [...new Set(left || [])].sort();
  const b = [...new Set(right || [])].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function isTemporaryHomeSelection({ query = "", category = "All", favoritesOnly = false } = {}) {
  return Boolean(String(query).trim() || (category && category !== "All") || favoritesOnly);
}

export function suggestSelectionDashTitle({ query = "", category = "All", favoritesOnly = false, locale = "en" } = {}) {
  const cleanQuery = String(query).trim();
  if (cleanQuery) return cleanQuery.charAt(0).toLocaleUpperCase() + cleanQuery.slice(1);
  if (favoritesOnly) return unifiedDashText("favorites", {}, { locale });
  if (category && category !== "All") return String(category);
  return unifiedDashText("filtered", {}, { locale });
}

export function createSelectionDash({ title, query, resultIds, now } = {}) {
  const ids = [...new Set((resultIds || []).filter(Boolean))];
  if (!ids.length) throw new Error("Cannot save an empty Dash selection.");
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) throw new Error("Dash title is required.");
  const semanticQuery = String(query || cleanTitle).trim() || cleanTitle;
  return createDashRevision({
    title: cleanTitle,
    description: `Saved card selection: ${semanticQuery}.`,
    query: semanticQuery,
    updateMode: "review",
    automaticResultIds: ids,
    suggestedResultIds: []
  }, { now });
}

export function findEquivalentSavedDash(vault, results, resultIds) {
  const target = [...new Set(resultIds || [])];
  if (!target.length) return null;
  for (const revision of latestDashRevisions(vault?.dashRevisions || [], vault?.events || [])) {
    const view = materializeDash(revision, vault?.events || [], results || [], {
      allDashRevisions: vault?.dashRevisions || []
    });
    if (sameResultIds(view.members.map(member => member.result.id), target)) return { revision, view };
  }
  return null;
}

function runtimeLocale() {
  return resolveUnifiedDashLocale({
    documentLanguage: globalThis.document?.documentElement?.lang,
    browserLanguage: globalThis.navigator?.language
  });
}

function t(key, values = {}) {
  return unifiedDashText(key, values, { locale: runtimeLocale() });
}

function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function currentDashId() {
  const match = window.location.pathname.match(/^\/demo\/dashes\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isProductBoardRoute() {
  return /^\/demo\/dash\//.test(window.location.pathname);
}

function readVault() {
  return loadBrowserVault(globalThis.localStorage).vault;
}

function writeVault(vault) {
  saveBrowserVault(globalThis.localStorage, vault);
}

function currentRevision(vault, dashId) {
  return latestDashRevisions(vault.dashRevisions || [], vault.events || [])
    .find(revision => revision.dashId === dashId) || null;
}

function menuNode(activeDashId = null) {
  const details = element("details", "my-dashes-menu");
  details.dataset.unifiedDashMenu = "true";
  const summary = element("summary", "button ghost my-dashes-trigger", t("myDashes"));
  const nav = element("nav", "my-dashes-list");
  nav.setAttribute("aria-label", t("myDashes"));

  const home = element("a", `my-dash-item${activeDashId ? "" : " active"}`);
  home.href = "/demo/";
  home.append(element("strong", "", t("myDash")), element("span", "", t("allCards")));
  nav.append(home);

  const vault = readVault();
  for (const revision of latestDashRevisions(vault.dashRevisions || [], vault.events || [])) {
    const view = materializeDash(revision, vault.events || [], materializeResults(vault), {
      allDashRevisions: vault.dashRevisions || []
    });
    const link = element("a", `my-dash-item${revision.dashId === activeDashId ? " active" : ""}`);
    link.href = `/demo/dashes/${encodeURIComponent(revision.dashId)}/`;
    link.append(element("strong", "", revision.title), element("span", "", t("savedMeta", { count: view.members.length })));
    nav.append(link);
  }

  details.append(summary, nav);
  details.addEventListener("click", event => {
    if (event.target.closest("a")) details.open = false;
  });
  return details;
}

function buildSaveDialog() {
  let dialog = document.querySelector("#saveSelectionDialog");
  if (dialog) return dialog;
  dialog = element("dialog", "dialog unified-save-dialog");
  dialog.id = "saveSelectionDialog";
  dialog.innerHTML = `
    <form id="saveSelectionForm">
      <p class="eyebrow">${t("notSaved")}</p>
      <h2>${t("saveTitle")}</h2>
      <p id="saveSelectionSummary" class="muted"></p>
      <label>${t("dashName")}<input id="saveSelectionName" name="title" maxlength="100" required /></label>
      <p id="saveSelectionError" class="vault-note" hidden></p>
      <section id="saveSelectionDuplicate" class="selection-duplicate" hidden>
        <h3>${t("duplicateTitle")}</h3>
        <p id="saveSelectionDuplicateText" class="muted"></p>
        <div class="dialog-actions">
          <button id="openExistingSelectionDash" type="button" class="button primary">${t("openExisting")}</button>
          <button id="updateExistingSelectionDash" type="button" class="button">${t("updateExisting")}</button>
          <button id="saveDifferentSelectionDash" type="button" class="button ghost">${t("saveDifferent")}</button>
        </div>
      </section>
      <div id="saveSelectionPrimaryActions" class="dialog-actions">
        <button id="cancelSelectionSave" type="button" class="button ghost">${t("cancel")}</button>
        <button type="submit" class="button primary">${t("confirmSave")}</button>
      </div>
    </form>`;
  document.body.append(dialog);
  return dialog;
}

function homeSelectionState() {
  const search = document.querySelector("#searchInput");
  const category = document.querySelector("#categoryFilters .chip.active")?.textContent?.trim() || "All";
  const favoritesOnly = document.querySelector("#showFavoritesButton")?.getAttribute("aria-pressed") === "true";
  const ids = [...document.querySelectorAll("#resultsGrid .result-card[data-result-id]")].map(card => card.dataset.resultId);
  return { query: search?.value?.trim() || "", category, favoritesOnly, resultIds: ids };
}

function openSaveDialog(state, existing = null) {
  const dialog = buildSaveDialog();
  const name = dialog.querySelector("#saveSelectionName");
  const summary = dialog.querySelector("#saveSelectionSummary");
  const error = dialog.querySelector("#saveSelectionError");
  const duplicate = dialog.querySelector("#saveSelectionDuplicate");
  const duplicateText = dialog.querySelector("#saveSelectionDuplicateText");
  const primary = dialog.querySelector("#saveSelectionPrimaryActions");
  const locale = runtimeLocale();
  name.value = suggestSelectionDashTitle({ ...state, locale });
  summary.textContent = t("selectionCards", { count: state.resultIds.length });
  error.hidden = true;
  error.textContent = "";
  duplicate.hidden = !existing;
  primary.hidden = Boolean(existing);
  dialog._dashgptSelection = { ...state, existing };
  if (existing) duplicateText.textContent = t("duplicateText", { name: existing.revision.title });
  dialog.showModal();
}

function saveNewSelection(dialog) {
  const state = dialog._dashgptSelection;
  const title = dialog.querySelector("#saveSelectionName").value.trim();
  const error = dialog.querySelector("#saveSelectionError");
  if (!title) {
    error.textContent = t("nameRequired");
    error.hidden = false;
    return;
  }
  const vault = readVault();
  const revision = createSelectionDash({
    title,
    query: state.query || state.category,
    resultIds: state.resultIds,
    now: new Date().toISOString()
  });
  putDashRevision(vault, revision, { updatedAt: revision.lastUpdatedAt });
  writeVault(vault);
  window.location.href = `/demo/dashes/${encodeURIComponent(revision.dashId)}/`;
}

function updateExistingSelection(dialog) {
  const state = dialog._dashgptSelection;
  const existing = state?.existing?.revision;
  if (!existing) return;
  const title = dialog.querySelector("#saveSelectionName").value.trim() || existing.title;
  const vault = readVault();
  const revision = reviseDash(existing, {
    title,
    description: existing.description,
    automaticResultIds: [...new Set(state.resultIds)],
    suggestedResultIds: []
  }, { now: new Date().toISOString() });
  putDashRevision(vault, revision, { updatedAt: revision.lastUpdatedAt });
  writeVault(vault);
  window.location.href = `/demo/dashes/${encodeURIComponent(existing.dashId)}/`;
}

function wireSaveDialog(dialog) {
  if (dialog.dataset.wired) return;
  dialog.dataset.wired = "true";
  dialog.querySelector("#cancelSelectionSave").addEventListener("click", () => dialog.close());
  dialog.querySelector("#saveSelectionForm").addEventListener("submit", event => {
    event.preventDefault();
    saveNewSelection(dialog);
  });
  dialog.querySelector("#openExistingSelectionDash").addEventListener("click", () => {
    const id = dialog._dashgptSelection?.existing?.revision?.dashId;
    if (id) window.location.href = `/demo/dashes/${encodeURIComponent(id)}/`;
  });
  dialog.querySelector("#updateExistingSelectionDash").addEventListener("click", () => updateExistingSelection(dialog));
  dialog.querySelector("#saveDifferentSelectionDash").addEventListener("click", () => {
    dialog._dashgptSelection.existing = null;
    dialog.querySelector("#saveSelectionDuplicate").hidden = true;
    dialog.querySelector("#saveSelectionPrimaryActions").hidden = false;
    const input = dialog.querySelector("#saveSelectionName");
    input.value = `${input.value} 2`;
    input.focus();
    input.select();
  });
}

function buildHomeShell() {
  if (isProductBoardRoute() || currentDashId()) return;
  const dashboard = document.querySelector("#dashboardView");
  const controls = dashboard?.querySelector(".controls");
  const gallery = document.querySelector("#galleryRegion");
  if (!dashboard || !controls || !gallery) return;

  dashboard.querySelector(".summary-card")?.setAttribute("hidden", "");
  dashboard.querySelector(".semantic-dashes")?.setAttribute("hidden", "");
  dashboard.classList.add("unified-dashboard-view");

  let context = document.querySelector("#unifiedDashContext");
  if (!context) {
    context = element("section", "unified-dash-context");
    context.id = "unifiedDashContext";
    const text = element("div", "unified-context-copy");
    text.append(
      element("p", "eyebrow", t("allCards")),
      element("h2", "", t("myDash")),
      element("p", "muted unified-context-meta", "")
    );
    text.querySelector(".eyebrow").id = "dashContextEyebrow";
    text.querySelector("h2").id = "dashContextTitle";
    text.querySelector(".unified-context-meta").id = "dashContextMeta";
    const actions = element("div", "unified-context-actions");
    actions.id = "unifiedContextActions";
    const save = element("button", "button primary", t("saveAsDash"));
    save.id = "saveSelectionButton";
    save.type = "button";
    save.hidden = true;
    actions.append(menuNode(), save);
    context.append(text, actions);
    dashboard.insertBefore(context, controls);
  }

  const search = document.querySelector("#searchInput");
  if (search) {
    search.placeholder = t("searchPlaceholder");
    const label = search.closest("label")?.querySelector("span");
    if (label) label.textContent = t("search");
  }
  const galleryHeading = gallery.querySelector(".gallery-heading > div");
  if (galleryHeading) galleryHeading.classList.add("unified-legacy-gallery-title");
  const empty = document.querySelector("#emptyState");
  if (empty) {
    const heading = empty.querySelector("h3");
    if (heading) heading.textContent = t("noCards");
  }

  const saveButton = document.querySelector("#saveSelectionButton");
  const refresh = () => queueMicrotask(updateHomeContext);
  search?.addEventListener("input", refresh);
  document.querySelector("#categoryFilters")?.addEventListener("click", refresh);
  document.querySelector("#showFavoritesButton")?.addEventListener("click", refresh);
  document.querySelector("#showAllButton")?.addEventListener("click", refresh);
  saveButton?.addEventListener("click", () => {
    const state = homeSelectionState();
    if (!state.resultIds.length || !isTemporaryHomeSelection(state)) return;
    const vault = readVault();
    const existing = findEquivalentSavedDash(vault, materializeResults(vault), state.resultIds);
    openSaveDialog(state, existing);
  });

  const resultsGrid = document.querySelector("#resultsGrid");
  if (resultsGrid) new MutationObserver(refresh).observe(resultsGrid, { childList: true });
  const legacyDashes = document.querySelector("#dashesGrid");
  if (legacyDashes) new MutationObserver(() => rebuildHomeMenu()).observe(legacyDashes, { childList: true, subtree: true });

  const params = new URLSearchParams(window.location.search);
  const query = params.get("q");
  if (query && search && !search.value) {
    search.value = query;
    search.dispatchEvent(new Event("input", { bubbles: true }));
  }
  updateHomeContext();
}

function rebuildHomeMenu() {
  const actions = document.querySelector("#unifiedContextActions");
  const existing = actions?.querySelector(".my-dashes-menu");
  if (!actions || !existing) return;
  existing.replaceWith(menuNode());
}

function updateHomeContext() {
  if (currentDashId() || isProductBoardRoute()) return;
  const title = document.querySelector("#dashContextTitle");
  const eyebrow = document.querySelector("#dashContextEyebrow");
  const meta = document.querySelector("#dashContextMeta");
  const save = document.querySelector("#saveSelectionButton");
  if (!title || !eyebrow || !meta || !save) return;
  const state = homeSelectionState();
  const temporary = isTemporaryHomeSelection(state);
  if (!temporary) {
    eyebrow.textContent = t("allCards");
    title.textContent = t("myDash");
    meta.textContent = t("allMeta", { count: state.resultIds.length });
    save.hidden = true;
    return;
  }
  const label = state.query || (state.favoritesOnly ? t("favorites") : state.category);
  eyebrow.textContent = t("notSaved");
  title.textContent = `${t("selection")}: ${label}`;
  meta.textContent = t("selectionMeta", { count: state.resultIds.length });
  save.hidden = state.resultIds.length === 0;
}

function ensureSavedDashShell() {
  const dashId = currentDashId();
  if (!dashId || isProductBoardRoute()) return;
  const page = document.querySelector("#resultPage");
  const article = page?.querySelector(".semantic-dash-page");
  if (!page || !article || page.querySelector("#savedDashUnifiedContext")) return;
  const vault = readVault();
  const revision = currentRevision(vault, dashId);
  if (!revision) return;
  const results = materializeResults(vault);
  const view = materializeDash(revision, vault.events || [], results, { allDashRevisions: vault.dashRevisions || [] });

  const context = element("section", "unified-dash-context saved-dash-context");
  context.id = "savedDashUnifiedContext";
  const copy = element("div", "unified-context-copy");
  copy.append(
    element("p", "eyebrow", t("savedDash")),
    element("h2", "", `Dash: ${revision.title}`),
    element("p", "muted", t("savedMeta", { count: view.members.length }))
  );
  const actions = element("div", "unified-context-actions");
  const back = element("a", "button ghost", t("backToMyDash"));
  back.href = "/demo/";
  actions.append(menuNode(dashId), back);
  context.append(copy, actions);

  const searchBar = element("section", "saved-dash-search controls");
  searchBar.id = "savedDashSearchControls";
  const label = element("label", "search");
  label.append(element("span", "", t("searchThisDash")));
  const input = document.createElement("input");
  input.id = "savedDashSearch";
  input.type = "search";
  input.autocomplete = "off";
  input.placeholder = t("searchPlaceholder");
  label.append(input);
  const scopeLabel = element("label", "saved-dash-scope");
  scopeLabel.append(element("span", "", t("search")));
  const select = document.createElement("select");
  select.id = "savedDashSearchScope";
  select.innerHTML = `<option value="dash">${t("inThisDash")}</option><option value="all">${t("allCardsScope")}</option>`;
  scopeLabel.append(select);
  searchBar.append(label, scopeLabel);
  const hint = element("p", "muted saved-dash-search-hint", t("searchAllHint"));
  searchBar.append(hint);

  const oldActions = page.querySelector(".page-actions");
  page.insertBefore(context, oldActions || article);
  page.insertBefore(searchBar, article);

  const legacyEyebrow = article.querySelector(":scope > .eyebrow");
  if (legacyEyebrow) legacyEyebrow.hidden = true;
  const legacyTitle = article.querySelector(":scope > h1");
  if (legacyTitle) legacyTitle.hidden = true;
  const membersHeading = article.querySelector(".dash-section > h2");
  if (membersHeading?.textContent === "Results") membersHeading.textContent = t("cards");
  for (const link of page.querySelectorAll('.page-actions a[href="/demo/"]')) link.textContent = `← ${t("backToMyDash")}`;

  const applySearch = () => {
    const query = input.value.trim();
    const cards = [...article.querySelectorAll(".dash-result-card[data-result-id]")];
    if (!query) {
      cards.forEach(card => { card.hidden = false; });
      return;
    }
    const rankedIds = new Set(rankResults(view.members.map(member => member.result), query).map(item => item.result.id));
    cards.forEach(card => { card.hidden = !rankedIds.has(card.dataset.resultId); });
  };
  input.addEventListener("input", applySearch);
  select.addEventListener("change", () => {
    if (select.value !== "all") return;
    const query = input.value.trim();
    window.location.href = `/demo/${query ? `?q=${encodeURIComponent(query)}` : ""}`;
  });
}

function watchSavedDashPage() {
  if (!currentDashId()) return;
  ensureSavedDashShell();
  const page = document.querySelector("#resultPage");
  if (!page) return;
  new MutationObserver(() => queueMicrotask(ensureSavedDashShell)).observe(page, { childList: true, subtree: false });
}

export function initializeUnifiedDashboard() {
  if (typeof document === "undefined" || isProductBoardRoute()) return;
  document.body.classList.add("unified-card-dashboard");
  const dialog = buildSaveDialog();
  wireSaveDialog(dialog);
  if (currentDashId()) watchSavedDashPage();
  else buildHomeShell();
}

if (typeof document !== "undefined") initializeUnifiedDashboard();
