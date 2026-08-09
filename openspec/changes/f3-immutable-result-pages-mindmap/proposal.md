# Feature 3 — Immutable Result pages + current topic map

## Why

Feature 2 proved that a real shared AI chat can become a DashGPT Result. The next problem is durability and navigation: every Result needs a stable page, page-format fixes must apply consistently to old Results, and published content must not be silently rewritten by presentation updates.

The dashboard also needs a faster answer to “what is relevant now?” than a flat archive.

## Scope

- render all Result pages through one shared renderer at stable Result URLs;
- keep published Result content separate from mutable presentation;
- add a portable Result schema plus explicit immutable/integrity metadata;
- verify immutable content digests in repository checks and in the browser;
- show recent/current Results before the full archive;
- derive a clickable topic map from indexed Result categories;
- publish the second supplied shared chat as a Result while excluding personal document data.

## Not in scope

- cryptographic author identity/signatures;
- a complete Result revision/history model;
- automatic semantic topic clustering with an LLM;
- replacing the Git-backed MVP catalog;
- major visual redesign of DashGPT.
