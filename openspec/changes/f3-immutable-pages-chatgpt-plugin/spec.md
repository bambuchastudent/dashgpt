# Feature 3 specification — Immutable pages + ChatGPT plugin MVP

## Standalone Result route

A published Result with id `example-id` MUST be addressable at:

`/demo/result/example-id/`

The route MUST render from the same presentation implementation used by the dashboard, rather than storing a copied HTML snapshot for that Result.

Updating shared presentation code MUST be able to change the appearance/navigation of old Result pages without editing their published knowledge content.

## Published immutable content

Published Results MAY include:

- `immutable: true`
- `contentVersion: <positive integer>`

For an immutable Result, these fields are durable knowledge and MUST NOT change in place after the Result reaches the base branch:

- title
- summary
- category
- tags
- decisions
- next
- source

An immutable Result MUST NOT be removed or changed back to mutable in place.

A materially corrected version should be represented by a new Result/revision. The richer supersedes/revision model may be added later.

The UI MUST visibly distinguish immutable published content from a browser-local draft.

## Shared renderer

The dashboard and Result pages MUST share the same HTML/JavaScript/CSS renderer.

The deployed host MUST support client-side Result routes falling back to the common application shell.

Published Result data remains separate from presentation code.

## Second shared-chat Result

The shared conversation with source id `6a787ebb-dd38-83eb-940a-bd6c77efad95` MUST produce a useful Result about camping/fishing overnight planning around El Regajo / Fuente Muñoz.

The Result MUST preserve the shared-chat URL as provenance but MUST NOT reproduce personal identification/document details contained in the source conversation.

## MCP endpoint

Each DashGPT deployment MUST expose a read-only MCP endpoint at `/mcp` suitable for connecting the deployment to an MCP-capable ChatGPT client.

Initial tools:

### `list_results`

- optional text query
- optional category
- bounded result limit
- returns ids, titles, summaries, categories, tags, immutability metadata, and page URLs

### `get_result`

- takes a stable Result id
- returns the durable published Result and page URL

### `get_context_pack`

- takes a stable Result id
- returns a portable Context Pack with source, page URL, and immutability metadata

All initial tools are read-only and must be annotated accordingly.

## DashGPT plugin package

The repository MUST contain a plugin manifest at:

`plugins/dashgpt/.codex-plugin/plugin.json`

The manifest MUST use stable plugin id `dashgpt` and display name `DashGPT`.

The package MAY contain reusable skills before the MCP registration mapping is available.

It MUST NOT contain a fabricated ChatGPT registered MCP connection id. Once ChatGPT developer-mode registration returns a real `plugin_asdk_app...` id, the plugin packaging can add the corresponding `.app.json` mapping.

## MVP acceptance

Feature 3 is code-complete when:

- dashboard and stable Result page render from one shared renderer;
- immutable Result guard passes;
- the second shared-chat Result exists as an immutable page;
- `/mcp` exposes the three read tools;
- plugin package identity is `dashgpt`.

DashGPT itself is MVP-complete only after a human acceptance test demonstrates ChatGPT connected to a second person's/separate DashGPT instance and retrieves that instance's Results rather than the developer site's hard-coded content.
