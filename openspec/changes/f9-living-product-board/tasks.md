# Tasks: Living Product Board

## 1. Spec and repository grounding

- [x] 1.1 Read product summary, development summary, roadmap, existing Feature 7/8 changes, current `/demo/dash/` implementation, public Result catalog, and saved Dash catalog.
- [x] 1.2 Confirm PR #18 and PR #19 merge state and identify status drift.
- [x] 1.3 Create this separate `f9-living-product-board` OpenSpec change without editing completed Feature 7/8 history.
- [x] 1.4 Strictly validate the OpenSpec change before production-code changes.

## 2. Product board data model and migration

- [x] 2.1 Define product-board metadata validation and allowed delivery states.
- [x] 2.2 Evolve saved Dash `dashgpt-product` into `DashGPT Product Board` while preserving stable ID.
- [x] 2.3 Add/migrate initial product-topic Results for Semantic Dashes, Semantic Gallery UX, Semantic Navigator, Localization, Developer Fast Path, Structured Chat Continuation, Chat-to-Result capture, and explicit portability/storage slices.
- [x] 2.4 Preserve immutable Result hash rules and ensure new published Result knowledge hashes verify.
- [x] 2.5 Add deterministic fixture validation for board identity, membership, required metadata, status values, and no duplicated manual summary.

## 3. Rendering and routing

- [x] 3.1 Replace legacy `/demo/dash/` textual status renderer with Product Board rendering backed by `dashes.json` + the logical published Result catalog.
- [x] 3.2 Add canonical `/demo/dash/dashgpt-product/` route and make `/demo/dash/` resolve to the same board identity.
- [x] 3.3 Compute status summary/counts from current accessible board Results.
- [x] 3.4 Render current state, next action, blocker, OpenSpec/PR/deployment metadata, verification notes, timestamps, and provenance.
- [x] 3.5 Keep the board usable without browser localStorage and preserve responsive/mobile layout contracts.

## 4. Review-mode reconciliation

- [x] 4.1 Implement a pure deterministic reconciliation helper over saved card state and persisted external evidence.
- [x] 4.2 Enforce transition rules: open PR → proposed `in_development`; merged PR → proposed `merged`; confirmed production deployment → proposed `deployed`; manual acceptance only → `product_verified`.
- [x] 4.3 Ensure reconciliation never mutates summaries, decisions, continuation instructions, or private notes.
- [x] 4.4 Render last refreshed, last saved, update source, pending proposals, refresh action, and stale warning.
- [x] 4.5 Verify repeated refresh against identical evidence is idempotent and automatic mode remains disabled.

## 5. Continuation and discoverability

- [x] 5.1 Generate board Markdown continuation context with role, product definition, objective, current state, completed/active work, decisions, constraints, open questions, next actions, and sources.
- [x] 5.2 Add Copy Context/Continue affordance without implementing the separate provider-transport feature.
- [x] 5.3 Add a visible Product Board entry point from `/demo/`, from the Living Product Board Result card, and retain saved-Dash discoverability.

## 6. Documentation and legacy surface

- [x] 6.1 Update product/development/roadmap docs so the product board is the user-facing product-status surface and Feature 7/8 merged state is no longer stale.
- [x] 6.2 Keep `DASH.md` only as a developer operational handoff; document that `demo/data/dash.json` is not the product board source of truth.
- [x] 6.3 Update `DASH.md`/generated mirror only as required by existing development checks, without reintroducing a second product-status dataset.

## 7. Verification

- [x] 7.1 Add syntax/check integration for new board modules/scripts.
- [x] 7.2 Add deterministic board tests covering status counts, route identity, missing/inaccessible members, reconciliation transitions, idempotence, continuation output, no-localStorage rendering contract, Result-card discovery, deep-route SPA configuration, and idempotent server/browser Result-catalog composition.
- [x] 7.3 Run `npm run check` and strict OpenSpec validation after the implementation/docs state.
- [x] 7.4 Open a separate PR to `develop` linked to this OpenSpec change.
- [x] 7.5 Verify Cloudflare branch preview on desktop and narrow mobile; record any physical gesture/product-acceptance gates explicitly instead of overclaiming `product_verified`.

### Preview verification result

Cloudflare exposes `https://feature-f9-living-product-board-dashgpt.dimkashir.workers.dev`. The first live Chromium run correctly found a deployment-only regression that deterministic repository tests had not exercised: the Worker already returned product Result shards in `/results.json`, while the browser bootstrap appended those same shards again and rejected `dashgpt-semantic-dashes` as a duplicate ID.

The catalog merge was fixed to be idempotent for identical same-ID Results while conflicting same-ID content still fails hard; `scripts/verify-result-catalog.mjs` protects that regression.

The fixed branch runtime was then verified against the canonical `/demo/dash/dashgpt-product/` route in Chromium at 1440×1000 and 390×844. Both viewports rendered all 14 tracked topic cards with zero missing cards, zero `/undefined` metadata links and no horizontal overflow. The structured continuation dialog was opened and its required sections were asserted. Full-page desktop and mobile screenshots were captured and manually inspected: the board summary/actions are readable, the desktop card grid remains aligned, the mobile layout collapses cleanly to one column, the blocked storage state is visually distinct, and the delivery-model legend remains intact.

This completed the Feature 9 branch-preview/manual verification gate. PR #21 was subsequently integrated with merged Structured Chat Continuation, revalidated on current `develop`, and merged as `4be4941593928509ec75d4da58d2004963d3b694`. This advances the feature only to `merged`; stable production deployment remains separate evidence, and product acceptance must remain explicit.
