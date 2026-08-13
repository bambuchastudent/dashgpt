import assert from "node:assert/strict";

import {
  CHATGPT_DETAIL_RETRY_STAGES_MS,
  computeChatGptDetailRetryDelay
} from "../demo/chatgpt-history-import-policy.js";
import {
  CHATGPT_HISTORY_SOURCE_VERSION,
  MAX_CHATGPT_IMPORT_ACTION_CHARS,
  buildChatGptHistoryImportAction,
  buildChatGptHistorySourceRunner
} from "../demo/chatgpt-history-source-runner.js";

const now = Date.parse("2026-08-13T10:00:00.000Z");
const expectedStages = [5_000, 15_000, 30_000, 60_000, 120_000, 300_000];
assert.deepEqual([...CHATGPT_DETAIL_RETRY_STAGES_MS], expectedStages);

for (let attempt = 0; attempt < expectedStages.length; attempt += 1) {
  const delay = computeChatGptDetailRetryDelay("", attempt, "conversation-a", now);
  assert.ok(delay >= expectedStages[attempt], `attempt ${attempt + 1} retried too early: ${delay}`);
  assert.ok(delay <= expectedStages[attempt] + 750, `attempt ${attempt + 1} stagger exceeded bound: ${delay}`);
}

const capped = computeChatGptDetailRetryDelay("", 99, "conversation-a", now);
assert.ok(capped >= 300_000 && capped <= 300_750, `retry ceiling is not 300 seconds: ${capped}`);

const providerMinimum = computeChatGptDetailRetryDelay("400", 0, "conversation-a", now);
assert.ok(providerMinimum >= 400_000, `Retry-After was violated: ${providerMinimum}`);

const sameStageA = computeChatGptDetailRetryDelay("", 2, "conversation-a", now);
const sameStageB = computeChatGptDetailRetryDelay("", 2, "conversation-b", now);
assert.notEqual(sameStageA, sameStageB, "source stagger should separate retry timestamps");

const runner = buildChatGptHistorySourceRunner({
  receiverOrigin: "https://dashgpt.example",
  receiverPath: "/demo/",
  sessionId: "session-test",
  nonce: "nonce-test"
});

assert.equal(CHATGPT_HISTORY_SOURCE_VERSION, 4);
assert.match(runner, /cooldownStages = \[5_000, 10_000, 15_000, 30_000\]/);
assert.match(runner, /this\.limit = 1;/);
assert.match(runner, /this\.cooldownUntil = Math\.max\(this\.cooldownUntil, now \+ cooldown\)/);
assert.match(runner, /rateLimitStreak/);
assert.match(runner, /successStreak >= 12/);
assert.match(runner, /await flush\(true\);/);
assert.match(runner, /savedCurrent/);
assert.match(runner, /сохранено в DashGPT/);
assert.doesNotMatch(runner, /1_200 \* \(2 \*\* exponent\)/);
assert.doesNotMatch(runner, /caches\.delete|localStorage\.clear|sessionStorage\.clear|indexedDB\.deleteDatabase/);

const action = buildChatGptHistoryImportAction({
  receiverOrigin: "https://dashgpt.example",
  receiverPath: "/demo/"
});
assert.ok(action.length <= MAX_CHATGPT_IMPORT_ACTION_CHARS, `bookmark action grew beyond the supported limit: ${action.length}`);
assert.ok(action.startsWith("javascript:"));

console.log("F25 ChatGPT 429 circuit-breaker verification passed");
