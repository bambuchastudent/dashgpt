# Feature 4 — Plugin Directory submission

## Why

The deployed DashGPT MCP endpoint works, but the current personal ChatGPT UI does not expose a custom-app Create flow even with Developer mode enabled. The MVP goal is not developer-only wiring: another person must be able to discover/connect DashGPT and use it with their own DashGPT instance.

## Change

Prepare DashGPT as a submit-ready ChatGPT app/plugin for the Plugins Directory instead of depending on a private custom MCP connection on one developer account.

The public listing identity remains **DashGPT** (`dashgpt`). The app must point at a user-configurable/per-instance DashGPT backend rather than hard-coded developer data.

## Success

A separate user can install/connect DashGPT from the normal ChatGPT plugin surface, connect it to their own DashGPT instance, and prove both Result retrieval and Result handoff/import without using the developer's site as the source of truth.
