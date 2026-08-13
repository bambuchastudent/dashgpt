# Proposal — coherent Save chat + storage flow

Issue: #62

## Problem

The personal dashboard relabels the generic `+ Add Result` button to `+ Сохранить чат`, but the underlying action still opens the manual Result form. Users therefore click a chat-specific promise and land in a different product model. The flow also hides the fact that cards are always stored locally first and that Google Drive / GitHub are optional sync providers for the same Vault.

## Proposed change

1. On the personal root, make `Сохранить чат` open a dedicated capture dialog rather than the generic Add Result form.
2. Reuse the existing chat-first capture command, Result-envelope parser, review, and local-card creation semantics from first-user onboarding.
3. Put the storage model in human language inside the same dialog:
   - this device/local Vault is always active;
   - Google Drive is an optional sync choice;
   - GitHub is an optional sync choice;
   - one remote provider at a time.
4. Offer a Google Drive action from the dialog that reuses the canonical Google Drive controller, and a GitHub setup action that opens/focuses the existing repository-scoped setup.
5. Keep provider setup optional. Saving a card must never require a remote account.
6. Keep clean-user onboarding and anonymous Share fallback working.
7. Keep the generic manual Result form available outside the personal Save-chat mode.

## User-visible result

`Сохранить чат` becomes one predictable flow: understand how the card will be stored, optionally connect sync, copy the DashGPT command, paste the prepared Result, review it, and save the canonical card locally. Connected remote storage then synchronizes that same Vault/card rather than creating another copy/type.

## Scope boundaries

No private ChatGPT scraping, no new card type, no new Vault schema, no provider mirroring, no change to Drive scope or GitHub repository pairing semantics.
