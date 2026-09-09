# Impact Manifest — F52

## Primary surfaces

- public DashGPT MCP tool contract;
- per-tool mixed authentication metadata for public reads and private writes;
- MCP OAuth discovery, authorization and token endpoints;
- ephemeral Cloudflare Durable Object state for pending OAuth requests and single-use authorization codes;
- canonical Card save/upsert path and private write authorization boundary;
- existing Google Drive-backed Vault persistence path;
- ChatGPT app/plugin submission metadata and reviewer tests;
- bundled `use-dashgpt` skill instructions;
- privacy/support/setup documentation for supported ChatGPT surfaces.

## Adjacent capabilities to preserve

- F36 link-first Share capture remains available and best-effort;
- F50 unreadable-Share recovery remains a separate web UX change;
- canonical Cards, Vault storage, Search, Semantic Gallery, Dashes and Structured Continuation keep their existing entity model;
- `prepare_result_import` remains available during migration unless this change explicitly and safely supersedes it;
- public read MCP tools keep their current anonymous access boundary through explicit `noauth` per-tool security metadata;
- anonymous browser-local Vault use and optional GitHub sync remain unchanged.

## Security/privacy blast radius

A write tool can modify user-controlled DashGPT state, so authorization and tenant/storage binding are critical. This change must not convert the current no-auth public MCP surface into an arbitrary private write endpoint. The OAuth flow must validate client/redirect/resource/scope/expiry, use PKCE S256 and one-time authorization codes, and keep provider authorization out of Card/Vault content, tool output, URLs, logs and fixtures.

The Durable Object is allowed to hold only short-lived OAuth transaction state. It must not become a Card/Vault/session-history store. Canonical user memory remains in user-controlled storage.

The public privacy policy is part of the release blast radius because the previously submitted plugin was rejected for incomplete disclosure. It must accurately cover direct Card-save inputs, purposes, recipients/processors, authorization-state retention, user-content retention, and user controls before resubmission.

## Infrastructure blast radius

- add one Durable Object binding/class and migration for ephemeral OAuth state;
- add one deployment secret for protecting short-lived self-contained DashGPT bearer grants;
- reuse the existing public `GOOGLE_CLIENT_ID` and existing Google Drive `drive.file` permission;
- add Worker-first routes for OAuth metadata/authorization/token endpoints;
- no hosted SQL/Card database, no new paid third-party identity provider, and no new storage provider.

The first deployment containing the new Durable Object lifecycle cannot use Cloudflare's ordinary version-upload/PR-preview path because that path cannot apply a new Durable Object class migration. The migration must be applied by an explicit `wrangler deploy` to a chosen staging or production Worker. A failed version preview must not be “fixed” by removing the Durable Object or weakening one-time authorization-code semantics.

The real deployment must have `GOOGLE_CLIENT_ID`, `PLUGIN_OAUTH_SECRET`, and the `OAUTH_STATE` binding/migration configured before direct save is claimed operational. Missing configuration must be reported as configuration-not-ready rather than as a successful OAuth flow.

## External/release impact

Repository readiness does not equal Plugin Directory publication. A real staging/production Durable Object migration, production secret provisioning, Google authorization, domain verification, publisher/portal actions, attestations, submission and publication are externally consequential actions and require explicit user authorization outside normal code implementation.

Native/mobile availability must not be inferred from repository readiness or a web developer-mode connection. Public plugin capability on native mobile must be explicitly verified before product claims are made.
