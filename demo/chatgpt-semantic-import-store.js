import { materializeResults } from "./vault.js";
import {
  CHATGPT_IMPORT_RESULT_ID,
  sanitizeChatGptCardCandidate
} from "./chatgpt-history-import.js";
import {
  CHATGPT_SEMANTIC_ENRICHMENT_VERSION,
  needsChatGptSemanticBackfill,
  normalizeChatGptSemanticCandidate,
  semanticProjectionMetadata
} from "./chatgpt-semantic-enrichment.js";

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
