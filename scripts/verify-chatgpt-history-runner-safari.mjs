import assert from "node:assert/strict";
import { buildChatGptHistorySourceRunner } from "../demo/chatgpt-history-source-runner.js";

const runner = buildChatGptHistorySourceRunner({
  receiverOrigin: "https://fix-f20-safari-resume-focus-dashgpt.dimkashir.workers.dev",
  receiverPath: "/demo/",
  sessionId: "session-safari-parse-test",
  nonce: "nonce-safari-parse-test"
});

assert.doesNotMatch(runner, /#/, "Safari clipboard runner must not contain hash characters");
assert.doesNotThrow(() => new Function(runner), "Generated clipboard runner must parse as JavaScript");

console.log("Safari ChatGPT import runner verifier: hash-free clipboard program parses successfully.");
