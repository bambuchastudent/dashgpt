# Impact Manifest — F27 coherent Save chat + storage flow

## Production files

- `demo/public-onboarding.js`: personal Save-chat interception, dedicated capture dialog, local-first storage summary, and reuse of existing provider controls.
- `demo/onboarding.css`: Save-chat dialog and narrow-screen layout.

The core app and provider controllers remain unchanged.

## Tests

- `tests/save-chat-flow.spec.mjs`: existing-user dialog behavior, local save, provider visibility/delegation, Google user-activation delegation, GitHub focus, and narrow viewport behavior.
- Existing onboarding tests remain authoritative for clean-user first-card and anonymous Share compatibility.
- Existing Google Drive tests remain authoritative for canonical browser-ordering behavior.
- `package.json` registers the new regression file for syntax/fast verification.

## OpenSpec overlap

F14 structured handoff, F18 personal dashboard action, F25/F26 remote synchronization/browser ordering, and existing GitHub storage behavior remain authoritative.

## Data/storage blast radius

No schema change, migration, new card type, or provider-specific duplicate card. Local-first save semantics remain unchanged.

## UX blast radius

Only the personal Save-chat action changes from the generic manual form to the dedicated capture dialog. Detailed remote settings remain in the existing Storage dialog.

## Risks

- both dialogs opening from one click;
- capture semantics drifting from first-card onboarding;
- provider setup blocking local save;
- browser click ordering regression;
- mobile overflow;
- first-card/Share regressions.
