const HOME_ID = "dashgptHomeEntry";
const IMPORT_ACTION_ID = "dashgptHomeImport";
const SAVE_ACTION_ID = "dashgptHomeSaveChat";
const CARDS_ACTION_ID = "dashgptHomeCards";
const STATUS_ID = "dashgptHomeImportStatus";
const CHATGPT_IMPORT_RESULT_ID = "dashgpt-chatgpt-history-import";

function isPersonalRoot() {
  const params = new URLSearchParams(window.location.search);
  return /^\/demo\/?$/.test(window.location.pathname) && params.get("showcase") !== "1";
}

function russian() {
  const language = String(navigator.language || document.documentElement?.lang || "en").toLocaleLowerCase();
  return language.startsWith("ru");
}

function copy() {
  return russian() ? {
    eyebrow: "НАЧНИ ЗДЕСЬ",
    title: "Сохраняй полезное из AI-чатов и продолжай с того же места",
    intro: "Импортируй всю историю ChatGPT или добавь один чат по Share-ссылке. Result, Vault и Semantic Dash знать не нужно.",
    import: "Импортировать историю ChatGPT",
    save: "Сохранить один чат",
    cards: "Мои карточки",
    note: "Импорт можно запускать повторно: уже сохранённые разговоры не дублируются. Сначала всё хранится на этом устройстве.",
    emptyStatus: "Можно начать с полной истории ChatGPT или сохранить только один нужный разговор.",
    progress: ({ imported, discovered, deferred }) => `Импорт: ${imported}${discovered ? ` из ${discovered}` : ""}${deferred ? ` · ${deferred} ждут повтора` : ""}`,
    unavailable: "Импорт ещё загружается. Попробуй ещё раз через секунду."
  } : {
    eyebrow: "START HERE",
    title: "Keep useful AI work and continue from where you stopped",
    intro: "Import your ChatGPT history or save one shared chat. You do not need to understand Results, Vaults, or Semantic Dashes first.",
    import: "Import ChatGPT history",
    save: "Save one chat",
    cards: "My cards",
    note: "You can run import again safely: already saved conversations are not duplicated. Everything starts on this device.",
    emptyStatus: "Start with your full ChatGPT history or save only one conversation you need.",
    progress: ({ imported, discovered, deferred }) => `Import: ${imported}${discovered ? ` of ${discovered}` : ""}${deferred ? ` · ${deferred} waiting to retry` : ""}`,
    unavailable: "The import controls are still loading. Try again in a second."
  };
}

function installStyles() {
  if (document.querySelector('link[data-dashgpt-home-entry]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/demo/home-entry.css";
  link.dataset.dashgptHomeEntry = "true";
  document.head.append(link);
}

function importProgress() {
  try {
    const raw = globalThis.localStorage?.getItem?.("dashgpt.demo.vault.v1");
    if (!raw) return null;
    const vault = JSON.parse(raw);
    const card = Array.isArray(vault?.results)
      ? vault.results.find(result => result?.id === CHATGPT_IMPORT_RESULT_ID)
      : null;
    const progress = card?.result;
    if (progress?.kind !== "chatgpt-history-import-progress") return null;
    return {
      imported: Math.max(0, Number(progress.imported || 0)),
      discovered: Math.max(0, Number(progress.discovered || 0)),
      deferred: Math.max(0, Number(progress.deferred || 0))
    };
  } catch {
    return null;
  }
}

function updateImportStatus(section) {
  const status = section.querySelector(`#${STATUS_ID}`);
  if (!status) return;
  const messages = copy();
  const progress = importProgress();
  status.textContent = progress ? messages.progress(progress) : messages.emptyStatus;
}

function clickCanonical(selector, section, attemptsLeft = 8) {
  const target = document.querySelector(selector);
  if (target && !target.disabled && !target.hidden) {
    target.click();
    return true;
  }
  if (attemptsLeft > 0) {
    setTimeout(() => clickCanonical(selector, section, attemptsLeft - 1), 100);
    return false;
  }
  const status = section.querySelector(`#${STATUS_ID}`);
  if (status) status.textContent = copy().unavailable;
  return false;
}

function createHomeEntry() {
  const messages = copy();
  const section = document.createElement("section");
  section.id = HOME_ID;
  section.className = "dashgpt-home-entry";
  section.setAttribute("aria-labelledby", "dashgptHomeTitle");
  section.innerHTML = `
    <div class="dashgpt-home-copy">
      <p class="eyebrow">${messages.eyebrow}</p>
      <h2 id="dashgptHomeTitle">${messages.title}</h2>
      <p class="dashgpt-home-intro">${messages.intro}</p>
      <p id="${STATUS_ID}" class="dashgpt-home-status" aria-live="polite"></p>
    </div>
    <div class="dashgpt-home-actions" aria-label="DashGPT primary actions">
      <button id="${IMPORT_ACTION_ID}" type="button" class="button primary dashgpt-home-primary">${messages.import}</button>
      <button id="${SAVE_ACTION_ID}" type="button" class="button">${messages.save}</button>
      <button id="${CARDS_ACTION_ID}" type="button" class="button ghost">${messages.cards}</button>
    </div>
    <p class="dashgpt-home-note">${messages.note}</p>`;

  section.querySelector(`#${IMPORT_ACTION_ID}`)?.addEventListener("click", () => {
    clickCanonical("#chatgptImportGuideButton", section);
  });
  section.querySelector(`#${SAVE_ACTION_ID}`)?.addEventListener("click", () => {
    clickCanonical("#addResultButton", section);
  });
  section.querySelector(`#${CARDS_ACTION_ID}`)?.addEventListener("click", () => {
    const gallery = document.querySelector("#galleryRegion");
    gallery?.scrollIntoView({ behavior: "smooth", block: "start" });
    requestAnimationFrame(() => document.querySelector("#searchInput")?.focus());
  });

  updateImportStatus(section);
  window.addEventListener("storage", () => updateImportStatus(section));
  window.addEventListener("dashgpt:history-import-progress", () => updateImportStatus(section));
  return section;
}

export function initializeHomeEntry() {
  if (!isPersonalRoot() || document.getElementById(HOME_ID)) return false;
  const dashboard = document.querySelector("#dashboardView");
  if (!dashboard) return false;
  installStyles();
  dashboard.prepend(createHomeEntry());
  return true;
}
