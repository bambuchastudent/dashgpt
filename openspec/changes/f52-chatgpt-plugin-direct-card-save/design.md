# Design — F52 ChatGPT plugin direct Card save

## Context

The existing public MCP surface is primarily read-only and includes `prepare_result_import`, which builds a payload plus explicit browser import URL. A production Share failure trace demonstrated that anonymous server-side retrieval can be blocked upstream even when the same Share opens in a normal mobile browser. The reliable boundary is therefore the current AI client context, not a secondary fetch of `chatgpt.com`.

## Proposed flow

1. User explicitly asks ChatGPT to save the useful outcome to DashGPT.
2. ChatGPT/plugin distills the current conversation into the existing canonical Card-shaped fields: title/goal, concise summary, facts/context, decisions, constraints, current state, unresolved questions, next actions, references/provenance when available.
3. ChatGPT calls a write-capable DashGPT MCP tool (`upsert_card` is the target name unless repository conventions require a more compatible name).
4. DashGPT validates and normalizes the payload, rejects secrets/invalid source material where existing policies require it, and routes it to the same canonical Card/Vault persistence semantics used by the web save flow.
5. Existing identity/provenance keys are used to update rather than duplicate when a stable source URL/card id is supplied and matches existing rules.
6. Tool response states whether a Card was created, updated, or not persisted, plus stable card identity/location information that is safe to return.

## Storage boundary

The tool must not invent a parallel cloud memory store. It must use an existing DashGPT persistence boundary or an explicitly user-selected compatible DashGPT instance. If authenticated private-Vault write support is not yet available in the current server architecture, implementation must stop at the narrowest truthful explicit persistence boundary and update this OpenSpec before widening scope.

## Authentication

Direct private writes are externally consequential. The implementation must not reuse the current public no-auth read surface for arbitrary private writes. Before production code is finalized, inspect existing account/Vault and MCP auth conventions and choose the smallest approved mechanism that binds a write to the user's own DashGPT storage. No ChatGPT session cookies or OpenAI credentials may be accepted as DashGPT auth.

## Tool metadata

The direct-save tool is not read-only. MCP annotations/submission metadata must declare the write semantics accurately. It is non-destructive in normal operation but modifies external/user state. Tool descriptions must require explicit user intent and must not imply background capture.

## Mobile/product surfaces

Custom MCP developer-mode apps are currently web-only in ChatGPT. Installing/configuring one in a phone browser does not make custom MCP invocation available in the native mobile app. A published plugin can be discoverable on mobile, but availability of its app-backed capability is still subject to supported-surface restrictions. Therefore this PR must not promise native-mobile direct save until verified on the published plugin surface.

The implementation should nevertheless make the plugin/submission package ready for the supported distribution path, because publication through the Plugin Directory is the route most likely to remove manual MCP setup for ordinary users.

## Share fallback

Share-link capture remains best-effort and separate. A Share URL supplied by the user may be attached as provenance without server-side re-fetch. F50 remains responsible for the current web recovery UX; F52 must not absorb unrelated Share resolver work.

## Verification

- strict OpenSpec validation before production code;
- MCP contract tests for input/output schema and annotations;
- persistence/upsert regression tests against existing Card/Vault semantics;
- no-secret/no-cookie boundary tests;
- submission JSON + bundled skill consistency checks;
- targeted `npm run check` and relevant tests during implementation;
- final `npm run verify:full` once before ready-for-review;
- production preview of any changed public setup UX; native mobile capability must only be claimed if explicitly verified.