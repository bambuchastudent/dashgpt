import assert from "node:assert/strict";
import { TextEncoder } from "node:util";

Object.defineProperty(globalThis, "document", {
  configurable: true,
  value: { documentElement: { lang: "en" } }
});
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { language: "en-US" }
});

const {
  createVault,
  materializeResults,
  putResult,
  saveBrowserVault
} = await import("../demo/vault.js");
const {
  CHATGPT_IMPORT_RESULT_ID,
  applyChatGptImportBatch,
  chatGptImportedResultId,
  knownChatGptFreshness,
  sanitizeChatGptCardCandidate,
  seedDefaultChatGptImportCard
} = await import("../demo/chatgpt-history-import.js");
const { applyChatGptImportBatchFast } = await import("../demo/chatgpt-history-import-batch.js");
const {
  computeChatGptDetailRetryDelay
} = await import("../demo/chatgpt-history-source-runner-core.js");
const {
  CHATGPT_HISTORY_SOURCE_VERSION,
  MAX_CHATGPT_IMPORT_ACTION_CHARS,
  buildChatGptHistoryImportAction,
  buildChatGptHistorySourceRunner
} = await import("../demo/chatgpt-history-source-runner.js");

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function candidate(sourceId, updatedAt, overrides = {}) {
  return {
    sourceId,
    title: "Imported conversation",
    summary: "A bounded useful assistant outcome from the selected ChatGPT branch.",
    currentState: "Continue from the latest useful user state.",
    tags: ["chatgpt", "imported"],
    facts: ["Imported from ChatGPT", "12 visible messages"],
    updatedAt,
    ...overrides
  };
}

{
  const storage = new MemoryStorage();
  const first = seedDefaultChatGptImportCard(storage);
  assert.equal(first.seeded, true);
  const parsed = JSON.parse(storage.getItem("dashgpt.demo.vault.v1"));
  assert.equal(parsed.results.filter(result => result.id === CHATGPT_IMPORT_RESULT_ID).length, 1);
  const second = seedDefaultChatGptImportCard(storage);
  assert.equal(second.seeded, false);
}

{
  const storage = new MemoryStorage();
  const vault = createVault({ vaultId: "vault_existing", createdAt: "2026-08-11T00:00:00.000Z" });
  putResult(vault, {
    id: "existing-card",
    schemaVersion: 1,
    title: "Existing",
    summary: "Existing user content",
    tags: [],
    decisions: [],
    immutable: false,
    contentVersion: 1
  });
  putResult(vault, sanitizeChatGptCardCandidate(candidate("already-imported", "2026-08-11T10:00:00.000Z")));
  saveBrowserVault(storage, vault);
  const seeded = seedDefaultChatGptImportCard(storage);
  assert.equal(seeded.seeded, true);
  const parsed = JSON.parse(storage.getItem("dashgpt.demo.vault.v1"));
  const progress = parsed.results.find(result => result.id === CHATGPT_IMPORT_RESULT_ID)?.result;
  assert.equal(progress?.imported, 1);
  assert.equal(progress?.deferred, 0);
}

assert.equal(chatGptImportedResultId("abc-123"), "chatgpt-conversation-abc-123");
assert.throws(() => chatGptImportedResultId("https://evil.invalid/x"));

{
  const now = Date.parse("2026-08-12T10:00:00.000Z");
  const secondsDelay = computeChatGptDetailRetryDelay("3", 0, "conversation-a", now);
  assert.ok(secondsDelay >= 3000);
  const first = computeChatGptDetailRetryDelay("", 0, "conversation-a", now);
  const second = computeChatGptDetailRetryDelay("", 1, "conversation-a", now);
  assert.ok(second > first);
}

{
  const vault = createVault({ vaultId: "vault_batch", createdAt: "2026-08-11T00:00:00.000Z" });
  const first = applyChatGptImportBatch(vault, [candidate("same-id", "2026-08-10T10:00:00.000Z")], { discovered: 1, unresolved: 0, deferred: 2 });
  assert.equal(first.accepted, 1);
  const replay = applyChatGptImportBatch(vault, [candidate("same-id", "2026-08-10T10:00:00.000Z")], { discovered: 1, unresolved: 0, deferred: 1 });
  assert.equal(replay.skipped, 1);
  assert.equal(materializeResults(vault).filter(result => result.source?.sourceId === "same-id").length, 1);
  const newer = applyChatGptImportBatch(vault, [candidate("same-id", "2026-08-11T10:00:00.000Z", { summary: "Newer source state" })], { discovered: 1, unresolved: 0, deferred: 0 });
  assert.equal(newer.updated, 1);
  const known = new Map(knownChatGptFreshness(vault));
  assert.equal(known.get("same-id"), "2026-08-11T10:00:00.000Z");
}

{
  const vault = createVault({ vaultId: "vault_fast_batch", createdAt: "2026-08-11T00:00:00.000Z" });
  const batch = Array.from({ length: 32 }, (_, index) => candidate(`fast-${index}`, "2026-08-11T10:00:00.000Z"));
  const first = applyChatGptImportBatchFast(vault, batch, { discovered: 32, unresolved: 0, deferred: 3 });
  assert.deepEqual({ accepted: first.accepted, updated: first.updated, skipped: first.skipped }, { accepted: 32, updated: 0, skipped: 0 });
  const replay = applyChatGptImportBatchFast(vault, batch, { discovered: 32, unresolved: 0, deferred: 2 });
  assert.deepEqual({ accepted: replay.accepted, updated: replay.updated, skipped: replay.skipped }, { accepted: 0, updated: 0, skipped: 32 });
}

{
  const projected = sanitizeChatGptCardCandidate(candidate("bounded", "2026-08-11T10:00:00.000Z", {
    title: "T".repeat(1000),
    summary: "S".repeat(10000),
    currentState: "C".repeat(5000),
    tags: Array.from({ length: 30 }, (_, index) => `tag-${index}-${"x".repeat(100)}`),
    facts: Array.from({ length: 30 }, (_, index) => `fact-${index}-${"y".repeat(1000)}`)
  }));
  assert.ok(projected.title.length <= 160);
  assert.ok(projected.summary.length <= 700);
  assert.ok(projected.currentState.length <= 300);
  assert.ok(projected.tags.length <= 6);
  assert.ok(projected.facts.length <= 4);
}

{
  const vault = createVault({ vaultId: "vault_large", createdAt: "2026-08-11T00:00:00.000Z" });
  for (let index = 0; index < 2500; index += 1) {
    vault.results.push(sanitizeChatGptCardCandidate(candidate(`synthetic-${index}`, "2026-08-11T10:00:00.000Z")));
  }
  const bytes = new TextEncoder().encode(JSON.stringify(vault)).byteLength;
  assert.ok(bytes < 6_200_000);
}

{
  const runner = buildChatGptHistorySourceRunner({
    receiverOrigin: "https://dashgpt.example",
    receiverPath: "/demo/",
    sessionId: "session-test",
    nonce: "nonce-test"
  });
  assert.equal(CHATGPT_HISTORY_SOURCE_VERSION, 4);
  assert.match(runner, /"sourceVersion":4/);
  assert.match(runner, /"initialConcurrency":2/);
  assert.match(runner, /"maxConcurrency":3/);
  assert.match(runner, /scheduler\.rateLimited\(\)/);
  assert.match(runner, /ChatGptDetailDeferredError/);
  assert.match(runner, /rateLimitStreak/);
  assert.match(runner, /cooldownStages/);
  assert.match(runner, /savedCurrent/);
  assert.match(runner, /CONTROL_PAUSE/);
}

{
  const action = buildChatGptHistoryImportAction({
    receiverOrigin: "https://dashgpt.example",
    receiverPath: "/demo/"
  });
  assert.ok(action.length < MAX_CHATGPT_IMPORT_ACTION_CHARS);
  assert.match(action, /rateLimitStreak/);
  assert.match(action, /ChatGptDetailDeferredError/);
}

console.log("ChatGPT history import verifier: idempotent import, F25 throttling, resumability and reusable launcher contracts passed.");
