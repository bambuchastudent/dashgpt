# Public Own-Chat Onboarding

## Problem

The public `/demo/` entry currently loads the publisher's published Result catalog into every visitor's dashboard and persists those Results into the visitor's local Vault. A clean phone therefore looks like the publisher's personal board instead of a new-user product.

## Goal

A first-time visitor must see a welcome screen that asks them to share one of their own public AI chats. Their first saved card must come from that chat. Publisher Results must never be injected into the normal public dashboard.

## Scope

- normal `/demo/` root starts from user-local Results only;
- first-time empty state is a focused welcome/share flow;
- public ChatGPT share URLs can be read through the existing `/api/shared-chat` endpoint and reviewed before saving;
- the saved first card records the shared-chat source URL in the user's local Vault;
- published Result catalog remains available for direct immutable Result routes, Semantic Dash routes, MCP/public APIs, and explicit `?showcase=1` development/demo mode;
- public-facing copy hides storage/Vault/immutable implementation language during onboarding.

## Non-goals

- authentication or cross-device sync;
- importing private/non-public chats;
- silently publishing user cards;
- Claude/Gemini ingestion in this fix (the first supported share flow is the existing ChatGPT public-share parser).
