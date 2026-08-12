# Impact Manifest: F24 per-conversation deferred retries

## Direct production surfaces

- `demo/chatgpt-history-source-runner-core.js`
  - conversation-detail retry policy;
  - adaptive concurrency response to 429 vs 503;
  - ready/deferred task scheduling;
  - progress snapshots/state transitions.
- `demo/chatgpt-history-source-runner.js`
  - generated-runner bridge hooks must remain compatible after scheduler refactor.
- `demo/chatgpt-history-import.js`
  - bounded progress projection/receiver handling for deferred count and coarse running/rate-limited state.

## Verification surfaces

- `scripts/verify-chatgpt-history-import.mjs`
  - retry delay and generated-runner contracts.
- `tests/chatgpt-history-import*.spec.mjs`
  - browser/import progress and pause/resume regression coverage where required.
- `package.json`
  - no new external dependency is expected; existing `verify:fast`/`verify:full` remain authoritative.

## Product/model impact

- Canonical imported cards: **identity/content model unchanged**.
- Progress operational card: one additive bounded `deferred`/waiting counter may be stored.
- Search / Semantic Gallery / Dashes / Structured Continuation: no semantic contract change.
- Vault storage model: no second store, no per-source retry ledger.
- Source provenance: unchanged.

## Privacy/security impact

- Retry task state stays inside the authenticated ChatGPT source page.
- No provider credential/session field crosses the existing browser bridge.
- No raw error response/body is persisted.
- Existing exact origin/session/nonce and payload-bound validation remains authoritative.

## Open work overlap

- PR #48 / Feature 23 consumes the generated source runner for zero-DevTools launcher adapters and is expected to conflict/rebase around runner generation. F24 must not absorb launcher UX; integration must preserve both capabilities.
- PR #47 is a Safari focus compatibility hotfix around receiver windows; F24 does not change window focus/opener semantics.
- Issue #41 performance profiling remains separate. F24 must not claim to solve the unrelated post-~200-card throughput cliff.
- Issue #43 reindex and Issue #45 detail actions remain separate.

## Rollback boundary

If the new deferred queue regresses import behavior, the scheduler/progress changes can be reverted without migrating user cards because durable imported-card identity and Vault schema remain compatible. The additive progress `deferred` field is optional and older progress readers already tolerate unrecognized machine-data fields.
