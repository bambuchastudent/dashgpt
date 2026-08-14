import { expect, test } from "@playwright/test";
import { createVault, materializeResults } from "../demo/vault.js";
import { CHATGPT_SEMANTIC_ENRICHMENT_VERSION } from "../demo/chatgpt-semantic-enrichment.js";
import {
  applyChatGptUsageImportBatch,
  knownChatGptUsageFreshness
} from "../demo/chatgpt-profile-metrics-import-store.js";

const NOW = "2026-08-13T12:00:00.000Z";

test("legacy imported card gets one same-timestamp usage backfill", () => {
  const vault = createVault({ vaultId: "vault_f27_backfill", createdAt: NOW });
  const legacy = {
    sourceId: "conv_legacy",
    title: "Legacy",
    summary: "old import",
    currentState: "go",
    updatedAt: NOW,
    semanticEnrichmentVersion: CHATGPT_SEMANTIC_ENRICHMENT_VERSION
  };

  applyChatGptUsageImportBatch(vault, [legacy], { state: "running", discovered: 1, imported: 1 });
  expect(knownChatGptUsageFreshness(vault)).toEqual([]);

  const result = applyChatGptUsageImportBatch(vault, [{
    ...legacy,
    usage: { tokenCount: 222, tokenCountKind: "estimated", estimator: "visible-text-v1" }
  }], { state: "running", discovered: 1, imported: 1 });

  expect(result.updated).toBe(1);
  const cards = materializeResults(vault).filter(item => item.source?.sourceId === "conv_legacy");
  expect(cards).toHaveLength(1);
  expect(cards[0].result.usage.tokenCount).toBe(222);
  expect(knownChatGptUsageFreshness(vault)).toEqual([["conv_legacy", NOW]]);
});
