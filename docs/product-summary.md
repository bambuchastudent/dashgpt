# DashGPT — Product Summary

This file answers one question only: **what are we building?**

Do not put development-process decisions here.

## Product statement

DashGPT is a private personal dashboard for useful outcomes of AI conversations and portable working context. It turns chats, images, links, files and project discussions into curated Results that can be searched, summarized, revisited and handed off to another chat or agent.

## Product principles

1. **Result-first, not chat-first.** Raw conversation history is a source, not the primary knowledge object.
2. **Continuable by design.** A saved Result should contain enough context for a person or another AI agent to continue without rereading the original conversation.
3. **User-owned context.** Data and context must be exportable in open human- and machine-readable formats.
4. **Private by default.** Access control is enforced before private content is delivered to the client.
5. **Local-first, cloud-optional.** Core functionality must work locally without Cloudflare, GitHub APIs or paid LLM APIs.
6. **Provider-independent.** ChatGPT is an important client, but not the system of record.
7. **Different views for different devices.** Laptop = detailed inspection; phone = concise human summaries and continuation actions.
8. **Zero-install entry.** A person can begin from a normal AI chat without first deploying infrastructure; durable storage is paired only when needed.

## Primary entities

### Result

A curated useful outcome. It may be text-first or image-first.

Expected fields include:

- title
- summary
- category and tags
- favorite/status
- result/body
- decisions
- instructions/code/links
- images/assets
- open questions
- next steps
- sources/provenance
- related Results
- continuation context

A published Result may be marked **immutable**. Once published as immutable, its knowledge content must not be silently rewritten. Corrections or materially changed knowledge become a new revision while the old Result remains addressable.

### Context Pack

A portable representation of the current useful context for continuation by another chat or agent.

It should support multiple sizes, for example quick/human, medium, large and agent-oriented variants, so callers do not have to send the whole history every time.

### Project

A collection of Results, decisions, specs and state that can produce a current human summary and an agent continuation context.

### Semantic Dash

A saved, living semantic view of Results from one or more source conversations. A Dash stores its title, topic definition, update policy and Result references; it does not copy Result knowledge into a second store.

Dash membership combines semantic selection with explicit user overrides:

- pinned and manually added Results remain present;
- excluded Results do not return during refresh;
- new matches appear for review by default;
- deleting a Dash never deletes its Results.

Every build and refresh must apply the user's current Result access, source, archive and deletion constraints before ranking or summarization. If a referenced Result becomes unavailable, the Dash may show that state but must not retain or reveal its content through the aggregate summary.

### Source

Provenance for a Result, such as a ChatGPT conversation, another AI chat, repository, URL, file or image.

### Asset

Images and other attached files used by Results.

### DashGPT Profile

A small, inspectable set of explicit user-approved preferences that should travel with DashGPT independently of any one AI provider. It may include preferred languages, answer density and stable working preferences. Provider-native memories or inferred conversational facts are context hints, not automatically persisted Profile data.

### DashGPT Vault

A portable user-owned durable storage unit for Results, Dash definitions/revisions, assets, user-state events and explicit Profile revisions. The same vault should be usable through local storage or replaceable synchronization adapters such as GitHub, Google Drive and a compatible DashGPT instance.

## Core user experience

### Dashboard

The dashboard should provide:

- categories
- tags
- favorites
- recent/active items
- search
- related Results
- image previews
- automatically generated topic/category summaries
- active and completed topics/projects
- saved Semantic Dashes and temporary topic previews

### Continue actions

A Result should support actions equivalent to:

- continue the original chat when a source conversation link is available
- start a new chat with generated context
- send/export context to another agent
- inspect/copy the Context Pack
- share a deliberately selected item when supported

### Zero-install onboarding

The normal first-run experience should begin in chat, not with deployment instructions.

A user can start using DashGPT immediately to distill and preview useful Results. Before durable storage is paired, DashGPT must clearly distinguish pending/conversational state from durably saved state.

For durable storage, the target interaction is roughly:

`start chat -> give DashGPT a supported storage link or choose local storage -> authorize that provider if needed -> sync`

A storage link may identify a compatible DashGPT instance, GitHub location or Google Drive location. Provider authorization remains explicit. The user should not need to understand MCP, Cloudflare deployment or API-key configuration for the standard path.

### Shared-chat publishing MVP

A deliberately simple first ingestion flow should work before a full importer exists:

1. the user creates a public/shareable AI conversation link;
2. the user sends that link to an assistant/agent that can access DashGPT;
3. the assistant reads the conversation and distills the useful outcome into a Result;
4. the Result is published into DashGPT with the original shared link preserved as provenance;
5. the card becomes available for search, inspection and Context Pack generation.

For the first MVP, the summarizing assistant may perform the summarization outside DashGPT. DashGPT does not need a mandatory model API merely to accept the Result.

Later versions should make this flow available through normal DashGPT/agent APIs and may support direct automated import where appropriate.

### Published Result pages

Every published Result should have a stable standalone page that can be opened or shown without navigating the dashboard first.

The page has two deliberately separate concerns:

- **content is durable:** title, summary, decisions, next steps and provenance remain the published Result;
- **presentation is living:** layout, typography, navigation and shared DashGPT UI may improve later and those improvements should appear on old Result pages too.

An immutable Result page must visibly communicate that its content is locked. Updating the common DashGPT presentation must not count as changing the Result itself.

### Mobile experience

The phone UI should explain state rather than expose repository internals.

A project summary should answer concisely:

- where are we now?
- what is already decided/done?
- what is currently active?
- what comes next?
- are there blockers?

The same state may have short, normal, detailed and agent representations.

### Laptop experience

The laptop view may expose deeper structured information such as Results, specs, sources, decisions, history, assets and detailed context.

## UX / visual design — open questions

The first M1 demo is intentionally utilitarian: the interaction model is already convenient enough to validate the Result → Context Pack loop, but the visual design is not a target design.

Keep for later exploration:

- define a distinctive visual language for DashGPT instead of a generic dashboard look
- preserve the current low-friction interaction flow while improving hierarchy, typography, spacing and density
- make cards feel more like durable knowledge/results than generic admin-panel tiles
- reconsider mobile navigation and quick actions once real Results/projects exist
- test whether categories, projects, recent items and favorites should be visually stronger than tags/metadata
- avoid polishing the UI so early that it hides flaws in the underlying information model

## Integrations

### Agent interoperability

DashGPT should expose its useful knowledge through a provider-neutral interface. MCP is the preferred integration boundary for agent access.

Expected capabilities include concepts equivalent to:

- search Results
- open or preview a Semantic Dash from a natural topic request
- get Result
- create/update Result
- get project state
- generate/get Context Pack
- find related Results

### ChatGPT

DashGPT should be usable from ChatGPT through the current supported app/plugin mechanism backed by the same provider-neutral core/MCP interface. It should not require a separate ChatGPT-specific data model.

The product plugin identity is **DashGPT** (`dashgpt`). From a normal ChatGPT conversation, the user should be able to say the equivalent of **“save the useful result of this conversation to DashGPT”**. ChatGPT should distill the conversation rather than dump raw history and show what is about to be saved.

ChatGPT conversation history, Projects and Memory may improve continuity and personalization when available, but they are not the authoritative DashGPT Result store. DashGPT must remain reconstructable from its own user-owned vault without relying on hidden host memory.

If a vault is already paired, save/read/search operations should target that vault. If no vault is paired, DashGPT may prepare a pending Result and guide the user through one minimal storage-pairing action before claiming durable save.

The same plugin must be able to search the paired vault, open durable Results and obtain Context Packs for continuation.

Natural requests such as “open my food Dash” or “what did we discuss about Morocco?” should reopen one confident saved Dash, ask the user to choose between materially ambiguous saved Dashes, or show a temporary topic preview that requires explicit confirmation before it is saved. Public plugin surfaces may only use Results and Dashes intentionally exposed by the selected DashGPT instance; access to a private paired Vault requires an authenticated storage surface.

The product must prove more than a connection to the developer's own test site: another person should be able to use the same recognizable DashGPT experience against storage they control, without hard-coded developer data.

### Other agents

Context should be portable to tools such as Codex, Claude, OpenCode, Copilot and local agents without changing the underlying Result.

## Personalization and privacy

DashGPT should use personalization without becoming a shadow copy of a provider's memory system.

- provider-native context may influence the current interaction;
- durable DashGPT Profile data is explicit, inspectable and user-approved;
- raw chat transcripts are not stored or synchronized by default;
- credentials and provider tokens are never Result/Profile/vault content;
- cloud synchronization is opt-in and identifies the provider receiving the data;
- the user can export or move their vault without an active cloud provider.

## Deployment and privacy

### Zero-install standard path

A user should not need a personal deployment in order to begin using DashGPT. The standard path starts in chat and adds durable storage through a local vault or a supported storage link plus explicit provider authorization.

### Optional private deployment

A hosted personal DashGPT instance remains useful for advanced/self-hosted scenarios, but is one storage/runtime option rather than the onboarding prerequisite.

There should still be a low-friction hosted path for people who want one, roughly equivalent to:

GitHub account + Cloudflare account + permissions/configuration -> private personal DashGPT instance.

### Local/self-hosted deployment

The same product must remain runnable locally or on an arbitrary host using ordinary Git and local storage. GitHub and Cloudflare are adapters/convenience targets, not hard dependencies.

Requirements:

- core works offline where practical
- self-hosting remains supported
- Git provider is replaceable (GitHub/GitLab/Gitea/Forgejo/local Git, etc.)
- data can be backed up and moved between deployments
- no mandatory paid model/API for basic operation

## Storage direction

DashGPT durable personal state should converge on a provider-neutral portable Vault format rather than direct coupling to browser `localStorage`, GitHub, Google Drive or Cloudflare storage APIs.

The Vault should use inspectable open formats such as JSON plus ordinary assets. Immutable Result knowledge remains revisioned; Dash membership is reference-only; mutable user state should be represented in a synchronization-friendly way that does not silently rewrite immutable Result content.

Initial storage/sync adapters should cover local/browser storage, local filesystem/local Git, GitHub, Google Drive and compatible DashGPT instances. Cloud storage implementations must not redefine the domain model around one provider.

## Initial product scope

The first useful vertical slice should prove the central loop:

1. create/import a Result
2. store it locally
3. browse/search Results
4. favorite/open a Result
5. generate a Context Pack
6. copy/export it for continuation

The next practical ingestion slice proves that a real shared AI chat can be distilled and published as a Result without requiring a built-in paid LLM API.

The public plugin MVP established provider-neutral ChatGPT/MCP access and compatible-instance routing. Feature 6 moves onboarding and persistence toward zero-install chat-first use plus user-owned portable storage, so a personal deployed `siteUrl` is no longer the required first-use model.

Later milestones add richer project-state summaries, images/assets, advanced relationships and richer synchronization/personalization behavior.
