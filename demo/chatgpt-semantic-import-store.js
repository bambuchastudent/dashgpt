import { sanitizeChatGptCardCandidate } from "./chatgpt-history-import.js";
import {
  CHATGPT_SEMANTIC_ENRICHMENT_VERSION,
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
