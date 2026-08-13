# Design — coherent Save chat + storage flow

## Existing ownership

`demo/app.js` owns the generic add-result button and manual Result form. `demo/public-onboarding.js` changes that button's label on the personal root and already contains the structured ChatGPT command, Result-envelope parser, review UI, and local Result creation used for a visitor's first card. Google Drive and GitHub synchronization already have canonical controllers and the existing Storage dialog remains the detailed settings surface.

## Request boundary

Before the generic app opens its manual form, it dispatches one cancelable `dashgpt:add-result-request` event. On ordinary routes nobody cancels it and existing behavior remains unchanged. On the personal root, the onboarding layer cancels it and opens the dedicated Save-chat dialog.

This avoids branching core app behavior on translated display text and keeps the generic manual Result form available outside the personal Save-chat experience.

## Save-chat dialog

The dialog has two parts.

### Where the card lives

The dialog explains the product model in human language:

- `This device` is always active and receives the card first.
- `Google Drive` is optional synchronization of the same Vault and cards.
- `GitHub` is optional synchronization of the same Vault and cards.
- only one remote provider is active at a time.

Provider setup is optional and must not gate local save. The UI never presents providers as different card types.

### Capture the conversation

The dialog reuses the existing chat-first sequence:

1. copy the DashGPT command;
2. paste the structured Result returned by ChatGPT;
3. parse and validate it with short human-facing errors;
4. review title and summary;
5. save exactly one visitor-owned local Result using the existing ChatGPT-handoff provenance.

After that local save, the existing storage controllers remain responsible for remote synchronization.

## Provider actions

The Google Drive action delegates to the already-initialized canonical Drive controller rather than implementing a second Drive path. The public onboarding module imports that entry point ahead of time so the provider action can delegate synchronously from the user's click, preserving the F26 browser-flow rule.

GitHub setup requires the existing repository/folder field and pairing flow, so the Save-chat dialog opens the canonical Storage dialog and focuses the GitHub section rather than duplicating that form.

The Save-chat dialog derives status from the canonical provider UI/state and refreshes when provider state changes.

## Data safety

Local save remains available without a remote provider. Existing one-provider-at-a-time, Drive merge, GitHub merge, and local-first rules remain authoritative. Unsaved capture text is not automatically persisted just to support provider setup. The UI tells users they can connect synchronization before or after saving.

## Mobile

At 360px provider cards stack vertically, controls remain touchable, review fields fit the dialog width, and the dialog introduces no horizontal overflow.

## Compatibility

The clean-user welcome remains the first-value flow. If the operational import card makes the topbar Save-chat action visible before the first user card exists, that action opens the same dedicated dialog. Anonymous Share compatibility remains untouched.
