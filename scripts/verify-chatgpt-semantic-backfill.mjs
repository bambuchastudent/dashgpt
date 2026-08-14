import assert from "node:assert/strict";

Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: { lang: "en" } } });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { language: "en-US" } });

const { createVault, materializeResults, putResult } = await import("../demo/vault.js");
const { sanitizeChatGptCardCandidate } = await import("../demo/chatgpt-history-import.js");
const { projectChatGptExportConversation } = await import("../demo/chatgpt-export-normalizer.js");
const {
  applyChatGptSemanticImportBatch,
  knownChatGptSemanticFreshness
} = await import("../demo/chatgpt-semantic-import-store.js");
const { semanticEnrichmentVersionOf } = await import("../demo/chatgpt-semantic-enrichment.js");

const timestamp = "2026-08-12T10:00:00.000Z";
const base = {
  sourceId: "same-id",
  title: "Safari GitHub import",
  summary: "Import project",
  currentState: "Continue",
  facts: [],
  updatedAt: timestamp
};
const vault = createVault({ vaultId: "semantic-backfill", createdAt: "2026-08-13T00:00:00.000Z" });
const legacy = sanitizeChatGptCardCandidate({ ...base, tags: ["chatgpt", "safari", "import"] });
putResult(vault, legacy);
assert.equal(new Map(knownChatGptSemanticFreshness(vault)).has("same-id"), false);

const semanticCandidate = {
  ...base,
  category: "Software",
  tags: ["software", "safari", "github", "import"],
  semanticEnrichmentVersion: 1
};
const first = applyChatGptSemanticImportBatch(vault, [semanticCandidate], { discovered: 1 });
assert.equal(first.updated, 1);
const current = materializeResults(vault).find(result => result.source?.sourceId === "same-id");
assert.equal(current.id, legacy.id);
assert.equal(current.publishedAt, timestamp);
assert.equal(current.category, "Software");
assert.equal(current.tags.includes("chatgpt"), false);
assert.equal(semanticEnrichmentVersionOf(current), 1);
assert.equal(materializeResults(vault).filter(result => result.source?.sourceId === "same-id").length, 1);
assert.equal(new Map(knownChatGptSemanticFreshness(vault)).get("same-id"), timestamp);

const replay = applyChatGptSemanticImportBatch(vault, [semanticCandidate], { discovered: 1 });
assert.equal(replay.skipped, 1);
assert.equal(replay.updated, 0);

const exportTimestampSeconds = Date.parse(timestamp) / 1000;
const exportCandidate = projectChatGptExportConversation({
  id: "export-backfill",
  title: "Salmon recipe",
  create_time: exportTimestampSeconds - 100,
  update_time: exportTimestampSeconds,
  current_node: "a",
  mapping: {
    u: { parent: null, children: ["a"], message: { author: { role: "user" }, content: { parts: ["Need a salmon recipe and curing instructions."] } } },
    a: { parent: "u", children: [], message: { author: { role: "assistant" }, content: { parts: ["Use salt and sugar for a simple salmon cure recipe."] } } }
  }
});
const exportLegacy = sanitizeChatGptCardCandidate({ ...exportCandidate, category: undefined, semanticEnrichmentVersion: undefined, tags: ["chatgpt", "salmon"] });
putResult(vault, exportLegacy);
const exportUpdate = applyChatGptSemanticImportBatch(vault, [exportCandidate], { discovered: 2 });
assert.equal(exportUpdate.updated, 1);
const exported = materializeResults(vault).find(result => result.source?.sourceId === "export-backfill");
assert.equal(exported.id, exportLegacy.id);
assert.equal(exported.category, "Food");
assert.equal(exported.tags.includes("chatgpt"), false);
assert.equal(semanticEnrichmentVersionOf(exported), 1);
assert.equal(materializeResults(vault).filter(result => result.source?.sourceId === "export-backfill").length, 1);

console.log("ChatGPT semantic backfill verification passed.");
