# DashGPT — Development Summary

This file answers one question only: **how are we building DashGPT?**

Product requirements and canonical terminology belong in `docs/product-summary.md`.

## Development principles

1. **Spec-driven development.** Production capabilities start from a dedicated OpenSpec change, not ad-hoc implementation.
2. **Repository is the implementation source of truth.** Chat discussion can propose work; repository/OpenSpec/PR/test/deployment evidence determines actual state.
3. **One capability per change/PR.** Do not silently mix unrelated future work into an active PR.
4. **Scope changes update OpenSpec first.** Production code follows the approved scope, not the other way around.
5. **Regression coverage is required.** Bugs that escaped before receive tests that would have caught them.
6. **Verification is layered.** Use focused checks while developing and one authoritative full gate before PR/merge; important UI work also requires production-preview/mobile verification.
7. **Provider-neutral workflow.** Claude, Codex, Copilot, OpenCode and local models are replaceable clients of the same repository state.
8. **Short global instructions; durable detail in specs/docs.** `AGENTS.md` routes; it is not a project encyclopedia.
9. **Truthful status.** `specified`, `in development`, `merged`, `deployed`, `product verified` and `publicly available` are distinct states.

## Canonical product language vs implementation compatibility

Current product language is **Card**. Existing `develop` still contains `Result` in schema names, static catalogs, routes, storage layout, MCP tools and historical OpenSpec changes.

Development rule:

- use **Card** for new product-facing behavior and documentation;
- keep literal `Result` when referring to an existing identifier/contract that actually has that name;
- do not create a second product entity to bridge the terminology;
- rename compatibility contracts only through a dedicated OpenSpec migration with backward-compatibility tests.

Historical OpenSpec artifacts should remain historically accurate instead of being rewritten to pretend they used today's terminology.

## Required production-change workflow

For every production feature/change:

1. Read `docs/product-summary.md`, this file, `docs/roadmap.md` and `openspec/README.md`.
2. Inspect existing OpenSpec capabilities/changes and the actual affected implementation.
3. Check overlap with cards, Dashes, search, storage, continuation, UI, localization/security and compatibility contracts.
4. Use a dedicated OpenSpec change.
5. Prepare:
   - proposal;
   - spec delta;
   - `design.md` when behavior/data/UX/architecture changes;
   - verifiable `tasks.md`;
   - Impact Manifest when blast radius matters.
6. Strictly validate the OpenSpec change.
7. Only then modify production code.
8. Implement only approved scope. If scope changes, update/revalidate OpenSpec first.
9. Add regression tests and run targeted verification during implementation.
10. Before PR/merge, run the canonical full verification once while applicable.
11. Verify meaningful UI changes in production preview and relevant mobile viewport.
12. Link the PR to its OpenSpec change and keep independent capabilities in separate PRs.
13. Reconcile tasks, roadmap/current-state docs and handoff state when the project state materially changes.

For future capability discussions that are not already active, a GitHub Issue is the preferred durable product/PR handoff before implementation: keep the full Markdown/OpenSpec input there, then create the dedicated change/PR from it.

## OpenSpec in this repository

OpenSpec remains the SDD/change lifecycle framework.

Important current repository fact: `openspec/changes/` contains both merged historical changes and umbrella changes with remaining tasks. It is **not** a clean list of currently active work. See `openspec/README.md` for the reconciled index.

`.github/workflows/openspec.yml` installs the current OpenSpec CLI and strictly validates only change directories modified by the PR. This intentionally avoids making old-format historical changes fail unrelated work under a newer CLI.

Current validation command:

```bash
openspec validate <change-id> --type change --strict --no-interactive
```

Do not run `openspec init` on an existing DashGPT checkout as part of normal contribution; the repository is already initialized and contains its change history.

## Code-intelligence tooling

Use when available:

- **Graphify** to understand repository/dependency structure while minimizing loaded context.
- **Serena** for focused symbol-aware navigation and modifications.

If either tool is unavailable in the current execution environment, use narrow repository-tree/search/symbol inspection instead and record the fallback when it matters to the change. Tool availability must not become a correctness dependency.

## Current verification commands on `develop`

The current `develop` `package.json` exposes:

```bash
npm run check
npm run test:browser
```

`npm run check` is the broad deterministic repository gate. It currently includes JavaScript syntax, DASH mirror synchronization, immutable legacy Result/catalog checks, Structured Continuation, Product Board compatibility behavior, Semantic Dashes/Gallery, Vault/GitHub storage, Worker routing, shared-chat parser/resolver regressions, UI contracts, submission metadata and MCP smoke coverage.

`npm run test:browser` runs Playwright browser flows, including desktop/narrow-mobile coverage present in the repository.

Open PR #33 introduces `verify:fast` / `verify:full` scripts on its branch, but those commands are **not yet part of current `develop`**. Documentation must not instruct a fresh `develop` checkout to run commands that only exist in an unmerged PR. Once such a change merges, update this section and the contributor workflow.

## Major implementation surfaces on current `develop`

### Legacy card/Result renderer and catalog

Current static/browser/Worker code still uses legacy Result-compatible data and routes. Published immutable knowledge is verified through stable content hashes; presentation can evolve without silently mutating old published knowledge.

The historical catalog and Product Board shards are composed into one logical catalog for current compatibility consumers. This is implementation history, not a reason to keep `Result` as a separate future product concept.

### Semantic Gallery and Dashes

Feature 7 (PR #18) and Feature 8 (PR #19) are merged. Current implementation provides semantic Dash references/overrides and deterministic semantic gallery ordering/density behavior over legacy Result-shaped records.

New UI/product work should project those records as canonical cards rather than introducing a second data model.

### Structured Chat Continuation

PR #20 is merged. `demo/continuation.js` owns the current Continuation Brief projection, RU/EN templates, privacy filtering and ChatGPT transport/fallback behavior.

Continuation rebuilds from the current source record, treats imported text as data rather than trusted instructions, excludes credential-shaped values/unsafe URLs, and records only content-free continuation activity after confirmed transport behavior.

### Product Board dogfooding

PR #21 is merged. The current `dashgpt-product` Semantic Dash and Product Board renderer remain valid **implemented compatibility/dogfooding surfaces**.

They are not a separate canonical product entity. Current product direction is cards + Dashes; the Product Board is one Dash/view over product-state cards.

### Chat-first and Share onboarding/resolver

Current `develop` contains the merged sequence:

- PR #24 — public own-chat onboarding;
- PR #25 — shared-chat fetch hardening;
- PR #26 — rendered visible-DOM fallback;
- PR #27 — avoid direct predictable 403 path;
- PR #28 — chat-first onboarding;
- PR #30 — anonymous Share resolver;
- PR #31 — current public Share JSON/backend resolver;
- PR #32 — permanent parser/browser/live-smoke regression safety net.

The preferred everyday product direction remains direct AI conversation → distill → save/update card. Public Share parsing is a useful fallback/capture path and should not become the architectural foundation of onboarding.

### Storage

Feature 6 established a provider-neutral Vault direction plus merged local Vault core (PR #12) and GitHub adapter implementation (PR #13). The public GitHub App identity was configured in PR #16.

Production GitHub synchronization is **not considered fully activated** until protected Worker secrets are configured and a real private disposable-repository pair → sync → idempotent re-sync → disconnect smoke test passes. See `docs/github-storage-setup.md`.

Google Drive, explicit Profile and broader provider portability remain future work and should receive dedicated scopes rather than being silently mixed into unrelated PRs.

### MCP / ChatGPT App compatibility

Current Worker/MCP still exposes legacy compatibility names such as `list_results`, `search_results`, `get_result`, `get_context_pack`, `prepare_result_import`, plus Semantic Dash support. All six public tools advertise object-root output schemas for successful structured responses. `search_results` is the explicit required-query route while `list_results.query` remains compatible. Fixed service messages accept `language: en | ru` with English default; stored Card/Result/Dash content is never automatically translated. Keep literal tool names accurate in implementation documentation until a dedicated compatibility migration changes them.

Public app submission remains an external release track under `f4-plugin-directory-submission`; implementation/submission artifacts are present, but public review/approval/publication/second-user acceptance are not complete merely because `/mcp` works.

## Current branch/PR state at this reconciliation

`develop` includes merged work through Feature 17 / PR #32.

Open work that must **not** be described as shipped:

- **PR #33** — Feature 18 `f18-unified-card-dashboard`, draft. It introduces the card-first `My Dash` shell/unified dashboard behavior on its branch.
- **PR #34** — Feature 19 `f19-project-local-developer-memory`, open. It prototypes provider-neutral `.dashgpt` project memory and a Project State developer view on its branch.

The OpenSpec directories for Features 18/19 are branch-local and correctly absent from `develop` until merge.

## Documentation separation

- `docs/product-summary.md` = WHAT DashGPT is and must do.
- `docs/product-conversation-guide.md` = product-evaluation/usability gate.
- `docs/development-summary.md` = HOW it is built and verified.
- `docs/roadmap.md` = merged/active/planned ordering and state.
- `openspec/README.md` = how to interpret OpenSpec lifecycle/currentness.
- OpenSpec changes = scoped implementation history/work.
- ADRs = durable architectural decisions and rationale at the time made.
- `DASH.md` = short developer operational NOW / DONE / NEXT / BLOCKERS handoff.
- GitHub Issues = preferred durable handoff for future capability/PR proposals before implementation.

No one of these should silently replace the others.

## Handoff rule

A handoff must distinguish:

- what is verified on `develop`;
- what exists only in an open branch/PR;
- what is specified/planned but unimplemented;
- what is blocked on an external/user action;
- what verification evidence exists.

Old timestamped handoffs may remain for history, but they must be visibly marked superseded when no longer current. `docs/handoff-dashgpt-v2.md` is such a historical artifact and should not be used as the current state source.
