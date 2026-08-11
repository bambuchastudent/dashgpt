## 1. OpenSpec and overlap

- [x] 1.1 Inspect current card, Semantic Dash, Semantic Gallery, continuation, storage and active dashboard changes.
- [x] 1.2 Keep the prototype isolated from the concurrent Unified Card Dashboard capability.
- [x] 1.3 Define the provider-neutral `.dashgpt` contract and privacy boundaries.
- [x] 1.4 Strictly validate this OpenSpec change before production-code work.

## 2. Prototype fixture and renderer

- [x] 2.1 Add one deterministic developer-memory fixture representing canonical cards, explicit relations and contributing sessions.
- [x] 2.2 Add a standalone developer prototype route that loads only the fixture and existing static assets.
- [x] 2.3 Render Project Map semantic neighborhoods from canonical card metadata.
- [x] 2.4 Render Timeline from canonical cards without creating a second result entity.
- [x] 2.5 Render Results summary and completed/in-progress engineering outcomes from the same cards.
- [x] 2.6 Render Sessions as provider-neutral evidence linked back to canonical cards.
- [x] 2.7 Add a card detail surface for problem, decision, outcome, files, evidence and contributing sessions.
- [x] 2.8 Label session provenance as local/private evidence and avoid claims of automatic capture.

## 3. Responsive UX and regression coverage

- [x] 3.1 Make the standalone route usable at desktop and 390px mobile widths with no horizontal overflow.
- [x] 3.2 Add Playwright coverage for all four views, card detail/evidence, session-to-card links and mobile overflow.
- [x] 3.3 Run targeted browser verification for the developer route through the desktop and mobile Playwright projects.

## 4. Final verification

- [x] 4.1 Run the repository canonical full verification (`npm run check` plus Playwright/browser gate through CI).
- [ ] 4.2 Verify the production preview route if the PR environment exposes one. Cloudflare reports a successful final-head deployment; direct interactive preview inspection is blocked by this execution environment.
- [x] 4.3 Keep this PR separate from capture adapters, IDE extensions, MCP write tools and filesystem persistence.
