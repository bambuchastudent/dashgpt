# Impact Manifest — F49 React Router Share payload compatibility

## Directly affected

- `src/shared-chat.js`
  - current ChatGPT Share HTML parsing compatibility
  - turbo-stream graph decoding
  - conversion into the existing shared-chat conversation shape
- `scripts/verify-shared-chat-parser.mjs`
  - deterministic current-format payload regression coverage
- `openspec/changes/f49-react-router-share-payload/**`

## Existing contracts to preserve

- `/api/shared-chat`
  - same request/response fields and `SHARED_CHAT_UNREADABLE` terminal code
- F11 shared-chat fetch hardening
  - strict ChatGPT URL validation and Browser fallback
- F12 visible-DOM fallback
  - readable rendered page remains a compatibility path
- F15 anonymous Share resolver
  - provider-neutral reader/proxy fallbacks and human errors
- F16 fresh Share backend resolver
  - backend JSON remains the preferred current-share path when available
- F17 resolver regression safety net
  - deterministic + browser + live smoke coverage remains provider-agnostic
- F36/F45 Save-chat capture
  - canonical Card provenance and project/classic Share compatibility remain unchanged
- F46/F48
  - smoke classification and client retry behavior are independent and unchanged

## User-visible blast radius

Only public ChatGPT Share URLs that currently end in an unreadable state because their conversation exists in an unsupported server-render payload can change from failure to successful review/capture. No card fields, storage UI, Dashes, search, Semantic Gallery or continuation UI are changed.

## Operational blast radius

The resolver performs an additional local parse attempt on HTML it already retrieved. It does not add a new external provider or network request. The graph walk is bounded by the finite parsed slot/object graph and is cycle-safe.

## Security/privacy

- No authenticated ChatGPT access or credentials.
- No arbitrary host expansion.
- No `eval`, `Function` or script execution.
- Synthetic regression fixtures only; the user's reproduction Share URL/content is not committed.
- Existing source URL normalization strips tracking query/hash data before provenance storage.

## Rollback

Remove the turbo-stream parsing helpers and fallback call from `parseReadableChat`. Existing backend/reader/proxy/Browser/direct paths remain intact. No data migration or card cleanup is required.
