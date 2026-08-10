import {
  loadBrowserVault,
  materializeResults,
  putResult,
  recordResultActivity,
  saveBrowserVault
} from "./vault.js";

const params = new URLSearchParams(window.location.search);
const isPersonalRoot = /^\/demo\/?$/.test(window.location.pathname) && params.get("showcase") !== "1";

if (isPersonalRoot) {
  const dashboard = document.querySelector("#dashboardView");
  const resultPage = document.querySelector("#resultPage");
  const addButton = document.querySelector("#addResultButton");
  const storageButton = document.querySelector("#storageButton");
  const productBoardLink = document.querySelector(".dash-nav-link");
  const topbar = document.querySelector(".topbar");
  const subtitle = topbar?.querySelector(".subtitle");
  const eyebrow = topbar?.querySelector(".eyebrow");

  if (eyebrow) eyebrow.textContent = "ТВОИ СОХРАНЁННЫЕ РАЗГОВОРЫ";
  if (subtitle) subtitle.textContent = "Полезное из твоих разговоров с ИИ — чтобы продолжить потом.";
  if (storageButton) storageButton.textContent = "Настройки";
  if (productBoardLink) productBoardLink.hidden = true;
  if (addButton) addButton.textContent = "+ Сохранить чат";

  const load = () => loadBrowserVault(globalThis.localStorage);
  const ownResults = () => materializeResults(load().vault);

  function make(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text) node.textContent = options.text;
    return node;
  }

  function firstString(value, paths) {
    for (const path of paths) {
      let current = value;
      for (const part of path.split(".")) current = current?.[part];
      if (typeof current === "string" && current.trim()) return current.trim();
    }
    return "";
  }

  function collectReadableStrings(value, output = [], depth = 0) {
    if (depth > 8 || output.length > 300) return output;
    if (typeof value === "string") {
      const text = value.replace(/\s+/g, " ").trim();
      if (text.length >= 35 && text.length <= 5000 && !/^https?:\/\//i.test(text)) output.push(text);
      return output;
    }
    if (Array.isArray(value)) {
      for (const item of value) collectReadableStrings(item, output, depth + 1);
      return output;
    }
    if (!value || typeof value !== "object") return output;
    const priority = ["messages", "message", "content", "parts", "text", "body", "conversation", "mapping"];
    const seen = new Set();
    for (const key of priority) {
      if (key in value) {
        seen.add(key);
        collectReadableStrings(value[key], output, depth + 1);
      }
    }
    for (const [key, child] of Object.entries(value)) {
      if (seen.has(key) || ["id", "uuid", "url", "sourceUrl", "fetchedAt", "createdAt", "updatedAt"].includes(key)) continue;
      collectReadableStrings(child, output, depth + 1);
    }
    return output;
  }

  function summarizeSharedChat(payload, sourceUrl) {
    const title = firstString(payload, ["title", "chat.title", "conversation.title", "data.title"])
      || "Сохранённый разговор";
    const candidates = collectReadableStrings(payload)
      .filter(text => text !== title && !text.includes(sourceUrl))
      .map(text => text.length > 1200 ? `${text.slice(0, 1197)}…` : text);
    const summary = candidates.at(-1)
      || "Разговор сохранён. Открой карточку, чтобы вернуться к нему и продолжить позже.";
    return { title: title.slice(0, 120), summary };
  }

  function normalizeShareUrl(raw) {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !["chatgpt.com", "chat.openai.com"].includes(url.hostname)) {
      throw new Error("Сейчас нужен публичный share-link из ChatGPT.");
    }
    if (!url.pathname.startsWith("/share/")) throw new Error("Открой Share в ChatGPT и вставь публичную ссылку на разговор.");
    return url.toString();
  }

  function persistFirstResult({ title, summary, sourceUrl }) {
    const loaded = load();
    const result = {
      id: `result-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
      schemaVersion: 1,
      title: title.trim() || "Сохранённый разговор",
      summary: summary.trim() || "Полезный разговор сохранён для продолжения.",
      category: "Мои чаты",
      tags: ["chatgpt"],
      favorite: false,
      decisions: [],
      next: "Вернуться к этому разговору и продолжить с сохранённого контекста.",
      source: { type: "chatgpt-share", url: sourceUrl, title: title.trim() || "ChatGPT conversation" },
      immutable: false,
      contentVersion: 1,
      status: "Сохранено"
    };
    putResult(loaded.vault, result);
    recordResultActivity(loaded.vault, result.id, "created");
    saveBrowserVault(globalThis.localStorage, loaded.vault);
    return result;
  }

  function humanizeDashboard() {
    const summaryTitle = document.querySelector("#summary-title");
    const summaryText = document.querySelector("#summaryText");
    const resultsTitle = document.querySelector("#resultsTitle");
    const dashEmpty = document.querySelector("#dashesEmpty");
    if (summaryTitle) summaryTitle.textContent = "Здесь остаётся то, к чему стоит вернуться.";
    if (summaryText) {
      const count = ownResults().length;
      summaryText.textContent = count === 1 ? "1 сохранённая карточка из твоего разговора." : `${count} сохранённых карточек из твоих разговоров.`;
    }
    if (resultsTitle) resultsTitle.textContent = "Твои карточки";
    if (dashEmpty) {
      const heading = dashEmpty.querySelector("h3");
      const copy = dashEmpty.querySelector("p");
      if (heading) heading.textContent = "Темы появятся сами";
      if (copy) copy.textContent = "Когда карточек станет больше, DashGPT соберёт связанные разговоры рядом.";
    }
  }

  function renderWelcome() {
    dashboard.hidden = true;
    if (resultPage) resultPage.hidden = true;
    if (addButton) addButton.hidden = true;
    if (storageButton) storageButton.hidden = true;

    let welcome = document.querySelector("#publicWelcome");
    if (welcome) return;

    welcome = make("section", { className: "public-welcome" });
    welcome.id = "publicWelcome";

    const badge = make("p", { className: "public-welcome-badge", text: "НАЧНИ СО СВОЕГО ЧАТА" });
    const title = make("h2", { text: "Сохрани полезное из первого разговора" });
    const copy = make("p", {
      className: "public-welcome-copy",
      text: "Поделись своим публичным ChatGPT-чатом. DashGPT превратит его в твою первую карточку — без чужих дашей и чужой истории."
    });

    const form = make("form", { className: "public-share-form" });
    form.id = "publicShareForm";
    const label = make("label", { text: "Ссылка на твой чат" });
    const input = document.createElement("input");
    input.id = "publicShareUrl";
    input.type = "url";
    input.required = true;
    input.autocomplete = "off";
    input.inputMode = "url";
    input.placeholder = "https://chatgpt.com/share/...";
    label.append(input);
    const submit = make("button", { className: "button primary public-share-submit", text: "Добавить мой чат" });
    submit.type = "submit";
    const hint = make("p", { className: "public-welcome-hint", text: "В ChatGPT: Share → Copy link → вставь сюда." });
    const status = make("p", { className: "public-share-status" });
    status.id = "publicShareStatus";
    status.setAttribute("aria-live", "polite");
    form.append(label, submit, hint, status);

    const review = make("section", { className: "public-share-review" });
    review.id = "publicShareReview";
    review.hidden = true;
    const reviewTitle = make("h3", { text: "Вот что сохранится" });
    const titleLabel = make("label", { text: "Название" });
    const titleInput = document.createElement("input");
    titleInput.id = "publicReviewTitle";
    titleInput.maxLength = 120;
    titleLabel.append(titleInput);
    const summaryLabel = make("label", { text: "Главное" });
    const summaryInput = document.createElement("textarea");
    summaryInput.id = "publicReviewSummary";
    summaryInput.rows = 6;
    summaryLabel.append(summaryInput);
    const save = make("button", { className: "button primary public-save-first", text: "Сохранить первую карточку" });
    save.type = "button";
    review.append(reviewTitle, titleLabel, summaryLabel, save);

    welcome.append(badge, title, copy, form, review);
    dashboard.before(welcome);

    let prepared = null;
    form.addEventListener("submit", async event => {
      event.preventDefault();
      review.hidden = true;
      status.classList.remove("error");
      status.textContent = "Читаю разговор…";
      submit.disabled = true;
      try {
        const sourceUrl = normalizeShareUrl(input.value.trim());
        const response = await fetch(`/api/shared-chat?url=${encodeURIComponent(sourceUrl)}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || payload?.error) throw new Error(payload?.error || `Не удалось прочитать чат (${response.status}).`);
        prepared = { sourceUrl, ...summarizeSharedChat(payload, sourceUrl) };
        titleInput.value = prepared.title;
        summaryInput.value = prepared.summary;
        review.hidden = false;
        status.textContent = "Готово. Проверь карточку и сохрани.";
        review.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (error) {
        prepared = null;
        status.classList.add("error");
        status.textContent = error instanceof Error ? error.message : "Не удалось прочитать этот чат.";
      } finally {
        submit.disabled = false;
      }
    });

    save.addEventListener("click", () => {
      if (!prepared) return;
      save.disabled = true;
      persistFirstResult({
        sourceUrl: prepared.sourceUrl,
        title: titleInput.value,
        summary: summaryInput.value
      });
      window.location.replace("/demo/");
    });
  }

  if (ownResults().length === 0) renderWelcome();
  else {
    dashboard.hidden = false;
    if (addButton) addButton.hidden = false;
    if (storageButton) storageButton.hidden = false;
    humanizeDashboard();
    const observer = new MutationObserver(() => humanizeDashboard());
    const summaryText = document.querySelector("#summaryText");
    if (summaryText) observer.observe(summaryText, { childList: true, characterData: true, subtree: true });
  }
}
