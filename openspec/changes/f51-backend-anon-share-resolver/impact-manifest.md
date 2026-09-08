# Impact Manifest — F51 anonymous Share JSON resolver refresh

## Primary production surface

- `src/shared-chat.js`
  - derive the current first-party anonymous Share JSON endpoint from an already validated ChatGPT Share URL;
  - try that endpoint before existing resolver fallbacks;
  - reuse the existing public-share JSON parser and response projection.

## Verification surfaces

- `scripts/verify-shared-chat.mjs` and/or `scripts/verify-shared-chat-parser.mjs`
  - resolver ordering;
  - anonymous JSON success;
  - challenge/malformed/error fallthrough;
  - current-node branch and visibility invariants.
- existing browser Save-chat coverage remains relevant because the endpoint contract is unchanged.
- Cloudflare preview acceptance against the real public reproduction is required before merge-ready.

## Contracts intentionally unchanged

- `/api/shared-chat` request/response shape;
- canonical Card identity and source provenance;
- local Vault/storage/sync behavior;
- Search, Semantic Gallery and Dash membership semantics;
- Structured Continuation behavior;
- public URL validation and host allow-list;
- existing F48 client retry behavior;
- F46 live-smoke classification behavior.

## Security / privacy blast radius

The change adds one outbound first-party request to `chatgpt.com/backend-anon/share/<validated-id>` before existing fallbacks. It MUST NOT forward browser cookies, ChatGPT session state, account credentials, DashGPT storage credentials or arbitrary user-controlled target URLs.

Malformed HTML/challenge bodies and non-success responses are internal failures only and fall through to existing public resolver paths. No raw upstream/provider details become normal user-facing copy.

## Deployment / operations

No secrets, migrations, schema changes or new Cloudflare bindings are required. Existing Worker networking and `BROWSER` binding remain unchanged. A failure of the new anonymous route must degrade to the pre-F51 resolver order rather than create a new hard dependency.

## Explicitly out of scope

- F49 React Router payload parser;
- F48 retry implementation;
- authenticated/private ChatGPT capture;
- new proxy services;
- Card detail/F39;
- project-local memory/F37.
