import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  CHATGPT_HISTORY_SOURCE_VERSION,
  buildChatGptHistorySourceRunner
} from "../demo/chatgpt-history-source-runner.js";

const runner = buildChatGptHistorySourceRunner({
  receiverOrigin: "https://dashgpt.example",
  receiverPath: "/demo/",
  sessionId: "session-test",
  nonce: "nonce-test"
});

assert.ok(CHATGPT_HISTORY_SOURCE_VERSION >= 6);
assert.match(runner, /rateLimited\(delayMs = 0\)/);
assert.match(runner, /scheduler\.rateLimited\(delay\)/);
assert.match(runner, /await scheduler\.signal\(Math\.min\(Math\.max\(1, waitMs\), 15_000\)\)/);
assert.match(runner, /event\.data\.type === "CONTROL_WAKE"/);
assert.match(runner, /document\.visibilityState === "visible"/);
assert.match(runner, /window\.addEventListener\("focus"/);

const receiverSource = await readFile(new URL("../demo/chatgpt-history-import-batch.js", import.meta.url), "utf8");
assert.match(receiverSource, /RETRY_WAKE_INTERVAL_MS = 5_000/);
assert.match(receiverSource, /type: "CONTROL_WAKE"/);
assert.match(receiverSource, /syncRetryWakeHeartbeat\(event, config, data\)/);
assert.match(receiverSource, /data\.state !== "rate_limited"/);
assert.match(receiverSource, /pagehide/);

console.log("F26 ChatGPT deferred retry wakeup verification passed");
