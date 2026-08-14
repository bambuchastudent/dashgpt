import assert from "node:assert/strict";

import {
  CHATGPT_DETAIL_RETRY_STAGES_MS,
  computeChatGptDetailRetryDelay
} from "../demo/chatgpt-history-import-policy.js";
import {
  CHATGPT_HISTORY_SOURCE_VERSION,
  buildChatGptHistorySourceRunner
} from "../demo/chatgpt-history-source-runner.js";

const now = Date.parse("2026-08-13T10:00:00.000Z");
const expectedStages = [5_000, 15_000, 30_000, 60_000, 120_000, 300_000];
assert.deepEqual([...CHATGPT_DETAIL_RETRY_STAGES_MS], expectedStages);

for (let attempt = 0; attempt < expectedStages.length; attempt += 1) {
  const delay = computeChatGptDetailRetryDelay("", attempt, "conversation-a", now);
  assert.ok(delay >= expectedStages[attempt]);
  assert.ok(delay <= expectedStages[attempt] + 750);
}

const providerMinimum = computeChatGptDetailRetryDelay("400", 0, "conversation-a", now);
assert.ok(providerMinimum >= 400_000);
assert.notEqual(
  computeChatGptDetailRetryDelay("", 2, "conversation-a", now),
  computeChatGptDetailRetryDelay("", 2, "conversation-b", now)
);

const runner = buildChatGptHistorySourceRunner({
  receiverOrigin: "https://dashgpt.example",
  receiverPath: "/demo/",
  sessionId: "session-test",
  nonce: "nonce-test"
});

assert.ok(CHATGPT_HISTORY_SOURCE_VERSION >= 6);
assert.match(runner, /cooldownStages = \[5_000, 10_000, 15_000, 30_000\]/);
assert.match(runner, /this\.limit = 1;/);
assert.match(runner, /rateLimitStreak/);
assert.match(runner, /successStreak >= 12/);
assert.match(runner, /await flush\(true\);/);
assert.match(runner, /savedCurrent/);

console.log("F25 ChatGPT 429 circuit-breaker verification passed");
