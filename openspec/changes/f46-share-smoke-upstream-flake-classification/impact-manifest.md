# Impact Manifest

## Directly affected

- `.github/workflows/shared-chat-live.yml`
  - retry timing;
  - fixture evaluation order/aggregation;
  - scheduled versus strict trigger failure semantics;
  - GitHub warning and step-summary diagnostics.
- deterministic verification for the workflow contract;
- `npm run check` wiring for that verifier.

## User-visible impact

No application UI or API payload contract changes. Users still receive the existing human `SHARED_CHAT_UNREADABLE` state when a public ChatGPT Share cannot be read.

Maintainer-visible behavior changes: scheduled external upstream flaps no longer produce a failed workflow solely for `SHARED_CHAT_UNREADABLE`/network timeout, reducing recurring GitHub failure-email noise. The run remains diagnosable through warnings and the step summary.

## Preserved hard-failure paths

- malformed HTTP 200 normalized payload;
- missing required conversation fields/roles/fixture content;
- unexpected 4xx/5xx responses;
- unexpected error body/code;
- strict push/manual smoke with exhausted upstream availability.

## Explicitly unaffected

- `src/shared-chat.js` resolver order and user-facing error boundary;
- cards and Dash semantics;
- local Vault/storage and optional sync;
- search/Semantic Gallery;
- continuation/export;
- ChatGPT history import;
- production deployment configuration and credentials.

## Main risk

A scheduled workflow can conclude success while the external public Share path is temporarily unavailable. This is intentional and bounded to the recognized upstream-only failure class. Strict push/manual runs and deterministic CI remain available for gating, while unexpected production behavior stays fatal on every trigger.
