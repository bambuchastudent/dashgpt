import assert from "node:assert/strict";
import {
  buildChatGptHistoryImportAction,
  buildChatGptHistorySafariShortcutScript
} from "../demo/chatgpt-history-source-runner.js";

const options = {
  receiverOrigin: "https://dashgpt.example",
  receiverPath: "/demo/"
};

const bookmark = buildChatGptHistoryImportAction(options);
const shortcut = buildChatGptHistorySafariShortcutScript(options);

assert.match(bookmark, /^javascript:/);
assert.doesNotMatch(shortcut, /^javascript:/);
assert.match(shortcut, /https:\/\/dashgpt\.example/);
assert.match(shortcut, /chatgpt-progressive-import-source/);
assert.match(shortcut, /randomUUID/);
assert.match(shortcut, /const sessionId=makeId\("session"\)/);
assert.match(shortcut, /const nonce=makeId\("nonce"\)/);
assert.match(shortcut, /completion/);
assert.match(shortcut, /connect\.click\(\)/);
assert.match(shortcut, /postMessage/);
assert.match(shortcut, /scheduler\.throttled/);
assert.doesNotMatch(shortcut, /__DASHGPT_ACTION_SESSION__/);
assert.doesNotMatch(shortcut, /__DASHGPT_ACTION_NONCE__/);
assert.doesNotMatch(shortcut, /session-test|nonce-test|SECRET_ACCESS_TOKEN|Bearer secret|acct-secret/);
assert.doesNotMatch(shortcut, /localStorage/);

console.log("Safari Shortcut import verifier: shared F20 runner, fresh launch identity, receiver target, completion and privacy contracts passed.");
