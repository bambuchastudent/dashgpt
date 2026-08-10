# Design: Living Product Board

## Context

Feature 7 already defines Semantic Dashes as reference-only saved views over Results. Feature 8 renders current Dash membership through the same semantic gallery controller. The repository also already exposes `demo/data/dashes.json`, including a public `dashgpt-product` Dash, and `demo/data/results.json` as the public Result catalog.

The legacy `/demo/dash/` path is different: `demo/dash.js` fetches `demo/data/dash.json`, which is generated from `DASH.md`. That creates a second project-status data model and permits drift.

## Decision

### 1. Reuse the existing Dash and Result contracts

`dashgpt-product` becomes the stable public product board identity. No second `ProductBoard` domain entity is introduced.

The board definition remains a Semantic Dash revision and stores Result references. Product-topic state is carried by dedicated Result records. Board-level summary is computed at render/verification time from those records.

### 2. Product-topic Result extension

Product-board Results use additive presentation/domain metadata outside the immutable hash inputs already defined by the Result verifier:

```json
{
  "productBoard": {
    "area": "semantic-memory",
    "primaryTag": "DashGPT",
    "deliveryStatus": "merged",
    "lastMeaningfulUpdate": "2026-08-10T14:37:24Z",
    "currentState": "...",
    "nextAction": "...",
    "blocker": null,
    "openSpecChangeId": "f8-semantic-gallery-ux",
    "prUrl": "https://github.com/.../pull/19",
    "mergeCommit": "...",
    "previewUrl": null,
    "productionUrl": "https://dashgpt.dimkashir.workers.dev/demo/",
    "updatedAt": "...",
    "updateSource": "github+product-review",
    "verificationNotes": []
  },
  "continuationContext": { ... }
}
```

The existing durable knowledge/hash fields are not redefined. New product-board Results are published with correct hashes for their hashed fields; later reconciliation updates mutable board metadata rather than pretending old immutable knowledge changed.

### 3. Status state machine

Allowed primary delivery states:

`idea -> specified -> in_development -> merged -> deployed -> product_verified`

`blocked` and `archived` are explicit terminal/side states for the current view; transitions out require review.

Rules:

- open linked PR can propose `in_development`;
- merged linked PR can propose `merged`;
- confirmed successful production deployment can propose `deployed`;
- only explicit manual product acceptance can set `product_verified`;
- reconciliation never rewrites decisions, summary, continuation instructions, or private notes.

### 4. Stable routing

Canonical board route: `/demo/dash/dashgpt-product/`.

Compatibility route: `/demo/dash/` renders the same board identity, not a second dataset. No route is keyed to a browser-local revision or preview ID.

### 5. Board data and refresh model

MVP public board data is repository-backed (`results.json` + `dashes.json`) and therefore portable across browsers and deployments. Browser Vault state may add user-local activity/presentation, but it is not required to reconstruct the public board.

`Refresh board` is Review-mode only. For this PR the deterministic reconciler consumes persisted evidence fields on board Results and returns proposed status changes; it does not perform authenticated GitHub mutation/fetch in the browser. The board shows last refreshed/last saved/update source and pending proposals. A future authenticated adapter may populate evidence using the same contract.

Refresh is idempotent for identical evidence.

### 6. Continuation package

The board generates Markdown containing:

- role;
- product definition;
- selected/current objective;
- current product state;
- completed items;
- active work;
- decisions already made;
- constraints;
- open questions;
- ordered next actions;
- board/Result/OpenSpec/PR/preview/production sources.

This is board/product continuation output. The separate future Structured Chat Continuation change owns target-provider transport, prompt hardening, URL limits, and richer per-chat transfer semantics.

### 7. Discoverability

The normal demo header/dashboard gains a Product Board entry. `/demo/dash/` remains a familiar operational alias but renders the product board. The saved Dash remains discoverable through the existing Dash catalog.

## Migration

- Keep `DASH.md` as a short developer operational handoff if desired by the development workflow, but stop treating its generated `demo/data/dash.json` as the product status page source of truth.
- Existing `demo/data/dash.json` may remain temporarily for compatibility/tooling, but the UI must not render it as a separate status dataset.
- Evolve the existing `dashgpt-product` Dash revision rather than creating a duplicate Dash.

## Privacy

Only curated public Result data is placed in the public catalog. Source conversation URLs are included only when deliberately safe/shareable. Raw chat text, credentials, private Vault content, and provider memory are excluded.

## Failure modes

- Missing referenced Result: board shows unavailable/missing without reconstructing private content.
- Unknown delivery status: verifier fails rather than silently coercing.
- Bad linked metadata: keep current saved state and surface a proposed/error state.
- Repeated refresh with same evidence: no duplicate proposal/state change.
- Stable route load without localStorage: board still renders from repository-backed catalog.

