# Feature 2 specification — Shared chat → published Result

## User story

As a DashGPT user, I can send an assistant a public ChatGPT shared-chat URL and have the useful outcome appear in DashGPT as a normal Result card.

## Input

A deliberate public shared-chat URL with the canonical shape:

`https://chatgpt.com/share/<conversation-id>`

The summarizing agent is responsible for reading the conversation and deciding what is useful enough to preserve.

## Published Result shape

A published Result MUST have:

- `id`: stable unique string
- `title`
- `summary`
- `category`
- `tags`: array of strings
- `favorite`: default boolean
- `decisions`: array of concise durable facts/choices
- `next`: concise next action or empty string
- `source`: object with at least `type` and `url`

It MAY also have:

- `publishedAt`
- future Result fields without breaking readers

For ChatGPT shared links, `source.type` is `chatgpt-share`.

## Catalog

Published Results live in `demo/data/results.json` for this MVP.

The catalog is deliberately simple and Git-backed so an assistant with repository write access can publish without a new storage service.

## Client loading and merge behavior

On startup the client MUST:

1. attempt to fetch `./data/results.json`;
2. fall back to bundled examples if the catalog cannot be loaded;
3. load browser-local Results;
4. merge by Result `id`;
5. prefer published catalog content for durable fields;
6. preserve a locally changed `favorite` value for an existing published Result;
7. preserve browser-local Results that do not exist in the published catalog.

A new/updated published Result MUST become visible after deployment without requiring the user to clear local storage.

## Provenance

When a Result has a source URL:

- Result details MUST expose an `Open source chat` action;
- Context Pack MUST include the source URL.

## Acceptance examples

### New shared chat

Given the agent publishes a new catalog Result with a new `id`, after Cloudflare deploys the branch and the page is refreshed, a card for that Result is visible.

### Updated summary

Given an existing published Result is changed in the catalog, after refresh the new summary appears even if an older version of that Result exists in local storage.

### Local Result safety

Given the user previously created a browser-local Result, loading a new published catalog MUST NOT delete it.

### Catalog unavailable

If catalog fetch fails, DashGPT MUST still render useful fallback Results and any browser-local Results.