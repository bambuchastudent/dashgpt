# F36 — Link-first ChatGPT chat capture

## Why

The existing personal `+ Сохранить чат` flow is structurally correct but too laborious for a user who already has the conversation open: copy a DashGPT command into ChatGPT, wait for a JSON envelope, copy that response back, then review and save.

DashGPT already has a hardened public ChatGPT Share reader (`/api/shared-chat`) and anonymous Share capture. The personal Save-chat flow should reuse that capability as the primary entry rather than asking the user to manually manufacture card fields.

## What changes

- Put a ChatGPT Share-link field first in the existing-user Save-chat capture section.
- Resolve a valid Share URL through the existing `/api/shared-chat` endpoint and prepare a reviewable canonical card automatically.
- Preserve the original canonical Share URL in card provenance.
- Re-importing the same Share URL updates/reuses the same card instead of adding a duplicate.
- Translate unsupported private `/c/...` links and unreadable Share failures into human product states.
- Keep the current JSON handoff/copy-command flow as a secondary fallback.
- Preserve F27 local-first saving, optional Google Drive/GitHub sync, provider exclusivity and F26 Safari click ordering.

## Source-of-truth / overlap

This change composes existing capabilities rather than adding a parallel import model:

- canonical card/Vault model;
- F27 `save-chat-flow` dialog and storage behavior;
- `src/shared-chat.js` public Share retrieval;
- existing ChatGPT Share URL compatibility behavior;
- existing source/original-chat actions.

F33 guided bulk export import and F28 semantic history enrichment remain separate bulk/migration behavior. F34/F35 account-backed Vault work must not be changed by this capture UX change. Open gallery/profile work consumes the same cards and is not part of this scope.

## Out of scope

- reading authenticated private ChatGPT `/c/...` pages from DashGPT;
- new browser-extension permissions;
- new card/Result/Vault schema;
- new remote provider or simultaneous provider mirroring;
- changes to bulk ZIP/history import, semantic gallery ordering, continuation, merge-card behavior or Google account identity.

## Success

A normal existing user can click `+ Сохранить чат`, paste a ChatGPT Share link as the first action, review the automatically prepared title/summary, save one canonical local card, and return to it later through the original-chat link without manually constructing JSON.
