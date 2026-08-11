# Impact Manifest

## Touched by this prototype

- OpenSpec change `f19-project-local-developer-memory`.
- Standalone developer demo route and its isolated CSS/JS.
- Static developer-memory fixture.
- Playwright regression tests for that route.
- Project-state presentation metadata on synthetic fixture cards (`workstream`, `stage`, `stageLabel`, `priority`, `progress`) and project-level `productSpine` data.

## Revised visualization scope

The initial semantic Project Map did not make current DashGPT project state clear enough. The default developer view is therefore revised to Project State with:

- product spine;
- active work / Now;
- shipped-active-next summary;
- human workstreams;
- concise outcome and verified progress/evidence on cards before detail drill-down.

This is a presentation/model-fixture refinement inside the existing F19 capability, not a new production task-management entity.

## Explicitly not touched

- `demo/unified-dashboard*.js|css` and other files owned by active PR #33.
- Existing `demo/semantic-gallery.js` ordering/state contracts.
- Existing Semantic Dash storage/membership contracts.
- Vault, GitHub storage, Result hashing, search ranking or continuation payloads.
- Worker/MCP tools and public capture behavior.
- Real developer repositories or real `.dashgpt` directories.

## Privacy blast radius

None for real user data. The prototype uses synthetic fixture data only. Session entries are summaries/metadata and contain no full transcript or credential material.

## State accuracy

Open PR/prototype work must be shown as active/prototype rather than shipped. Planned capture/IDE adapters must be shown as next/planned. Only repository-verified merged/develop capabilities may be presented as shipped.

## Follow-up capabilities deliberately deferred

- filesystem-backed `.dashgpt` reader/writer;
- Copilot, Cline, OpenCode or Codex capture adapters;
- MCP/CLI context and save operations;
- IDE WebView packaging;
- sync/commit policy enforcement;
- local-model distillation.
