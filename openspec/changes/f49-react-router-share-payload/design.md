# Design — F49 React Router Share payload compatibility

## Context

`src/shared-chat.js` already has a layered public resolver:

1. Jina Reader over `backend-api/share/<id>` parsed as public share JSON;
2. Jina Reader over the Share page parsed as role-labelled text;
3. AllOrigins raw HTML parsed by `chatgpt-share-parser`;
4. Cloudflare Browser visible-DOM scrape;
5. direct ChatGPT Share HTML parsed by `chatgpt-share-parser`;
6. Cloudflare Browser rendered HTML parsed by `chatgpt-share-parser`.

That sequence survived several upstream changes, but a newer ChatGPT page representation can still defeat every path. Current 2026 Share HTML has been observed using React Router 7 streaming bootstrap data. The page contains calls shaped like:

`window.__reactRouterContext.streamController.enqueue("[...]")`

The string decodes to JSON containing a flat slot array. Composite slots refer to other slots by integer index. Object keys may be encoded as `_<slotIndex>` and must be resolved through the same slot table. The conversation can appear at varying route-loader paths, so a fixed property path is unnecessarily brittle.

## Decision

Add a small in-repository compatibility parser in `src/shared-chat.js` rather than replacing the existing parser dependency or resolver order.

### Turbo-stream extraction

For each `streamController.enqueue(...)` call found in HTML:

1. Capture the JavaScript string body only.
2. Decode the string escaping with `JSON.parse` by restoring surrounding quotes.
3. Parse the decoded string as JSON.
4. Ignore chunks that are not arrays or cannot be decoded.
5. Resolve slot `0` into a graph using a cache for cycle safety.
6. Treat in-range non-negative integer values as slot references, except primitive numeric values stored in slots; keep floats and out-of-range integers as primitives.
7. Resolve object keys named `_<n>` by resolving slot `n`; only string keys are accepted.
8. Collapse negative integer sentinel references to `null` because the resolver does not need their React Router sentinel semantics.
9. Deep-search the resolved object graph for the first object with `mapping` or `linear_conversation`.

### Conversation conversion

Do not create a second message model. Convert the extracted conversation through shared helpers compatible with the existing backend JSON parser:

- prefer `linear_conversation` when present because it is already ordered;
- otherwise follow `current_node` ancestry through `mapping`, falling back to the existing deepest/newest branch selection when necessary;
- include only visible user/assistant messages;
- exclude system/tool and visually hidden turns;
- reuse existing text-part extraction, duplicate collapse and fallback-title behavior;
- preserve the normalized Share id and existing response field shapes.

### Integration point

`parseReadableChat(html, sourceUrl)` should first keep the existing `chatgpt-share-parser` attempt for compatibility. If that parser throws or returns no readable conversation, try the new turbo-stream parser. If the turbo-stream parser also fails, rethrow so `readSharedChat()` continues to the next existing retrieval strategy.

The new parser is therefore a compatibility layer, not a new endpoint, provider or privileged retrieval mechanism.

## Security and privacy

- Parsing runs only after the existing strict ChatGPT host/path validation.
- No credentials, cookies or authenticated requests are added.
- The graph resolver is cycle-safe and does not execute page JavaScript.
- Only JSON string decoding/parsing is used; no `eval`, `Function`, DOM execution or arbitrary script interpretation.
- Unknown/malformed chunks are ignored and eventually fall through to the existing human unreadable state.
- No user-provided reproduction Share URL is committed as a fixture; tests use synthetic payloads.

## Compatibility

Must preserve F11/F12/F15/F16/F17 behavior:

- strict URL allow-listing;
- existing backend-reader preference and fallback order;
- visible DOM Browser fallback;
- same `/api/shared-chat` response contract;
- no provider/parser internals in user-facing UI;
- live smoke remains provider-agnostic.

F48 remains a separate client retry capability and is not required for this parser to work.

## Verification

Add deterministic coverage to `scripts/verify-shared-chat-parser.mjs` for:

- a representative graph-encoded turbo-stream payload with indexed keys;
- `linear_conversation` ordering;
- hidden/system/tool filtering;
- malformed/non-array enqueue chunks being ignored;
- fallback title behavior;
- no regression to existing backend JSON and canonicalization cases.

Run `npm run check` and `npm run test:browser`. Because current `develop` does not yet contain the unmerged `verify:full` script, use the canonical gates that actually exist on this branch. Verify Cloudflare preview deployment and exercise the fresh reproduction Share through the preview `/api/shared-chat` and Save-chat UI before marking merge-ready.
