import {
  loadBrowserVault,
  materializeResults,
  putResult,
  saveBrowserVault
} from "./vault.js";
import {
  CHATGPT_IMPORT_PROTOCOL,
  CHATGPT_IMPORT_PROTOCOL_VERSION,
  CHATGPT_IMPORT_RESULT_ID,
  CHATGPT_IMPORT_SOURCE_ORIGIN,
  applyChatGptImportBatch,
  sanitizeChatGptCardCandidate
} from "./chatgpt-history-import.js";

const RECEIVER_SESSION_KEY = "dashgpt.chatgpt-import.receiver.v1";
const UI_PENDING_KEY = "dashgpt.chatgpt-import.pending-ui.v1";
const VAULT_UPDATED_EVENT = "dashgpt:chatgpt-import-vault-updated";
const MAX_BATCH_CARDS = 48;
const MAX_MESSAGE_CHARS = 240_000;
const SOURCE_STATES = new Set(["running", "rate_limited"]);
let installed = false;
let returnRefreshScheduled = false;

function safeMessageSize(data) {
  try { return JSON.stringify(data).length; } catch { return Number.POSITIVE_INFINITY; }
}

function receiverConfig() {
  try {
    const parsed = JSON.parse(globalThis.sessionStorage?.getItem?.(RECEIVER_SESSION_KEY) || "null");
    return parsed?.sessionId && parsed?.nonce ? parsed : null;
  } catch {
    return null;
  }
}

function pendingUiCount() {
  return Math.max(0, Number(globalThis.sessionStorage?.getItem?.(UI_PENDING_KEY) || 0));
}

function validEnvelope(event) {
  const config = receiverConfig();
  const data = event.data;
  if (!config || event.origin !== CHATGPT_IMPORT_SOURCE_ORIGIN) return null;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  if (data.protocol !== CHATGPT_IMPORT_PROTOCOL || data.version !== CHATGPT_IMPORT_PROTOCOL_VERSION) return null;
  if (data.sessionId !== config.sessionId || data.nonce !== config.nonce) return null;
  if (safeMessageSize(data) > MAX_MESSAGE_CHARS) return null;

  if (data.type === "BATCH") {
    if (!Number.isInteger(data.sequence) || data.sequence < 1) return null;
    if (!Array.isArray(data.cards) || data.cards.length > MAX_BATCH_CARDS) return null;
    return { config, data };
  }

  if (data.type === "SOURCE_STATE") {
    if (!SOURCE_STATES.has(data.state)) return null;
    const retryAfterMs = Number(data.retryAfterMs || 0);
    if (!Number.isFinite(retryAfterMs) || retryAfterMs < 0 || retryAfterMs > 60_000) return null;
    return { config, data: { ...data, retryAfterMs: Math.floor(retryAfterMs) } };
  }

  return null;
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

function mutableResultIndex(vault) {
  const byId = new Map();
  for (let index = 0; index < vault.results.length; index += 1) {
    const result = vault.results[index];
    if (!result?.immutable && typeof result?.id === "string") byId.set(result.id, index);
  }
  return byId;
}

/**
 * Import-only fast path. Incoming objects have already crossed the strict
 * allowlist in sanitizeChatGptCardCandidate. We update the in-memory mutable
 * Result array directly, then the normal saveBrowserVault path validates and
 * sanitizes the complete Vault exactly once before the durable write.
 */
export function applyChatGptImportBatchFast(vault, candidates, progress = {}) {
  if (!Array.isArray(candidates) || candidates.length > MAX_BATCH_CARDS) throw new Error("Invalid import batch size");
  const currentById = new Map(materializeResults(vault).map(result => [result.id, result]));
  const indexById = mutableResultIndex(vault);
  let accepted = 0;
  let updated = 0;
  let skipped = 0;

  for (const raw of candidates) {
    const result = sanitizeChatGptCardCandidate(raw);
    const current = currentById.get(result.id);
    if (current?.immutable) throw new Error("Imported Result identity conflicts with immutable content");
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

    const index = indexById.get(result.id);
    if (Number.isInteger(index)) vault.results[index] = result;
    else {
      indexById.set(result.id, vault.results.length);
      vault.results.push(result);
    }
    currentById.set(result.id, result);
  }

  // Reuse the canonical Feature 20 progress projection without re-upserting
  // every conversation through putResult. With an empty card list this performs
  // one progress-card update for the whole batch.
  const progressResult = applyChatGptImportBatch(vault, [], progress);
  return {
    accepted,
    updated,
    skipped,
    imported: progressResult.imported
  };
}

function markPendingUi(count) {
  if (!count) return;
  globalThis.sessionStorage?.setItem?.(UI_PENDING_KEY, String(pendingUiCount() + count));
}

function refreshProgressiveCardsOnReturn() {
  if (returnRefreshScheduled || typeof document === "undefined" || document.visibilityState !== "visible") return;
  if (!receiverConfig() || pendingUiCount() <= 0) return;
  returnRefreshScheduled = true;
  // Do not repeatedly reload the hidden receiver while ChatGPT is fetching.
  // Refresh exactly once when the user comes back so the canonical app.js
  // gallery materializes everything that is already durable in the Vault.
  globalThis.sessionStorage?.setItem?.(UI_PENDING_KEY, "0");
  setTimeout(() => globalThis.location?.reload?.(), 80);
}

function handleBatch(event, config, data) {
  const loaded = loadBrowserVault(globalThis.localStorage);
  try {
    const result = applyChatGptImportBatchFast(loaded.vault, data.cards, data.progress || {});
    // ACK is deliberately after this durable write. saveBrowserVault performs
    // the regular full Vault validation/sanitization once for the batch.
    saveBrowserVault(globalThis.localStorage, loaded.vault);
    markPendingUi(result.accepted + result.updated);
    globalThis.dispatchEvent?.(new CustomEvent(VAULT_UPDATED_EVENT));
    postReply(event.source, config, { type: "ACK", sequence: data.sequence, ...result });
  } catch (error) {
    postReply(event.source, config, {
      type: "NACK",
      sequence: data.sequence,
      reason: error?.name === "QuotaExceededError" ? "storage-full" : "invalid-or-unsaved-batch"
    });
  }
}

function humanizedSourceState(current, state) {
  const progress = current?.result;
  if (!progress || progress.kind !== "chatgpt-history-import-progress") return null;
  if (!["running", "rate_limited"].includes(progress.state)) return null;
  const discovered = Math.max(0, Number(progress.discovered || 0));
  const imported = Math.max(0, Number(progress.imported || 0));
  const remaining = discovered ? Math.max(0, discovered - imported) : 0;
  const ru = current.language === "ru";
  const rateLimited = state === "rate_limited";
  const summary = rateLimited
    ? (ru
      ? `Импортировано ${imported}${discovered ? ` из ${discovered}` : ""}. Жду, пока ChatGPT снова разрешит запросы.`
      : `Imported ${imported}${discovered ? ` of ${discovered}` : ""}. Waiting for ChatGPT to allow more requests.`)
    : (ru
      ? `Импортировано ${imported}${discovered ? ` из ${discovered}` : ""}. Можно пользоваться DashGPT, пока исходная страница ChatGPT доступна.`
      : `Imported ${imported}${discovered ? ` of ${discovered}` : ""}. You can keep using DashGPT while the source page stays available.`);
  return {
    ...current,
    summary,
    status: rateLimited ? (ru ? "Жду ChatGPT" : "Waiting for ChatGPT") : (ru ? "Импорт идёт" : "Importing"),
    next: remaining ? `${remaining} ${ru ? "осталось" : "remaining"}` : "",
    result: {
      ...progress,
      state,
      updatedAt: new Date().toISOString()
    }
  };
}

function handleSourceState(event, config, data) {
  const loaded = loadBrowserVault(globalThis.localStorage);
  const current = materializeResults(loaded.vault).find(result => result.id === CHATGPT_IMPORT_RESULT_ID);
  const updated = humanizedSourceState(current, data.state);
  if (!updated) return;
  try {
    putResult(loaded.vault, updated);
    saveBrowserVault(globalThis.localStorage, loaded.vault);
    globalThis.dispatchEvent?.(new CustomEvent(VAULT_UPDATED_EVENT));
    postReply(event.source, config, { type: "SOURCE_STATE_ACK", state: data.state });
  } catch {
    // A transient visual state is never acknowledged as durable if Vault save fails.
  }
}

export function installChatGptImportBatchFastPath() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  // Install before the standard receiver. Validated BATCH/SOURCE_STATE messages
  // are fully owned here; all other protocol messages continue to the standard
  // Feature 20 lifecycle receiver.
  window.addEventListener("message", event => {
    const envelope = validEnvelope(event);
    if (!envelope) return;
    event.stopImmediatePropagation();
    if (envelope.data.type === "BATCH") handleBatch(event, envelope.config, envelope.data);
    else handleSourceState(event, envelope.config, envelope.data);
  }, true);
  document.addEventListener("visibilitychange", refreshProgressiveCardsOnReturn);
  queueMicrotask(refreshProgressiveCardsOnReturn);
}
