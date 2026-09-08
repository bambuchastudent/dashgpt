# Impact Manifest — F51 anonymous Share JSON resolver refresh

## Primary production surfaces

- `src/shared-chat-anon.js`
  - keep the direct first-party anonymous Share JSON preflight;
  - keep the fresh logged-out browser-session recovery helper;
  - reuse canonical URL validation and existing public-share JSON projection;
  - when diagnostic mode is explicitly requested, append only sanitized stage outcomes to an in-memory trace.
- `src/worker.js`
  - for `/api/shared-chat`, run direct anonymous JSON preflight first;
  - delegate to the existing `handleSharedChat()` chain unchanged;
  - only when that response is exactly `SHARED_CHAT_UNREADABLE`, try one fresh browser-session public recovery;
  - return the original existing response unchanged when recovery misses for normal requests;
  - for explicit `diagnostics=1` failures only, return the same error plus a sanitized diagnostic object and support-only legacy resolver replay classifications.
- `package.json`
  - keep the Cloudflare-supported Puppeteer runtime package required for Browser Run session control.
- `src/shared-chat.js`
  - no production resolver semantics change;
  - exported URL validation, JSON projection, and `readSharedChat()` internal cause structure are reused by the support-only diagnostic replay.

## Verification surfaces

- `scripts/verify-shared-chat.mjs` and/or a focused diagnostic verifier:
  - direct anonymous route ordering and success;
  - no fresh-session launch after any existing resolver success;
  - exact `SHARED_CHAT_UNREADABLE` eligibility;
  - session recovery success using canonical Share/backend ids;
  - session miss preserving the original human 502 contract;
  - invalid/unsupported URL and user-session replay boundaries;
  - diagnostics absent by default and present only for explicit unresolved diagnostic requests;
  - safe stage/kind/status classification without raw body/transcript/cookie/auth leakage.
- existing browser Save-chat coverage remains relevant because normal endpoint behavior is unchanged.
- desktop/mobile and canonical `npm run verify:full` must rerun on the diagnostic final candidate.
- Cloudflare preview acceptance against the exact real public reproduction remains the merge gate.

## Contracts intentionally unchanged

- normal `/api/shared-chat` request/response behavior without `diagnostics=1`;
- canonical Card identity and source provenance;
- local Vault/storage/sync behavior;
- Search, Semantic Gallery and Dash membership semantics;
- Structured Continuation behavior;
- public URL validation and host allow-list;
- existing F48 client retry behavior;
- F46 live-smoke classification behavior.

## Explicit support-only contract addition

`/api/shared-chat?...&diagnostics=1` may add a failure-only `diagnostics` object containing a generated trace id, validated Share id, and ordered sanitized stage outcomes. This mode is intended for user-supported debugging from a mobile browser and is not normal onboarding UI.

## Security / privacy blast radius

The direct preflight still sends one first-party request to `chatgpt.com/backend-anon/share/<validated-id>` with no user authentication state.

The refined recovery may additionally launch one **fresh logged-out** Browser Run session only after the existing resolver chain has exhausted. That session navigates to the already validated public Share page and then requests only the corresponding same-origin `backend-anon/share/<validated-id>`. Any cookies/state used by that request must originate inside the new anonymous session itself.

F51 MUST NOT copy incoming `Cookie`, `Authorization`, ChatGPT session/account identifiers, passwords, project credentials, DashGPT storage credentials or arbitrary user-controlled target URLs into the browser. CAPTCHA/Turnstile, login or access-control challenges are failures, not signals to bypass protection.

Diagnostic output MUST NOT serialize raw response bodies, HTML, JSON conversation payloads, transcript/message text, cookies, `Set-Cookie`, authorization headers, incoming request headers, account/session identifiers, passwords, project credentials or storage credentials. Only coarse stage/outcome/kind/status metadata is allowed.

## Deployment / operations / cost

- no new secret, migration, schema or Cloudflare binding;
- existing `BROWSER` binding is reused;
- `@cloudflare/puppeteer` remains the runtime dependency for full Browser Run session control;
- browser time can increase for unresolved public Share requests, so the session path is bounded to one attempt and runs only after direct anonymous plus all existing resolver paths have failed;
- explicit diagnostic mode may perform one additional support-only legacy resolver replay after failure, so it is never used for ordinary traffic;
- session/browser resources must be closed in `finally` on every outcome;
- if the session path fails, ordinary behavior degrades to the existing human unreadable response rather than creating a new hard dependency.

## Explicitly out of scope

- F49 React Router payload parser changes;
- F48 retry implementation changes;
- authenticated/private ChatGPT capture;
- user browser cookie/session replay;
- CAPTCHA/Turnstile solving or project-access bypass;
- raw upstream payload logging/exposure;
- new proxy services;
- Card detail/F39;
- project-local memory/F37.
