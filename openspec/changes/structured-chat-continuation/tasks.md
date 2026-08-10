## 1. OpenSpec Gate and Scope Audit

- [x] 1.1 Read product/development/roadmap context and inspect every existing capability spec plus unfinished change tasks.
- [x] 1.2 Inspect current Result cards, create/materialize flow, `Continue in new chat`, Context Pack, target URL, Vault/GitHub storage, privacy, language behavior, and test contracts.
- [x] 1.3 Inspect active Semantic Dashes/Gallery intersections and keep Semantic Gallery, Semantic Navigator, search, and card redesign outside this change.
- [x] 1.4 Write proposal, spec delta, transport/data design, and dedicated prompt-injection/privacy threat analysis.
- [x] 1.5 Strictly validate `structured-chat-continuation` before editing production code.
- [x] 1.6 Keep implementation inside this change; update and revalidate artifacts before any scope expansion.

## 2. Continuation Brief Domain

- [x] 2.1 Add a dependency-free continuation module with allowlisted Result projection, RU/EN locale templates, conservative language resolution, and stable section model.
- [x] 2.2 Render valid full Markdown with one H1, non-empty H2 sections, lists/links, truthful minimal-Result fallbacks, and no fabricated decisions/facts/constraints.
- [x] 2.3 Generate contextual trusted instructions only from DashGPT templates/section presence and keep all Result/source/imported prompt-like text in untrusted data sections.
- [x] 2.4 Add secret/credential/URL filtering, control/hidden-text removal, Markdown/HTML neutralization, item/resource bounds, and unrelated-field exclusion.
- [x] 2.5 Preserve additive structured continuation fields through Vault Result sanitization and immutable canonical hashing without changing hashes of current Results.
- [x] 2.6 Add deterministic compact rendering that preserves required sections by priority, marks shortening explicitly, and keeps the full brief available.

## 3. Target Transport and UX

- [x] 3.1 Add the current ChatGPT transport adapter with encoded-URL byte measurement, Unicode/Markdown round trip, centralized safe budget, full/compact/clipboard preparation, and no title-only fallback.
- [x] 3.2 Replace legacy detail/page continuation links with one current-Result controller and route Semantic Dash member continuation through it.
- [x] 3.3 Add optional Preview context with exact prepared payload, transient editing, target/size/compaction status, Close, Copy continuation brief, conditional Copy full brief, and Continue.
- [x] 3.4 Add direct Copy continuation brief beside the existing secondary Context Pack without making preview mandatory or changing Context Pack.
- [x] 3.5 Implement synchronous target-tab opening, opener isolation, popup-blocker recovery, clipboard plus selectable-text fallback, and truthful localized status messages.
- [x] 3.6 Keep dialog/actions keyboard accessible, mobile responsive, and free of horizontal page overflow.

## 4. Activity and Compatibility

- [x] 4.1 Append content-free `result.activity = continue.new-chat` only after confirmed deeplink or clipboard-plus-target success; persist through the current Vault adapter.
- [x] 4.2 Prove blocked, cancelled, copy-failed, and preview-only actions append no success event and that no prompt/clipboard content enters Vault or telemetry.
- [x] 4.3 Preserve immutable Result integrity, current Result/source actions, Context Pack behavior, Dash membership, search, and existing Vault/GitHub round trips.

## 5. Verification

- [x] 5.1 Add unit fixtures for title+summary only, fully populated, absent decisions, decisions/constraints/questions, RU/EN, Unicode/emoji, links, prompt injection, secrets, unrelated privacy canaries, and Markdown structure.
- [x] 5.2 Add unit boundary fixtures for long cards, exact URL budget, over-budget compact mode, compact-does-not-fit clipboard mode, and edited over-budget preview.
- [x] 5.3 Add integration fixtures for current-version rebuild, repeated clicks, popup blocker, clipboard denial/legacy failure, exact preview editing, event success/failure, and Semantic Dash callback reuse.
- [x] 5.4 Add Playwright browser tests against the real demo for detail and standalone surfaces, exact preview/edit/copy/continue behavior, popup/clipboard outcomes, Cyrillic/links, and a narrow mobile viewport.
- [x] 5.5 Extend UI/security contracts and the project check command so unit, integration, browser setup, and existing regressions are discoverable; keep CI deterministic.
- [x] 5.6 Run strict OpenSpec validation, JavaScript syntax, continuation unit/integration tests, immutable Result/Vault/GitHub/UI/smoke regressions, and browser tests.

## 6. Handoff and PR

- [x] 6.1 Update only the minimum durable product/development/operational docs required to describe the merged capability and keep Semantic Gallery/Navigator state separate.
- [x] 6.2 Rebase on current `develop` and review the exact diff for generated artifacts, secrets, unrelated files, and overlap with merged PR #19.
- [x] 6.3 Publish one dedicated branch and commit, then open a draft PR to `develop` linking `openspec/changes/structured-chat-continuation/`.
- [x] 6.4 Record branch, commit, PR, OpenSpec validation, automated/browser evidence, and any remaining external/manual verification here before marking complete.

## Completion Evidence

Populate this section only from completed commands and observed results. Do not mark transport, browser, or activity tasks complete from code inspection alone.

- Pre-production gate: `openspec validate structured-chat-continuation --type change --strict --no-interactive` passed before edits.
- Local quality gate: `npm run check` passed, including syntax, Continuation unit/integration, immutable Result, Semantic Dash, Vault, GitHub storage, Worker, UI-contract and smoke verification.
- Browser discovery: `npm run test:browser -- --list` found 14 Playwright cases across pinned desktop Chromium and narrow mobile Chromium projects.
- Current-base review: rebased on `develop@503e6e04ec8667b789848962072d083cfcfbe1f8`; GitHub compare reported one ahead commit, zero behind, and exactly 29 continuation/OpenSpec/test/doc paths with no Gallery module changes or secret findings.
- Publication: branch `agent/structured-chat-continuation`; tested implementation head `052d384c0dbc036793387c7e80814c95660bf8ef`; draft PR [#20](https://github.com/bambuchastudent/dashgpt/pull/20) targets `develop` and links this change.
- CI evidence: Immutable Results run 30 succeeded; DashGPT checks run 133/job `93499581062` succeeded, including `npm run check`, Chromium installation, and Playwright with 13 passed plus one expected desktop skip of the mobile-only layout assertion.
- Remaining optional manual evidence: verify the best-effort `chatgpt.com/?q=` composer behavior from a deployed desktop/mobile browser when convenient. The public web transport has no documented maximum contract, so preview/copy and truthful clipboard/manual fallback remain the required safety path if that behavior changes.
