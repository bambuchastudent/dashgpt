# Impact Manifest — F27 coherent Save chat + storage flow

## Production files

Expected primary changes:

- `demo/public-onboarding.js`
  - capture-phase personal action interception;
  - Save-chat dialog, capture reuse, provider summary/actions.
- `demo/google-drive-sync.js`
  - small synchronous public entry point for the canonical Connect flow and provider-state notification where needed.
- `demo/onboarding.css`
  - Save-chat provider/capture dialog layout and mobile behavior.

`demo/app.js` is intentionally unchanged; its generic manual Result form remains the fallback outside personal mode.

## Tests

- `tests/onboarding.spec.mjs`
  - existing-user Save-chat regression, local save, provider visibility, GitHub focus, mobile overflow.
- existing `tests/google-drive-sync.spec.mjs`
  - remains authoritative for Drive click ordering and provider behavior; F27 must not weaken it.

## OpenSpec overlap

- F14 public own-chat onboarding: reuses the structured handoff as the normal repeated capture path.
- F18 unified card dashboard: fixes the personal topbar Save-chat action without changing card/dashboard membership.
- F25 Google Drive Vault sync: provider remains synchronization for the same Vault/cards.
- F26 Safari-safe Google Drive connect: direct provider action must preserve the no-await-before-account-window ordering.
- Existing GitHub storage: repository-scoped setup remains canonical.

## Data/storage blast radius

No schema changes and no migration. Saving creates the same local Result shape/provenance as existing ChatGPT handoff. Remote providers continue synchronizing the same Vault.

## UX blast radius

Personal-root topbar Save-chat action changes from generic manual Add Result to the dedicated chat capture dialog. Generic Add Result behavior outside personal mode remains unchanged. Storage dialog remains canonical detailed provider settings.

## Risk areas

- accidentally allowing the old target listener to open the generic dialog after personal interception;
- duplicating capture/parser logic with different semantics;
- losing F26 browser click ordering when invoking Google Drive from Save chat;
- presenting providers as separate destinations instead of synchronization of one local-first Vault;
- provider setup unexpectedly blocking local save;
- mobile dialog overflow;
- regressions to first-card onboarding / anonymous Share fallback.
