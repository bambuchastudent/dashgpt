# F52 — ChatGPT plugin direct Card save

## Problem

DashGPT currently treats ChatGPT Share retrieval as the convenient capture path. Real production diagnostics show that a Share URL can be public and readable from a user's mobile browser while DashGPT server-side retrieval receives 403/429 before any parser sees conversation content. This makes Share scraping unsuitable as the critical path for dependable everyday capture.

The repository already contains a public ChatGPT app/plugin submission packet and MCP tool `prepare_result_import`, but that tool only prepares an explicit browser import URL and does not persist a canonical Card. The desired product flow is instead `current ChatGPT conversation -> distill -> save/update canonical Card`.

## Goal

Add a plugin-backed direct Card-save capability that can receive structured card content from the current ChatGPT conversation and perform an explicit canonical Card upsert through DashGPT, without reading ChatGPT cookies, scraping Share pages, or creating a parallel Result entity.

## Scope

- add a dedicated write-capable MCP tool for canonical Card save/upsert from current conversation context;
- keep Card as the primary entity and preserve existing Card/Vault identity, source/provenance and continuation semantics;
- require an explicit user save request and represent the tool as a write action in MCP metadata;
- preserve Share URL as provenance when the caller has one, but do not require server-side retrieval of that URL;
- update plugin submission artifacts, reviewer cases and bundled skill instructions for the new direct-save workflow;
- add regression verification for schema, safety boundaries, deterministic upsert semantics and submission consistency;
- preserve the existing `prepare_result_import` fallback during migration unless superseded by approved implementation details.

## Out of scope

- bypassing ChatGPT anti-bot protections;
- collecting ChatGPT session cookies/tokens;
- background/silent capture without a user request;
- changing Vault provider architecture, sync providers, Card schema or Dash/search semantics beyond what is required to call the existing canonical Card persistence path;
- claiming mobile custom-MCP support where ChatGPT does not provide it;
- publishing or submitting externally from this PR without a separate explicit user-authorized release step.

## Success criteria

A supported ChatGPT surface can invoke DashGPT with a structured Card payload, DashGPT explicitly saves or updates the canonical Card using existing identity rules, and the tool returns a clear persisted/not-persisted result. The plugin/submission packet accurately describes the write capability and does not claim unsupported mobile custom-MCP behavior.