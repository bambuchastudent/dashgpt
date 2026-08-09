# DashGPT v2 — handoff for next chat / agent

> Interim continuity handoff created on 2026-08-09 while Feature 4 is blocked on OpenAI publisher identity verification. This is **not** an MVP-complete release note.

## Start here

Repository: `bambuchastudent/dashgpt`  
Primary branch/source of truth: `develop`

Live production:

- Dashboard: `https://dashgpt.dimkashir.workers.dev/demo/`
- Mobile project status: `https://dashgpt.dimkashir.workers.dev/demo/dash/`
- Universal MCP: `https://dashgpt.dimkashir.workers.dev/mcp`
- DashGPT discovery: `https://dashgpt.dimkashir.workers.dev/.well-known/dashgpt.json`

Current chat share URL: `https://chatgpt.com/share/6a78a99f-bff4-83eb-80ce-e51389a70861`

### Required reading order for the next agent

1. `docs/handoff-dashgpt-v2.md`
2. `DASH.md`
3. `docs/product-summary.md` — **WHAT** we build
4. `docs/development-summary.md` — **HOW** we build
5. `openspec/changes/f4-plugin-directory-submission/proposal.md`
6. `openspec/changes/f4-plugin-directory-submission/spec.md`
7. `openspec/changes/f4-plugin-directory-submission/tasks.md`
8. `plugins/dashgpt/SUBMISSION.md`

Do not redesign Feature 4, archive it, or declare MVP complete before the second-user acceptance test passes.

---

# PRODUCT SUMMARY — WHAT WE BUILD

DashGPT is a private, result-first dashboard for useful AI outcomes and portable context between chats/agents.

Core principles:

- **Result-first, not chat-first.** Raw chat is a source, not the durable primary object.
- A saved Result must preserve enough distilled context to continue without rereading the original conversation.
- ChatGPT is an important client, not the system of record.
- Provider-neutral core, user-owned context, open exports, local-first/cloud-optional.
- Phone UX should explain state concisely; laptop UX can expose deeper structure.

Primary objects:

- **Result** — title, summary, category/tags, decisions, next action, source/provenance, immutable content metadata.
- **Context Pack** — portable continuation context.
- **Project** — structured project state/results/decisions/specs.
- **Source** — ChatGPT share, URL, repo, file, image, etc.
- **Asset** — attached image/file.

Already demonstrated:

- search/categories/tags/favorites;
- Result details and standalone Result pages;
- Context Pack generation;
- mobile project status;
- shared renderer so presentation can evolve without mutating old knowledge.

UX note from user feedback:

- current interface is convenient but visually rough;
- do not over-polish prematurely;
- visual language, cards, mobile navigation and hierarchy remain later work.

## MVP acceptance criterion

MVP is **not** complete when it works only for the developer.

Another person must be able to:

1. install/connect public **DashGPT**;
2. point it at that person's own compatible DashGPT site;
3. list/read their Results;
4. get a Context Pack;
5. explicitly save/import a new Result into their own DashGPT.

Only then call MVP complete.

---

# DEVELOPMENT SUMMARY — HOW WE BUILD

- Spec-driven development.
- Git/repo = durable project memory.
- OpenSpec = current change/spec/task lifecycle.
- Agents are replaceable; project state is not.
- Keep `AGENTS.md` short; detailed workflow lives in specs/skills.
- Strong models for architecture/spec review/hard debugging; cheaper/local models acceptable for mechanical execution when sufficient.
- Ground changes against repo/code/tests, never hidden chat memory alone.
- Explicit handoffs required.

Tooling direction:

- OpenSpec: required baseline.
- Git/tests/CI: objective verification.
- Serena: optional preferred symbol-aware navigation/editing.
- Graphify/CodeGraphContext: optional structural context reduction.
- Beads: optional later if task dependencies outgrow OpenSpec.
- Agent Skills: portable workflows across providers.

Documentation separation:

- `docs/product-summary.md` = WHAT
- `docs/development-summary.md` = HOW
- `docs/roadmap.md` = milestone ordering
- OpenSpec = scoped active change
- ADRs = durable architecture rationale
- `DASH.md` = operational NOW / DONE / NEXT / BLOCKERS

---

# BUILT SO FAR

## M0 / M1

- repo/bootstrap and durable product/development summaries;
- Cloudflare Workers deployment from `develop`;
- local-first Result vertical slice with create/persist/browse/search/favorite/details/Context Pack.

## Feature 2 — shared ChatGPT link → Result

Public ChatGPT share URLs can be fetched server-side and converted to durable Results. Real examples include DashGPT context, cold soups, chicken Kyiv, and camping/fishing.

Shared-chat parsing runs in the Worker because dynamic `chatgpt.com/share` pages were unreliable to fetch directly.

## Feature 3 — immutable pages + MCP foundation

Implemented:

- stable `/demo/result/<id>/` pages;
- shared renderer for old/new Results;
- `schemaVersion`, `immutable`, `contentVersion`, `contentHash`;
- SHA-256 verification in CI and browser;
- corrections create new revisions rather than silently mutating old content;
- MCP endpoint `/mcp` via official MCP SDK / Cloudflare Agents;
- stable identity `dashgpt` / **DashGPT**;
- privacy/terms/support pages;
- OpenAI domain challenge endpoint.

ADR: `docs/adr/0001-shared-renderer-immutable-results.md`

## Mobile DASH

- Live: `https://dashgpt.dimkashir.workers.dev/demo/dash/`
- Source: `DASH.md`
- Mirror: `demo/data/dash.json`
- Sync checker: `scripts/sync-dash.mjs`
- CI rejects drift.

---

# FEATURE 4 — PUBLIC DASHGPT PLUGIN

Implementation PR #9 (`Feature 4: public DashGPT plugin + universal instance gateway`) is merged into `develop`. Old PR #7 was superseded and closed.

## Architecture

Public plugin uses one fixed **Universal MCP** endpoint:

`https://dashgpt.dimkashir.workers.dev/mcp`

It is not hard-coded to developer data.

Read/context tools accept optional `siteUrl`, allowing the same public plugin to operate against another compatible DashGPT site.

DashGPT instance protocol v1:

- `GET /.well-known/dashgpt.json`
- `GET /api/dashgpt/results`
- `GET /api/dashgpt/results/<id>`
- `GET /api/dashgpt/context/<id>`

Remote sites must use HTTPS and expose a compatible DashGPT discovery manifest.

MCP tools:

- `list_results`
- `get_result`
- `get_context_pack`
- `prepare_result_import`

`prepare_result_import` is intentionally non-mutating: it creates an immutable payload + explicit `/demo/#import=...` URL. The user opens that link to import. No authenticated DB write API is required for MVP.

## Submission packet

Source: `plugins/dashgpt/SUBMISSION.md`

Current metadata:

- Public name: **DashGPT**
- Stable id: `dashgpt`
- Version: `0.3.0`
- Category: Productivity
- Type: With MCP + bundled skill
- MCP URL type: Universal
- MCP URL: `https://dashgpt.dimkashir.workers.dev/mcp`
- Authentication: None
- Embedded MCP UI: none

Packet already includes listing copy, site/support/privacy/terms URLs, logo source, starter prompts, 5 positive tests, 3 negative tests, tool annotations, domain verification instructions, release notes and portal runbook.

Availability regions remain `TBD at submission time`.

---

# OPENSPEC STATUS — VERIFIED CURRENT

Active change:

`openspec/changes/f4-plugin-directory-submission/`

Current files verified:

- `proposal.md` — public-plugin goal and second-user MVP criterion.
- `spec.md` — Universal MCP, instance protocol, tool behavior, privacy/safety, submission and acceptance.
- `tasks.md` — exact current implementation/manual checklist.

Feature 4 OpenSpec is **not archived** because submission/review/second-user acceptance remain incomplete.

## Completed OpenSpec tasks

Technical tasks are checked off:

- public plugin requirements audit;
- correct OpenAI Platform submission path;
- Universal MCP decision;
- instance protocol + second-user acceptance criteria;
- instance-neutral `siteUrl` routing;
- public discovery/result/context endpoints;
- MCP annotations;
- local + remote smoke tests;
- support/privacy updates;
- plugin metadata + brand asset;
- full submission packet;
- preview + production-shaped MCP smoke verification;
- merge into `develop`;
- publisher permission check;
- interim DashGPT v2 handoff.

Publisher permission is complete because the submitting account is confirmed **Organization Owner**, satisfying Apps Management write access.

## Remaining OpenSpec tasks / exact next steps

### 1. Publisher identity verification

Current state: **Individual — Identity in review**.

Observed on 2026-08-09:

`Create plugin → With MCP` redirects to Organization verification and creates no draft while identity is in review.

Do not restart verification while it remains in review.

### 2. When identity becomes Verified

OpenAI Platform:

1. Plugins
2. Create plugin
3. With MCP
4. Universal
5. MCP URL: `https://dashgpt.dimkashir.workers.dev/mcp`
6. Authentication: None

### 3. Domain verification

Portal provides a challenge token.

Set Cloudflare Worker secret/env:

`OPENAI_APPS_CHALLENGE=<exact portal token>`

Worker already exposes:

`/.well-known/openai-apps-challenge`

### 4. Scan Tools

Verify all four tool names/schemas/annotations against `plugins/dashgpt/SUBMISSION.md`.

### 5. Fill submission

Use prepared packet for:

- listing;
- verified Developer Identity;
- starter prompts;
- 5 positive tests;
- 3 negative tests;
- availability regions;
- release notes;
- attestations.

### 6. Submit for OpenAI review

Record submission state in OpenSpec + DASH.

### 7. After approval

Publish DashGPT to the universal Plugins Directory.

### 8. Second-user MVP acceptance

Use another person/account and a separate compatible DashGPT instance.

Prove:

- list/read their Results;
- Context Pack retrieval;
- explicit save/import into their site.

### 9. Only after acceptance

- mark MVP complete;
- archive/sync Feature 4 OpenSpec as appropriate;
- produce final completion/release handoff.

---

# CURRENT EXTERNAL BLOCKER

As of 2026-08-09 18:16 (+02:00):

- OpenAI Platform role: **Organization Owner** — permission gate satisfied.
- Individual publisher verification: **Identity in review**.
- Plugin draft creation is blocked by that verification in the observed UI.

Therefore there is currently **no productive manual submission step** until identity becomes Verified.

Do not ask the user to create roles or restart verification.

---

# DEPLOYMENT STATE / RULES

Cloudflare Worker/project: `dashgpt`  
Production branch: `develop`

Normal user entry:

`https://dashgpt.dimkashir.workers.dev/demo/`

User rule:

- latest working product always at `/demo/`;
- historical snapshots only if useful: `/demo/v1/`, `/demo/v2/`, ...;
- do not make the user open long feature-preview domains for normal use.

Develop head at handoff completion: `b77198787a9af2b97dc3e227a6118a2ed62fbf84`.

Latest checks after handoff update:

- GitHub quality check: **success**
- Cloudflare Workers build/deploy: **success**

---

# IMPORTANT DECISIONS / DO NOT REGRESS

- Do not couple product domain to ChatGPT, Cloudflare, or GitHub.
- Public plugin must work against another person's instance.
- Published knowledge is immutable; renderer/UI can evolve globally.
- Corrections create revisions rather than mutating immutable Results.
- Save/import remains explicit in MVP.
- No mandatory paid LLM API for the core product.
- Keep PRODUCT SUMMARY and DEVELOPMENT SUMMARY separate.
- Keep DASH short and operational.
- Keep OpenSpec current after every meaningful state change.
- Action-first workflow: progress independently until a real external/manual hinge appears, then ask only for that step.

Do not:

- redesign Feature 4 without new evidence;
- replace Universal MCP with per-user/template URLs casually;
- hard-code developer data;
- invent a ChatGPT connection/app id;
- archive Feature 4 while review/second-user tasks remain;
- declare MVP done because MCP works;
- restart identity verification while it is in review;
- mutate old immutable Result content for visual changes.

---

# NEXT CHAT FIRST INSTRUCTION

If identity is still in review:

> Read this handoff, `DASH.md`, and Feature 4 OpenSpec. Technical implementation is merged and green. Current blocker is OpenAI Platform Individual publisher verification (`Identity in review`). Do not redesign or repeat setup. Keep DASH/OpenSpec current and resume submission immediately when the user reports `Verified`.

When user reports `Verified`:

1. Confirm screenshot/status.
2. Update `DASH.md`, `demo/data/dash.json`, and Feature 4 `tasks.md`.
3. Continue OpenAI Platform plugin creation with Universal MCP.
4. Handle domain challenge token via `OPENAI_APPS_CHALLENGE`.
5. Scan tools and fill submission from `SUBMISSION.md`.
6. Submit for review and record state.
7. After approval, publish.
8. Run second-user acceptance.
9. Only then close Feature 4/MVP.

---

# SOURCE-OF-TRUTH INDEX

Operational:

- `DASH.md`
- `demo/data/dash.json`

Product:

- `docs/product-summary.md`
- `docs/roadmap.md`

Development:

- `docs/development-summary.md`
- `AGENTS.md`

OpenSpec:

- `openspec/changes/f4-plugin-directory-submission/proposal.md`
- `openspec/changes/f4-plugin-directory-submission/spec.md`
- `openspec/changes/f4-plugin-directory-submission/tasks.md`

Submission:

- `plugins/dashgpt/SUBMISSION.md`
- `plugins/dashgpt/.codex-plugin/plugin.json`
- `plugins/dashgpt/assets/logo.svg`

Architecture:

- `docs/adr/0001-shared-renderer-immutable-results.md`

Implementation/checks:

- `src/index.js`
- `scripts/smoke.mjs`
- `scripts/verify-results.mjs`
- `scripts/sync-dash.mjs`
- `.github/workflows/quality.yml`

If this handoff conflicts with current `develop`, current OpenSpec, or `DASH.md`, **the repository wins**.
