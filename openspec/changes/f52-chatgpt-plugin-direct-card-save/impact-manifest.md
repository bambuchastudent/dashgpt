# Impact Manifest — F52

## Primary surfaces

- public DashGPT MCP tool contract;
- MCP OAuth discovery, authorization and token endpoints;
- ephemeral Cloudflare Durable Object state for pending OAuth requests and single-use authorization codes;
- canonical Card save/upsert path and private write authorization boundary;
- existing Google Drive-backed Vault persistence path;
- ChatGPT app/plugin submission metadata and reviewer tests;
- bundled `use-dashgpt` skill instructions;
- support/setup documentation for supported ChatGPT surfaces.

## Adjacent capabilities to preserve

- F36 link-first Share capture remains available and best-effort;
- F50 unreadable-Share recovery remains a separate web UX change;
- canonical Cards, Vault storage, Search, Semantic Gallery, Dashes and Structured Continuation keep their existing entity model;
- `prepare_result_import` remains available during migration unless this change explicitly and safely supersedes it;
- public read MCP tools keep their current anonymous access boundary;
- anonymous browser-local Vault use and optional GitHub sync remain unchanged.

## Security/privacy blast radius

A write tool can modify user-controlled DashGPT state, so authorization and tenant/storage binding are critical. This change must not convert the current no-auth public MCP surface into an arbitrary private write endpoint. The OAuth flow must validate client/redirect/resource/scope/expiry, use PKCE S256 and one-time authorization codes, and keep provider authorization out of Card/Vault content, tool output, URLs, logs and fixtures.

The Durable Object is allowed to hold only short-lived OAuth transaction state. It must not become a Card/Vault/session-history store. Canonical user memory remains in user-controlled storage.

## Infrastructure blast radius

- add one Durable Object binding/class and migration for ephemeral OAuth state;
- add one deployment secret for protecting short-lived self-contained DashGPT bearer grants;
- reuse the existing public `GOOGLE_CLIENT_ID` and existing Google Drive `drive.file` permission;
- add Worker-first routes for OAuth metadata/authorization/token endpoints;
- no hosted SQL/Card database, no new paid third-party identity provider, and no new storage provider.

A preview may deploy code without completing a real Google authorization if the environment-specific Google client or grant-protection secret is not configured. That state must be reported as configuration-not-ready rather than as working OAuth.

## External/release impact

Repository readiness does not equal Plugin Directory publication. Domain verification, publisher/portal actions, OAuth client/redirect registration, secret provisioning, attestations and submission are externally consequential and require explicit user authorization outside normal code implementation. Mobile custom MCP remains unsupported by ChatGPT at the time of this change; public plugin capability on native mobile must be verified before product claims are made.