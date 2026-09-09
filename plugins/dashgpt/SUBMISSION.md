# DashGPT — public plugin submission packet

Use this packet to create or update the public **DashGPT** plugin in the OpenAI Platform submission portal.

The repository root contains `chatgpt-app-submission.json`, generated to match the current MCP behavior. Prefer that file when the portal supports import; use this packet for the human review fields and release checklist.

## Submission

- Type: **With MCP** + bundled skill
- Public name: **DashGPT**
- Stable package id: `dashgpt`
- MCP URL: `https://dashgpt.dimkashir.workers.dev/mcp`
- Website: `https://dashgpt.dimkashir.workers.dev/demo/`
- Support: `https://dashgpt.dimkashir.workers.dev/demo/support.html`
- Privacy: `https://dashgpt.dimkashir.workers.dev/demo/privacy.html`
- Terms: `https://dashgpt.dimkashir.workers.dev/demo/terms.html`
- Category: `PRODUCTIVITY`
- UI component: none
- CSP: not applicable because this version has no MCP-rendered widget

## Product behavior

DashGPT keeps useful AI conversation outcomes as user-owned canonical Cards. The preferred everyday capture flow is:

```text
current ChatGPT conversation
  -> explicit user request to save/update
  -> ChatGPT distills canonical Card fields
  -> upsert_card
  -> DashGPT OAuth linking when required
  -> Google Drive drive.file authorization
  -> create/update Card in the user's DashGPT Vault
```

DashGPT does not need to fetch the current ChatGPT conversation, scrape a Share page, or receive ChatGPT cookies/session tokens/OpenAI credentials to perform the direct save. A valid Share URL can be stored as provenance when the caller already has one.

`prepare_result_import` remains a portable explicit fallback. It only prepares an import URL and never claims that persistence already happened.

## Authentication

The MCP is mixed-auth:

- public read/context tools advertise `securitySchemes: [{ "type": "noauth" }]`;
- `upsert_card` advertises `securitySchemes: [{ "type": "oauth2", "scopes": ["cards:write"] }]`;
- each tool mirrors the scheme in `_meta.securitySchemes` for compatibility;
- an unauthenticated `upsert_card` returns `_meta["mcp/www_authenticate"]` pointing to DashGPT protected-resource metadata;
- the authorization server publishes OAuth metadata, uses authorization-code + PKCE S256, validates the MCP resource/scope, and uses one-time short-lived authorization-code state;
- Card-write bearer grants are short-lived and authorize only `cards:write` for the DashGPT MCP resource;
- Google Drive is the first private write provider and keeps canonical Card/Vault data in user-controlled storage.

The production deployment must provide `GOOGLE_CLIENT_ID`, `PLUGIN_OAUTH_SECRET`, and the configured `OAUTH_STATE` Durable Object binding before direct write can be claimed as operational.

## Privacy review remediation

The first DashGPT v1.0.0 submission was rejected because the privacy policy did not clearly disclose all data uses. The current privacy page now explicitly covers:

- data handled by direct Card save;
- purposes for each supported workflow;
- recipients/processors including OpenAI/ChatGPT, Google Drive, GitHub, remote DashGPT instances, and hosting infrastructure when those workflows are used;
- authorization-state and user-content retention behavior;
- Google Drive `drive.file` scope and provider boundaries;
- user controls for explicit saving, editing/deleting Cards, deleting a Vault, clearing local data, and disconnecting providers;
- the distinction between private Cards and intentionally published content;
- credential/data-minimization rules.

Do not resubmit until the deployed privacy URL serves this current policy.

## Tool review

### `list_results`
Reads intentionally exposed Card-compatible metadata from the default or caller-selected compatible DashGPT instance. Read-only, non-destructive, open-world because a selected public HTTPS instance may be contacted.

### `search_results`
Searches intentionally exposed Card-compatible metadata for a required topic/decision/fact query. Read-only, non-destructive, open-world for the same selected-public-instance reason.

### `open_semantic_dash`
Resolves one intentionally exposed saved Dash, returns a bounded ambiguity, or builds a temporary unsaved Dash from exposed Cards. Read-only, non-destructive, open-world.

### `get_result`
Reads one intentionally exposed Card-compatible Result. Read-only, non-destructive, open-world.

### `get_context_pack`
Reads a selected outcome and derives portable continuation context. Read-only, non-destructive, open-world.

### `prepare_result_import`
Computes a portable import payload and explicit browser import URL. It does not contact the target site or persist merely by being called. Read-only, non-destructive, closed-world.

### `upsert_card`
Creates or updates exactly one canonical private Card in the user's authorized Google Drive-backed DashGPT Vault. It requires explicit user save intent plus OAuth `cards:write`. It is a write action, non-destructive, and closed-world because it writes only to bounded private user-controlled storage rather than public internet state.

All tools that return structured content advertise object-root `outputSchema` contracts. Fixed service copy supports `en` and `ru`; stored Card/Dash content is not automatically translated.

## Starter prompts

1. `DashGPT, save the useful outcome of this conversation as a card.`
2. `Use DashGPT to find what I already decided about this topic.`
3. `Открой мой даш про DashGPT.`
4. `Get the Context Pack for this DashGPT card and continue from it.`
5. `Prepare this outcome for DashGPT import without saving it yet.`

## Reviewer tests

The authoritative set is in `chatgpt-app-submission.json`: exactly five positive cases and three negative cases.

Positive coverage includes direct `upsert_card` save, search, Semantic Dash reopening, continuation context, and explicit import fallback. Negative coverage proves that DashGPT does not trigger for an unrelated calendar request, does not silently persist on a plain summarization request, and does not store credential-like secrets.

## Domain verification

The Worker exposes `/.well-known/openai-apps-challenge`. When the portal provides a verification token, set the Cloudflare deployment secret/environment variable `OPENAI_APPS_CHALLENGE` to exactly that token, verify the endpoint, then complete domain verification in the portal.

## Production readiness gate

Before submission or publication:

1. OpenSpec F52 is strictly valid and its tasks reflect the real implementation state.
2. `upsert_card`, OAuth metadata/challenge, one-time code replay protection, Google Drive persistence, secret rejection, and mixed-auth tool metadata have regression coverage.
3. `npm run check` is green on the final candidate.
4. `npm run verify:full` is green once on the final candidate.
5. Cloudflare production deployment is green with the Durable Object binding/migration.
6. Production has `GOOGLE_CLIENT_ID` and `PLUGIN_OAUTH_SECRET` configured without exposing either secret in source or logs.
7. The deployed privacy/support/terms URLs are reachable and current.
8. A real ChatGPT developer/plugin connection scans seven tools and shows `upsert_card` as OAuth-protected.
9. A real end-to-end test performs `Continue with Google` and creates/updates a Card in the same Google Drive Vault used by DashGPT.
10. Only supported ChatGPT surfaces are claimed; native-mobile direct save is not claimed until explicitly verified with the published plugin.

## Portal runbook

1. Open the OpenAI Platform plugin submission portal in the organization that owns the verified publisher identity.
2. Create/update **DashGPT** → **With MCP**.
3. Import `chatgpt-app-submission.json` if offered.
4. Confirm listing, publisher, support, privacy, and terms fields from this packet.
5. Set MCP URL to `https://dashgpt.dimkashir.workers.dev/mcp`.
6. Configure the connection as mixed/per-tool OAuth according to the scanned `securitySchemes`; do not label `upsert_card` as anonymous.
7. Complete domain verification using `OPENAI_APPS_CHALLENGE` if the portal issues a new token.
8. Scan Tools and confirm all seven tool names, schemas, annotations, and security schemes match production.
9. Upload/review the bundled `use-dashgpt` skill if requested.
10. Confirm the five positive and three negative reviewer tests.
11. Complete required publisher attestations and availability selections.
12. Submit for review.
13. After approval, publish the approved version and run a second-account installation test before declaring the public-plugin flow complete.

## Release notes

This release adds direct canonical Card save from the current ChatGPT conversation. With explicit user intent, `upsert_card` uses MCP OAuth and Google Drive `drive.file` authorization to create or update a private Card in the user's existing DashGPT Vault without Share scraping. The previous explicit import-link flow remains as a fallback. The privacy policy and reviewer packet have been updated to disclose the direct-write data flow, recipients, retention, and user controls.
