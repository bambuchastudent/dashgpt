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

// A genuinely new empty Vault is seeded once with the stable operational card.
{
  const storage = new MemoryStorage();
  const first = seedDefaultChatGptImportCard(storage);
  assert.equal(first.seeded, true);
  const parsed = JSON.parse(storage.getItem("dashgpt.demo.vault.v1"));
  assert.equal(parsed.results.filter(result => result.id === CHATGPT_IMPORT_RESULT_ID).length, 1);
  const second = seedDefaultChatGptImportCard(storage);
  assert.equal(second.seeded, false);
  const parsedAgain = JSON.parse(storage.getItem("dashgpt.demo.vault.v1"));
  assert.equal(parsedAgain.results.filter(result => result.id === CHATGPT_IMPORT_RESULT_ID).length, 1);
}

// Existing populated Vaults get the same operational card unless the user
// explicitly dismissed it. Existing imported cards seed the displayed count.
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
  assert.equal(parsed.results.filter(result => result.id === CHATGPT_IMPORT_RESULT_ID).length, 1);
  assert.equal(progress?.state, "ready");
  assert.equal(progress?.imported, 1);
  assert.equal(progress?.deferred, 0);

  const replay = seedDefaultChatGptImportCard(storage);
  assert.equal(replay.seeded, false);
  assert.equal(JSON.parse(storage.getItem("dashgpt.demo.vault.v1")).results.filter(result => result.id === CHATGPT_IMPORT_RESULT_ID).length, 1);
}

// Explicit dismissal remains authoritative and prevents automatic resurrection.
{
  const storage = new MemoryStorage();
  const vault = createVault({ vaultId: "vault_dismissed", createdAt: "2026-08-11T00:00:00.000Z" });
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
  vault.events.push({
    schemaVersion: 1,
    eventId: "evt_import_dismissed",
    type: "system.card.dismissed",
    resultId: CHATGPT_IMPORT_RESULT_ID,
    value: true,
    createdAt: "2026-08-11T01:00:00.000Z"
  });
  saveBrowserVault(storage, vault);
  const seeded = seedDefaultChatGptImportCard(storage);
  assert.equal(seeded.seeded, false);
  assert.equal(JSON.parse(storage.getItem("dashgpt.demo.vault.v1")).results.some(result => result.id === CHATGPT_IMPORT_RESULT_ID), false);
}

// Source identity is deterministic and never title-based.
assert.equal(chatGptImportedResultId("abc-123"), "chatgpt-conversation-abc-123");
assert.throws(() => chatGptImportedResultId("https://evil.invalid/x"));

// Historical F24 core retry timing remains directly testable. F25's final
// staged policy is verified separately in verify-chatgpt-history-import-f25.mjs.
{
  const now = Date.parse("2026-08-12T10:00:00.000Z");
  const secondsDelay = computeChatGptDetailRetryDelay("3", 0, "conversation-a", now);
  assert.ok(secondsDelay >= 3000, `Retry-After seconds retried too early: ${secondsDelay}`);

  const retryAt = new Date(now + 5000).toUTCString();
  const dateDelay = computeChatGptDetailRetryDelay(retryAt, 0, "conversation-a", now);
  assert.ok(dateDelay >= 5000, `Retry-After date retried too early: ${dateDelay}`);

  const first = computeChatGptDetailRetryDelay("", 0, "conversation-a", now);
  const second = computeChatGptDetailRetryDelay("", 1, "conversation-a", now);
  const capped = computeChatGptDetailRetryDelay("", 7, "conversation-a", now);
  const stillCapped = computeChatGptDetailRetryDelay("", 20, "conversation-a", now);
  assert.ok(second > first, `Fallback backoff did not grow: ${first} -> ${second}`);
  assert.ok(capped <= 120_750, `Fallback backoff exceeded bound: ${capped}`);
  assert.equal(stillCapped, capped);

  const sameMinimumA = computeChatGptDetailRetryDelay("3", 0, "conversation-a", now);
  const sameMinimumB = computeChatGptDetailRetryDelay("3", 0, "conversation-b", now);
  assert.notEqual(sameMinimumA, sameMinimumB, "Different source IDs should not re-enter on the same millisecond");
}

// Canonical single-card path remains idempotent and freshness-aware, and its
// bounded progress projection carries a mixed-work deferred count.
{
  const vault = createVault({ vaultId: "vault_batch", createdAt: "2026-08-11T00:00:00.000Z" });
  const first = applyChatGptImportBatch(vault, [candidate("same-id", "2026-08-10T10:00:00.000Z")], { discovered: 1, unresolved: 0, deferred: 2 });
  assert.equal(first.accepted, 1);
  assert.equal(first.updated, 0);
  assert.equal(first.skipped, 0);
  assert.equal(materializeResults(vault).find(result => result.id === CHATGPT_IMPORT_RESULT_ID)?.result?.deferred, 2);
  assert.equal(materializeResults(vault).find(result => result.id === CHATGPT_IMPORT_RESULT_ID)?.result?.state, "running");

  const replay = applyChatGptImportBatch(vault, [candidate("same-id", "2026-08-10T10:00:00.000Z")], { discovered: 1, unresolved: 0, deferred: 1 });
  assert.equal(replay.accepted, 0);
  assert.equal(replay.updated, 0);
  assert.equal(replay.skipped, 1);
  assert.equal(materializeResults(vault).filter(result => result.source?.sourceId === "same-id").length, 1);

  const newer = applyChatGptImportBatch(vault, [candidate("same-id", "2026-08-11T10:00:00.000Z", { summary: "Newer source state" })], { discovered: 1, unresolved: 0, deferred: 0 });
  assert.equal(newer.updated, 1);
  assert.equal(materializeResults(vault).find(result => result.source?.sourceId === "same-id").summary, "Newer source state");

  applyChatGptImportBatch(vault, [candidate("different-id", "2026-08-11T10:00:00.000Z", { title: "Imported conversation" })], { discovered: 2, unresolved: 0, deferred: 0 });
  assert.equal(materializeResults(vault).filter(result => result.source?.provider === "chatgpt").length, 2);

  const known = new Map(knownChatGptFreshness(vault));
  assert.equal(known.get("same-id"), "2026-08-11T10:00:00.000Z");
  assert.equal(known.get("different-id"), "2026-08-11T10:00:00.000Z");
}

// The import receiver fast path performs one in-memory batch upsert while
// preserving the same deterministic replay/update semantics and deferred count.
{
  const vault = createVault({ vaultId: "vault_fast_batch", createdAt: "2026-08-11T00:00:00.000Z" });
  const batch = Array.from({ length: 32 }, (_, index) => candidate(`fast-${index}`, "2026-08-11T10:00:00.000Z"));
  const first = applyChatGptImportBatchFast(vault, batch, { discovered: 32, unresolved: 0, deferred: 3 });
  assert.deepEqual({ accepted: first.accepted, updated: first.updated, skipped: first.skipped }, { accepted: 32, updated: 0, skipped: 0 });
  assert.equal(first.imported, 32);
  assert.equal(materializeResults(vault).find(result => result.id === CHATGPT_IMPORT_RESULT_ID)?.result?.deferred, 3);

  const replay = applyChatGptImportBatchFast(vault, batch, { discovered: 32, unresolved: 0, deferred: 2 });
  assert.deepEqual({ accepted: replay.accepted, updated: replay.updated, skipped: replay.skipped }, { accepted: 0, updated: 0, skipped: 32 });
  assert.equal(materializeResults(vault).filter(result => result.source?.provider === "chatgpt").length, 32);

  const update = applyChatGptImportBatchFast(vault, [candidate("fast-7", "2026-08-11T11:00:00.000Z", { summary: "Fast path newer state" })], { discovered: 32, unresolved: 0, deferred: 0 });
  assert.equal(update.updated, 1);
  assert.equal(materializeResults(vault).find(result => result.source?.sourceId === "fast-7")?.summary, "Fast path newer state");
}

// The receiver reconstructs an allowlisted compact Result and drops source-supplied secrets/raw transcript fields.
{
  const secret = "SECRET_ACCESS_TOKEN_SHOULD_NOT_SURVIVE";
  const projected = sanitizeChatGptCardCandidate(candidate("privacy-id", "2026-08-11T10:00:00.000Z", {
    accessToken: secret,
    accountId: "acct-secret",
    authorization: "Bearer secret",
    cookies: "session=secret",
    rawMessages: [{ role: "user", text: "raw transcript secret" }]
  }));
  const serialized = JSON.stringify(projected);
  assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes("acct-secret"), false);
  assert.equal(serialized.includes("raw transcript secret"), false);
  assert.equal(projected.source.provider, "chatgpt");
  assert.equal(projected.source.sourceId, "privacy-id");
}

// Max-size candidate projection remains bounded.
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

// Measure a deliberately worst-case 2,500-card Vault.
{
  const vault = createVault({ vaultId: "vault_large", createdAt: "2026-08-11T00:00:00.000Z" });
  for (let index = 0; index < 2500; index += 1) {
    const projected = sanitizeChatGptCardCandidate(candidate(
      `synthetic-${index}`,
      `2026-08-${String((index % 10) + 1).padStart(2, "0")}T10:00:00.000Z`,
      {
        title: `Synthetic ${index} ${"t".repeat(120)}`,
        summary: "s".repeat(700),
        currentState: "c".repeat(300),
        facts: ["f".repeat(170), "g".repeat(170), "h".repeat(170), "i".repeat(170)]
      }
    ));
    vault.results.push(projected);
  }
  const bytes = new TextEncoder().encode(JSON.stringify(vault)).byteLength;
  assert.ok(bytes < 6_200_000, `Synthetic 2,500-card Vault is ${bytes} bytes; hard compact-projection budget exceeded`);
  const observedHistoryEstimate = Math.ceil(bytes * (2123 / 2500));
  assert.ok(observedHistoryEstimate < 5_100_000, `Observed 2,123-chat worst-case estimate is ${observedHistoryEstimate} bytes; projection needs tightening`);
}

// The final shared runner keeps F24 task-local deferral while F25 adds a
// bounded provider-pressure circuit breaker around new detail acquisitions.
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
  assert.match(runner, /"batchSize":32/);
  assert.match(runner, /"maxDetailRateLimitAttempts":8/);
  assert.match(runner, /scheduler\.rateLimited\(\)/);
  assert.match(runner, /scheduler\.serviceThrottled\(delay\)/);
  assert.match(runner, /ChatGptDetailDeferredError/);
  assert.match(runner, /const ready = pending\.map/);
  assert.match(runner, /const deferred = \[\]/);
  assert.match(runner, /nextRetryAt/);
  assert.match(runner, /deferred: deferredCurrent/);
  assert.match(runner, /rateLimitStreak/);
  assert.match(runner, /cooldownStages/);
  assert.match(runner, /savedCurrent/);
  assert.match(runner, /CONTROL_PAUSE/);
  assert.match(runner, /postMessage/);
  assert.doesNotMatch(runner, /scheduler\.throttled/);
  assert.doesNotMatch(runner, /fetch\([^\n]*dashgpt\.example/);
  assert.doesNotMatch(runner, /localStorage/);

  const detail429Start = runner.indexOf("if (detail && status === 429)");
  const detail429End = runner.indexOf("const delay = serviceRetryDelay", detail429Start);
  assert.ok(detail429Start >= 0 && detail429End > detail429Start, "Detail 429 branch not found");
  const detail429Block = runner.slice(detail429Start, detail429End);
  assert.match(detail429Block, /scheduler\.rateLimited\(\)/);
  assert.doesNotMatch(detail429Block, /serviceThrottled|await sleep/);

  const serviceBlock = runner.slice(detail429End, runner.indexOf("function extractItems", detail429End));
  assert.match(serviceBlock, /status === 503/);
  assert.match(serviceBlock, /scheduler\.serviceThrottled\(delay\)/);
}

// The reusable browser action packages the same final F25 runner without
// fixed bridge identity or credentials.
{
  const action = buildChatGptHistoryImportAction({
    receiverOrigin: "https://dashgpt.example",
    receiverPath: "/demo/"
  });
  assert.ok(action.startsWith("javascript:"));
  assert.ok(action.length < MAX_CHATGPT_IMPORT_ACTION_CHARS, `Import action is ${action.length} chars`);
  assert.match(action, /https:\/\/dashgpt\.example/);
  assert.match(action, /https:\/\/chatgpt\.com/);
  assert.match(action, /randomUUID/);
  assert.match(action, /const sessionId=makeId\("session"\)/);
  assert.match(action, /const nonce=makeId\("nonce"\)/);
  assert.match(action, /connect\.click\(\)/);
  assert.match(action, /postMessage/);
  assert.match(action, /scheduler\.rateLimited\(\)/);
  assert.match(action, /ChatGptDetailDeferredError/);
  assert.match(action, /nextRetryAt/);
  assert.match(action, /rateLimitStreak/);
  assert.doesNotMatch(action, /scheduler\.throttled/);
  assert.doesNotMatch(action, /__DASHGPT_ACTION_SESSION__/);
  assert.doesNotMatch(action, /__DASHGPT_ACTION_NONCE__/);
  assert.doesNotMatch(action, /session-test|nonce-test|SECRET_ACCESS_TOKEN_SHOULD_NOT_SURVIVE|acct-secret/);
  assert.doesNotMatch(action, /fetch\([^\n]*dashgpt\.example/);
  assert.doesNotMatch(action, /localStorage/);
}

console.log("ChatGPT history import verifier: discoverable operational card, dismissal, idempotent upsert, F25-wrapped per-conversation 429 deferral, batch fast path, freshness, privacy, storage budget and reusable launcher contracts passed.");
