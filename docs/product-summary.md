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

### Context Pack

A portable representation of the current useful context for continuation by another chat or agent.

It should support multiple sizes, for example quick/human, medium, large and agent-oriented variants, so callers do not have to send the whole history every time.

### Project

A collection of Results, decisions, specs and state that can produce a current human summary and an agent continuation context.

### Source

Provenance for a Result, such as a ChatGPT conversation, another AI chat, repository, URL, file or image.

### Asset

Images and other attached files used by Results.

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

### Continue actions

A Result should support actions equivalent to:

- continue the original chat when a source conversation link is available
- start a new chat with generated context
- send/export context to another agent
- inspect/copy the Context Pack
- share a deliberately selected item when supported

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

## Integrations

### Agent interoperability

DashGPT should expose its useful knowledge through a provider-neutral interface. MCP is the preferred integration boundary for agent access.

Expected capabilities include concepts equivalent to:

- search Results
- get Result
- create/update Result
- get project state
- generate/get Context Pack
- find related Results

### ChatGPT

DashGPT should be usable from ChatGPT through the current supported app/plugin mechanism backed by the same provider-neutral core/MCP interface. It should not require a separate ChatGPT-specific data model.

### Other agents

Context should be portable to tools such as Codex, Claude, OpenCode, Copilot and local agents without changing the underlying Result.

## Deployment and privacy

### Fast private deployment

There should be a low-friction hosted path roughly equivalent to:

GitHub account + Cloudflare account + permissions/configuration → private personal DashGPT instance.

The user should not need to perform substantial DevOps work for the standard path.

### Local/self-hosted deployment

The same product must remain runnable locally or on an arbitrary host using ordinary Git and local storage. GitHub and Cloudflare are adapters/convenience targets, not hard dependencies.

Requirements:

- core works offline where practical
- self-hosting remains supported
- Git provider is replaceable (GitHub/GitLab/Gitea/Forgejo/local Git, etc.)
- data can be backed up and moved between deployments
- no mandatory paid model/API for basic operation

## Storage direction

The product should preserve portable exports such as Markdown/YAML/JSON even if the runtime uses a database/index for metadata, relationships and search.

Cloud storage implementations must not make the domain model Cloudflare-specific.

## Initial product scope

The first useful vertical slice should prove the central loop:

1. create/import a Result
2. store it locally
3. browse/search Results
4. favorite/open a Result
5. generate a Context Pack
6. copy/export it for continuation

Later milestones add MCP, ChatGPT integration, richer project-state summaries, quick hosted deployment, images/assets and advanced relationships.
