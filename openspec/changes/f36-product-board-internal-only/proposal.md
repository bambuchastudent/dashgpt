# Proposal — F36 Product Board internal-only navigation

## Why

The global `PRODUCT BOARD` action exposes DashGPT's own development-state dashboard in the same primary header used by ordinary users for their personal memory. That is project-maintenance tooling, not a core card/Dash action for every user.

DashGPT product state is already maintained through repository evidence, OpenSpec changes and structured AI conversation handoffs. The personal product UI should stay focused on the user's Cards, Dashes, search, capture and storage.

## What changes

- Remove the global `PRODUCT BOARD` action from the normal `/demo/` header.
- Replace F9's requirement that Product Board be visibly discoverable from the normal Results/Card dashboard.
- Keep `/demo/dash/dashgpt-product/` and the historical Product Board implementation/data available as an internal/compatibility surface for now.
- Add regression coverage so a future UI change does not accidentally re-promote Product Board into normal global navigation.

## User-visible result

The DashGPT header contains user-relevant actions only. Ordinary users are no longer presented with a DashGPT-development dashboard alongside their personal storage and capture actions.

## Non-goals

- No deletion of the historical F9 Product Board implementation.
- No migration of Product Board data.
- No Card, Dash, search, storage, import, continuation, semantic-color or Vault schema change.
- No change to the internal developer handoff/OpenSpec workflow.
- No unrelated header redesign.
