import { loadBrowserVault, saveBrowserVault } from "./vault.js";
import {
  CHATGPT_IMPORT_PROTOCOL,
  CHATGPT_IMPORT_PROTOCOL_VERSION,
  CHATGPT_IMPORT_SOURCE_ORIGIN
} from "./chatgpt-history-import.js";
import { CHATGPT_SEMANTIC_ENRICHMENT_VERSION } from "./chatgpt-semantic-enrichment.js";
import {
  applyChatGptSemanticImportBatch,
  knownChatGptSemanticFreshness
} from "./chatgpt-semantic-import-store.js";

const RECEIVER_SESSION_KEY = "dashgpt.chatgpt-import.receiver.v1";
const UI_PENDING_KEY = "dashgpt.chatgpt-import.pending-ui.v1";
const MAX_BATCH_CARDS = 48;
const MAX_MESSAGE_CHARS = 240_000;
const MIN_SEMANTIC_SOURCE_VERSION = 4;
let installed = false;

function receiverConfig() {
  try {
    const value = JSON.parse(globalThis.sessionStorage?.getItem?.(RECEIVER_SESSION_KEY) || "null");
    return value?.sessionId && value?.nonce ? value : null;
  } catch {
    return null;
  }
}

function owned(event) {
  const config = receiverConfig();
  const data = event.data;
  if (!config || event.origin !== CHATGPT_IMPORT_SOURCE_ORIGIN || !data || typeof data !== "object" || Array.isArray(data)) return null;
  if (data.protocol !== CHATGPT_IMPORT_PROTOCOL || data.version !== CHATGPT_IMPORT_PROTOCOL_VERSION) return null;
  if (data.sessionId !== config.sessionId || data.nonce !== config.nonce) return null;
  try { if (JSON.stringify(data).length > MAX_MESSAGE_CHARS) return null; } catch { return null; }
  return config;
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

function answerHello(event, config, data) {
  if (Number(data.sourceVersion || 0) < MIN_SEMANTIC_SOURCE_VERSION) return;
  const loaded = loadBrowserVault(globalThis.localStorage);
  postReply(event.source, config, {
    type: "READY",
    semanticEnrichmentVersion: CHATGPT_SEMANTIC_ENRICHMENT_VERSION,
    known: knownChatGptSemanticFreshness(loaded.vault),
    limits: { maxBatchCards: MAX_BATCH_CARDS, maxMessageChars: MAX_MESSAGE_CHARS }
  });
}

function receiveBatch(event, config, data) {
  if (!Number.isInteger(data.sequence) || data.sequence < 1) return false;
  if (!Array.isArray(data.cards) || data.cards.length > MAX_BATCH_CARDS) return false;
  const loaded = loadBrowserVault(globalThis.localStorage);
  try {
    const result = applyChatGptSemanticImportBatch(loaded.vault, data.cards, data.progress || {});
    saveBrowserVault(globalThis.localStorage, loaded.vault);
    const current = Math.max(0, Number(globalThis.sessionStorage?.getItem?.(UI_PENDING_KEY) || 0));
    globalThis.sessionStorage?.setItem?.(UI_PENDING_KEY, String(current + result.accepted + result.updated));
    postReply(event.source, config, {
      type: "ACK",
      sequence: data.sequence,
      semanticEnrichmentVersion: CHATGPT_SEMANTIC_ENRICHMENT_VERSION,
      ...result
    });
  } catch (error) {
    postReply(event.source, config, {
      type: "NACK",
      sequence: data.sequence,
      semanticEnrichmentVersion: CHATGPT_SEMANTIC_ENRICHMENT_VERSION,
      reason: error?.name === "QuotaExceededError" ? "storage-full" : "invalid-or-unsaved-batch"
    });
  }
  return true;
}

export function installChatGptSemanticImportBridge() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("message", event => {
    const config = owned(event);
    if (!config) return;
    if (event.data.type === "HELLO") {
      answerHello(event, config, event.data);
      return;
    }
    if (event.data.type !== "BATCH" || !receiveBatch(event, config, event.data)) return;
    event.stopImmediatePropagation();
  }, true);
}
