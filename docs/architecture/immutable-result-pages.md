# Immutable Result content with a shared renderer

## Problem

DashGPT Result pages need two properties that pull in different directions:

1. an old page should automatically benefit from later improvements to DashGPT layout/navigation;
2. the useful content that was published must not silently change merely because the UI changed.

Generating and keeping a separate HTML snapshot for every Result couples content to presentation and makes global UI fixes expensive. Treating the complete rendered page as immutable has the opposite problem: old pages can never receive layout fixes.

## Decision

Separate **immutable structured content** from the **mutable shared renderer**.

A stable Result URL such as `/demo/result/<id>` resolves a structured Result from the catalog and renders it through the current DashGPT application shell. The URL and stored content remain stable; the renderer, styles and navigation may evolve.

Published content currently uses:

- `schemas/result.v1.schema.json` as its portable structural contract;
- `immutable: true` as an explicit publication boundary;
- `contentVersion` for the content contract generation;
- `contentHash: sha256:...` for the durable content digest.

The hash covers only durable knowledge fields: `id`, `title`, `summary`, `category`, `tags`, `decisions`, `next` and `source` when present. Local favorite state and presentation metadata are excluded.

## Canonicalization

The MVP canonicalizes JSON deterministically by recursively sorting object keys and preserving array order before SHA-256 hashing. Browser verification and repository verification share the same rule.

For a future multi-language signing/export protocol, use RFC 8785 JSON Canonicalization Scheme (JCS) rather than growing a private canonicalization format. JCS exists specifically to make JSON cryptographic hashing/signing repeatable.

## Rendering and routing

Cloudflare Worker routes `/demo/result/<id>` to the common application HTML shell. The browser resolves `<id>` from the route and renders the catalog Result. Local development may use `/demo/?result=<id>` as a fallback when a simple static server has no SPA rewrite support.

This routing choice is compatible with the general SPA fallback pattern supported by Cloudflare Workers static assets. It is an adapter detail, not part of the Result domain model.

## Mutation rule

A renderer update is allowed to change layout, typography, controls and navigation without changing the content digest.

If a durable field needs correction or evolution, do not silently overwrite an immutable published record. Make that change explicit through a new content version/revision mechanism. The exact long-term revision model is intentionally deferred.

## Verification

- `scripts/verify-results.mjs` checks every published Result in the repository.
- the Result page independently checks the digest with WebCrypto and displays `Immutable • verified` or a mismatch warning.

This is integrity detection, not yet a cryptographic identity/signature system. A future signing feature can build on the same immutable boundary.
