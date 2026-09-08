# Impact Manifest — F51 anonymous Share JSON resolver refresh

## Primary production surfaces

- `src/shared-chat-anon.js`
  - keep the direct first-party anonymous Share JSON preflight;
  - add a separate fresh logged-out browser-session recovery helper;
  - reuse canonical URL validation and existing public-share JSON projection;
  - return `null` on unavailable/challenge/malformed/session failure so orchestration can preserve existing behavior.
- `src/worker.js`
  - for `/api/shared-chat`, run direct anonymous JSON preflight first;
  - delegate to the existing `handleSharedChat()` chain unchanged;
  - only when that response is exactly `SHARED_CHAT_UNREADABLE`, try one fresh browser-session public recovery;
  - return the original existing response unchanged when recovery misses.
- `package.json`
  - add the Cloudflare-supported Puppeteer runtime package required for Browser Run session control.
- `src/shared-chat.js`
  - no production resolver semantics need to change;
  - exported URL validation and JSON projection remain the source of truth reused by F51.

## Verification surfaces

- `scripts/verify-shared-chat.mjs`
  - direct anonymous route ordering and success;
  - no fresh-session launch after any existing resolver success;
  - exact `SHARED_CHAT_UNREADABLE` eligibility;
  - session recovery success using canonical Share/backend ids;
  - session miss preserving the original human 502 contract;
  - invalid/unsupported URL and user-session replay boundaries.
- existing browser Save-chat coverage remains relevant because the endpoint contract is unchanged.
- desktop/mobile and canonical `npm run verify:full` must rerun on the refined final candidate.
- Cloudflare preview acceptance against the exact real public reproduction remains the merge gate.

## Contracts intentionally unchanged

- `/api/shared-chat` request/response schema;
- canonical Card identity and source provenance;
- local Vault/storage/sync behavior;
- Search, Semantic Gallery and Dash membership semantics;
- Structured Continuation behavior;
- public URL validation and host allow-list;
- existing F48 client retry behavior;
- F46 live-smoke classification behavior.

## Security / privacy blast radius

The direct preflight still sends one first-party request to `chatgpt.com/backend-anon/share/<validated-id>` with no user authentication state.

The refined recovery may additionally launch one **fresh logged-out** Browser Run session only after the existing resolver chain has exhausted. That session navigates to the already validated public Share page and then requests only the corresponding same-origin `backend-anon/share/<validated-id>`. Any cookies/state used by that request must originate inside the new anonymous session itself.

F51 MUST NOT copy incoming `Cookie`, `Authorization`, ChatGPT session/account identifiers, passwords, project credentials, DashGPT storage credentials or arbitrary user-controlled target URLs into the browser. CAPTCHA/Turnstile, login or access-control challenges are failures, not signals to bypass protection.

No raw provider/status/parser details become normal user-facing copy.

## Deployment / operations / cost

- no new secret, migration, schema or Cloudflare binding;
- existing `BROWSER` binding is reused;
- add `@cloudflare/puppeteer` as a runtime dependency for full Browser Run session control;
- browser time can increase for unresolved public Share requests, so the session path is bounded to one attempt and runs only after direct anonymous plus all existing resolver paths have failed;
- session/browser resources must be closed in `finally` on every outcome;
- if the session path fails, behavior degrades to the existing pre-refinement human unreadable response rather than creating a new hard dependency.

## Explicitly out of scope

- F49 React Router payload parser changes;
- F48 retry implementation changes;
- authenticated/private ChatGPT capture;
- user browser cookie/session replay;
- CAPTCHA/Turnstile solving or project-access bypass;
- new proxy services;
- Card detail/F39;
- project-local memory/F37.
