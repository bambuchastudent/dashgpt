# F39 tasks

## 1. OpenSpec gate

- [x] Inspect current `develop`, product/development summaries, roadmap, OpenSpec guide, F36 link-first capture, F18 unified card dashboard, affected renderer/capture code, package verification commands, and overlapping open PRs.
- [x] Create Issue #97 plus dedicated `f39-rich-card-detail` proposal, design, spec delta, tasks and Impact Manifest.
- [ ] Run `openspec validate f39-rich-card-detail --type change --strict --no-interactive` before production edits and record evidence.

## 2. Card-content implementation

- [ ] Add provider-neutral card-content normalization/section-extraction utility with no schema migration.
- [ ] Preserve rich block structure from F36 Share capture and strip provider-internal rendering markers.
- [ ] Extract only explicit Decisions/Решения and Next/Следующий шаг sections; do not infer missing values.
- [ ] Add safe DOM renderer for the bounded Markdown subset without captured `innerHTML`.
- [ ] Use rich summary rendering in modal and standalone card detail.
- [ ] Omit empty Decisions/Next detail blocks.
- [ ] Keep existing source provenance, repeat-capture identity, continuation, Dashes/search and fallback structured capture unchanged.
- [ ] Add minimal CSS needed for readable rich content and 360px wrapping.

## 3. Regression coverage

- [ ] Internal marker cleanup regression.
- [ ] Block/newline preservation regression.
- [ ] Explicit Decisions/Next extraction and no-invention regressions.
- [ ] Strong/code/list/heading/link renderer regression.
- [ ] Unsafe-link and captured-HTML inertness regressions.
- [ ] Modal and standalone detail omit empty Decisions/Next placeholders.
- [ ] F36 mocked Share capture saves structured rich card while preserving canonical source URL and duplicate behavior.
- [ ] 360px rich detail has no horizontal page overflow and primary actions remain reachable.

## 4. Verification / delivery

- [ ] Run focused syntax/deterministic checks for changed card-content/capture/render files.
- [ ] Run canonical `npm run verify:fast` and record evidence.
- [ ] Attempt canonical `npm run verify:full` once before merge and record pass/failure evidence truthfully.
- [ ] Verify production-shaped branch preview on desktop and 360px mobile.
- [ ] Open PR against `develop`, link Issue #97 and this OpenSpec change.
- [ ] Merge only when implementation scope is complete and verification evidence is explicit; then verify resulting `develop` head.
