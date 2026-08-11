## 1. OpenSpec and overlap

- [x] 1.1 Inspect current card, Semantic Dash, Semantic Gallery, continuation, storage and active dashboard changes.
- [x] 1.2 Keep the prototype isolated from the concurrent Unified Card Dashboard capability.
- [x] 1.3 Define the provider-neutral `.dashgpt` contract and privacy boundaries.
- [x] 1.4 Strictly validate the initial OpenSpec change before production-code work.
- [ ] 1.5 Revalidate the expanded Project State visualization scope before modifying renderer production code.

## 2. Prototype fixture and renderer

- [x] 2.1 Add one deterministic developer-memory fixture representing canonical cards, explicit relations and contributing sessions.
- [x] 2.2 Add a standalone developer prototype route that loads only the fixture and existing static assets.
- [x] 2.3 Render the initial semantic Project Map from canonical card metadata.
- [x] 2.4 Render Timeline from canonical cards without creating a second result entity.
- [x] 2.5 Render Results summary and completed/in-progress engineering outcomes from the same cards.
- [x] 2.6 Render Sessions as provider-neutral evidence linked back to canonical cards.
- [x] 2.7 Add a card detail surface for problem, decision, outcome, files, evidence and contributing sessions.
- [x] 2.8 Label session provenance as local/private evidence and avoid claims of automatic capture.

## 3. Project State visualization revision

- [ ] 3.1 Extend the fixture with verified `workstream`, `stage`, `stageLabel`, `priority`, `progress` and product-spine metadata.
- [ ] 3.2 Replace Project Map as the default tab with Project State.
- [ ] 3.3 Add a compact product spine showing how DashGPT capture, cards, semantic organization, continuation and developer memory compose.
- [ ] 3.4 Add a prominent Now surface where active cards expose user-visible outcome and progress/evidence without opening details.
- [ ] 3.5 Add Shipped / Active / Next project-state summary derived from canonical cards.
- [ ] 3.6 Group project cards by human workstream while keeping semantic hue as a secondary cue.
- [ ] 3.7 Keep card details, Timeline, Results and Sessions using the same canonical IDs.

## 4. Responsive UX and regression coverage

- [x] 4.1 Initial standalone route is usable at desktop and 390px mobile widths with no horizontal overflow.
- [x] 4.2 Initial Playwright coverage exists for all four views, card detail/evidence, session-to-card links and mobile overflow.
- [ ] 4.3 Update browser coverage for default Project State, product spine, active work/outcome/progress, stage distinctions and workstreams.
- [ ] 4.4 Verify the revised Project State at desktop and 390px mobile widths with no horizontal overflow.

## 5. Final verification

- [ ] 5.1 Run strict OpenSpec validation after the scope revision.
- [ ] 5.2 Run the repository canonical full verification (`npm run check` plus Playwright/browser gate through CI) on the final head.
- [ ] 5.3 Verify the production preview route if the PR environment exposes one; if direct preview inspection remains unavailable, record that limitation and rely on the browser gate plus deployment status.
- [x] 5.4 Keep this PR separate from capture adapters, IDE extensions, MCP write tools and filesystem persistence.
