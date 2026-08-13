import { materializeResults, putResult } from "./vault.js";
import {
  CHATGPT_IMPORT_RESULT_ID,
  applyChatGptImportBatch,
  sanitizeChatGptCardCandidate
} from "./chatgpt-history-import.js";
import {
  CHATGPT_SEMANTIC_ENRICHMENT_VERSION,
  needsChatGptSemanticBackfill,
  normalizeChatGptSemanticCandidate,
  semanticProjectionMetadata,
  shouldReplaceChatGptImportedResult
} from "./chatgpt-semantic-enrichment.js";

const MAX_BATCH_CARDS = 48;

export function semanticizeChatGptCandidate(raw) {
  const base = sanitizeChatGptCardCandidate(raw);
  if (Number(raw?.semanticEnrichmentVersion || 0) !== CHATGPT_SEMANTIC_ENRICHMENT_VERSION) return base;
  const semantic = normalizeChatGptSemanticCandidate(raw);
  return {
    ...base,
    category: semantic.category,
    tags: semantic.tags,
    result: semanticProjectionMetadata()
  };
}

export function knownChatGptSemanticFreshness(vault) {
  return materializeResults(vault)
    .filter(result =>
      result.id !== CHATGPT_IMPORT_RESULT_ID
      && result.source?.provider === "chatgpt"
      && result.source?.type === "conversation"
      && typeof result.source?.sourceId === "string"
      && !needsChatGptSemanticBackfill(result)
    )
    .map(result => [result.source.sourceId, String(result.publishedAt || "")])
    .filter(([, publishedAt]) => Number.isFinite(Date.parse(publishedAt)))
    .slice(0, 10_000);
}

export function applyChatGptSemanticImportBatch(vault, candidates, progress = {}) {
  if (!Array.isArray(candidates) || candidates.length > MAX_BATCH_CARDS) throw new Error("Invalid semantic import batch size");
  const currentById = new Map(materializeResults(vault).map(result => [result.id, result]));
  let accepted = 0;
  let updated = 0;
  let skipped = 0;

  for (const raw of candidates) {
    const result = semanticizeChatGptCandidate(raw);
    const current = currentById.get(result.id);
    if (current?.immutable) throw new Error("Imported Result identity conflicts with immutable content");
    if (current && !shouldReplaceChatGptImportedResult(current, result)) {
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
