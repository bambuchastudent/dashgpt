import {
  loadBrowserVault,
  materializeResults,
  putResult,
  saveBrowserVault
} from "./vault.js";
import { buildChatGptHistorySourceRunner } from "./chatgpt-history-source-runner.js";

export const CHATGPT_IMPORT_RESULT_ID = "dashgpt-chatgpt-history-import";
export const CHATGPT_IMPORT_PROTOCOL = "dashgpt-chatgpt-history-import";
export const CHATGPT_IMPORT_PROTOCOL_VERSION = 1;
export const CHATGPT_IMPORT_SOURCE_ORIGIN = "https://chatgpt.com";
export const CHATGPT_IMPORTED_RESULT_PREFIX = "chatgpt-conversation-";

const RECEIVER_SESSION_KEY = "dashgpt.chatgpt-import.receiver.v1";
const UI_PENDING_KEY = "dashgpt.chatgpt-import.pending-ui.v1";
const DISMISS_EVENT_TYPE = "system.card.dismissed";
const MAX_BATCH_CARDS = 48;
const MAX_MESSAGE_CHARS = 240_000;
const UI_AUTO_REFRESH_EVERY = 200;
const UI_AUTO_REFRESH_MIN_MS = 12_000;
const IMPORT_STYLE_ID = "dashgpt-chatgpt-import-style";

let initialized = false;
let sourceWindow = null;
let lastAutoRefreshAt = 0;
let cardObserver = null;
let dialog = null;

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix) {
  const value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${value}`;
}

function clip(value, max) {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (!text) return "";
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
}

function list(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return [];
  const output = [];
  const seen = new Set();
  for (const item of value) {
    const text = clip(String(item || ""), maxLength);
    const key = text.toLocaleLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    output.push(text);
    if (output.length >= maxItems) break;
  }
  return output;
}

function importLocale() {
  return String(document.documentElement?.lang || navigator.language || "en").toLocaleLowerCase().startsWith("ru") ? "ru" : "en";
}

const COPY = {
  en: {
    title: "Import ChatGPT history",
    ready: "Bring useful parts of your previous ChatGPT conversations into this DashGPT Vault. Cards appear progressively and repeated runs do not create duplicates.",
    waiting: "ChatGPT is open. Run the prepared script once in the ChatGPT page; DashGPT will then save cards progressively.",
    running: ({ imported, discovered, deferred }) => `Imported ${imported}${discovered ? ` of ${discovered}` : ""}.${deferred ? ` ${deferred} waiting to retry; other conversations continue.` : " You can keep using DashGPT while the source page stays available."}`,
    limited: ({ imported, discovered, deferred }) => `Imported ${imported}${discovered ? ` of ${discovered}` : ""}. Waiting for ChatGPT${deferred ? ` to retry ${deferred} conversations` : " to allow more requests"}.`,
    paused: ({ imported, discovered }) => `Imported ${imported}${discovered ? ` of ${discovered}` : ""}. Import is paused; continue later without starting over.`,
    partial: ({ imported, discovered, failed }) => `Imported ${imported}${discovered ? ` of ${discovered}` : ""}. ${failed} conversations still need another attempt.`,
    completed: ({ imported }) => `Imported ${imported} ChatGPT conversations. The imported cards are independent from this progress card.`,
    dismissed: "ChatGPT history import was dismissed.",
    statusReady: "Ready",
    statusWaiting: "Waiting for ChatGPT",
    statusRunning: "Importing",
    statusLimited: "Waiting for ChatGPT",
    statusPaused: "Paused",
    statusPartial: "Almost complete",
    statusCompleted: "Complete",
    start: "Start import",
    continue: "Continue import",
    pause: "Pause",
    view: "View imported",
    remove: "Remove",
    refresh: "Refresh cards",
    restore: "Import ChatGPT",
    dialogTitle: "Continue in ChatGPT",
    dialogCopy: "ChatGPT was opened and the import script was copied. In Safari, open Web Inspector → Console on the ChatGPT page, paste once, and press Enter. If Safari separates the windows, the script will show a “Connect DashGPT” button.",
    copied: "Script copied again",
    copyAgain: "Copy script again"
  },
  ru: {
    title: "Импортировать историю ChatGPT",
    ready: "Перенеси полезное из прошлых разговоров ChatGPT в этот Vault DashGPT. Карточки появляются постепенно, а повторный запуск не создаёт дублей.",
    waiting: "ChatGPT открыт. Один раз запусти подготовленный скрипт на странице ChatGPT — дальше DashGPT будет сохранять карточки постепенно.",
    running: ({ imported, discovered, deferred }) => `Импортировано ${imported}${discovered ? ` из ${discovered}` : ""}.${deferred ? ` ${deferred} ждут повтора, остальные разговоры продолжают импортироваться.` : " Можно пользоваться DashGPT, пока исходная страница ChatGPT доступна."}`,
    limited: ({ imported, discovered, deferred }) => `Импортировано ${imported}${discovered ? ` из ${discovered}` : ""}. Жду ChatGPT${deferred ? `, чтобы повторить ${deferred} разговоров` : ", пока снова разрешатся запросы"}.`,
    paused: ({ imported, discovered }) => `Импортировано ${imported}${discovered ? ` из ${discovered}` : ""}. Импорт приостановлен — позже продолжится без старта с нуля.`,
    partial: ({ imported, discovered, failed }) => `Импортировано ${imported}${discovered ? ` из ${discovered}` : ""}. Ещё ${failed} разговоров нужно повторить.`,
    completed: ({ imported }) => `Импортировано ${imported} разговоров ChatGPT. Эти карточки уже независимы от карточки прогресса.`,
    dismissed: "Импорт истории ChatGPT скрыт.",
    statusReady: "Готово к запуску",
    statusWaiting: "Жду ChatGPT",
    statusRunning: "Импорт идёт",
    statusLimited: "Жду ChatGPT",
    statusPaused: "Приостановлено",
    statusPartial: "Почти готово",
    statusCompleted: "Готово",
    start: "Начать импорт",
    continue: "Продолжить",
    pause: "Пауза",
    view: "Показать импортированные",
    remove: "Удалить",
    refresh: "Обновить карточки",
    restore: "Импорт ChatGPT",
    dialogTitle: "Продолжи в ChatGPT",
    dialogCopy: "ChatGPT уже открыт, а скрипт импорта скопирован. В Safari открой Web Inspector → Console на странице ChatGPT, вставь скрипт один раз и нажми Enter. Если Safari разорвёт связь между вкладками, сам скрипт покажет кнопку «Подключить DashGPT».",
    copied: "Скрипт снова скопирован",
    copyAgain: "Скопировать скрипт ещё раз"
  }
};

function t(key, values = {}) {
  const value = COPY[importLocale()][key] ?? COPY.en[key] ?? key;
  return typeof value === "function" ? value(values) : value;
}

function progressFromResult(result) {
  const state = result?.result;
  if (!state || state.kind !== "chatgpt-history-import-progress") return null;
  return {
    state: String(state.state || "ready"),
    discovered: Math.max(0, Number(state.discovered || 0)),
    imported: Math.max(0, Number(state.imported || 0)),
    failed: Math.max(0, Number(state.failed || 0)),
    deferred: Math.max(0, Number(state.deferred || 0)),
    updatedAt: String(state.updatedAt || ""),
    lastSuccessAt: String(state.lastSuccessAt || "")
  };
}

function latestDismissed(vault) {
  return (vault.events || [])
    .filter(event => event.type === DISMISS_EVENT_TYPE && event.resultId === CHATGPT_IMPORT_RESULT_ID)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.eventId.localeCompare(b.eventId))
    .reduce((value, event) => Boolean(event.value), false);
}

function addDismissEvent(vault, value) {
  if (latestDismissed(vault) === Boolean(value)) return;
  const createdAt = nowIso();
  vault.events.push({
    schemaVersion: 1,
    eventId: randomId("evt"),
    type: DISMISS_EVENT_TYPE,
    resultId: CHATGPT_IMPORT_RESULT_ID,
    value: Boolean(value),
    createdAt
  });
  vault.updatedAt = createdAt;
}

function humanizedProgressResult(progress = {}) {
  const state = String(progress.state || "ready");
  const imported = Math.max(0, Number(progress.imported || 0));
  const discovered = Math.max(0, Number(progress.discovered || 0));
  const failed = Math.max(0, Number(progress.failed || 0));
  const deferred = Math.max(0, Number(progress.deferred || 0));
  const updatedAt = progress.updatedAt || nowIso();
  const lastSuccessAt = progress.lastSuccessAt || "";
  const values = { imported, discovered, failed, deferred };
  const stateCopy = {
    ready: ["ready", "statusReady"],
    waiting_for_source: ["waiting", "statusWaiting"],
    running: ["running", "statusRunning"],
    rate_limited: ["limited", "statusLimited"],
    paused: ["paused", "statusPaused"],
    partial: ["partial", "statusPartial"],
    completed: ["completed", "statusCompleted"]
  }[state] || ["paused", "statusPaused"];
  const summary = t(stateCopy[0], values);
  const remaining = discovered ? Math.max(0, discovered - imported) : 0;
  const next = state === "completed"
    ? t("view")
    : state === "running" || state === "rate_limited"
      ? (remaining ? `${remaining} ${importLocale() === "ru" ? "осталось" : "remaining"}` : "")
      : state === "waiting_for_source"
        ? (importLocale() === "ru" ? "Запусти скрипт в ChatGPT" : "Run the script in ChatGPT")
        : t(state === "ready" ? "start" : "continue");

  const facts = discovered ? [
    importLocale() === "ru" ? `Найдено разговоров: ${discovered}` : `Conversations discovered: ${discovered}`,
    importLocale() === "ru" ? `Импортировано: ${imported}` : `Imported: ${imported}`
  ] : [];
  if (deferred) facts.push(importLocale() === "ru" ? `Ждут повтора: ${deferred}` : `Waiting/retry: ${deferred}`);

  return {
    id: CHATGPT_IMPORT_RESULT_ID,
    schemaVersion: 1,
    title: t("title"),
    summary,
    category: importLocale() === "ru" ? "Импорт" : "Import",
    tags: ["chatgpt", "import"],
    decisions: [],
    facts,
    next,
    source: {
      type: "system-operation",
      provider: "dashgpt",
      sourceId: "chatgpt-history-import",
      title: "ChatGPT history import"
    },
    immutable: false,
    contentVersion: 1,
    status: t(stateCopy[1]),
    language: importLocale(),
    result: {
      kind: "chatgpt-history-import-progress",
      state,
      discovered,
      imported,
      failed,
      deferred,
      updatedAt,
      lastSuccessAt
    }
  };
}

export function chatGptImportedResultId(sourceId) {
  const normalized = String(sourceId || "").trim();
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(normalized)) throw new Error("Invalid ChatGPT conversation ID");
  return `${CHATGPT_IMPORTED_RESULT_PREFIX}${normalized}`;
}

export function sanitizeChatGptCardCandidate(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) throw new Error("Invalid import card candidate");
  const sourceId = String(candidate.sourceId || "").trim();
  const id = chatGptImportedResultId(sourceId);
  const updatedAt = new Date(candidate.updatedAt || "");
  if (!Number.isFinite(updatedAt.getTime())) throw new Error("Invalid ChatGPT update time");
  const title = clip(candidate.title, 160) || (importLocale() === "ru" ? "Разговор ChatGPT" : "ChatGPT conversation");
  const summary = clip(candidate.summary, 700) || title;
  const currentState = clip(candidate.currentState, 300);
  const tags = list(candidate.tags, 6, 40);
  const facts = list(candidate.facts, 4, 180);
  return {
    id,
    schemaVersion: 1,
    title,
    summary,
    currentState,
    category: "ChatGPT",
    tags: [...new Set(["chatgpt", ...tags])].slice(0, 6),
    decisions: [],
    facts,
    constraints: [],
    openQuestions: [],
    next: currentState
      ? (importLocale() === "ru" ? "Продолжить с последнего сохранённого состояния." : "Continue from the latest saved state.")
      : "",
    source: {
      type: "conversation",
      provider: "chatgpt",
      sourceId,
      title: "ChatGPT conversation",
      url: `https://chatgpt.com/c/${encodeURIComponent(sourceId)}`
    },
    publishedAt: updatedAt.toISOString(),
    immutable: false,
    contentVersion: 1,
    status: importLocale() === "ru" ? "Импортировано" : "Imported",
    language: importLocale()
  };
}

function importedCards(vault) {
  return materializeResults(vault).filter(result =>
    result.id !== CHATGPT_IMPORT_RESULT_ID
    && result.source?.provider === "chatgpt"
    && result.source?.type === "conversation"
    && typeof result.source?.sourceId === "string"
  );
}

export function knownChatGptFreshness(vault) {
  return importedCards(vault)
    .map(result => [result.source.sourceId, String(result.publishedAt || "")])
    .filter(([, publishedAt]) => Number.isFinite(Date.parse(publishedAt)))
    .slice(0, 10_000);
}

function currentProgressResult(vault) {
  return materializeResults(vault).find(result => result.id === CHATGPT_IMPORT_RESULT_ID) || null;
}

function writeProgress(vault, patch = {}) {
  const existing = currentProgressResult(vault);
  const current = progressFromResult(existing) || { state: "ready", discovered: 0, imported: 0, failed: 0, deferred: 0 };
  const next = {
    ...current,
    ...patch,
    updatedAt: patch.updatedAt || nowIso()
  };
  putResult(vault, humanizedProgressResult(next));
  return next;
}

export function seedDefaultChatGptImportCard(storage = globalThis.localStorage) {
  const loaded = loadBrowserVault(storage);
  if (!loaded.created || loaded.vault.results.length || latestDismissed(loaded.vault)) return { ...loaded, seeded: false };
  putResult(loaded.vault, humanizedProgressResult({ state: "ready", discovered: 0, imported: 0, failed: 0, deferred: 0 }));
  saveBrowserVault(storage, loaded.vault);
  return { ...loaded, seeded: true };
}

function restoreImportCard() {
  const loaded = loadBrowserVault(globalThis.localStorage);
  addDismissEvent(loaded.vault, false);
  const imported = importedCards(loaded.vault).length;
  const existing = progressFromResult(currentProgressResult(loaded.vault));
  putResult(loaded.vault, humanizedProgressResult(existing || { state: "ready", imported, discovered: 0, failed: 0, deferred: 0 }));
  saveBrowserVault(globalThis.localStorage, loaded.vault);
}

function dismissImportCard() {
  const loaded = loadBrowserVault(globalThis.localStorage);
  loaded.vault.results = loaded.vault.results.filter(result => result.id !== CHATGPT_IMPORT_RESULT_ID);
  addDismissEvent(loaded.vault, true);
  saveBrowserVault(globalThis.localStorage, loaded.vault);
  window.dispatchEvent(new CustomEvent("dashgpt:chatgpt-import-vault-updated", { detail: { reload: true } }));
}

function receiverConfigFromPage() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("chatgptImportReceiver") === "1") {
    const sessionId = params.get("session") || "";
    const nonce = params.get("nonce") || "";
    if (sessionId && nonce) {
      const config = { sessionId, nonce, sourceOrigin: CHATGPT_IMPORT_SOURCE_ORIGIN, createdAt: nowIso() };
      sessionStorage.setItem(RECEIVER_SESSION_KEY, JSON.stringify(config));
      params.delete("chatgptImportReceiver");
      params.delete("session");
      params.delete("nonce");
      const query = params.toString();
      history.replaceState(history.state, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
      return config;
    }
  }
  try {
    const parsed = JSON.parse(sessionStorage.getItem(RECEIVER_SESSION_KEY) || "null");
    return parsed?.sessionId && parsed?.nonce ? parsed : null;
  } catch {
    return null;
  }
}

function safeMessageSize(data) {
  try { return JSON.stringify(data).length; } catch { return Number.POSITIVE_INFINITY; }
}

function postReply(target, config, payload) {
  if (!target || target.closed) return;
  target.postMessage({
    protocol: CHATGPT_IMPORT_PROTOCOL,
    version: CHATGPT_IMPORT_PROTOCOL_VERSION,
    sessionId: config.sessionId,
    nonce: config.nonce,
    ...payload
  }, CHATGPT_IMPORT_SOURCE_ORIGIN);
}

function validatedEnvelope(event, config) {
  if (!config || event.origin !== CHATGPT_IMPORT_SOURCE_ORIGIN) return null;
  const data = event.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  if (data.protocol !== CHATGPT_IMPORT_PROTOCOL || data.version !== CHATGPT_IMPORT_PROTOCOL_VERSION) return null;
  if (data.sessionId !== config.sessionId || data.nonce !== config.nonce) return null;
  if (safeMessageSize(data) > MAX_MESSAGE_CHARS) return null;
  return data;
}

function numeric(value, max = 100_000) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(max, Math.floor(number))) : 0;
}

function persistDiscovered(total) {
  const loaded = loadBrowserVault(globalThis.localStorage);
  const imported = Math.min(numeric(total), importedCards(loaded.vault).length);
  writeProgress(loaded.vault, {
    state: "running",
    discovered: numeric(total),
    imported,
    failed: 0,
    deferred: 0
  });
  saveBrowserVault(globalThis.localStorage, loaded.vault);
  updateVisibleProgressCard();
}

function persistSourceState(data = {}) {
  const state = data.state === "rate_limited" ? "rate_limited" : data.state === "running" ? "running" : "";
  if (!state) return;
  const loaded = loadBrowserVault(globalThis.localStorage);
  const current = progressFromResult(currentProgressResult(loaded.vault)) || {};
  writeProgress(loaded.vault, {
    state,
    discovered: numeric(current.discovered),
    imported: importedCards(loaded.vault).length,
    failed: numeric(current.failed),
    deferred: numeric(data.deferred ?? current.deferred)
  });
  saveBrowserVault(globalThis.localStorage, loaded.vault);
  updateVisibleProgressCard();
}

function persistPause(data = {}) {
  const loaded = loadBrowserVault(globalThis.localStorage);
  const current = progressFromResult(currentProgressResult(loaded.vault)) || {};
  writeProgress(loaded.vault, {
    state: "paused",
    discovered: numeric(data.discovered ?? current.discovered),
    imported: importedCards(loaded.vault).length,
    failed: numeric(data.unresolved ?? current.failed),
    deferred: numeric(data.deferred ?? current.deferred)
  });
  saveBrowserVault(globalThis.localStorage, loaded.vault);
  updateVisibleProgressCard();
}

export function applyChatGptImportBatch(vault, candidates, progress = {}) {
  if (!Array.isArray(candidates) || candidates.length > MAX_BATCH_CARDS) throw new Error("Invalid import batch size");
  let accepted = 0;
  let updated = 0;
  let skipped = 0;
  const currentById = new Map(materializeResults(vault).map(result => [result.id, result]));

  for (const raw of candidates) {
    const result = sanitizeChatGptCardCandidate(raw);
    const current = currentById.get(result.id);
    if (current) {
      const existingTime = Date.parse(current.publishedAt || "") || 0;
      const incomingTime = Date.parse(result.publishedAt || "") || 0;
      if (existingTime >= incomingTime) {
        skipped += 1;
        continue;
      }
      updated += 1;
    } else {
      accepted += 1;
    }
    putResult(vault, result);
    currentById.set(result.id, result);
  }

  const discovered = numeric(progress.discovered);
  const imported = discovered
    ? Math.min(discovered, importedCards(vault).length)
    : importedCards(vault).length;
  writeProgress(vault, {
    state: "running",
    discovered,
    imported,
    failed: numeric(progress.unresolved),
    deferred: numeric(progress.deferred),
    lastSuccessAt: accepted || updated ? nowIso() : (progressFromResult(currentProgressResult(vault))?.lastSuccessAt || "")
  });
  return { accepted, updated, skipped, imported };
}

function handleBatch(event, config, data) {
  if (!Number.isInteger(data.sequence) || data.sequence < 1 || !Array.isArray(data.cards) || data.cards.length > MAX_BATCH_CARDS) return;
  const loaded = loadBrowserVault(globalThis.localStorage);
  try {
    const result = applyChatGptImportBatch(loaded.vault, data.cards, data.progress || {});
    saveBrowserVault(globalThis.localStorage, loaded.vault);
    sourceWindow = event.source;
    postReply(event.source, config, { type: "ACK", sequence: data.sequence, ...result });
    markPendingUi(result.accepted + result.updated);
    updateVisibleProgressCard();
  } catch (error) {
    postReply(event.source, config, {
      type: "NACK",
      sequence: data.sequence,
      reason: error?.name === "QuotaExceededError" ? "storage-full" : "invalid-or-unsaved-batch"
    });
    const current = progressFromResult(currentProgressResult(loaded.vault)) || {};
    try {
      writeProgress(loaded.vault, {
        state: "paused",
        discovered: current.discovered || numeric(data.progress?.discovered),
        imported: importedCards(loaded.vault).length,
        failed: current.failed || numeric(data.progress?.unresolved),
        deferred: current.deferred || numeric(data.progress?.deferred)
      });
      saveBrowserVault(globalThis.localStorage, loaded.vault);
    } catch {
      // Never claim a failed persistence as durable progress.
    }
    updateVisibleProgressCard();
  }
}

function handleComplete(event, config, data) {
  const loaded = loadBrowserVault(globalThis.localStorage);
  const total = numeric(data.total);
  const unresolved = numeric(data.unresolved);
  const imported = total ? Math.min(total, importedCards(loaded.vault).length) : importedCards(loaded.vault).length;
  const complete = unresolved === 0 && (!total || imported >= total);
  writeProgress(loaded.vault, {
    state: complete ? "completed" : "partial",
    discovered: total,
    imported,
    failed: unresolved,
    deferred: 0,
    lastSuccessAt: progressFromResult(currentProgressResult(loaded.vault))?.lastSuccessAt || nowIso()
  });
  saveBrowserVault(globalThis.localStorage, loaded.vault);
  postReply(event.source, config, { type: "COMPLETE_ACK", imported, unresolved });
  markPendingUi(UI_AUTO_REFRESH_EVERY);
  updateVisibleProgressCard();
}

function installReceiver() {
  const config = receiverConfigFromPage();
  window.addEventListener("message", event => {
    const data = validatedEnvelope(event, config || receiverConfigFromPage());
    if (!data) return;
    const active = config || receiverConfigFromPage();
    sourceWindow = event.source;
    if (data.type === "HELLO") {
      const loaded = loadBrowserVault(globalThis.localStorage);
      writeProgress(loaded.vault, {
        state: "running",
        imported: importedCards(loaded.vault).length,
        failed: 0,
        deferred: 0
      });
      saveBrowserVault(globalThis.localStorage, loaded.vault);
      postReply(event.source, active, {
        type: "READY",
        known: knownChatGptFreshness(loaded.vault),
        limits: { maxBatchCards: MAX_BATCH_CARDS, maxMessageChars: MAX_MESSAGE_CHARS }
      });
      updateVisibleProgressCard();
      return;
    }
    if (data.type === "SOURCE_STATE") {
      persistSourceState(data);
      return;
    }
    if (data.type === "DISCOVERED") {
      persistDiscovered(data.total);
      return;
    }
    if (data.type === "BATCH") {
      handleBatch(event, active, data);
      return;
    }
    if (data.type === "COMPLETE") {
      handleComplete(event, active, data);
      return;
    }
    if (data.type === "PAUSED") persistPause(data);
  });
}

function transientLaunch() {
  try {
    return JSON.parse(sessionStorage.getItem(RECEIVER_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.readOnly = true;
  area.style.cssText = "position:fixed;left:-9999px;top:0";
  document.body.append(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  return Boolean(ok);
}

function createLaunchConfig() {
  const config = {
    sessionId: randomId("session"),
    nonce: randomId("nonce"),
    sourceOrigin: CHATGPT_IMPORT_SOURCE_ORIGIN,
    createdAt: nowIso()
  };
  sessionStorage.setItem(RECEIVER_SESSION_KEY, JSON.stringify(config));
  return config;
}

function runnerFor(config) {
  return buildChatGptHistorySourceRunner({
    receiverOrigin: window.location.origin,
    receiverPath: "/demo/",
    sessionId: config.sessionId,
    nonce: config.nonce
  });
}

function ensureDialog() {
  if (dialog?.isConnected) return dialog;
  dialog = document.createElement("dialog");
  dialog.id = "chatgptImportLaunchDialog";
  dialog.className = "dialog chatgpt-import-dialog";
  const article = document.createElement("article");
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "CHATGPT → DASHGPT";
  const title = document.createElement("h2");
  title.textContent = t("dialogTitle");
  const copy = document.createElement("p");
  copy.className = "muted";
  copy.id = "chatgptImportLaunchCopy";
  copy.textContent = t("dialogCopy");
  const actions = document.createElement("div");
  actions.className = "dialog-actions";
  const copyAgain = document.createElement("button");
  copyAgain.type = "button";
  copyAgain.className = "button ghost";
  copyAgain.textContent = t("copyAgain");
  copyAgain.addEventListener("click", async () => {
    const config = transientLaunch();
    if (!config) return;
    const ok = await copyText(runnerFor(config));
    copyAgain.textContent = ok ? t("copied") : t("copyAgain");
  });
  const close = document.createElement("button");
  close.type = "button";
  close.className = "button primary";
  close.textContent = importLocale() === "ru" ? "Понятно" : "Got it";
  close.addEventListener("click", () => dialog.close());
  actions.append(copyAgain, close);
  article.append(eyebrow, title, copy, actions);
  dialog.append(article);
  document.body.append(dialog);
  return dialog;
}

async function launchImport() {
  const config = createLaunchConfig();
  const chat = window.open(CHATGPT_IMPORT_SOURCE_ORIGIN + "/", "dashgpt-chatgpt-history-source");
  const copied = await copyText(runnerFor(config));
  const loaded = loadBrowserVault(globalThis.localStorage);
  const current = progressFromResult(currentProgressResult(loaded.vault)) || {};
  writeProgress(loaded.vault, {
    state: "waiting_for_source",
    discovered: current.discovered || 0,
    imported: importedCards(loaded.vault).length,
    failed: current.failed || 0,
    deferred: 0
  });
  saveBrowserVault(globalThis.localStorage, loaded.vault);
  updateVisibleProgressCard();
  const modal = ensureDialog();
  const copy = modal.querySelector("#chatgptImportLaunchCopy");
  if (copy) copy.textContent = copied
    ? t("dialogCopy")
    : (importLocale() === "ru" ? "ChatGPT открыт, но Safari не дал скопировать скрипт автоматически. Нажми «Скопировать скрипт ещё раз»." : "ChatGPT opened, but Safari blocked automatic copying. Use “Copy script again”.");
  if (!chat) {
    if (copy) copy.textContent += importLocale() === "ru" ? " Разреши всплывающее окно для DashGPT и попробуй снова." : " Allow pop-ups for DashGPT and try again.";
  }
  modal.showModal();
}

function pauseImport() {
  const config = receiverConfigFromPage() || transientLaunch();
  if (sourceWindow && config) {
    sourceWindow.postMessage({
      protocol: CHATGPT_IMPORT_PROTOCOL,
      version: CHATGPT_IMPORT_PROTOCOL_VERSION,
      sessionId: config.sessionId,
      nonce: config.nonce,
      type: "CONTROL_PAUSE"
    }, CHATGPT_IMPORT_SOURCE_ORIGIN);
  }
  persistPause({});
}

function viewImported() {
  const input = document.querySelector("#searchInput");
  if (input) {
    input.value = "chatgpt";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  window.location.href = "/demo/?q=chatgpt";
}

function progressAction(progress) {
  if (!progress || ["ready", "paused", "partial"].includes(progress.state)) return { label: progress?.state === "ready" ? t("start") : t("continue"), action: launchImport };
  if (progress.state === "completed") return { label: t("view"), action: viewImported };
  if (["running", "rate_limited"].includes(progress.state)) return { label: t("pause"), action: pauseImport };
  return { label: t("copyAgain"), action: async () => {
    const config = transientLaunch();
    if (config) await copyText(runnerFor(config));
    ensureDialog().showModal();
  } };
}

function pendingUiCount() {
  return Math.max(0, Number(sessionStorage.getItem(UI_PENDING_KEY) || 0));
}

function markPendingUi(count) {
  if (!count) return;
  const next = pendingUiCount() + count;
  sessionStorage.setItem(UI_PENDING_KEY, String(next));
  const enough = next >= UI_AUTO_REFRESH_EVERY;
  const elapsed = Date.now() - lastAutoRefreshAt;
  if (enough && elapsed >= UI_AUTO_REFRESH_MIN_MS && document.visibilityState === "hidden") {
    lastAutoRefreshAt = Date.now();
    sessionStorage.setItem(UI_PENDING_KEY, "0");
    setTimeout(() => window.location.reload(), 50);
  }
}

function currentStoredProgress() {
  const loaded = loadBrowserVault(globalThis.localStorage);
  return {
    loaded,
    result: currentProgressResult(loaded.vault),
    progress: progressFromResult(currentProgressResult(loaded.vault))
  };
}

function updateVisibleProgressCard() {
  const { result, progress } = currentStoredProgress();
  const card = document.querySelector(`[data-result-id="${CHATGPT_IMPORT_RESULT_ID}"]`);
  if (!card || !result || !progress) return;
  card.classList.add("chatgpt-import-card");
  card.dataset.importState = progress.state;
  card.querySelector(".favorite-button")?.setAttribute("hidden", "");
  const title = card.querySelector(".title");
  const summary = card.querySelector(".summary");
  const status = card.querySelector(".card-status");
  const next = card.querySelector(".card-next");
  if (title) title.textContent = result.title;
  if (summary) summary.textContent = result.summary;
  if (status) status.textContent = result.status || "";
  if (next) {
    next.textContent = result.next ? `${importLocale() === "ru" ? "Дальше" : "Next"}: ${result.next}` : "";
    next.hidden = !result.next;
  }
  for (const selector of [".page-link", ".original-link", ".continue-link"]) card.querySelector(selector)?.setAttribute("hidden", "");
  const open = card.querySelector(".open-button");
  if (open) {
    const action = progressAction(progress);
    open.textContent = action.label;
    open.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      action.action();
    };
  }

  const actions = card.querySelector(".card-actions");
  if (actions) {
    actions.querySelectorAll(".chatgpt-import-extra").forEach(node => node.remove());
    if (pendingUiCount() > 0) {
      const refresh = document.createElement("button");
      refresh.type = "button";
      refresh.className = "button small ghost chatgpt-import-extra";
      refresh.textContent = `${t("refresh")} (${pendingUiCount()})`;
      refresh.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        sessionStorage.setItem(UI_PENDING_KEY, "0");
        window.location.reload();
      });
      actions.append(refresh);
    }
    if (progress.state === "completed") {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "button small ghost chatgpt-import-extra";
      remove.textContent = t("remove");
      remove.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        dismissImportCard();
      });
      actions.append(remove);
    }
  }

  const grid = card.parentElement;
  if (grid?.id === "resultsGrid" && grid.firstElementChild !== card) grid.prepend(card);
}

function installCardObserver() {
  if (cardObserver) return;
  const root = document.querySelector("#dashboardView") || document.body;
  cardObserver = new MutationObserver(records => {
    const externalMutation = records.some(record => {
      const target = record.target instanceof Element ? record.target : record.target?.parentElement;
      return !target?.closest?.(".chatgpt-import-card");
    });
    if (externalMutation) queueMicrotask(updateVisibleProgressCard);
  });
  cardObserver.observe(root, { childList: true, subtree: true });
  queueMicrotask(updateVisibleProgressCard);
}

function installExistingUserAction() {
  const loaded = loadBrowserVault(globalThis.localStorage);
  if (currentProgressResult(loaded.vault) || document.querySelector("#chatgptImportRestoreButton")) return;
  const topbar = document.querySelector(".topbar-actions");
  if (!topbar) return;
  const button = document.createElement("button");
  button.id = "chatgptImportRestoreButton";
  button.type = "button";
  button.className = "button ghost";
  button.textContent = t("restore");
  button.addEventListener("click", () => {
    restoreImportCard();
    window.location.reload();
  });
  topbar.prepend(button);
}

function installStyles() {
  if (document.getElementById(IMPORT_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = IMPORT_STYLE_ID;
  style.textContent = `
    .chatgpt-import-card { order:-1000; outline:2px solid color-mix(in srgb, hsl(var(--semantic-hue, 215) 70% 55%) 50%, transparent); }
    .chatgpt-import-card[data-import-state="running"] .card-status,
    .chatgpt-import-card[data-import-state="rate_limited"] .card-status { font-weight:700; }
    .chatgpt-import-card .card-actions { flex-wrap:wrap; }
    .chatgpt-import-dialog { max-width:min(620px, calc(100vw - 24px)); }
    @media (max-width: 360px) {
      .chatgpt-import-card .card-actions .button { flex:1 1 100%; width:100%; }
      .chatgpt-import-dialog { width:calc(100vw - 20px); padding:14px; }
    }
  `;
  document.head.append(style);
}

function installStorageRefresh() {
  window.addEventListener("storage", event => {
    if (event.key !== "dashgpt.demo.vault.v1") return;
    markPendingUi(1);
    updateVisibleProgressCard();
  });
  window.addEventListener("dashgpt:chatgpt-import-vault-updated", event => {
    if (event.detail?.reload) window.location.reload();
    else updateVisibleProgressCard();
  });
}

export function initializeChatGptHistoryImport({ phase = "post-app" } = {}) {
  if (phase === "pre-app") {
    seedDefaultChatGptImportCard(globalThis.localStorage);
    installReceiver();
    installStorageRefresh();
    return;
  }
  if (initialized) return;
  initialized = true;
  installStyles();
  installCardObserver();
  installExistingUserAction();
  updateVisibleProgressCard();
}
