import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [guide, bootstrap, browserSpec] = await Promise.all([
  readFile(new URL("../demo/chatgpt-import-guide.js", import.meta.url), "utf8"),
  readFile(new URL("../demo/catalog-bootstrap.js", import.meta.url), "utf8"),
  readFile(new URL("../tests/chatgpt-import-guide.spec.mjs", import.meta.url), "utf8")
]);

assert.match(guide, /importChatGptExportFiles/, "guided UI must reuse the F29 export importer");
assert.doesNotMatch(guide, /\bfetch\s*\(/, "guided UI must not introduce an archive upload fetch path");
assert.doesNotMatch(guide, /XMLHttpRequest/, "guided UI must not introduce an archive upload XHR path");
assert.match(guide, /Settings → Data Controls → Export data/, "guide must contain the concrete ChatGPT export path");
assert.match(guide, /conversations\.json/, "guide must explain the supported unpacked JSON option");
assert.match(guide, /help\.openai\.com\/en\/articles\/7260999/, "guide must link to official OpenAI export help");
assert.match(guide, /Import DashGPT Vault/, "Storage Vault import must be unambiguous");
assert.match(guide, /Export DashGPT Vault/, "Storage Vault export must be unambiguous");
assert.match(guide, /chatgptImportGuideButton/, "permanent dashboard entry must have a stable id");
assert.match(guide, /chatgptStorageImportSection/, "Storage entry must have a stable id");
assert.match(bootstrap, /chatgpt-import-guide\.js/, "catalog bootstrap must load the guided import UI");
assert.match(bootstrap, /initializeChatGptImportGuide/, "catalog bootstrap must initialize the guided import UI");
assert.match(browserSpec, /guided-json/, "browser regression must exercise JSON through the permanent guide");
assert.match(browserSpec, /guided-zip/, "browser regression must exercise ZIP through the permanent guide");
assert.match(browserSpec, /360/, "browser regression must cover a narrow mobile viewport");

console.log("Guided ChatGPT import verifier: permanent entry, local F29 reuse, copy, Vault disambiguation and regression coverage are wired.");
