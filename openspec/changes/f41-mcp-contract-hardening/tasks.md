# F41 tasks

## 1. OpenSpec gate

- [x] Inspect current `develop`, product/development summaries, roadmap, MCP implementation, Semantic Dash chat formatter, bundled skill, submission packet, verification scripts and overlapping open PRs.
- [x] Create Issue #104 and dedicated `f41-mcp-contract-hardening` proposal, design, spec delta, tasks and Impact Manifest.
- [x] Record Graphify/Serena unavailability and fallback impact-scan evidence.
- [x] Run `openspec validate f41-mcp-contract-hardening --type change --strict --no-interactive` before production edits and record exact evidence. Local OpenSpec 1.9.0 strict validation completed successfully on 2026-08-14 before any production edit; the validation-only branch/PR commit and CI run are recorded separately when published.

## 2. Structured MCP contracts

- [ ] Define reusable object-root output schemas for list/search, Semantic Dash, Result, Context Pack and prepared import success envelopes.
- [ ] Advertise an output schema for all existing tools and `search_results`.
- [ ] Keep MCP errors error-shaped without fake structured success.
- [ ] Bump the compatible MCP/plugin minor version.

## 3. Dedicated search

- [ ] Add required-query `search_results` using the same load/rank/projection helper as `list_results`.
- [ ] Preserve `list_results.query` compatibility.
- [ ] Preserve category, limit, Unicode, remote-instance discovery and public-only access behavior.

## 4. RU/EN generated responses

- [ ] Add explicit `language: en | ru` input to every public tool with English default.
- [ ] Localize fixed list/search, Dash, not-found and explicit-import guidance.
- [ ] Preserve stored Result/Card/Dash and Context Pack content without automatic translation.
- [ ] Update the bundled skill to route browse/search and pass the user's supported conversation language.

## 5. Metadata and regression coverage

- [ ] Update public submission artifacts for six tools and dedicated-search reviewer coverage.
- [ ] Assert every discovered tool advertises an object-root output schema.
- [ ] Cover successful schema validation for all tools.
- [ ] Cover dedicated-search parity, category/limit, empty result, Unicode/Cyrillic and remote-instance behavior.
- [ ] Cover RU/EN copy, unsupported language validation, prompt-like data boundaries and explicit-import wording.
- [ ] Wire the focused verifier into canonical repository checks.

## 6. Verification / delivery

- [ ] Run focused syntax and deterministic MCP contract checks.
- [ ] Run canonical `npm run verify:fast -- --files <changed-paths>` and record evidence.
- [ ] Run exactly one canonical `npm run verify:full` before merge readiness and record the result truthfully.
- [ ] Open a dedicated PR against `develop`, linked to Issue #104 and this OpenSpec change.
- [ ] Merge only when scope is complete, review state is clear and required executable checks are green; then verify the resulting `develop` state.
