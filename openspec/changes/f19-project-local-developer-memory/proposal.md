## Why

DashGPT already turns AI conversations into reusable cards, but developer work often spans Copilot, OpenCode, Cline, local models, commits and IDE sessions. The useful history is fragmented across chat clients and disappears from the repository context that future agents actually see.

The first prototype proved that canonical cards and session evidence can be visualized, but its semantic card map did not answer the most important developer question quickly enough: **what is happening in this project right now?** A developer opening DashGPT should immediately see current product direction, active work, shipped capabilities, next work and how those pieces compose into the product before drilling into individual cards.

## What Changes

- Define a provider-neutral, project-local `.dashgpt` memory contract whose canonical knowledge is composed of cards and relationships, not client-specific chat history.
- Keep raw or summarized session history as optional evidence and treat it separately from canonical cards.
- Make the portable memory AI-readable as ordinary Markdown/JSON so agents can use it without a DashGPT-specific plugin.
- Make **Project State** the primary developer visualization instead of a generic semantic card map.
- Show a compact product spine explaining how current DashGPT capabilities compose: capture → distill/cards → semantic organization → continuation/developer memory.
- Show a prominent **Now** surface for active work with stage/evidence such as OpenSpec, PR, tests and merge state.
- Organize canonical cards into human project workstreams such as Memory, Capture, Experience, Reliability and Developer Tools, while preserving semantic color as a secondary visual cue.
- Keep Timeline, Results and Sessions as secondary views derived from the same canonical cards.
- Let a user inspect one result and see its problem/decision/outcome, related code/evidence and contributing AI sessions.
- Add desktop and mobile browser regression coverage for project-state comprehension and the existing detail views.

## Capabilities

### New Capabilities

- `project-local-developer-memory`: portable `.dashgpt` project memory plus a provider-neutral visual developer view centered on current project state.

### Modified Capabilities

None. This prototype consumes the existing card-first model and semantic presentation principles without changing current dashboard, search, Semantic Dash, continuation, storage or MCP behavior.

## Scope Boundaries

This change does not implement a Copilot/Cline/OpenCode extension, automatic chat interception, local-model inference, MCP write tools, filesystem watching, Git hooks, repository commits of private sessions, or synchronization of `.dashgpt` folders. It does not merge into or modify the concurrent Unified Card Dashboard capability.

The fixture demonstrates the intended portable contract and visual behavior only; production capture adapters are future capabilities. Project-state labels in the fixture must represent verified repository state or be explicitly marked as planned/prototype state.

## Impact and Intersections

- **Cards:** cards remain canonical. Developer outcomes and planned work are represented as cards with optional developer metadata and evidence.
- **Project state:** stage/workstream metadata is presentation/retrieval metadata on cards, not a parallel project-task entity.
- **Sessions:** sessions are evidence. They may point to cards but do not replace them as memory.
- **Semantic Gallery:** semantic color remains useful as a secondary cue; existing Gallery ordering/state are unchanged.
- **Semantic Dashes:** no Dash membership or saved-view behavior changes.
- **Search:** no search ranking/index changes.
- **Structured Continuation:** future agents can consume the same portable project context, but current continuation payloads are unchanged.
- **Storage/privacy:** the prototype documents local/shared boundaries; it does not write private sessions to repository storage.
- **Unified Card Dashboard / PR #33:** no files owned by that capability are changed; the developer prototype is a separate route.
