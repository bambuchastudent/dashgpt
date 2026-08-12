import assert from "node:assert/strict";
import { buildChatGptHistorySafariShortcutScript } from "../demo/chatgpt-history-source-runner.js";

const shortcut = buildChatGptHistorySafariShortcutScript({
  receiverOrigin: "https://dashgpt.example",
  receiverPath: "/demo/"
});

assert.doesNotMatch(shortcut, /^javascript:/);
assert.match(shortcut, /https:\/\/dashgpt\.example/);
assert.match(shortcut, /dashgpt-progressive-import-source/);
assert.match(shortcut, /connect\.click\(\)/);
assert.match(shortcut, /completion\(\)/);
assert.doesNotMatch(shortcut, /__DASHGPT_ACTION_SESSION__|__DASHGPT_ACTION_NONCE__/);

console.log("Safari Shortcut import verifier: plain-JS adapter, receiver target, shared source runner and completion contracts passed.");
