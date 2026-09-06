import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(
  new URL("../.github/workflows/shared-chat-live.yml", import.meta.url),
  "utf8"
);

assert.match(workflow, /name: Shared Chat live production smoke/);
assert.match(workflow, /set -u -o pipefail/);
assert.doesNotMatch(workflow, /set -euo pipefail/, "fixture failures must be aggregated instead of short-circuiting the second fixture");

assert.match(workflow, /is_upstream_unavailable\(\)/);
assert.match(workflow, /\[ "\$status" = "000" \]/, "transport timeouts must classify as upstream unavailability");
assert.match(workflow, /SHARED_CHAT_UNREADABLE/, "the stable unreadable-share boundary must classify as upstream unavailability");
assert.match(workflow, /saw_hard_failure=1/, "unexpected production responses must remain hard failures after retries");

const resetIndex = workflow.indexOf(': > "$body"');
const curlIndex = workflow.indexOf("status=$(curl");
assert.ok(resetIndex >= 0 && curlIndex > resetIndex, "response state must be cleared before each curl attempt");
assert.match(workflow, /--max-time 20/);
assert.match(workflow, /for attempt in 1 2 3 4 5 6 7 8; do/);
assert.match(workflow, /sleep 5/);

const olderIndex = workflow.indexOf('run_fixture "$OLDER_SHARE"');
const freshIndex = workflow.indexOf('run_fixture "$FRESH_SHARE"');
const hardDecisionIndex = workflow.indexOf("if (( HARD_FAILURES > 0 )); then");
assert.ok(olderIndex >= 0, "older fixture must be probed");
assert.ok(freshIndex > olderIndex, "fresh fixture must be probed after the older fixture");
assert.ok(hardDecisionIndex > freshIndex, "final failure classification must happen only after all fixtures are probed");
assert.doesNotMatch(workflow, /^\s*resolve_one "\$OLDER_SHARE"/m, "top-level resolve_one would restore set-e-style early exit behavior");

const scheduledIndex = workflow.indexOf('if [ "${GITHUB_EVENT_NAME}" = "schedule" ]; then');
assert.ok(scheduledIndex > hardDecisionIndex, "scheduled degradation handling must happen after hard failures are evaluated");
const scheduledBlock = workflow.slice(scheduledIndex, scheduledIndex + 700);
assert.match(scheduledBlock, /::warning title=Shared Chat upstream degraded/);
assert.match(scheduledBlock, /exit 0/, "scheduled upstream-only degradation must remain non-fatal");

const strictIndex = workflow.indexOf("::error title=Shared Chat strict smoke unavailable");
assert.ok(strictIndex > scheduledIndex, "push/manual strict handling must remain after the scheduled exception");
assert.match(workflow.slice(strictIndex, strictIndex + 400), /exit 1/, "strict upstream exhaustion must fail");

const hardIndex = workflow.indexOf("::error title=Shared Chat production contract failure");
assert.ok(hardIndex >= 0 && hardIndex < scheduledIndex, "hard production contract failures must fail before scheduled upstream handling");
assert.match(workflow.slice(hardIndex, hardIndex + 400), /exit 1/);

const attempts = 8;
const curlMaxSeconds = 20;
const backoffs = 7;
const backoffSeconds = 5;
const pushPropagationSeconds = 20;
const worstCaseSeconds = 2 * (attempts * curlMaxSeconds + backoffs * backoffSeconds) + pushPropagationSeconds;
assert.ok(worstCaseSeconds < 8 * 60, `bounded retries must fit the 8-minute job timeout; estimated ${worstCaseSeconds}s`);

console.log("Shared Chat live smoke upstream-flake classification checks passed.");
