# F41 Impact Manifest

## Affected capabilities

- Universal public MCP tool discovery and structured response contracts.
- Published Result browsing/search and Semantic Dash chat formatting.
- Bundled DashGPT agent skill and public app submission metadata.

## Entry symbols and likely production files

- `createDashGptServer`, `textResult`, `loadResultsForSite`, `rankResults` use in `src/index.js`.
- `formatDashForChat` in `demo/semantic-dashes.js`.
- `plugins/dashgpt/.codex-plugin/plugin.json` for the compatible minor version.
- `plugins/dashgpt/skills/use-dashgpt/SKILL.md` for list/search and language routing.
- `plugins/dashgpt/SUBMISSION.md` and `chatgpt-app-submission.json` for the six-tool review surface.

## Tests / verification likely to change

- `scripts/smoke.mjs` for MCP discovery and end-to-end calls.
- focused MCP contract verifier for schema, localization and search parity cases.
- `scripts/verify-chatgpt-app-submission.mjs` for six-tool submission consistency.
- `package.json` only as required to wire the focused verifier into canonical checks.

## Do-not-touch boundaries

- Card/Vault schema and local/private storage.
- Google Drive and GitHub synchronization.
- ChatGPT history/export/Share import runners.
- Semantic Gallery ordering/color and unified dashboard UI.
- Structured Chat Continuation transport.
- Public instance authentication model and explicit import semantics.

## Risks

- A schema narrower than actual structured output would turn previously successful calls into protocol errors.
- Duplicate list/search ranking code could drift.
- Translating stored content would silently change user meaning.
- A locale flag must not affect authorization or selected storage scope.
- Submission metadata can drift from actual discovered tools.

## Code-intelligence evidence

- Graphify: unavailable.
- Serena: unavailable.
- Fallback scanner query `registerTool` found the five registrations in `src/index.js` and the corresponding MCP smoke coverage.
- GitHub `develop` inspection confirmed `src/index.js` blob `e74aeb10612e62247ad750665c3f5b2fdc1a8407`, `demo/semantic-dashes.js` blob `55d4411ccb1f33cf6349b9c4145c6074c64b7ad5`, and `scripts/smoke.mjs` blob `b8fffa52a14217f43ceb2ef45e1edaa79626bd2b` as the starting contracts.

## Fast and full verification

- Fast: focused syntax plus MCP contract/search/localization and submission verifiers for changed files.
- Full: `npm run verify:full` exactly once on the final candidate, including the repository browser suite.

## Rollback

No persisted migration. Reverting the code and metadata commits restores the five-tool English-default surface; existing callers and stored data remain readable.
