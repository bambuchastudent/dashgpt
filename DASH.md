# DashGPT — DASH

A living project status board. Keep this file short, current, and operational.

## NOW

**Active internal work:** Feature 6 — zero-install privacy, personalization and portable sync.

- PR #11 is open from `feature/f6-zero-install-private-sync` into `develop`.
- PR #11 is architecture/spec only; no runtime implementation is included yet.
- OpenSpec proposal/spec/tasks define chat-first unpaired mode, Vault v1, storage-link discovery, privacy boundaries and phased adapters.
- ADR 0003 records that ChatGPT-native context is optional personalization context, not the authoritative DashGPT Result database.
- Product Summary and roadmap are aligned with zero-install onboarding and user-owned storage.
- External release track remains Feature 4: the public DashGPT plugin implementation is already merged and publisher verification is complete.

## DONE

- M0 repository/bootstrap and durable product/development summaries.
- M1 local-first Result → dashboard → Context Pack vertical slice.
- Feature 2 shared ChatGPT link → published Result.
- Stable standalone Result pages at `/demo/result/<id>/` with shared renderer and immutable-content verification.
- DashGPT MCP surface exists at `/mcp` with stable plugin identity `dashgpt` / **DashGPT**.
- Universal MCP routing and DashGPT instance protocol v1 are implemented.
- Public support/privacy/terms surfaces and plugin submission packet are prepared.
- PR #9 merged; production GitHub checks and Cloudflare deployment succeeded.
- OpenAI Platform publisher access and Individual publisher identity are verified.
- Semantic Result card/continuation-first work is present in the current code/spec state.
- Feature 6 architecture captured in OpenSpec + ADR + Product Summary + roadmap on PR #11.

## NEXT

1. Review and merge PR #11 architecture before runtime storage changes.
2. Implement Feature 6 Slice A: Vault v1 core, local/browser adapter, migration from current browser storage, export/import and sync status.
3. Implement GitHub sync against the same vault/adapter contract.
4. Implement Google Drive sync against the same contract.
5. Add explicit inspectable DashGPT Profile and preference-promotion boundary.
6. Refactor compatible DashGPT instance storage onto the same vault abstraction and add provider switch/mirror UX.
7. Separately resume the Feature 4 external submission flow in OpenAI Platform when desired.

## BLOCKERS / EXTERNAL HINGES

- Feature 6 architecture has no external blocker; implementation should not begin by making a provider-specific database canonical.
- Writable GitHub and Google Drive adapters will require explicit provider authorization flows; users must not paste long-lived secrets into chat.
- ChatGPT Memory/Project context is intentionally not assumed to provide app-owned durable Result storage.
- Public plugin review/approval and final publication remain external Feature 4 hinges.
- When a concrete manual action becomes necessary, record it here before asking the user to do it.

## RULES FOR THIS DASH

- Update after every meaningful merge, deployment, architecture decision, blocker, or external manual step.
- Keep **DONE / NOW / NEXT / BLOCKERS** separate.
- Keep the phone mirror `demo/data/dash.json` synchronized with this file; CI must reject drift.
- Do not duplicate product requirements from `docs/product-summary.md` or development process from `docs/development-summary.md`.
- Prefer links/PR numbers/branches over long narrative history.
- This file is operational state, not an immutable Result.
