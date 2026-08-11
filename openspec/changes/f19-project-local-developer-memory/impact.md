# Impact Manifest

## Touched by this prototype

- New OpenSpec change `f19-project-local-developer-memory`.
- New standalone developer demo route and its isolated CSS/JS.
- New static developer-memory fixture.
- New Playwright regression tests for that route.

## Explicitly not touched

- `demo/unified-dashboard*.js|css` and other files owned by active PR #33.
- Existing `demo/semantic-gallery.js` ordering/state contracts.
- Existing Semantic Dash storage/membership contracts.
- Vault, GitHub storage, Result hashing, search ranking or continuation payloads.
- Worker/MCP tools and public capture behavior.
- Real developer repositories or real `.dashgpt` directories.

## Privacy blast radius

None for real user data. The prototype uses synthetic fixture data only. Session entries are summaries/metadata and contain no full transcript or credential material.

## Follow-up capabilities deliberately deferred

- filesystem-backed `.dashgpt` reader/writer;
- Copilot, Cline, OpenCode or Codex capture adapters;
- MCP/CLI context and save operations;
- IDE WebView packaging;
- sync/commit policy enforcement;
- local-model distillation.
