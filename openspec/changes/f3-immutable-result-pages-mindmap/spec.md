# Feature 3 specification

## Shared Result page

A published Result MUST have a stable URL equivalent to `/demo/result/<id>` and MUST be rendered from structured Result data by the common DashGPT renderer.

Changing shared HTML/CSS/renderer behavior MUST update old Result pages without requiring copied per-Result HTML files.

## Immutable content

Every published catalog Result MUST include:

- `immutable: true`;
- integer `contentVersion >= 1`;
- `contentHash` using SHA-256 over the canonical durable payload.

The durable payload contains `id`, `title`, `summary`, `category`, `tags`, `decisions`, `next`, and `source` when present. Favorite/local UI state MUST NOT affect the content digest.

Repository verification MUST fail when a durable field no longer matches its recorded digest.

The browser Result page MUST show an integrity state. Verified content is shown as immutable/verified; a mismatch is visibly warned rather than silently accepted.

## Dashboard relevance view

Before the complete Result archive, the dashboard MUST show:

1. up to three newest Results ordered by publication time;
2. an indexed category/topic map derived from the current Result collection.

Each category node MUST show its Result count and SHOULD surface representative tags. Selecting a category node MUST filter/navigate to the matching Results.

The category map MUST NOT require a separate manually maintained taxonomy for this MVP.

## Second shared-chat publication

The shared ChatGPT conversation titled `Разрешение на ночёвку` MUST be distilled into a Result about El Regajo camping/fishing preparation and related permit knowledge.

Personal driver-license identifiers or similar personal document values from the source conversation MUST NOT be copied into the published Result.

The Result MUST retain the deliberate shared-chat URL as provenance.

## Local behavior

Browser-local Results remain mutable and continue to coexist with published immutable Results. Local favorite state for a published Result remains local and MUST NOT invalidate its durable-content integrity digest.
