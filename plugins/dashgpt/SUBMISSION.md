# DashGPT — public plugin submission packet

Use this file when creating the first public **DashGPT** plugin draft in the OpenAI Platform plugin submission portal.

## Submission type

- Type: **With MCP** + bundled skill
- Public name: **DashGPT**
- Stable package id: `dashgpt`
- MCP URL type: **Universal**
- Production MCP URL: `https://dashgpt.dimkashir.workers.dev/mcp`
- Authentication for this MVP: **None**
- UI component: none
- CSP: not applicable to an embedded plugin UI; DashGPT has no MCP-rendered UI component in this version

Do not submit the old private/custom connection id. The portal must scan the production MCP URL as a new public plugin submission.

## Listing

**Short description**

Keep and reuse durable AI Results.

**Long description**

DashGPT turns useful AI outcomes into durable Results that can be searched, reopened and continued later. Connect the plugin to a compatible DashGPT site to find published Results, inspect provenance, generate a portable Context Pack, and prepare a distilled conversation outcome for explicit import back into the DashGPT site you choose. DashGPT keeps the Result content separate from its presentation so old knowledge can remain immutable while the dashboard UI evolves.

**Category**

Productivity

**Website**

`https://dashgpt.dimkashir.workers.dev/demo/`

**Support**

`https://dashgpt.dimkashir.workers.dev/demo/support.html`

**Privacy**

`https://dashgpt.dimkashir.workers.dev/demo/privacy.html`

**Terms**

`https://dashgpt.dimkashir.workers.dev/demo/terms.html`

**Logo asset**

Use `plugins/dashgpt/assets/logo.svg` as the source brand asset. Convert/export to the exact upload format required by the portal if necessary.

## Publisher prerequisites

Before submission:

- the submitting OpenAI Platform organization must grant the submitter **Apps Management: Write** (organization owners already have the required permission);
- select a verified individual or business identity that matches the public listing and policy pages;
- keep publisher/site/support/legal naming consistent with that verified identity.

## Domain verification

The Worker already exposes:

`/.well-known/openai-apps-challenge`

Set the Cloudflare Worker secret/environment variable `OPENAI_APPS_CHALLENGE` to exactly the token shown by the OpenAI Platform submission portal. The endpoint must return only that token.

## Tool review

### `list_results`

- reads published Result metadata from the default instance or a caller-selected compatible `siteUrl`;
- `readOnlyHint: true`;
- `destructiveHint: false`;
- `openWorldHint: true` because it may read a user-selected public HTTPS DashGPT site.

### `get_result`

- reads one published Result from the selected instance;
- `readOnlyHint: true`;
- `destructiveHint: false`;
- `openWorldHint: true`.

### `get_context_pack`

- reads/generates portable continuation context from the selected instance;
- `readOnlyHint: true`;
- `destructiveHint: false`;
- `openWorldHint: true`.

### `prepare_result_import`

- computes an immutable Result payload and an explicit browser import URL;
- does **not** write to an external system merely by being called;
- `readOnlyHint: true`;
- `destructiveHint: false`;
- `openWorldHint: false`.

## Starter prompts

1. `Use DashGPT to find what I already decided about this topic on my DashGPT site.`
2. `Use DashGPT to get the Context Pack for this Result and continue from it.`
3. `Save the useful outcome of this conversation to my DashGPT site.`
4. `Search my DashGPT site for Results related to this project and summarize the relevant decisions.`

## Positive reviewer test cases

### P1 — list default demo Results

**Prompt**: `List the Results available in DashGPT.`

**Expected behavior**: call `list_results` without `siteUrl`; return compact Result metadata from the production demo catalog.

**Expected shape**: list containing Result id/title/summary/category/tags and stable `/demo/result/<id>/` URLs.

**Fixture**: production DashGPT demo instance; no credentials.

### P2 — search a known Result

**Prompt**: `Search DashGPT for the camping and fishing Result.`

**Expected behavior**: call `list_results` with a relevant query and return the immutable Result about El Regajo / Fuente Muñoz.

**Expected shape**: matching Result metadata including `immutable: true` and a SHA-256 content hash.

**Fixture**: production catalog; no credentials.

### P3 — get portable context

**Prompt**: `Get the Context Pack for camping-fishing-el-regajo-fuente-munoz.`

**Expected behavior**: call `get_context_pack` for that Result.

**Expected shape**: portable text containing title, decisions, source/next step when present, immutable flag, content version/hash and Result page URL.

**Fixture**: production catalog; no credentials.

### P4 — read another DashGPT instance

**Prompt**: `My DashGPT is https://<review-fixture-host>/ . List its Results.`

**Expected behavior**: pass that URL as `siteUrl`; verify `/.well-known/dashgpt.json`; read `/api/dashgpt/results`; do not silently return the developer demo catalog.

**Expected shape**: Results and page URLs belonging to the fixture host.

**Fixture**: a second public DashGPT deployment prepared before submission; no credentials for the MVP fixture.

### P5 — prepare an explicit import to another instance

**Prompt**: `Save this outcome to my DashGPT at https://<review-fixture-host>/: we decided to keep the import explicit and test it with a second user.`

**Expected behavior**: distill the useful outcome and call `prepare_result_import` with `siteUrl`; return an **Open in DashGPT** import URL. Do not claim that the Result was already written.

**Expected shape**: immutable Result payload with SHA-256 content hash plus an import URL whose origin is the fixture DashGPT site.

**Fixture**: the same second public DashGPT deployment.

## Negative reviewer test cases

### N1 — insecure target

**Prompt/scenario**: `Use my DashGPT at http://example.com and list my Results.`

**Expected behavior**: reject/clarify that DashGPT instance URLs must use HTTPS; do not fetch the target.

**Why**: public instance routing requires HTTPS.

### N2 — incompatible target

**Prompt/scenario**: provide an HTTPS site that does not expose a compatible `/.well-known/dashgpt.json` manifest and ask to read Results.

**Expected behavior**: return a clear incompatible-instance error; do not reinterpret arbitrary website content as DashGPT data.

**Why**: prevents accidental or misleading cross-site reads.

### N3 — sensitive secret persistence

**Prompt/scenario**: `Save my API key sk-example-secret into DashGPT so I can remember it.`

**Expected behavior**: do not persist or echo the secret into a Result; explain that secrets should not be stored in DashGPT and, if useful, save only a non-sensitive note such as where the credential is managed.

**Why**: plugin instructions prohibit unnecessary persistence of secrets and sensitive identifiers.

## Availability

Do not select regions mechanically. For the initial submission, choose only countries/regions where the verified publisher identity, support process and public terms/privacy posture are ready. Record the final selection in this file before submitting.

**Initial selection:** `TBD at submission time`.

## Release notes — initial submission

Initial public DashGPT submission. Provides a universal MCP gateway plus a DashGPT skill for finding durable published Results, reading a Result, generating portable Context Packs, and preparing an explicit immutable Result import. Version 0.3 adds user-selected DashGPT instance routing so the public plugin can operate against another person's compatible DashGPT site rather than hard-coded developer data.

## Portal runbook

1. Open the OpenAI Platform plugin submission portal in the organization that owns the verified publisher identity.
2. Create plugin → **With MCP**.
3. Fill the listing and publisher fields from this packet.
4. Select **Universal** MCP URL and enter the production `/mcp` endpoint.
5. Authentication: none for this MVP.
6. Complete domain verification by setting `OPENAI_APPS_CHALLENGE` to the portal token.
7. Scan Tools and verify names, schemas and annotations against this file.
8. Upload the final `use-dashgpt` skill bundle (or import an equivalent reviewed skill snapshot if supported by the MCP submission flow).
9. Add starter prompts.
10. Add all five positive and three negative test cases.
11. Select the explicitly reviewed availability regions.
12. Add the initial release notes, complete attestations and submit for review.
13. After approval, manually publish the approved version.
14. Run the second-user MVP acceptance test before declaring DashGPT MVP complete.
