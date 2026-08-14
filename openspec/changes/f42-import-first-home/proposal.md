# Proposal: Import-first personal home

## Why

The personal root currently leads with internal dashboard concepts before explaining what DashGPT does or how to put useful data into it. The primary tasks already exist, but they are visually buried: importing ChatGPT history, saving one shared chat, and browsing saved cards.

## What changes

- Add a compact home entry surface above advanced dashboard content.
- Explain DashGPT in plain language.
- Make the existing ChatGPT import guide the primary action.
- Make the existing Save Chat / Share-link flow the secondary action.
- Add a direct jump to the existing card gallery/search.
- Keep Semantic Dashes, gallery density, storage providers, manual Result creation and other advanced tools available below or in their existing surfaces.
- Keep F38 Reset this device inside Storage/Vault rather than promoting a destructive action on the home hero.
- Provide RU/EN copy and responsive behavior.

## Compatibility

No new import protocol, storage schema or card format is introduced. CTA routing MUST delegate to existing canonical controls so import resumability, duplicate prevention, privacy and save-chat validation remain owned by their existing implementations.

## Success criteria

A user landing on the personal root can understand the product and start one of the three primary journeys without understanding Result, Semantic Dash, Vault or storage-provider terminology.