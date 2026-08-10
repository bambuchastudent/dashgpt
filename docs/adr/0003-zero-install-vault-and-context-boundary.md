# ADR 0003 — Zero-install entry, user-owned vault, and chat-context boundary

Status: proposed

## Context

DashGPT's current public-plugin MVP can target a compatible `siteUrl`, while the demo keeps local Result state in browser storage and published Results in Git-backed files. This proves the core loop but makes a personal deployment feel too central to onboarding.

The intended product experience is simpler: a person should be able to start from ChatGPT immediately and, when durable storage is needed, connect a location they already control with minimal setup.

ChatGPT Projects/Memory can provide useful continuity and personalization, but that context is controlled by the host product and is not an inspectable DashGPT object store with Result-level persistence and synchronization semantics.

## Decision

DashGPT will use three explicit layers:

1. **Chat-native context** for current interaction and optional personalization hints.
2. **Provider-neutral DashGPT domain state** for Results, revisions, user-state events and explicit Profile revisions.
3. **A portable user-owned DashGPT Vault** accessed through replaceable storage adapters.

Chat-native context is never the authoritative store for DashGPT Results.

The standard first-use path is zero-infrastructure: use DashGPT from a normal chat. Before durable storage exists, DashGPT may prepare pending Results but must clearly say they are not yet durably saved. Durable save pairs a vault through a local action or a supported storage link plus explicit provider authorization.

Vault v1 favors immutable/revisioned objects and append-only user-state events. This makes GitHub, Google Drive, local filesystem/browser storage and future providers converge on one synchronization model instead of each provider becoming a separate database design.

Provider credentials and transport metadata stay outside the vault. Raw chat transcripts are not saved by default. Durable personalization consists only of explicit/user-approved DashGPT Profile data.

## Consequences

### Positive

- New users do not need Cloudflare, MCP knowledge or manual deployment to begin.
- GitHub, Drive, local storage and compatible DashGPT instances can share one domain/storage contract.
- ChatGPT personalization can improve UX without locking the user's knowledge into opaque host memory.
- Append-only/revisioned objects reduce destructive sync conflicts and work naturally with Git-style storage.
- Users retain portable, inspectable data independent of one cloud provider.

### Costs

- A real sync engine and adapter contract are required; browser `localStorage` can no longer remain the persistence abstraction.
- Provider OAuth must be implemented correctly for writable GitHub/Drive adapters.
- Conflict handling must be visible instead of relying on simple last-write-wins.
- Chat-only unpaired mode cannot truthfully promise durable Result storage until a vault is paired.

## Rejected alternatives

### Use ChatGPT Memory/Projects as the DashGPT database

Rejected because host memory is contextual/personalization state rather than an app-controlled structured Result store. DashGPT would lose inspectability, deterministic sync, portability and provider independence.

### Require every user to deploy a personal DashGPT instance first

Rejected because it turns infrastructure setup into onboarding and contradicts the desired chat-first experience.

### Make GitHub the canonical database

Rejected because GitHub is a useful adapter, especially for open human-readable data and versioning, but it must remain optional and replaceable.

### Store all Results in one synchronized JSON document

Rejected because a monolithic mutable file produces unnecessary cross-device/provider conflicts and weakens immutable revision semantics.
