import { materializeResults, putResult } from "./vault.js";
import {
  CHATGPT_IMPORT_RESULT_ID,
  applyChatGptImportBatch
} from "./chatgpt-history-import.js";
import {
  semanticizeChatGptCandidate
} from "./chatgpt-semantic-import-store.js";
import {
  needsChatGptSemanticBackfill,
  shouldReplaceChatGptImportedResult
} from "./chatgpt-semantic-enrichment.js";

const MAX_BATCH_CARDS = 48;
const TOKEN_COUNT_KINDS = new Set(["estimated", "reported"]);

export function sanitizeChatGptUsage(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const tokenCount = Number(value.tokenCount);
  const tokenCountKind = String(value.tokenCountKind || "");
  const estimator = String(value.estimator || "").trim();
  if (!Number.isSafeInteger(tokenCount) || tokenCount < 0) return null;
  if (!TOKEN_COUNT_KINDS.has(tokenCountKind)) return null;
  if (tokenCountKind === "estimated" && estimator !== "visible-text-v1") return null;
  return {
    tokenCount,
    tokenCountKind,
    ...(estimator ? { estimator } : {})
  };
}

export function usageAwareChatGptCandidate(raw) {
  const base = semanticizeChatGptCandidate(raw);
  const usage = sanitizeChatGptUsage(raw?.usage);
  if (!usage) return base;
  return {
    ...base,
    result: {
      ...(base.result && typeof base.result === "object" ? base.result : {}),
      usage
    }
  };
}

function hasValidUsage(result) {
  return Boolean(sanitizeChatGptUsage(result?.result?.usage));
}

export function knownChatGptUsageFreshness(vault) {
  return materializeResults(vault)
    .filter(result =>
      result.id !== CHATGPT_IMPORT_RESULT_ID
      && result.source?.provider === "chatgpt"
      && result.source?.type === "conversation"
      && typeof result.source?.sourceId === "string"
      && !needsChatGptSemanticBackfill(result)
      && hasValidUsage(result)
    )
    .map(result => [result.source.sourceId, String(result.publishedAt || "")])
    .filter(([, publishedAt]) => Number.isFinite(Date.parse(publishedAt)))
    .slice(0, 10_000);
}

function isUsageOnlyEnrichment(current, incoming) {
  if (!current || hasValidUsage(current) || !hasValidUsage(incoming)) return false;
  const currentTime = Date.parse(current.publishedAt || "");
  const incomingTime = Date.parse(incoming.publishedAt || "");
  return Number.isFinite(currentTime) && currentTime === incomingTime;
}

export function applyChatGptUsageImportBatch(vault, candidates, progress = {}) {
  if (!Array.isArray(candidates) || candidates.length > MAX_BATCH_CARDS) throw new Error("Invalid usage-aware import batch size");
  const currentById = new Map(materializeResults(vault).map(result => [result.id, result]));
  let accepted = 0;
  let updated = 0;
  let skipped = 0;

  for (const raw of candidates) {
    const result = usageAwareChatGptCandidate(raw);
    const current = currentById.get(result.id);
    if (current?.immutable) throw new Error("Imported Result identity conflicts with immutable content");
    const replace = !current
      || shouldReplaceChatGptImportedResult(current, result)
      || isUsageOnlyEnrichment(current, result);
    if (!replace) {
      skipped += 1;
      continue;
    }
    if (current) updated += 1;
    else accepted += 1;
    putResult(vault, result);
    currentById.set(result.id, result);
  }

  const progressResult = applyChatGptImportBatch(vault, [], progress);
  return { accepted, updated, skipped, imported: progressResult.imported };
}
