import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const submission = JSON.parse(
  readFileSync(new URL("../chatgpt-app-submission.json", import.meta.url), "utf8")
);

const expectedTools = [
  "list_results",
  "open_semantic_dash",
  "get_result",
  "get_context_pack",
  "prepare_result_import"
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

assert.equal(submission.test_cases?.length, 5, "submission must contain exactly five positive test cases");
assert.equal(submission.negative_test_cases?.length, 3, "submission must contain exactly three negative test cases");

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

console.log("ChatGPT plugin submission packet checks passed.");
