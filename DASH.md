# DashGPT — DASH

A living project status board. Keep this file short, current, and operational.

## NOW

**Active:** Feature 4 — release/submission phase for the public **DashGPT** plugin.

- PR #9 implementation is merged into `develop`.
- Production GitHub checks: **green**.
- Production Cloudflare Workers deploy: **green**.
- OpenSpec implementation tasks: **complete**.
- OpenAI Platform individual publisher verification: **Identity in review**.
- User action required now: **confirm organization role / Apps Management access while identity review completes**.

## DONE

- M0 repository/bootstrap and durable product/development summaries.
- M1 local-first Result → dashboard → Context Pack vertical slice.
- Feature 2 shared ChatGPT link → published Result.
- Production deployment at `/demo/` from `develop` through Cloudflare Workers.
- Stable standalone Result pages: `/demo/result/<id>/`.
- Shared renderer: presentation updates can improve old Result pages without changing their knowledge content.
- Published Results support explicit immutability metadata and SHA-256 integrity verification.
- CI guard rejects silent mutation/removal of immutable published Results.
- DashGPT MCP surface exists at `/mcp`.
- Stable plugin identity reserved: `dashgpt` / **DashGPT**.
- Mobile project-status view is live at `/demo/dash/`.
- Feature 4 OpenSpec has proposal + full spec + tracked tasks.
- Public plugin path uses the OpenAI Platform plugin submission flow rather than a developer-only ChatGPT connection.
- One Universal MCP endpoint can target a compatible user-selected DashGPT `siteUrl`.
- DashGPT instance protocol v1 provides public discovery, Result reads and Context Packs.
- Public support/privacy/terms surfaces and a submission packet with reviewer tests are prepared.
- Plugin package metadata is version 0.3.0 with an MVP brand asset.
- Deterministic second-instance smoke tests pass.
- PR #9 merged; production checks and Cloudflare deployment succeeded.

## NEXT

1. Confirm the OpenAI Platform publishing organization has a submitter with Apps Management write access; organization owners already satisfy this requirement.
2. Wait for the current Individual publisher identity review to complete; do not restart verification while it is in review.
3. Create **DashGPT** in the OpenAI Platform plugin submission flow using the production Universal MCP URL.
4. Complete domain verification using the portal challenge token.
5. Scan tools and fill listing, starter prompts, reviewer tests, availability and release notes from `plugins/dashgpt/SUBMISSION.md`.
6. Submit for OpenAI review.
7. After approval, publish DashGPT to the universal Plugins Directory.
8. Install/connect it from a second ChatGPT account against a separate DashGPT instance.
9. Prove list/read + Context Pack + explicit import/save on that person's data.
10. Only after that call the MVP complete and produce the `DashGPT v2` handoff.

## BLOCKERS / EXTERNAL HINGES

- OpenAI Platform Individual publisher verification is currently in review.
- Apps Management write access / owner status still needs confirmation for the submitting account.
- OpenAI review/approval and final publication are external steps.
- A second public DashGPT instance/person is required for the final MVP acceptance test.
- When a concrete manual action becomes necessary, record it here before asking the user to do it.

## RULES FOR THIS DASH

- Update after every meaningful merge, deployment, architecture decision, blocker, or external manual step.
- Keep **DONE / NOW / NEXT / BLOCKERS** separate.
- Keep the phone mirror `demo/data/dash.json` synchronized with this file; CI must reject drift.
- Do not duplicate product requirements from `docs/product-summary.md` or development process from `docs/development-summary.md`.
- Prefer links/PR numbers/branches over long narrative history.
- This file is operational state, not an immutable Result.
