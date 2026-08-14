import { loadBrowserVault, saveBrowserVault } from "./vault.js";
import {
  CHATGPT_IMPORT_PROTOCOL,
  CHATGPT_IMPORT_PROTOCOL_VERSION,
  CHATGPT_IMPORT_SOURCE_ORIGIN
} from "./chatgpt-history-import.js";
import { CHATGPT_SEMANTIC_ENRICHMENT_VERSION } from "./chatgpt-semantic-enrichment.js";
import {
  applyChatGptUsageImportBatch,
  knownChatGptUsageFreshness
} from "./chatgpt-profile-metrics-import-store.js";

const RECEIVER_SESSION_KEY = "dashgpt.chatgpt-import.receiver.v1";
const UI_PENDING_KEY = "dashgpt.chatgpt-import.pending-ui.v1";
const MAX_BATCH_CARDS = 48;
const MAX_MESSAGE_CHARS = 240_000;
const MIN_USAGE_SOURCE_VERSION = 7;
let installed = false;
let activeUsageSession = "";

function receiverConfig() {
  try {
    const value = JSON.parse(globalThis.sessionStorage?.getItem?.(RECEIVER_SESSION_KEY) || "null");
    return value?.sessionId && value?.nonce ? value : null;
  } catch {
    return null;
  }
}

function sessionKey(config) {
  return config ? `${config.sessionId}:${config.nonce}` : "";
}

function owned(event) {
  const config = receiverConfig();
  const data = event.data;
  if (!config || event.origin !== CHATGPT_IMPORT_SOURCE_ORIGIN || !data || typeof data !== "object" || Array.isArray(data)) return null;
  if (data.protocol !== CHATGPT_IMPORT_PROTOCOL || data.version !== CHATGPT_IMPORT_PROTOCOL_VERSION) return null;
  if (data.sessionId !== config.sessionId || data.nonce !== config.nonce) return null;
  return config;
}

function messageSize(data) {
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

function answerHello(event, config, data) {
  if (messageSize(data) > MAX_MESSAGE_CHARS) return;
  if (Number(data.sourceVersion || 0) < MIN_USAGE_SOURCE_VERSION) return;
  activeUsageSession = sessionKey(config);
  const loaded = loadBrowserVault(globalThis.localStorage);
  postReply(event.source, config, {
    type: "READY",
    usageAware: true,
    semanticEnrichmentVersion: CHATGPT_SEMANTIC_ENRICHMENT_VERSION,
    known: knownChatGptUsageFreshness(loaded.vault),
    limits: { maxBatchCards: MAX_BATCH_CARDS, maxMessageChars: MAX_MESSAGE_CHARS }
  });
}

function nack(event, config, data, reason) {
  postReply(event.source, config, {
    type: "NACK",
    sequence: Number.isInteger(data?.sequence) ? data.sequence : 0,
    usageAware: true,
    semanticEnrichmentVersion: CHATGPT_SEMANTIC_ENRICHMENT_VERSION,
    reason
  });
}

function receiveBatch(event, config, data) {
  if (messageSize(data) > MAX_MESSAGE_CHARS) {
    nack(event, config, data, "message-too-large");
    return;
  }
  if (!Number.isInteger(data.sequence) || data.sequence < 1 || !Array.isArray(data.cards) || data.cards.length > MAX_BATCH_CARDS) {
    nack(event, config, data, "invalid-batch");
    return;
  }
  const loaded = loadBrowserVault(globalThis.localStorage);
  try {
    const result = applyChatGptUsageImportBatch(loaded.vault, data.cards, data.progress || {});
    saveBrowserVault(globalThis.localStorage, loaded.vault);
    const current = Math.max(0, Number(globalThis.sessionStorage?.getItem?.(UI_PENDING_KEY) || 0));
    globalThis.sessionStorage?.setItem?.(UI_PENDING_KEY, String(current + result.accepted + result.updated));
    globalThis.dispatchEvent?.(new CustomEvent("dashgpt:chatgpt-import-vault-updated"));
    postReply(event.source, config, {
      type: "ACK",
      sequence: data.sequence,
      usageAware: true,
      semanticEnrichmentVersion: CHATGPT_SEMANTIC_ENRICHMENT_VERSION,
      ...result
    });
  } catch (error) {
    nack(event, config, data, error?.name === "QuotaExceededError" ? "storage-full" : "invalid-or-unsaved-batch");
  }
}

export function installChatGptProfileMetricsImportBridge() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("message", event => {
    const config = owned(event);
    if (!config) return;
    if (event.data.type === "HELLO") {
      answerHello(event, config, event.data);
      return;
    }
    if (event.data.type !== "BATCH" || activeUsageSession !== sessionKey(config)) return;
    event.stopImmediatePropagation();
    receiveBatch(event, config, event.data);
  }, true);
}
