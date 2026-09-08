# MCP contract delta — direct canonical Card save

## Requirement: explicit direct Card save tool

DashGPT SHALL expose a write-capable MCP tool that accepts a structured canonical Card payload distilled from the current AI conversation and persists it only after explicit user intent to save.

### Scenario: create a Card from current conversation

- GIVEN the user explicitly asks ChatGPT to save the useful outcome to DashGPT
- AND the caller supplies a valid structured Card payload
- WHEN the direct-save tool is invoked with valid DashGPT write authorization
- THEN DashGPT persists one canonical Card using the existing Card/Vault persistence boundary
- AND returns a truthful created/updated/not-persisted result
- AND does not claim that a browser import still needs to be completed when persistence succeeded.

### Scenario: update instead of duplicate

- GIVEN a valid stable card/source identity that matches an existing Card under current DashGPT identity rules
- WHEN the direct-save tool is invoked again
- THEN DashGPT updates the canonical Card rather than creating a parallel duplicate
- AND preserves source/provenance semantics.

## Requirement: accurate write metadata

The direct-save tool SHALL NOT advertise `readOnlyHint: true`. Its annotations and submission metadata SHALL accurately describe that it modifies user-controlled DashGPT state while remaining non-destructive under normal use.

## Requirement: no ChatGPT credential ingestion

The direct-save flow SHALL NOT require or accept ChatGPT session cookies, ChatGPT bearer/session tokens, or OpenAI credentials as DashGPT storage authorization.

## Requirement: Share is provenance, not retrieval dependency

When a valid ChatGPT Share URL is available from the caller context, DashGPT MAY preserve it as Card provenance. Direct Card persistence SHALL NOT require DashGPT to re-fetch that Share URL from `chatgpt.com`.

## Requirement: supported-surface claims

Plugin/submission/user-facing setup materials SHALL distinguish public Plugin Directory distribution from custom developer-mode MCP. They SHALL NOT claim that a custom MCP connection configured on web becomes invokable in the native ChatGPT mobile app unless OpenAI explicitly supports and the project verifies that behavior.