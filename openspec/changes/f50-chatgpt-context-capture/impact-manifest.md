# Impact Manifest — F50 ChatGPT context capture recovery

## Primary production surface

- `demo/public-onboarding.js`
  - distinguish exact `SHARED_CHAT_UNREADABLE` from unrelated capture failures;
  - automatically reveal the existing structured current-chat handoff recovery;
  - keep a transient canonical Share URL for provenance carry-over;
  - reuse existing parser, review, local Vault save/upsert and provider controls.

No server resolver, Card schema, Vault schema or provider controller change is required for the first slice.

## Verification surfaces

- existing Save-chat deterministic/browser tests around `demo/public-onboarding.js`;
- add regression coverage for unreadable recovery activation, source provenance carry-over and duplicate-free update;
- narrow mobile Playwright coverage around the Save-chat dialog;
- `npm run check` during development;
- one final `npm run verify:full` on the candidate before merge readiness;
- production Cloudflare preview plus mobile viewport acceptance.

## Contracts intentionally unchanged

- `/api/shared-chat` request/response contract;
- successful Share-link capture;
- canonical Card/legacy Result durable fields;
- local Vault serialization and conflict behavior;
- Google Drive/GitHub sync ownership and exclusivity;
- Search, Semantic Gallery and Dashes;
- Structured Continuation;
- bulk ChatGPT history import;
- MCP `prepare_result_import` contract and plugin submission state.

## Security / privacy

The recovery operates on user-explicit data already present in the browser:

- the Share URL the user entered;
- the structured JSON response the user pastes from the original ChatGPT conversation.

It MUST NOT read, request, persist or transmit ChatGPT cookies, authorization/session tokens, account identifiers, passwords or project credentials. Normal user copy MUST NOT expose raw 403/429/provider/parser diagnostics.

## UX / mobile blast radius

Only the personal Save-chat dialog changes. The existing fallback `<details>` becomes automatically visible after exact unreadable Share. At 360–390px the action must remain reachable without horizontal scrolling and the recovery must scroll into view.

## Rollback

Removing the recovery orchestration restores F36 behavior with the same persisted data model. No migration or cleanup is required.

## Explicitly out of scope

- server anti-bot bypass/proxy expansion;
- F51 retrieval experiments;
- publishing the DashGPT ChatGPT plugin/App;
- direct authenticated writes from MCP to private Vault;
- F39 Card detail;
- F37 project memory.
