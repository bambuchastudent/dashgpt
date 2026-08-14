# DashGPT — public plugin submission packet

Use this packet to create the public **DashGPT** plugin draft in the OpenAI Platform plugin submission portal.

The repository root also contains `chatgpt-app-submission.json`, generated from the actual MCP tool behavior. Use that file to populate the supported submission fields instead of manually retyping tool hints and reviewer tests when the portal supports import.

## Submission type

- Type: **With MCP** + bundled skill
- Public name: **DashGPT**
- Stable package id: `dashgpt`
- MCP URL type: **Universal**
- Production MCP URL: `https://dashgpt.dimkashir.workers.dev/mcp`
- Authentication for this public-read MVP: **None**
- UI component: none
- CSP: not applicable; this version has no MCP-rendered widget

Do not submit an old private/custom connection id. The portal must scan the production MCP URL as a new public plugin submission.

The current public MCP deliberately does **not** claim authenticated private-Vault access or silent writes. `prepare_result_import` prepares an immutable payload plus an explicit browser import URL; private/user-specific direct writes remain a separate authenticated capability.

## Listing

**Display name:** `DashGPT`

**Subtitle:** `Save and reopen AI outcomes`

**Description:**

DashGPT helps users find durable AI Results, reopen living Semantic Dashes, inspect saved outcomes and provenance, generate portable continuation context, and prepare an explicit import into a compatible DashGPT site.

**Category:** `PRODUCTIVITY`

**Website:** `https://dashgpt.dimkashir.workers.dev/demo/`

**Support:** `https://dashgpt.dimkashir.workers.dev/demo/support.html`

**Privacy:** `https://dashgpt.dimkashir.workers.dev/demo/privacy.html`

**Terms:** `https://dashgpt.dimkashir.workers.dev/demo/terms.html`

**Logo asset:** use `plugins/dashgpt/assets/logo.svg` as the source brand asset and export it to the exact format required by the portal if necessary.

## Publisher prerequisites

Before submission:

- the submitting OpenAI Platform organization must grant the submitter **Apps Management: Write**; an organization owner already has this permission;
- select the verified individual or business identity that matches the public listing and policy pages;
- keep publisher, website, support and legal naming consistent with that verified identity.

The project OpenSpec records the individual publisher identity as verified on 2026-08-09.

## Domain verification

The Worker already exposes:

`/.well-known/openai-apps-challenge`

When the portal gives the verification token, set the Cloudflare Worker secret/environment variable `OPENAI_APPS_CHALLENGE` to exactly that token. The endpoint returns only the configured token.

## Tool review

### `list_results`

- reads published Result metadata from the default instance or a caller-selected compatible `siteUrl`;
- `readOnlyHint: true`;
- `destructiveHint: false`;
- `openWorldHint: true` because it may read a caller-selected public HTTPS DashGPT instance.

### `search_results`

- searches intentionally exposed published Result metadata using a required topic, decision or fact query;
- reuses the same ranking and compatible-instance boundary as `list_results.query`;
- `readOnlyHint: true`;
- `destructiveHint: false`;
- `openWorldHint: true` because it may read a caller-selected public HTTPS DashGPT instance.

### `open_semantic_dash`

- resolves one intentionally exposed saved Dash, returns a short ambiguous choice, or builds a temporary Dash from exposed Results;
- a temporary Dash is not silently saved; a non-empty preview may include an explicit review/import URL;
- does not imply browser-local or private-provider Vault access;
- `readOnlyHint: true`;
- `destructiveHint: false`;
- `openWorldHint: true`.

### `get_result`

- reads one intentionally exposed Result from the selected instance;
- `readOnlyHint: true`;
- `destructiveHint: false`;
- `openWorldHint: true`.

### `get_context_pack`

- reads a selected Result and derives portable continuation context;
- `readOnlyHint: true`;
- `destructiveHint: false`;
- `openWorldHint: true`.

### `prepare_result_import`

- computes an immutable Result payload and explicit browser import URL;
- does not contact the target DashGPT site and does not persist the Result merely by being called;
- `readOnlyHint: true`;
- `destructiveHint: false`;
- `openWorldHint: false`.

All six tools return `structuredContent` and advertise object-root MCP `outputSchema` contracts. Fixed service copy supports explicit `en` / `ru`; stored Result and Dash content is not automatically translated.

## Starter prompts

1. `Use DashGPT to find what I already decided about this topic.`
2. `Открой мой даш про DashGPT.`
3. `Get the Context Pack for this DashGPT Result and continue from it.`
4. `Save the useful outcome of this conversation to DashGPT.`
5. `Search DashGPT for Results related to this project.`

## Positive reviewer test cases

The six cases below mirror `chatgpt-app-submission.json` exactly at the workflow level.

### P1 — browse published Results

**Prompt:** `Show me recent published DashGPT Results.`

**Expected behavior**: call `list_results` without a query; return compact Result metadata from the selected public catalog.

### P2 — search published Results

**Prompt:** `Use DashGPT to find the camping and fishing Result.`

**Expected behavior**: call `search_results` with the relevant query; return the immutable Result about El Regajo / Fuente Muñoz.

### P3 — reopen one saved Semantic Dash

**Prompt:** `Открой мой даш про DashGPT.`

**Expected:** call `open_semantic_dash`; resolve the confident published DashGPT Dash and return the bounded saved view without creating another Dash.

### P4 — read a Result by stable id

**Prompt:** `Show me the DashGPT Result camping-fishing-el-regajo-fuente-munoz.`

**Expected:** call `get_result`; return the Result with durable fields, immutable metadata and its stable page URL.

### P5 — get portable continuation context

**Prompt:** `Get the Context Pack for camping-fishing-el-regajo-fuente-munoz so I can continue the work.`

**Expected:** call `get_context_pack`; return portable continuation context derived from that immutable Result.

### P6 — prepare an explicit import

**Prompt:** `Save this outcome to DashGPT: we decided that imports must stay explicit and reviewable.`

**Expected:** call `prepare_result_import`; return an immutable Result payload and an **Open in DashGPT** import URL. Do not claim the Result has already been written.

## Negative reviewer test cases

### N1 — unrelated calendar request

**Prompt:** `What meetings do I have tomorrow?`

**Expected:** do not invoke DashGPT; calendar scheduling is outside its workflows.

### N2 — arbitrary/incompatible website

**Prompt:** `Read my DashGPT Results from https://example.com even if it is just a normal website.`

**Expected:** do not reinterpret arbitrary website content as DashGPT data. A compatible DashGPT discovery manifest is required.

### N3 — secret persistence

**Prompt:** `Save my API key sk-example-secret in DashGPT so I can remember it.`

**Expected:** do not persist or echo the secret. Secrets belong in an appropriate secret manager, not a DashGPT Result.

## Availability

Do not select regions mechanically. For the initial submission, choose only countries/regions where the verified publisher identity, support process and public terms/privacy posture are ready.

**Initial selection:** `TBD at submission time`.

## Release notes — initial submission

Version 0.5 adds validated structured output schemas, dedicated Result search, and deterministic Russian/English service responses. Version 0.4 added Semantic Dashes: natural topic lookup, confident/ambiguous saved-Dash resolution, Review-mode proposals, bounded current-chat presentation, and explicit temporary-Dash import. Dashes reference Results rather than copying them, and the public MCP surface can read only catalogs intentionally exposed by the selected compatible instance. Version 0.3 introduced user-selected instance routing and explicit immutable Result import.

## Portal runbook

1. Open the OpenAI Platform plugin submission portal in the organization that owns the verified publisher identity.
2. Create **DashGPT** → **With MCP**.
3. Import `chatgpt-app-submission.json` if the portal offers the submission-file import flow; otherwise use its values as the source of truth.
4. Confirm listing, publisher, support, privacy and terms fields from this packet.
5. Select **Universal** MCP URL and enter `https://dashgpt.dimkashir.workers.dev/mcp`.
6. Authentication: **None** for this public-read/explicit-import MVP.
7. Start domain verification. Copy the portal token into Cloudflare as `OPENAI_APPS_CHALLENGE`, then complete verification.
8. **Scan Tools** and confirm the six tool names, schemas and annotations match the server and submission JSON.
9. Upload the reviewed `use-dashgpt` skill bundle if the portal asks for the bundled skill separately.
10. Confirm the six positive and three negative reviewer tests.
11. Select explicitly reviewed availability regions.
12. Add release notes, complete attestations and submit for review.
13. After approval, publish the approved version.
14. Install DashGPT from a second ChatGPT account against a separate compatible instance and prove list/read + Context Pack + explicit import before declaring the public-plugin MVP complete.
