# Feature 40 — One-sentence product explanation

## Why

A first-time visitor can currently see the slogan `Useful AI outcomes, not chat history.` without learning what DashGPT actually does. The public shell should explain the product in plain language within a few seconds.

## What changes

- replace the abstract public subtitle with one complete sentence that explains DashGPT as personal AI memory;
- say that useful parts of AI conversations become connected cards;
- include the core user value: find, combine and continue those cards later with context preserved;
- keep public metadata and the web-app manifest aligned with the same message;
- add regression coverage so the clear product explanation cannot silently drift back to an abstract slogan.

## Non-goals

- no card, Dash, search, storage, sync, import or continuation behavior changes;
- no product rename or visual redesign;
- no new onboarding flow or modal;
- no infrastructure/storage terminology in the primary explanation.

## User-visible outcome

A new visitor can understand from the DashGPT header itself what the product does, without needing prior project context.
