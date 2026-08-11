# Design

## Test layers

### 1. Deterministic parser/contract tests

Run on every PR through `npm run check` and cover the current backend JSON shape independently of network availability. Cases include:

- `current_node` ancestry selection;
- regenerated sibling exclusion;
- hidden/system/tool-only node exclusion;
- fallback path when `current_node` is absent or invalid;
- text extraction from string, object and nested content parts;
- generic upstream titles falling back to the first useful user turn;
- malformed backend payload falling through to page-reader/raw/browser/direct compatibility paths;
- stable public error boundary without provider/HTTP internals.

### 2. Browser onboarding tests

Playwright MUST verify a clean browser can use `?share=` and manual Share fallback without publisher cards leaking into the local board. Tests use mocked resolver responses so UX regressions remain deterministic.

### 3. Live production smoke

A dedicated GitHub Actions workflow runs:

- after pushes to `develop`;
- on a recurring schedule;
- manually via `workflow_dispatch`.

It resolves at least two known public ChatGPT Share fixtures through the production `/api/shared-chat` endpoint. Each fixture receives bounded retries to tolerate deployment propagation and upstream cache warm-up. Success requires HTTP 200 plus at least one user and one assistant message.

The live test is intentionally provider-neutral: it records `retrieval` for diagnostics but never requires Jina, AllOrigins, Browser Run, or direct fetch specifically.

## Failure semantics

Deterministic tests gate PRs. Live production smoke detects upstream and deployment regressions after merge and remains independently runnable. A live smoke failure is actionable evidence that anonymous Share import is broken even if unit/browser CI remains green.
