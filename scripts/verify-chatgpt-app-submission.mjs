import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const submission = JSON.parse(
  readFileSync(new URL("../chatgpt-app-submission.json", import.meta.url), "utf8")
);

const expectedTools = [
  "list_results",
  "search_results",
  "open_semantic_dash",
  "get_result",
  "get_context_pack",
  "prepare_result_import",
  "upsert_card"
];

assert.equal(submission.schema_version, 1);
assert.equal(submission.app_info?.display_name, "DashGPT");
assert.ok(submission.app_info?.subtitle?.length > 0 && submission.app_info.subtitle.length <= 30);
assert.equal(submission.app_info?.category, "PRODUCTIVITY");
assert.deepEqual(Object.keys(submission.tools || {}), expectedTools);

for (const name of expectedTools) {
  const tool = submission.tools[name];
  assert.equal(typeof tool.annotations?.readOnlyHint, "boolean", `${name}: readOnlyHint must be explicit`);
  assert.equal(typeof tool.annotations?.openWorldHint, "boolean", `${name}: openWorldHint must be explicit`);
  assert.equal(typeof tool.annotations?.destructiveHint, "boolean", `${name}: destructiveHint must be explicit`);
  assert.ok(tool.justifications?.read_only_justification, `${name}: missing read-only justification`);
  assert.ok(tool.justifications?.open_world_justification, `${name}: missing open-world justification`);
  assert.ok(tool.justifications?.destructive_justification, `${name}: missing destructive justification`);
}

assert.equal(submission.tools.upsert_card.annotations.readOnlyHint, false, "upsert_card must be declared as a write action");
assert.equal(submission.tools.upsert_card.annotations.openWorldHint, false, "upsert_card writes only private user-controlled storage");
assert.equal(submission.tools.upsert_card.annotations.destructiveHint, false, "upsert_card must not delete external state");
assert.equal(submission.test_cases?.length, 5, "submission must contain exactly five positive test cases");
assert.equal(submission.negative_test_cases?.length, 3, "submission must contain exactly three negative test cases");
assert.ok(submission.test_cases.some(testCase => testCase.tools_triggered === "upsert_card"), "submission must review the direct-save workflow");

for (const testCase of submission.test_cases) {
  assert.ok(expectedTools.includes(testCase.tools_triggered), `unknown positive-test tool: ${testCase.tools_triggered}`);
  assert.ok(testCase.user_prompt);
  assert.ok(testCase.expected_output);
}

for (const testCase of submission.negative_test_cases) {
  assert.equal(testCase.tools_triggered, null, "negative tests must not require a DashGPT tool call");
  assert.ok(testCase.user_prompt);
  assert.ok(testCase.expected_output);
}

const privacy = readFileSync(new URL("../demo/privacy.html", import.meta.url), "utf8");
for (const requiredCopy of [
  "Direct Card save",
  "Google Drive",
  "retention",
  "user controls",
  "OpenAI"
]) {
  assert.match(privacy, new RegExp(requiredCopy, "i"), `privacy policy must disclose ${requiredCopy}`);
}

await import("./verify-plugin-card-write.mjs");

console.log("ChatGPT plugin submission packet checks passed.");
