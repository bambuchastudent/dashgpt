# Proposal: Capture Inbox API

## Why

DashGPT should not make users act as import operators. A chat that already has the conversational context is the best place to distill that context into a useful card. DashGPT only needs a simple delivery path that lets prepared cards arrive progressively in the user's local My Dash.

The product flow becomes:

```text
AI chat -> distill CardEnvelope -> Capture Inbox API -> My Dash polls -> local Vault upsert -> ACK
```

This removes browser-specific history scraping, DevTools, ZIP/HTML parsing and mobile/desktop forks from the normal capture architecture.

## What changes

- Add one transport-neutral Capture Inbox API for prepared card envelopes.
- Treat the AI/client as responsible for distillation. The capture API does not parse raw conversations and does not run an LLM.
- Give each local DashGPT Vault one capture channel with separate write and claim credentials.
- Allow an AI client to submit a bounded CardEnvelope using only the write credential.
- Let My Dash poll its channel while the personal board is open, save accepted envelopes into the existing canonical local Vault, then acknowledge them.
- Reuse deterministic source identity (`provider + sourceId`) so retries and repeated chat saves converge to one mutable card instead of creating duplicates.
- Keep the server-side inbox temporary delivery infrastructure, not user memory. Acknowledged items are removed; unacknowledged items expire after a bounded TTL.
- Keep all canonical user state in the existing local Vault. Search, Semantic Gallery, Dashes, continuation, merge and optional sync operate on the same cards after local persistence.
- Do not create separate mobile or desktop behavior. Any browser capable of opening My Dash uses the same polling contract.

## Product behavior

A user should be able to connect an AI client once and then forget about transport details. After that, a useful chat can simply save/update its card and the user's open My Dash progressively receives it.

The normal UI speaks in product terms such as `Connect chats`, `Receiving cards`, `Last received`, and `Pause receiving`. Channel IDs, tokens, queue storage and polling cadence belong in implementation/settings surfaces rather than first-run onboarding.

## Delivery model

A capture channel has two capabilities:

- **write credential**: may submit a prepared CardEnvelope but may not read the inbox;
- **claim credential**: remains in the local DashGPT Vault/browser settings and may poll/acknowledge that channel.

This separation lets an AI client deliver cards without gaining read access to other pending cards.

The first implementation may use a short-lived Cloudflare-backed queue appropriate to the existing Worker deployment. The queue is not the source of truth and must not become a second memory store.

## CardEnvelope

A submitted envelope is bounded and outcome-oriented. Directionally it contains:

```json
{
  "schemaVersion": 1,
  "deliveryId": "...",
  "source": {
    "provider": "chatgpt",
    "sourceId": "conversation-stable-id",
    "url": "https://..."
  },
  "sourceUpdatedAt": "...",
  "card": {
    "title": "...",
    "summary": "...",
    "decisions": [],
    "facts": [],
    "constraints": [],
    "openQuestions": [],
    "next": "...",
    "tags": []
  }
}
```

The receiver reconstructs a canonical mutable Result instead of trusting arbitrary Vault fields from the sender. Senders cannot set Result IDs, favorite/immutable state, Dash membership, Vault events or storage metadata.

## Relationship to Feature 20

Feature 20 (`Resumable Progressive ChatGPT History Import`, PR #38) proved and implements deterministic source identity, compact card projection, local canonical upsert, duplicate-free replay and progress-card behavior for large migrations.

F22 is a separate capability layered on that model: it replaces browser-specific capture transport for ordinary ongoing capture with a generic inbox API. It does not silently widen or rewrite Feature 20's authenticated-history source runner.

The PR is intentionally stacked on #38 while #38 is open. After #38 merges, F22 must be rebased/retargeted to `develop` and fully reverified.

## Impact Manifest

### Existing surfaces affected

- `src/worker.js` — route new capture endpoints through the existing Worker entry.
- Worker storage/config — add a bounded ephemeral per-channel queue binding only if required by the chosen implementation.
- `demo/vault.js` — reuse canonical sanitization/materialization; do not create a new user-memory schema.
- Feature 20 deterministic imported-card identity/upsert helpers — reuse or extract the provider/source identity contract instead of duplicating it.
- `demo/catalog-bootstrap.js` / personal My Dash bootstrap — start/stop polling only for the personal board.
- `demo/unified-dashboard.js` / current My Dash UI — surface lightweight receive state without a new parallel inbox screen.
- existing search, Semantic Gallery, Semantic Dashes and continuation — unchanged consumers of locally persisted canonical cards.
- `package.json`, deterministic verifiers and Playwright — add API/idempotency/security/polling regression coverage.

### Explicit non-goals

- Raw conversation ingestion or server-side transcript parsing.
- Browser DevTools, userscripts, extensions or plugins as a prerequisite.
- Separate mobile import implementation.
- Permanent server-side user memory.
- A second `importedChats`/Inbox database visible as a product entity.
- LLM distillation inside the capture API.
- Changing card merge, Semantic Dash or continuation semantics.

## Privacy and storage boundary

Canonical memory remains user-owned and local-first. The Capture Inbox is only a bounded delivery buffer: pending envelopes are short-lived, acknowledged deliveries are removed, and server queue contents are not indexed into product memory or used as a replacement for the user's Vault.

The write credential does not permit reading pending items. The claim credential is never handed to AI senders. Credentials are never stored inside cards.

## OpenSpec gate

No production code for F22 may be committed until this change is strictly validated through the repository OpenSpec workflow. If GitHub Actions remains blocked by the current repository billing/spending-limit issue, this PR stays spec-only/draft rather than bypassing the gate.