# ADR 0001 — Shared renderer with immutable Result content

Status: accepted for MVP

## Context

DashGPT now needs stable standalone pages for published Results. The presentation of those pages must improve together with the dashboard over time, while previously published knowledge must not silently change.

Copying a full HTML page for every Result would make old pages visually stale and create duplicated templates. A static-site generator could rebuild every page, but DashGPT already has a small client-rendered application and does not need an additional framework for this requirement.

## Decision

Use one shared client-side renderer for both the dashboard and standalone Result routes.

- Dashboard route: `/demo/`
- Result route: `/demo/result/<result-id>/`
- Cloudflare Workers Static Assets uses SPA fallback so unmatched Result routes receive the same `index.html` shell.
- Shared JavaScript and CSS render the selected Result from the canonical published Result catalog.
- Presentation changes therefore update old and new Result pages together on the next deployment.

Keep durable content separate from presentation:

- published Result data remains in `demo/data/results.json` for the current MVP;
- a published Result can set `immutable: true` and `contentVersion`;
- CI compares immutable Results against the PR base branch and rejects deletion, unlocking, in-place version changes, or changes to durable content fields;
- a correction to immutable knowledge is represented by a new Result/revision rather than mutating the old one.

The immutable guard covers the durable fields `title`, `summary`, `category`, `tags`, `decisions`, `next`, and `source`. UI state such as a browser-local favorite is not immutable knowledge.

## Consequences

Positive:

- one renderer and one visual language for dashboard and Result pages;
- old pages automatically receive UI improvements;
- content stability is explicit and mechanically checked;
- no new frontend framework is required for the MVP;
- stable Result URLs remain independent of the current visual implementation.

Trade-offs:

- the standalone page needs JavaScript to resolve Result data;
- the current Git-backed catalog remains tactical storage, not the final persistence model;
- future revisions need an explicit revision/supersedes model when real editing is introduced.
