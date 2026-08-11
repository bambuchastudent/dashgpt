# DashGPT — Roadmap

This roadmap is intentionally high-level. Detailed implementation belongs in dedicated OpenSpec changes and PRs.

Status vocabulary matters:

- **merged** = code is in `develop`;
- **deployed** = a deployment containing that code is verified;
- **product verified** = the user-facing behavior was explicitly accepted in the relevant environment;
- **planned/proposed** = do not describe as working.

## Product spine

DashGPT is converging on one product spine:

`Capture → canonical Cards → Find / Semantic Gallery → save/reopen Dashes → Structured Continue → optional storage/sync`

For developer workflows, project-local memory may extend that spine without replacing canonical cards.

Current product terminology is **Card**. Legacy `Result` names remain in current implementation contracts and historical changes until separately migrated.

## Foundation — merged

### M0 — repository/spec-driven bootstrap

Repository, durable product/development summaries, OpenSpec workflow and CI foundations are established.

### M1 — local-first memory vertical slice

The original implementation proved local create/import, persistence, browsing/search, favorites/details and continuation/export using the legacy `Result` model.

Status: **merged historical foundation**. Product language has since moved to canonical Cards.

### Feature 2 — shared chat → published memory

Proved ingestion/distillation of real shared AI conversations with source provenance.

Status: **merged historical capture path**.

### Feature 3 — immutable pages + MCP foundation

Established stable standalone legacy Result pages, shared rendering, immutable-content verification and the first MCP/ChatGPT integration foundation.

Status: **merged**.

## Storage / ownership track

### Feature 6 — zero-install privacy and portable storage

Established the provider-neutral Vault direction and explicit boundary between AI-provider context and DashGPT-owned durable memory.

Merged slices:

- architecture/privacy boundary — PR #11;
- local Vault core/migration — PR #12;
- GitHub adapter — PR #13;
- public GitHub App identity/status follow-ups — PRs #14/#16.

Remaining external gate:

- configure protected production GitHub secrets;
- run one real private disposable-repository pair → sync → idempotent re-sync → disconnect smoke test.

Future storage capabilities such as Google Drive, explicit Profile and broader provider switching/mirroring should be split into dedicated future OpenSpec changes rather than treated as already delivered by the umbrella Feature 6 change.

## Semantic memory / continuation — merged

### Feature 7 — Semantic Dashes

Saved, reference-only semantic views with Review-mode refresh and user overrides.

Status: **merged via PR #18**.

### Feature 8 — Semantic Gallery UX

Deterministic semantic neighborhoods/activity ordering and density/zoom behavior.

Status: **merged via PR #19**.

### Structured Chat Continuation

Bounded, inspectable Continuation Brief with privacy/prompt-injection boundaries, exact preview/copy and transport fallback.

Status: **merged via PR #20**.

### Feature 9 — Product Board dogfooding

Uses the existing Semantic Dash + card/legacy-Result records to represent DashGPT product delivery state rather than a separate hand-maintained status database.

Status: **merged via PR #21**.

Product-model note: Product Board is one specialized Dash/view, not a separate canonical product entity.

## Onboarding / Share reliability — merged

A sequence of narrowly scoped changes hardened the public/chat-first capture path:

- Feature 10 — public own-chat onboarding — PR #24;
- Feature 11 — shared-chat fetch hardening — PR #25;
- Feature 12 — visible rendered-DOM fallback — PR #26;
- Feature 13 — avoid predictable direct 403 path — PR #27;
- Feature 14 — chat-first onboarding — PR #28;
- Feature 15 — anonymous Share resolver — PR #30;
- Feature 16 — current public Share JSON/backend resolver — PR #31;
- Feature 17 — permanent parser/browser/live-smoke regression safety net — PR #32.

Status: **merged into `develop` through Feature 17**.

Product direction remains direct AI conversation → distill → save/update card. Share parsing is a fallback/additional capture path, not the architectural foundation.

## Public ChatGPT App track — external release gate

Feature 4 implementation/submission artifacts are in `develop`. Publisher identity is already verified according to its current task state.

Still incomplete:

- create/finalize the public DashGPT submission in the current OpenAI Platform flow;
- complete domain/tool review and submit;
- approval/publication;
- second-user acceptance against separate user-controlled data.

Do not call the public-app MVP complete until those external acceptance steps occur.

## Active open feature work — not in `develop`

### Feature 18 — Unified Card Dashboard / `My Dash`

PR #33, OpenSpec `f18-unified-card-dashboard` on its feature branch.

Direction:

- make canonical cards the visible home/search/Dash surface;
- use `My Dash` / `Мой Dash` as the virtual default home view;
- remove separate Living Topics/Results product surfaces from the user model;
- save useful semantic selections as Dashes;
- keep the active saved Dash visible.

Status: **open draft PR; not merged, not shipped**.

### Feature 19 — Project-local Developer Memory

PR #34, OpenSpec `f19-project-local-developer-memory` on its feature branch.

Direction:

- provider-neutral `.dashgpt` project-memory contract;
- cards remain canonical memory;
- sessions are optional evidence;
- Project State becomes the developer-oriented summary/view;
- future coding-agent capture remains explicitly separate/planned.

Status: **open PR/prototype; not merged, not shipped**.

## Established future directions — require dedicated scopes

These are product directions, not implementation claims:

### Zero-friction mobile demo

New users should immediately see populated useful cards/Semantic Gallery and understand the product before storage/MCP/Vault internals.

### Direct AI capture

Normal AI conversation → distill → review → real save/update card through the integration. A command such as `dashgpt добавь карточку` must persist through the integration when available, not merely print sample JSON/text.

### Mobile Share Sheet / Shortcuts

Additional low-friction capture into the same card model.

### Bulk browser import

Migration/bootstrap for existing history. It should be resumable/idempotent, avoid duplicated cards across retries and make progress/recovery understandable. It must remain secondary to direct AI capture.

### Card merge

A synthesized card may combine useful context from multiple cards while preserving originals as source-of-truth evidence. Originals should be de-prioritized/grouped rather than deleted and may participate in later merges.

### Additional storage/provider work

Google Drive and other user-controlled providers over the same portable memory model; storage implementation must not redefine Cards/Dashes.

### Semantic navigation / localization

Richer semantic navigation and broader product localization remain separate capabilities.

### Authenticated private-memory agent access

Hosted agents should eventually access a user's private paired memory through an explicit authenticated boundary, not by weakening the public instance protocol.

## Current delivery intent

1. Keep documentation/OpenSpec/repository state truthful as the product moves from legacy Result terminology to canonical Cards.
2. Review and merge Feature 18 and Feature 19 independently only when their own OpenSpec/verification gates are satisfied.
3. Keep Feature 4 public release and Feature 6 production GitHub activation as explicit external tracks.
4. Prepare future capabilities as separate GitHub Issue/OpenSpec/PR scopes rather than widening active work.
5. Preserve the central product priority: a normal user can save useful AI outcomes as cards, find them and continue later without understanding storage infrastructure.
