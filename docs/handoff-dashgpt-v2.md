# DashGPT v2 — handoff for the next chat / agent

> Interim continuity handoff created on 2026-08-09 while Feature 4 is waiting on OpenAI publisher identity verification. This file is **not** a declaration that the MVP is complete.

## 0. Start here

Repository: `bambuchastudent/dashgpt`

Working branch for normal product state: `develop`

Live production:

- Dashboard: `https://dashgpt.dimkashir.workers.dev/demo/`
- Mobile project status: `https://dashgpt.dimkashir.workers.dev/demo/dash/`
- Universal MCP: `https://dashgpt.dimkashir.workers.dev/mcp`
- DashGPT discovery: `https://dashgpt.dimkashir.workers.dev/.well-known/dashgpt.json`

Current chat share URL: **PENDING**. The assistant cannot read the browser URL for the current private ChatGPT conversation. If continuity through the original chat is desired, paste `Share → Copy link` here later.

### Instruction to the next agent

1. Read this file.
2. Read `DASH.md` for operational state.
3. Read `docs/product-summary.md` for **WHAT** DashGPT is.
4. Read `docs/development-summary.md` for **HOW** DashGPT is built.
5. Read the active OpenSpec change:
   - `openspec/changes/f4-plugin-directory-submission/proposal.md`
   - `openspec/changes/f4-plugin-directory-submission/spec.md`
   - `openspec/changes/f4-plugin-directory-submission/tasks.md`
6. Read `plugins/dashgpt/SUBMISSION.md` before touching the OpenAI submission flow.
7. Do not redesign the product, archive Feature 4, or declare MVP complete until the second-user acceptance test passes.

---

# 1. PRODUCT SUMMARY — WHAT WE BUILD

DashGPT is a private, result-first personal dashboard for useful AI outcomes and portable context between chats/agents.

Core idea:

- **Result-first, not chat-first.** Raw conversation is a source, not the main durable object.
- A saved Result must contain enough distilled context that a human or another agent can continue without rereading the original chat.
- ChatGPT is an important client, but not the system of record.
- User-owned context, provider-neutral core, open exports, local-first/cloud-optional.
- Mobile should explain the current state concisely; laptop can expose deeper structure.

Primary entities:

- **Result** — title, summary, category/tags, decisions, next step, source/provenance, immutable content metadata, related assets/context.
- **Context Pack** — portable continuation context for another chat or agent.
- **Project** — structured project state/results/decisions/specs.
- **Source** — ChatGPT shared chat, URL, repo, file, image, etc.
- **Asset** — image/file attached to durable knowledge.

Dashboard behavior already demonstrated:

- categories/tags/search/favorites;
- Result detail pages;
- Context Pack generation;
- mobile project-status view;
- Result pages can visually evolve without mutating old knowledge content.

Important UX note from user feedback:

- current UI is convenient but visually rough;
- do not over-polish prematurely;
- visual language, card design, mobile navigation and hierarchy remain a later product-design task.

MVP acceptance criterion is stronger than “works on developer account”:

> Another person must be able to install/connect the public **DashGPT** plugin, point it at that person's own compatible DashGPT site, read their Results, obtain a Context Pack, and explicitly save/import a new Result into their own DashGPT.

Only after that is the MVP complete.

---

# 2. DEVELOPMENT SUMMARY — HOW WE BUILD

Development is spec-driven and repository-centered.

Rules:

- Git/repo = durable project memory.
- OpenSpec = current change/spec/task lifecycle.
- Agents are replaceable; project state is not.
- Keep `AGENTS.md` short; detailed workflow belongs in specs/skills.
- Use strong models for architecture/spec review/hard debugging; cheaper/local models are acceptable for mechanical implementation when quality is sufficient.
- Ground changes against repo/code/tests, not chat memory.
- Explicit handoffs are required.

Tooling direction:

- OpenSpec: required baseline.
- Git/tests/CI: objective verification.
- Serena: optional preferred symbol-aware navigation/editing.
- Graphify/CodeGraphContext: optional structural context reduction when repo size justifies it.
- Beads: optional later if multi-agent task dependencies outgrow OpenSpec tasks.
- Agent Skills: portable workflow layer across providers.

Documentation separation must remain strict:

- `docs/product-summary.md` = WHAT.
- `docs/development-summary.md` = HOW.
- `docs/roadmap.md` = milestone ordering.
- OpenSpec = scoped active change.
- ADRs = durable architecture rationale.
- `DASH.md` = short operational NOW / DONE / NEXT / BLOCKERS.

---

# 3. WHAT HAS BEEN BUILT

## M0 / bootstrap

- private GitHub repo created;
- durable product/development summaries;
- roadmap and agent instructions;
- Cloudflare Workers Git deployment wired to `develop` for production.

## M1 — local-first Result vertical slice

Working demo supports:

- create Result;
- browser-local persistence;
- browse/search/filter;
- favorite;
- details;
- generate/copy Context Pack.

## Feature 2 — shared ChatGPT link → published Result

A public ChatGPT share URL can be fetched server-side and turned into a durable published Result.

Real examples were added, including:

- DashGPT project-summary Result;
- cold soups Result;
- chicken Kyiv Result from a shared ChatGPT conversation;
- camping/fishing Result from another shared conversation.

The shared-chat reader was moved into the Worker because direct browser/tool fetching of dynamic `chatgpt.com/share` pages was unreliable.

## Feature 3 — immutable Result pages + shared renderer + MCP foundation

Implemented:

- stable Result pages: `/demo/result/<id>/`;
- one shared renderer for old/new Result pages;
- presentation changes update old pages without mutating their content;
- immutable Result metadata:
  - `schemaVersion`
  - `immutable`
  - `contentVersion`
  - `contentHash`
- deterministic SHA-256 verification in CI and browser;
- old immutable Results must be revised by creating a new revision, not silently edited;
- MCP endpoint at `/mcp` using the official MCP SDK / Cloudflare Agents MCP handler;
- plugin identity reserved as `dashgpt` / **DashGPT**;
- privacy/terms/support surfaces;
- OpenAI domain-verification challenge endpoint.

Architecture rationale is in:

- `docs/adr/0001-shared-renderer-immutable-results.md`

## Mobile DASH

Operational project state is visible at:

`https://dashgpt.dimkashir.workers.dev/demo/dash/`

Source of truth:

- `DASH.md`

Mobile mirror:

- `demo/data/dash.json`

Sync checker:

- `scripts/sync-dash.mjs`

CI rejects drift between `DASH.md` and the phone mirror.

---

# 4. FEATURE 4 — PUBLIC DASHGPT PLUGIN

Feature 4 implementation is merged into `develop`.

Previous stale PR #7 was superseded and closed.

Final implementation PR:

- PR #9 — `Feature 4: public DashGPT plugin + universal instance gateway`
- merged into `develop` after checks passed.

## Key architecture

Public plugin uses **one Universal MCP endpoint**:

`https://dashgpt.dimkashir.workers.dev/mcp`

It must not be hard-coded to developer data.

Read/context MCP tools accept optional `siteUrl`, allowing the same public plugin to operate against another compatible DashGPT site.

DashGPT instance protocol v1:

- `GET /.well-known/dashgpt.json`
- `GET /api/dashgpt/results`
- `GET /api/dashgpt/results/<id>`
- `GET /api/dashgpt/context/<id>`

Remote site requirements:

- HTTPS;
- compatible DashGPT discovery manifest;
- public protocol endpoints above.

Current MCP tools:

- `list_results`
- `get_result`
- `get_context_pack`
- `prepare_result_import`

`prepare_result_import` does **not** silently write external state. It creates an immutable payload + explicit `/demo/#import=...` link that the user opens to import into the selected DashGPT site.

This explicit import is intentionally the MVP write path; no auth/database write API is required yet.

## Submission package

Primary runbook:

- `plugins/dashgpt/SUBMISSION.md`

Package metadata:

- `plugins/dashgpt/.codex-plugin/plugin.json`
- current package/plugin version: `0.3.0`
- public name: **DashGPT**
- stable id: `dashgpt`
- category: Productivity
- authentication for current MVP submission: None
- no embedded MCP UI component in this version

Submission packet already contains:

- listing copy;
- website/support/privacy/terms URLs;
- logo asset reference;
- starter prompts;
- 5 positive reviewer tests;
- 3 negative reviewer tests;
- tool annotation expectations;
- domain-verification instructions;
- release notes;
- portal runbook.

Availability regions remain intentionally `TBD at submission time` until publisher/support/legal readiness is reviewed.

---

# 5. OPENSPEC STATUS — VERIFIED CURRENT

Active change:

`openspec/changes/f4-plugin-directory-submission/`

Files verified immediately before this handoff:

- `proposal.md` — current public-plugin goal and second-user MVP criterion.
- `spec.md` — Universal MCP architecture, instance protocol, tool behavior, privacy/safety, submission and acceptance requirements.
- `tasks.md` — current implementation/manual checklist.

OpenSpec is **not archived** because Feature 4 is not complete.

## Completed OpenSpec tasks

All technical implementation work is checked off, including:

- public plugin requirements audit;
- correct OpenAI Platform submission path;
- Universal MCP choice;
- instance protocol and second-user criteria;
- instance-neutral `siteUrl` routing;
- discovery/result/context public endpoints;
- MCP annotations;
- local + remote smoke tests;
- support/privacy updates;
- plugin metadata/brand asset;
- full submission packet;
- Cloudflare preview + production-shaped MCP smoke verification;
- merge into `develop`;
- OpenAI publisher permission check;
- interim DashGPT v2 continuity handoff.

OpenAI publisher permission is closed because the submitting account is confirmed as **Organization Owner**, which satisfies Apps Management write access.

## Remaining OpenSpec tasks

1. **Publisher identity verification**
   - current state: `Individual — Identity in review`;
   - observed Platform behavior on 2026-08-09: `Create plugin → With MCP` redirects back to Organization verification and creates no draft while identity is in review;
   - do not restart verification while it remains in review.

2. **After identity becomes Verified**
   - OpenAI Platform → Plugins;
   - Create plugin;
   - With MCP;
   - Universal;
   - MCP URL: `https://dashgpt.dimkashir.workers.dev/mcp`;
   - Authentication: None.

3. **Domain verification**
   - portal will provide a challenge token;
   - set Cloudflare Worker environment/secret `OPENAI_APPS_CHALLENGE` to exactly that token;
   - Worker already exposes `/.well-known/openai-apps-challenge` and returns the configured token;
   - complete verification in the portal.

4. **Scan Tools**
   - verify four tool names/schemas/annotations against `SUBMISSION.md`.

5. **Fill the submission**
   - listing copy;
   - verified Developer Identity;
   - starter prompts;
   - 5 positive tests;
   - 3 negative tests;
   - availability regions;
   - release notes;
   - required attestations.

6. **Submit for OpenAI review.**

7. **After approval, publish** DashGPT to the universal Plugins Directory.

8. **Second-user MVP test**
   - use another ChatGPT account/person;
   - use a separate compatible DashGPT instance;
   - install/connect public DashGPT;
   - prove list/read on that person's Results;
   - prove Context Pack retrieval;
   - prove explicit save/import to that person's site.

9. Only after step 8:
   - mark MVP complete;
   - archive/sync Feature 4 OpenSpec as appropriate;
   - produce final completion/release handoff.

---

# 6. CURRENT EXTERNAL BLOCKER

As of 2026-08-09 18:16 (+02:00):

- OpenAI Platform organization role: **Owner** — permission requirement satisfied.
- Individual publisher verification: **Identity in review**.
- Clicking `Create plugin → With MCP` currently redirects back to Organization verification and does not create a draft.

Therefore **no productive manual submission action is available until identity becomes Verified**.

Do not ask the user to re-run identity verification or create special roles.

When status becomes `Verified`, continue directly with the submission steps in section 5.

---

# 7. CLOUD / DEPLOYMENT STATE

Cloudflare Worker/project: `dashgpt`

Production branch: `develop`

Stable user-facing route:

`https://dashgpt.dimkashir.workers.dev/demo/`

Rule established by user:

- latest working product is always at `/demo/`;
- if historical snapshots are ever needed, use `/demo/v1/`, `/demo/v2/`, etc.;
- do not make the user open long feature-branch preview domains for normal use.

Cloudflare previews are still useful internally for CI/review but should not be the normal user entry point.

Production checks and Cloudflare deploy were green after Feature 4 merge.

---

# 8. IMPORTANT PRODUCT / PROCESS DECISIONS

- Do not couple the domain model to ChatGPT, Cloudflare or GitHub.
- Public plugin must work against another person's instance, not only developer demo data.
- Published knowledge content is immutable; renderer/UI can evolve globally.
- Result content hash covers durable knowledge fields, not presentation/local UI state.
- Corrections create new revisions instead of mutating old immutable Results.
- Save/import remains explicit in MVP.
- No mandatory paid LLM API for the core product.
- Public/self-hosted Git/storage provider should remain replaceable.
- Keep PRODUCT SUMMARY and DEVELOPMENT SUMMARY separate.
- Keep DASH operational and short.
- Keep OpenSpec current as implementation/manual status changes.
- User prefers action-first workflow: progress independently until a genuinely external manual step is required, then ask only for that step.

---

# 9. WHAT NOT TO DO NEXT

Do **not**:

- create a new Feature 4 architecture;
- replace Universal MCP with per-user/template MCP URLs without new evidence;
- hard-code developer Result data into the public plugin;
- invent a ChatGPT connection/app id;
- archive Feature 4 while identity/review/second-user tasks remain;
- declare MVP finished just because the production MCP works;
- ask the user to create roles — Owner permission is already confirmed;
- ask the user to restart Individual verification while it says `Identity in review`;
- mutate already published immutable Result content for visual changes.

---

# 10. NEXT CHAT — FIRST MESSAGE / EXECUTION PLAN

Recommended next-agent response if identity is still in review:

> Read `docs/handoff-dashgpt-v2.md`, `DASH.md`, and the Feature 4 OpenSpec. The technical implementation is merged and green. Current external blocker is OpenAI Platform Individual publisher verification (`Identity in review`). Do not redesign or repeat setup steps. Keep DASH/OpenSpec current and resume submission immediately when the user reports `Verified`.

Recommended next-agent execution once user reports `Verified`:

1. Confirm screenshot/status shows Verified.
2. Update `DASH.md`, `demo/data/dash.json`, and Feature 4 `tasks.md` to mark identity verification complete.
3. Guide user to OpenAI Platform → Plugins → Create plugin → With MCP → Universal.
4. Use production MCP URL `https://dashgpt.dimkashir.workers.dev/mcp` and Authentication None.
5. When portal gives domain challenge token, configure `OPENAI_APPS_CHALLENGE` in Cloudflare and verify endpoint.
6. Scan tools and compare with `plugins/dashgpt/SUBMISSION.md`.
7. Fill listing/tests/prompts/availability/release notes.
8. Submit for review and record submission state in DASH + OpenSpec.
9. After approval, publish and run the second-person acceptance test.
10. Only then close Feature 4/MVP and prepare the final release handoff.

---

# 11. SOURCE-OF-TRUTH INDEX

Operational state:

- `DASH.md`
- `demo/data/dash.json`

Product:

- `docs/product-summary.md`
- `docs/roadmap.md`

Development:

- `docs/development-summary.md`
- `AGENTS.md`

Active Feature 4 OpenSpec:

- `openspec/changes/f4-plugin-directory-submission/proposal.md`
- `openspec/changes/f4-plugin-directory-submission/spec.md`
- `openspec/changes/f4-plugin-directory-submission/tasks.md`

Submission:

- `plugins/dashgpt/SUBMISSION.md`
- `plugins/dashgpt/.codex-plugin/plugin.json`
- `plugins/dashgpt/assets/logo.svg`

Architecture:

- `docs/adr/0001-shared-renderer-immutable-results.md`

Implementation / verification:

- `src/index.js`
- `scripts/smoke.mjs`
- `scripts/verify-results.mjs`
- `scripts/sync-dash.mjs`
- `.github/workflows/quality.yml`

Live status on phone:

- `https://dashgpt.dimkashir.workers.dev/demo/dash/`

---

## Final continuity rule

If any fact in this handoff conflicts with current `develop`, current OpenSpec, or `DASH.md`, **the repository wins**. Re-read the repo before acting.
