import {
  loadBrowserVault,
  materializeResults,
  putResult,
  recordResultActivity,
  saveBrowserVault
} from "./vault.js";

const params = new URLSearchParams(window.location.search);
const isPersonalRoot = /^\/demo\/?$/.test(window.location.pathname) && params.get("showcase") !== "1";
const CHATGPT_IMPORT_RESULT_ID = "dashgpt-chatgpt-history-import";

const DASHGPT_CAPTURE_COMMAND = `DashGPT. Подготовь полезный итог ЭТОГО текущего разговора для сохранения.
Верни только один JSON-объект без markdown, пояснений и code fence:
{
  "title": "Короткое понятное название",
  "summary": "Кратко: что полезного выяснили, решили или подготовили",
  "category": "Короткая тема",
  "tags": ["2-5 коротких тегов"],
  "decisions": ["принятые решения, если есть"],
  "facts": ["важные факты, которые стоит сохранить"],
  "constraints": ["важные ограничения, если есть"],
  "userPreferences": ["выраженные предпочтения пользователя, если есть"],
  "openQuestions": ["что осталось неясным, если есть"],
  "next": "Следующий полезный шаг, если он есть"
}
Не пересказывай чат по сообщениям. Сохрани только долговременный полезный результат. Не включай пароли, API-ключи, платёжные данные и другие секреты.`;

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
  const userResults = () => ownResults().filter(result => result.id !== CHATGPT_IMPORT_RESULT_ID);
  const hasImportCard = () => ownResults().some(result => result.id === CHATGPT_IMPORT_RESULT_ID);

  function make(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text) node.textContent = options.text;
    return node;
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function cleanText(value, maxLength) {
    const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}…` : text;
  }

  function cleanList(value, { maxItems = 12, maxLength = 500 } = {}) {
    const input = Array.isArray(value)
      ? value
      : typeof value === "string" && value.trim()
        ? value.split(/[,\n]/)
        : [];
    const output = [];
    const seen = new Set();
    for (const item of input) {
      const text = cleanText(item, maxLength);
      if (!text) continue;
      const key = text.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(text);
      if (output.length >= maxItems) break;
    }
    return output;
  }

  function jsonCandidate(raw) {
    let text = String(raw || "").trim();
    const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenced) text = fenced[1].trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
    return text;
  }

  function parseResultEnvelope(raw) {
    let parsed;
    try {
      parsed = JSON.parse(jsonCandidate(raw));
    } catch {
      throw new Error("Не вижу карточку. Скопируй ответ ChatGPT целиком и вставь сюда.");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Не вижу карточку. Скопируй ответ ChatGPT целиком и вставь сюда.");
    }

    const title = cleanText(parsed.title, 120);
    const summary = cleanText(parsed.summary, 5000);
    if (!title || !summary) {
      throw new Error("В ответе не хватает названия или итога. Попроси ChatGPT выполнить DashGPT-команду ещё раз.");
    }

    return {
      title,
      summary,
      category: cleanText(parsed.category, 60) || "Мои чаты",
      tags: cleanList(parsed.tags, { maxItems: 8, maxLength: 40 }),
      decisions: cleanList(parsed.decisions),
      facts: cleanList(parsed.facts),
      constraints: cleanList(parsed.constraints),
      userPreferences: cleanList(parsed.userPreferences),
      openQuestions: cleanList(parsed.openQuestions),
      next: cleanText(parsed.next || parsed.suggestedNextStep, 1000)
    };
  }

  function persistFirstResult(prepared) {
    const loaded = load();
    const tags = [...new Set(["chatgpt", ...prepared.tags])];
    const result = {
      id: `result-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
      schemaVersion: 1,
      title: prepared.title,
      summary: prepared.summary,
      category: prepared.category,
      tags,
      favorite: false,
      decisions: prepared.decisions,
      facts: prepared.facts,
      constraints: prepared.constraints,
      userPreferences: prepared.userPreferences,
      openQuestions: prepared.openQuestions,
      next: prepared.next || "Вернуться к сохранённому итогу, когда он снова понадобится.",
      source: { type: "chatgpt-handoff", title: "ChatGPT conversation" },
      immutable: false,
      contentVersion: 1,
      status: "Сохранено"
    };
    putResult(loaded.vault, result);
    recordResultActivity(loaded.vault, result.id, "created");
    saveBrowserVault(globalThis.localStorage, loaded.vault);
    return result;
  }

  async function copyCaptureCommand() {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(DASHGPT_CAPTURE_COMMAND);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = DASHGPT_CAPTURE_COMMAND;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function humanizeDashboard() {
    const summaryTitle = document.querySelector("#summary-title");
    const summaryText = document.querySelector("#summaryText");
    const resultsTitle = document.querySelector("#resultsTitle");
    const dashEmpty = document.querySelector("#dashesEmpty");
    setText(summaryTitle, "Здесь остаётся то, к чему стоит вернуться.");
    if (summaryText) {
      const count = userResults().length;
      if (count === 0 && hasImportCard()) setText(summaryText, "Начни с импорта старых чатов или сохрани текущий разговор — обе возможности уже готовы.");
      else setText(summaryText, count === 1 ? "1 сохранённая карточка из твоего разговора." : `${count} сохранённых карточек из твоих разговоров.`);
    }
    setText(resultsTitle, "Твои карточки");
    if (dashEmpty) {
      setText(dashEmpty.querySelector("h3"), "Темы появятся сами");
      setText(dashEmpty.querySelector("p"), "Когда карточек станет больше, DashGPT соберёт связанные разговоры рядом.");
    }
  }

  function renderWelcome() {
    dashboard.hidden = true;
    if (resultPage) resultPage.hidden = true;
    if (addButton) addButton.hidden = true;
    if (storageButton) storageButton.hidden = true;

    let welcome = document.querySelector("#publicWelcome");
    if (welcome) return welcome;

    welcome = make("section", { className: "public-welcome" });
    welcome.id = "publicWelcome";

    const badge = make("p", { className: "public-welcome-badge", text: "НАЧНИ В СВОЁМ ЧАТЕ" });
    const title = make("h2", { text: "Сохрани разговор через ChatGPT" });
    const copy = make("p", {
      className: "public-welcome-copy",
      text: "Открой разговор, который хочешь оставить на потом. ChatGPT сам выделит итог, решения и следующий шаг — DashGPT сохранит готовую карточку."
    });

    const commandPanel = make("section", { className: "public-command-panel" });
    const commandLabel = make("p", { className: "public-step-label", text: "1 · В своём ChatGPT-чате" });
    const command = make("code", { className: "public-command", text: "DashGPT, сохрани этот разговор" });
    const copyButton = make("button", { className: "button primary public-copy-command", text: "Скопировать DashGPT-команду" });
    copyButton.id = "copyDashGptCommand";
    copyButton.type = "button";
    const commandHint = make("p", { className: "public-welcome-hint", text: "Отправь скопированную команду в конце нужного разговора." });
    const copyStatus = make("p", { className: "public-share-status" });
    copyStatus.id = "publicCommandStatus";
    copyStatus.setAttribute("aria-live", "polite");
    commandPanel.append(commandLabel, command, copyButton, commandHint, copyStatus);

    const form = make("form", { className: "public-handoff-form" });
    form.id = "publicHandoffForm";
    const handoffLabel = make("label", { text: "2 · Вставь ответ ChatGPT" });
    const handoff = document.createElement("textarea");
    handoff.id = "publicHandoffPayload";
    handoff.required = true;
    handoff.rows = 7;
    handoff.autocomplete = "off";
    handoff.placeholder = '{"title":"…","summary":"…"}';
    handoffLabel.append(handoff);
    const submit = make("button", { className: "button primary public-handoff-submit", text: "Проверить карточку" });
    submit.type = "submit";
    const status = make("p", { className: "public-share-status" });
    status.id = "publicHandoffStatus";
    status.setAttribute("aria-live", "polite");
    form.append(handoffLabel, submit, status);

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

    welcome.append(badge, title, copy, commandPanel, form, review);
    dashboard.before(welcome);

    let prepared = null;

    copyButton.addEventListener("click", async () => {
      copyStatus.classList.remove("error");
      try {
        await copyCaptureCommand();
        copyStatus.textContent = "Скопировано. Вернись в нужный чат и отправь команду.";
      } catch {
        copyStatus.classList.add("error");
        copyStatus.textContent = "Не получилось скопировать автоматически. Выдели команду выше и скопируй её.";
      }
    });

    form.addEventListener("submit", event => {
      event.preventDefault();
      review.hidden = true;
      status.classList.remove("error");
      try {
        prepared = parseResultEnvelope(handoff.value);
        titleInput.value = prepared.title;
        summaryInput.value = prepared.summary;
        review.hidden = false;
        status.textContent = "Готово. Проверь карточку и сохрани.";
        review.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (error) {
        prepared = null;
        status.classList.add("error");
        status.textContent = error instanceof Error ? error.message : "Не удалось подготовить карточку.";
      }
    });

    save.addEventListener("click", () => {
      if (!prepared) return;
      save.disabled = true;
      persistFirstResult({
        ...prepared,
        title: cleanText(titleInput.value, 120) || prepared.title,
        summary: cleanText(summaryInput.value, 5000) || prepared.summary
      });
      window.location.replace("/demo/");
    });
    return welcome;
  }

  if (userResults().length === 0) {
    const welcome = renderWelcome();
    if (hasImportCard()) {
      // Bulk migration is a secondary bootstrap path, so keep the normal
      // chat-first capture instructions available while showing the default
      // import card in the canonical My Dash above them.
      dashboard.hidden = false;
      if (addButton) addButton.hidden = false;
      if (storageButton) storageButton.hidden = false;
      const gallery = document.querySelector("#galleryRegion");
      if (gallery && welcome) gallery.after(welcome);
      humanizeDashboard();
    }
  } else {
    dashboard.hidden = false;
    if (addButton) addButton.hidden = false;
    if (storageButton) storageButton.hidden = false;
    humanizeDashboard();
    const observer = new MutationObserver(() => humanizeDashboard());
    const summaryText = document.querySelector("#summaryText");
    if (summaryText) observer.observe(summaryText, { childList: true, characterData: true, subtree: true });
  }
}
