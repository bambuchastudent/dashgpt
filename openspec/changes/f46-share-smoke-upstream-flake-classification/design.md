# Design

## Classification model

Each fixture is probed independently and ends in one of three states.

### PASS

The production endpoint returns HTTP 200 and the existing conversation contract validates: canonical `sourceUrl`, matching `shareId`, non-empty `retrieval` and title, user + assistant turns, fixture needle present, no challenge-page text, and no error payload.

### UPSTREAM_UNAVAILABLE

All retries are exhausted and the final failure is consistent with the existing public upstream boundary:

- curl/network timeout (`HTTP 000`); or
- HTTP 502 with JSON `code: SHARED_CHAT_UNREADABLE`.

This state means the external public-share path was unavailable during the bounded probe. It does not prove a DashGPT code regression.

### HARD_FAILURE

Anything else is a production contract failure, including:

- HTTP 200 with an invalid/malformed conversation contract;
- HTTP 4xx;
- HTTP 5xx without `SHARED_CHAT_UNREADABLE`;
- malformed/unexpected error payloads.

## Trigger semantics

- `schedule`: `UPSTREAM_UNAVAILABLE` is emitted as a GitHub warning and written to the step summary, but does not fail the workflow. `HARD_FAILURE` still fails.
- `push` and `workflow_dispatch`: both `UPSTREAM_UNAVAILABLE` and `HARD_FAILURE` fail after all fixtures are evaluated. These remain strict maintainer/release signals.

This removes recurring scheduled failure-email spam while retaining explicit strict runs.

## Probe execution

- Probe both fixtures even when one fails. Do not let `set -e` short-circuit the second fixture.
- Reset the temporary response body before every request so a timeout cannot print/classify stale JSON from a prior attempt.
- Keep retries bounded. Use `curl --max-time 20` and 8 attempts with 5-second backoff so a fully unavailable pair remains inside the workflow's 8-minute job timeout.
- Preserve provider-neutral success checks and diagnostic `retrieval` output.

## Verification

Add a deterministic repository verifier that reads `.github/workflows/shared-chat-live.yml` and asserts the failure-semantics invariants that escaped previously:

- scheduled upstream-only degradation is warning/non-fatal;
- push/manual strictness is present;
- both fixtures are accumulated before final exit;
- expected upstream classification checks `SHARED_CHAT_UNREADABLE` and network timeout;
- response temp state is cleared per attempt;
- retry timing stays bounded below the job timeout.

The verifier is included in `npm run check`, so future workflow edits cannot silently restore the spammy behavior.

## Trade-off

A scheduled run can be green while public Share import is temporarily unavailable upstream. That is intentional: the workflow summary still records the degradation, while strict push/manual smoke and deterministic CI continue to catch product regressions. This change optimizes scheduled monitoring for signal quality rather than paging on an external dependency flap.
