## Why

DashGPT already turns AI conversations into reusable cards, but developer work often spans Copilot, OpenCode, Cline, local models, commits and IDE sessions. The useful history is currently fragmented across chat clients and disappears from the repository context that future agents actually see.

A developer should be able to open a repository and understand what was investigated, decided, changed and achieved, regardless of which AI client produced the conversation. The same memory should also be visual: a project map, outcome timeline and evidence trail rather than a directory of raw transcripts.

## What Changes

- Define a provider-neutral, project-local `.dashgpt` memory contract whose canonical knowledge is composed of cards and relationships, not client-specific chat history.
- Keep raw or summarized session history as optional evidence and treat it separately from canonical cards.
- Make the portable memory AI-readable as ordinary Markdown/JSON so agents can use it without a DashGPT-specific plugin.
- Add a standalone developer prototype route that renders one project memory fixture as Project Map, Timeline, Results and Sessions views.
- Let a user inspect one result and see its problem/decision/outcome, related code/evidence and contributing AI sessions.
- Keep semantic color on cards and use relationships to show how investigations and decisions lead to outcomes.
- Add desktop and mobile browser regression coverage for the prototype.

## Capabilities

### New Capabilities

- `project-local-developer-memory`: portable `.dashgpt` project memory plus a provider-neutral visual developer view.

### Modified Capabilities

None. This prototype consumes the existing card-first model and semantic presentation principles without changing current dashboard, search, Semantic Dash, continuation, storage or MCP behavior.

## Scope Boundaries

This change does not implement a Copilot/Cline/OpenCode extension, automatic chat interception, local-model inference, MCP write tools, filesystem watching, Git hooks, repository commits of private sessions, or synchronization of `.dashgpt` folders. It does not merge into or modify the concurrent Unified Card Dashboard capability.

The fixture demonstrates the intended portable contract and visual behavior only; production capture adapters are future capabilities.

## Impact and Intersections

- **Cards:** cards remain canonical. Developer outcomes are represented as cards with optional developer metadata and evidence.
- **Sessions:** sessions are evidence. They may point to cards but do not replace them as memory.
- **Semantic Gallery:** semantic color and thematic grouping principles are reused visually; existing Gallery ordering/state are unchanged.
- **Semantic Dashes:** no Dash membership or saved-view behavior changes.
- **Search:** no search ranking/index changes.
- **Structured Continuation:** future agents can consume the same portable project context, but current continuation payloads are unchanged.
- **Storage/privacy:** the prototype documents local/shared boundaries; it does not write private sessions to repository storage.
- **Unified Card Dashboard / PR #33:** no files owned by that capability are changed; the developer prototype is a separate route.
