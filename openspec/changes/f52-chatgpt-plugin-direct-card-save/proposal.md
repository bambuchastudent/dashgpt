# F52 — ChatGPT plugin direct Card save

## Problem

DashGPT currently treats ChatGPT Share retrieval as the convenient capture path. Real production diagnostics show that a Share URL can be public and readable from a user's mobile browser while DashGPT server-side retrieval receives 403/429 before any parser sees conversation content. This makes Share scraping unsuitable as the critical path for dependable everyday capture.

The repository already contains a public ChatGPT app/plugin submission packet and MCP tool `prepare_result_import`, but that tool only prepares an explicit browser import URL and does not persist a canonical Card. The desired product flow is instead `current ChatGPT conversation -> distill -> save/update canonical Card`.

Repository inspection also confirms that the current MCP is anonymous/read-oriented while the account-scoped Google Drive Vault authorizes in the browser and keeps provider access in memory. A write-capable published plugin therefore needs a real MCP OAuth boundary before it can persist private user state.

## Goal

Add a plugin-backed direct Card-save capability that receives structured Card content from the current ChatGPT conversation and explicitly upserts it into the user's existing Google Drive-backed DashGPT Vault, without Share scraping, a DashGPT-hosted Card database, or ChatGPT account credentials.

## Scope

- add a dedicated write-capable MCP tool `upsert_card` for canonical Card save/update from current conversation context;
- add the OAuth metadata/challenge surface required by the MCP authorization contract for that write tool;
- use a narrow DashGPT authorization bridge whose consent UI obtains the existing Google Drive `drive.file` grant and whose bearer grants are short-lived;
- keep Cards/Vault content in the user's Google Drive; the OAuth bridge SHALL NOT become a hosted Card/Vault database;
- reuse the existing Google Drive folder/file layout plus canonical Card/Vault identity, source/provenance and continuation semantics;
- require explicit user save intent and represent the tool as a write action in MCP metadata and submission artifacts;
- preserve a ChatGPT Share URL as provenance when supplied by the caller, without requiring server-side retrieval of that URL;
- keep the current `prepare_result_import` flow as a portable fallback while direct-save distribution rolls out;
- add regression verification for OAuth discovery/challenge, token scope/audience/expiry checks, deterministic upsert semantics, provider persistence and submission consistency.

## Authorization/storage decision

The first direct-write provider is Google Drive because DashGPT already treats it as the ordinary account-scoped user-owned Vault. The plugin OAuth layer is authorization infrastructure only: it issues bounded grants that allow the MCP server to use the user's Drive authorization for the requested Card write. It does not store conversation content or canonical Cards outside the user's Vault.

Initial direct-write grants are intentionally short-lived; an expired or missing grant triggers the standard MCP OAuth linking/reauthorization flow. Longer-lived refresh-token custody or a hosted DashGPT account database is not introduced by this change.

## Out of scope

- bypassing ChatGPT anti-bot protections;
- collecting or replaying ChatGPT session state as DashGPT authorization;
- background/silent capture without a user request;
- a DashGPT-hosted Card/memory database;
- replacing browser-local anonymous use or existing optional GitHub sync;
- changing canonical Card/Vault schema, Dash/search semantics, or F50 Share-recovery UX;
- claiming mobile custom-MCP support where ChatGPT does not provide it;
- publishing or submitting externally from this PR without a separate explicit user-authorized release step.

## Success criteria

A supported ChatGPT plugin surface can invoke `upsert_card`; an unlinked caller gets the standard OAuth link challenge; an authorized caller creates or updates exactly one canonical Card in their Google Drive-backed DashGPT Vault using existing identity rules; the tool returns a truthful persisted state; and plugin/submission artifacts accurately describe the write capability and supported surfaces.