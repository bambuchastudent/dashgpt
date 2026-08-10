import {
  DEMO_DASHES,
  DEMO_RESULTS,
  DEMO_STORY_RESULT,
  dismissPersistenceOffer,
  isShowcaseMode,
  loadValueState,
  markPersistenceShown,
  recordConfirmedUserResult,
  saveValueState,
  shouldOfferPersistence
} from "./zero-friction-demo.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const elements = {
  storageButton: $("#storageButton"),
  storageDialog: $("#storageDialog"),
  resultsGrid: $("#resultsGrid"),
  resultsTitle: $("#resultsTitle"),
  resultCount: $("#resultCount"),
  resultTemplate: $("#resultCardTemplate"),
  resultDialog: $("#resultDialog"),
  resultDialogContent: $("#resultDialogContent"),
  resultPage: $("#resultPage"),
  addDialog: $("#addDialog"),
  addForm: $("#addResultForm"),
  captureStep: $("#captureStep"),
  reviewStep: $("#reviewStep"),
  demoDashesGrid: $("#demoDashesGrid"),
  resetDemoDashButton: $("#resetDemoDashButton"),
  demoStoryDialog: $("#demoStoryDialog"),
  demoStoryStage: $("#demoStoryStage"),
  demoStoryProgress: $("#demoStoryProgress"),
  demoStoryNextButton: $("#demoStoryNextButton"),
  demoStoryFinalActions: $("#demoStoryFinalActions"),
  persistenceDialog: $("#persistenceDialog"),
  persistenceCopy: $("#persistenceCopy")
};

let valueState = loadValueState(globalThis.localStorage);
let storyStep = 0;
let activeDemoDash = "";
let suppressResultObserver = false;

function ensureLegacyCardTemplateContract() {
  const card = elements.resultTemplate?.content?.querySelector?.(".result-card");
  if (!card || card.querySelector(".favorite-button")) return;

  const top = card.querySelector(".card-topline");
  const favorite = document.createElement("button");
  favorite.className = "favorite-button f9-legacy-card-control";
  favorite.type = "button";
  top?.append(favorite);

  const next = document.createElement("p");
  next.className = "card-next f9-legacy-card-control";
  const related = document.createElement("p");
  related.className = "card-related f9-legacy-card-control";
  const tags = document.createElement("div");
  tags.className = "tags f9-legacy-card-control";
  const actions = document.createElement("div");
  actions.className = "card-actions f9-legacy-card-control";

  const page = document.createElement("a");
  page.className = "button small page-link";
  const open = document.createElement("button");
  open.className = "button small open-button";
  open.type = "button";
  const original = document.createElement("a");
  original.className = "button small original-link";
  original.target = "_blank";
  original.rel = "noopener noreferrer";
  const continuation = document.createElement("a");
  continuation.className = "button small continue-link";
  continuation.target = "_blank";
  continuation.rel = "noopener noreferrer";
  actions.append(page, open, original, continuation);
  card.append(next, related, tags, actions);
}

function semanticHueForCategory(category) {
  const hues = { DashGPT: 216, "Еда": 34, "Поездки": 186, "Дом": 116, "Здоровье": 326 };
  return hues[category] ?? 250;
}

function demoCard(result) {
  const card = document.createElement("article");
  card.className = "result-card f9-demo-card";
  card.tabIndex = 0;
  card.dataset.demoResultId = result.id;
  card.dataset.demoCategory = result.category;
  const hue = semanticHueForCategory(result.category);
  card.style.setProperty("--semantic-hue", hue);
  card.style.setProperty("--semantic-hue-2", (hue + 28) % 360);
  card.innerHTML = `<div class="card-topline"><span class="category"></span><span class="card-status"></span></div><h3 class="title"></h3><p class="summary"></p>`;
  card.querySelector(".category").textContent = result.category;
  card.querySelector(".card-status").textContent = result.status || "Актуально";
  card.querySelector(".title").textContent = result.title;
  card.querySelector(".summary").textContent = result.summary;
  const open = () => openDemoResult(result);
  card.addEventListener("click", open);
  card.addEventListener("keydown", event => {
    if (!["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    open();
  });
  return card;
}

function ensureDemoResultsGrid() {
  let grid = $("#demoResultsGrid");
  if (!grid && elements.resultsGrid) {
    grid = document.createElement("div");
    grid.id = "demoResultsGrid";
    grid.className = "results-grid demo-results-grid";
    elements.resultsGrid.before(grid);
  }
  return grid;
}

function renderDemoResults() {
  const grid = ensureDemoResultsGrid();
  if (!grid) return;
  const visible = activeDemoDash ? DEMO_RESULTS.filter(item => item.category === activeDemoDash) : DEMO_RESULTS;
  grid.replaceChildren(...visible.map(demoCard));
  elements.resetDemoDashButton?.toggleAttribute("hidden", !activeDemoDash);
}

function renderDemoDashes() {
  if (!elements.demoDashesGrid) return;
  elements.demoDashesGrid.replaceChildren();
  for (const dash of DEMO_DASHES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "demo-dash-card";
    button.dataset.demoDashCategory = dash.category;
    const hue = semanticHueForCategory(dash.category);
    button.style.setProperty("--semantic-hue", hue);
    const title = document.createElement("strong");
    title.textContent = dash.title;
    const hint = document.createElement("span");
    hint.textContent = dash.hint;
    button.append(title, hint);
    button.addEventListener("click", () => {
      activeDemoDash = dash.category;
      renderDemoResults();
      ensureDemoResultsGrid()?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    });
    elements.demoDashesGrid.append(button);
  }
}

function detailSection(label, value) {
  const block = document.createElement("section");
  block.className = "detail-block human-detail-block";
  const heading = document.createElement("strong");
  heading.textContent = label;
  const body = document.createElement("div");
  body.textContent = value || "Пока ничего не добавлено.";
  block.append(heading, body);
  return block;
}

function demoContinuationUrl(result) {
  const text = `Продолжи разговор из сохранённой карточки DashGPT.\n\n${result.title}\n${result.summary}\n\nЧто решили: ${(result.decisions || []).join("; ")}\nДальше: ${result.next || "Продолжить с текущего состояния."}`;
  return `https://chatgpt.com/?q=${encodeURIComponent(text)}`;
}

function openDemoResult(result) {
  if (!elements.resultDialogContent || !elements.resultDialog) return;
  const category = document.createElement("p");
  category.className = "eyebrow";
  category.textContent = result.category;
  const title = document.createElement("h2");
  title.textContent = result.title;
  const details = document.createElement("div");
  details.className = "detail-grid human-detail-grid";
  details.append(
    detailSection("Главное", result.summary),
    detailSection("Что решили", (result.decisions || []).join(" • ")),
    detailSection("Сейчас", result.current || result.status || "Карточка актуальна."),
    detailSection("Дальше", result.next)
  );
  const actions = document.createElement("div");
  actions.className = "dialog-actions primary-result-actions human-result-actions";
  const continuation = document.createElement("a");
  continuation.className = "button primary";
  continuation.href = demoContinuationUrl(result);
  continuation.target = "_blank";
  continuation.rel = "noopener noreferrer";
  continuation.textContent = "Продолжить разговор";
  actions.append(continuation);
  elements.resultDialogContent.replaceChildren(category, title, details, actions);
  elements.resultDialog.showModal();
}

function humanizeExistingResultDialog() {
  const root = elements.resultDialogContent;
  if (!root || root.dataset.f9Humanizing === "true" || root.querySelector(".human-detail-grid")) return;
  const title = root.querySelector("h2");
  if (!title) return;
  root.dataset.f9Humanizing = "true";
  root.querySelector(".immutability-badge")?.remove();
  const lead = root.querySelector(":scope > p.muted");
  const details = root.querySelector(".detail-grid");
  const blocks = details ? [...details.querySelectorAll(":scope > .detail-block")] : [];
  const decisions = blocks.find(block => /Decisions/i.test(block.querySelector("strong")?.textContent || ""));
  const next = blocks.find(block => /^Next$/i.test(block.querySelector("strong")?.textContent || ""));
  const replacement = document.createElement("div");
  replacement.className = "detail-grid human-detail-grid";
  replacement.append(
    detailSection("Главное", lead?.textContent || ""),
    detailSection("Что решили", decisions?.querySelector("div")?.textContent || "Пока решений нет."),
    detailSection("Сейчас", "Карточка сохранена и готова к продолжению."),
    detailSection("Дальше", next?.querySelector("div")?.textContent || "Продолжить с сохранённого состояния.")
  );
  lead?.remove();
  details?.replaceWith(replacement);
  const actions = root.querySelector(".primary-result-actions");
  if (actions) {
    const links = [...actions.querySelectorAll("a")];
    for (const link of links) {
      if (/Original chat/i.test(link.textContent)) link.textContent = "Открыть исходный чат";
      if (/Continue in new chat/i.test(link.textContent)) link.textContent = "Продолжить разговор";
    }
  }
  delete root.dataset.f9Humanizing;
}

function humanizeStandaloneResult() {
  const root = elements.resultPage;
  if (!root || root.hidden || root.dataset.f9Humanized === "true") return;
  const article = root.querySelector(".published-result");
  if (!article) return;
  root.dataset.f9Humanized = "true";
  article.querySelector(".immutability-badge")?.remove();
  const lead = article.querySelector(".result-lead");
  const details = article.querySelector(".page-details");
  const blocks = details ? [...details.querySelectorAll(":scope > .detail-block")] : [];
  const decisions = blocks.find(block => /Decisions/i.test(block.querySelector("strong")?.textContent || ""));
  const next = blocks.find(block => /^Next$/i.test(block.querySelector("strong")?.textContent || ""));
  const source = blocks.find(block => /Source/i.test(block.querySelector("strong")?.textContent || ""));
  const human = document.createElement("div");
  human.className = "detail-grid page-details human-detail-grid";
  human.append(
    detailSection("Главное", lead?.textContent || ""),
    detailSection("Что решили", decisions?.querySelector("div")?.textContent || "Пока решений нет."),
    detailSection("Сейчас", "Карточка сохранена и готова к продолжению."),
    detailSection("Дальше", next?.querySelector("div")?.textContent || "Продолжить с сохранённого состояния.")
  );
  if (source) human.append(source);
  lead?.remove();
  details?.replaceWith(human);
  for (const action of root.querySelectorAll(".page-actions a")) {
    if (/Dashboard/i.test(action.textContent)) action.textContent = "← К борде";
    if (/Original chat/i.test(action.textContent)) action.textContent = "Открыть исходный чат";
    if (/Continue in new chat/i.test(action.textContent)) action.textContent = "Продолжить разговор";
  }
}

function normalizeRuntimeDashboard() {
  if (elements.storageButton && elements.storageButton.textContent !== "Настройки") elements.storageButton.textContent = "Настройки";
  if (elements.resultsTitle && elements.resultsTitle.textContent !== "Полезное, к которому можно вернуться") elements.resultsTitle.textContent = "Полезное, к которому можно вернуться";
  for (const status of $$("#resultsGrid .card-status")) {
    if (/Saved|Draft|verified|immutable|local/i.test(status.textContent)) status.textContent = "Актуально";
  }
}

function prepareReview() {
  const form = elements.addForm;
  if (!form) return;
  const title = form.elements.captureTitle?.value?.trim();
  const summary = form.elements.captureSummary?.value?.trim();
  if (!title || !summary) {
    form.elements.captureTitle?.reportValidity?.();
    form.elements.captureSummary?.reportValidity?.();
    return;
  }
  form.elements.title.value = title;
  form.elements.summary.value = summary;
  form.elements.category.value = form.elements.captureCategory?.value?.trim() || "Идеи";
  elements.captureStep.hidden = true;
  elements.reviewStep.hidden = false;
  form.elements.title.focus();
}

function resetSaveFlow() {
  if (!elements.captureStep || !elements.reviewStep) return;
  elements.captureStep.hidden = false;
  elements.reviewStep.hidden = true;
  $("#reviewOptionalFields")?.removeAttribute("hidden");
}

function maybeOfferPersistence() {
  if (!elements.persistenceDialog || !shouldOfferPersistence(valueState)) return;
  const count = valueState.confirmedUserResultIds.length;
  if (elements.persistenceCopy) {
    elements.persistenceCopy.textContent = count === 3
      ? "У тебя уже три полезные карточки. Можно сохранить их надолго и открывать на других устройствах."
      : `У тебя уже ${count} полезных карточек. Если хочешь, теперь их можно сохранить надолго и переносить между устройствами.`;
  }
  valueState = markPersistenceShown(valueState);
  valueState = saveValueState(globalThis.localStorage, valueState);
  elements.persistenceDialog.showModal();
}

const STORY_STAGES = [
  {
    title: "Обычный разговор с ИИ",
    render() {
      const wrap = document.createElement("div");
      wrap.className = "story-chat";
      wrap.innerHTML = `<p class="story-message user-message">У меня небольшой кусок лосося. Как засолить его к завтра?</p><p class="story-message ai-message">Сделай мягкую засолку, убери в холодильник на ночь и утром проверь вкус.</p>`;
      return wrap;
    }
  },
  {
    title: "Остаётся одна понятная карточка",
    render() {
      const wrap = document.createElement("div");
      wrap.className = "story-collapse";
      wrap.append(demoCard(DEMO_STORY_RESULT));
      return wrap;
    }
  },
  {
    title: "Внутри — только то, что пригодится",
    render() {
      const grid = document.createElement("div");
      grid.className = "story-detail-grid";
      grid.append(
        detailSection("Главное", DEMO_STORY_RESULT.summary),
        detailSection("Что решили", DEMO_STORY_RESULT.decisions[0]),
        detailSection("Сейчас", DEMO_STORY_RESULT.current),
        detailSection("Дальше", DEMO_STORY_RESULT.next)
      );
      return grid;
    }
  },
  {
    title: "Похожие вещи оказываются рядом",
    render() {
      const grid = document.createElement("div");
      grid.className = "story-neighborhood";
      grid.append(demoCard(DEMO_RESULTS.find(item => item.category === "Еда")), demoCard(DEMO_STORY_RESULT));
      return grid;
    }
  },
  {
    title: "Теперь это можно найти и продолжить в любой момент.",
    render() {
      const p = document.createElement("p");
      p.className = "story-complete-copy";
      p.textContent = "Разговор закончился, а полезный результат остался на твоей борде.";
      return p;
    }
  }
];

function renderStoryStep() {
  const stage = STORY_STAGES[storyStep];
  if (!stage || !elements.demoStoryStage) return;
  $("#demo-story-title").textContent = stage.title;
  elements.demoStoryProgress.textContent = `${storyStep + 1} / ${STORY_STAGES.length}`;
  elements.demoStoryStage.replaceChildren(stage.render());
  const complete = storyStep === STORY_STAGES.length - 1;
  elements.demoStoryFinalActions.hidden = !complete;
  elements.demoStoryNextButton.hidden = complete;
}

function openStory() {
  storyStep = 0;
  renderStoryStep();
  elements.demoStoryDialog?.showModal();
}

function installObservers() {
  if (elements.resultsGrid) {
    new MutationObserver(() => {
      if (suppressResultObserver) return;
      suppressResultObserver = true;
      normalizeRuntimeDashboard();
      queueMicrotask(() => { suppressResultObserver = false; });
    }).observe(elements.resultsGrid, { childList: true, subtree: true, characterData: true });
  }
  if (elements.storageButton) {
    new MutationObserver(normalizeRuntimeDashboard).observe(elements.storageButton, { childList: true, characterData: true, subtree: true });
  }
  if (elements.resultsTitle) {
    new MutationObserver(normalizeRuntimeDashboard).observe(elements.resultsTitle, { childList: true, characterData: true, subtree: true });
  }
  if (elements.resultDialogContent) {
    new MutationObserver(() => queueMicrotask(humanizeExistingResultDialog)).observe(elements.resultDialogContent, { childList: true, subtree: true });
  }
  if (elements.resultPage) {
    new MutationObserver(() => queueMicrotask(humanizeStandaloneResult)).observe(elements.resultPage, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  }
}

function installSaveFlow() {
  $("#prepareReviewButton")?.addEventListener("click", prepareReview);
  $("#backToCaptureButton")?.addEventListener("click", () => {
    elements.reviewStep.hidden = true;
    elements.captureStep.hidden = false;
    elements.addForm?.elements.captureTitle?.focus?.();
  });
  $("#stripOptionalButton")?.addEventListener("click", () => {
    const form = elements.addForm;
    if (!form) return;
    form.elements.tags.value = "";
    form.elements.next.value = "";
    $("#reviewOptionalFields")?.setAttribute("hidden", "");
  });
  $("#cancelReviewButton")?.addEventListener("click", () => elements.addDialog?.close());

  elements.addForm?.addEventListener("submit", event => {
    if (elements.reviewStep?.hidden) {
      event.preventDefault();
      event.stopImmediatePropagation();
      prepareReview();
      return;
    }
    const data = new FormData(elements.addForm);
    const title = String(data.get("title") || "card");
    const token = `confirmed-${Date.now()}-${title.toLowerCase().replace(/[^a-z0-9а-яё]+/giu, "-").replace(/(^-|-$)/g, "") || "card"}`;
    valueState = recordConfirmedUserResult(valueState, token);
    valueState = saveValueState(globalThis.localStorage, valueState);
    queueMicrotask(maybeOfferPersistence);
  }, true);

  elements.addDialog?.addEventListener("close", resetSaveFlow);
}

function installPersistenceFlow() {
  $("#dismissPersistenceButton")?.addEventListener("click", () => {
    valueState = dismissPersistenceOffer(valueState);
    valueState = saveValueState(globalThis.localStorage, valueState);
    elements.persistenceDialog?.close();
  });
  $("#openPersistenceButton")?.addEventListener("click", () => {
    elements.persistenceDialog?.close();
    elements.storageButton?.click();
  });
}

function installStoryFlow() {
  $("#showDemoButton")?.addEventListener("click", openStory);
  $("#closeDemoStoryButton")?.addEventListener("click", () => elements.demoStoryDialog?.close());
  elements.demoStoryNextButton?.addEventListener("click", () => {
    storyStep = Math.min(storyStep + 1, STORY_STAGES.length - 1);
    renderStoryStep();
  });
  $("#openDemoStoryCardButton")?.addEventListener("click", () => {
    elements.demoStoryDialog?.close();
    openDemoResult(DEMO_STORY_RESULT);
  });
  $("#tryOwnConversationButton")?.addEventListener("click", () => {
    elements.demoStoryDialog?.close();
    elements.addDialog?.showModal();
    elements.addForm?.elements.captureTitle?.focus?.();
  });
}

function init() {
  ensureLegacyCardTemplateContract();
  renderDemoDashes();
  renderDemoResults();
  normalizeRuntimeDashboard();
  installObservers();
  installSaveFlow();
  installPersistenceFlow();
  installStoryFlow();
  elements.resetDemoDashButton?.addEventListener("click", () => {
    activeDemoDash = "";
    renderDemoResults();
  });
  if (isShowcaseMode(location.search)) document.body.classList.add("showcase-mode");
  humanizeStandaloneResult();
}

init();
