## Why

DashGPT already has Result cards, semantic color, Semantic Dashes, a semantic gallery, local persistence, source links, and continuation actions. The first-run dashboard nevertheless leads with implementation concepts such as local-first storage, sync state, immutable verification, Vault terminology, and empty builder surfaces. A new person therefore has to understand the architecture before understanding the product.

The mobile demo must invert that order. Within ten seconds, a person who has never seen DashGPT should understand that useful outcomes from AI conversations become organized cards that can be found and continued later.

## What Changes

- Replace technical first-screen status with a compact Russian value proposition and two human-facing actions: `Показать за 20 секунд` and `Сохранить разговор`.
- Render deterministic demonstration Results and three demonstration Dashes on first meaningful render without AI, authentication, or user-data writes.
- Add an optional, closable, deterministic 20-second story that turns a chat fragment into a reviewed card and places it into a semantic neighborhood.
- Simplify first-screen Result cards to theme, title, short summary, recency/relevance, and semantic color.
- Simplify opened Result presentation to `Главное`, `Что решили`, `Сейчас`, `Дальше`, source-chat action, and continuation action; keep schema/hash/version details out of the primary user surface.
- Rename the primary creation action from `Add Result` to `Сохранить разговор` and add a review step headed `Вот что DashGPT сохранит` before a local Result is committed.
- Count only confirmed user-created Results for persistence onboarding. After the third user Result, offer a non-blocking persistence sheet; after `Не сейчас`, suppress the prompt until five additional user Results have been confirmed.
- Add `/demo/?showcase=1` as a presentation mode that starts with the strongest populated board, hides technical statuses, keeps demo data non-user-owned, and returns to the interactive board after the story.
- Add deterministic verification for mobile width, first-screen copy, demo/user-data separation, review-before-save, persistence-trigger thresholds, and technical-term suppression.
- Add `verify:fast` and `verify:full` scripts so the requested verification workflow is explicit; keep `npm run check` as a compatibility alias for the full suite.

## Capabilities

### New Capabilities

- `zero-friction-mobile-demo`: value-first mobile dashboard, deterministic demo story, demo seed presentation, save-review flow, and value-triggered persistence onboarding.

### Modified Capabilities

None. This change composes with existing Result cards, Semantic Dashes, Semantic Gallery UX, Vault storage, and continuation actions without changing their durable domain contracts.

## Scope Boundaries

This change does not publish a ChatGPT App, implement Google Drive, redesign Vault v1, add automatic chat observation, introduce full localization, change Result hashing/versioning, change Semantic Dash membership semantics, or implement Structured Chat Continuation. It does not expose a persistence action unless that action already works in the current product.

The follow-up capability `One-command Chat Capture` remains a separate PR. Its target scenario is: a user finishes a conversation with `DashGPT`, reviews the prepared card, and confirms it onto the board with one action.

## Impact and Intersections

- **Dashboard / onboarding:** primary impact. Technical storage state moves out of the first-run value path; no mandatory tour is introduced.
- **Result cards / Feature 5:** reuse existing Result data and semantic hue; only presentation density/copy changes on the main demo surface.
- **Semantic Dashes / Feature 7:** demonstration Dashes are presentation seed data and do not become user-owned Dash revisions unless the user explicitly confirms a real save action.
- **Semantic Gallery UX / Feature 8:** reuse existing ordering, density, semantic grouping, and one-tap card opening. The demo does not fork a second gallery algorithm.
- **Vault / Feature 6:** confirmed user Results continue to use the existing browser Vault. Demo Results remain outside user-owned persistence counts. Persistence prompting is presentation state only.
- **Structured Chat Continuation:** explicitly untouched; existing continuation URL/payload behavior is consumed as-is.
- **Privacy:** first meaningful render requires no AI call, auth, sync, or remote write. Demo data is static product content, not fabricated user history.
