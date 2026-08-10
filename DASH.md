# DashGPT — DASH

A living project status board. Keep this file short, current, and operational.

## NOW

**Active internal work:** Feature 6 Slice B — production GitHub Vault activation.

- Feature 6 architecture PR #11, Vault core PR #12 and GitHub sync implementation PR #13 are merged into `develop`.
- GitHub sync implementation is CI-green, including empty-repository initialization and idempotent re-sync.
- Public GitHub App is registered: App ID `4544269`, slug `dashgpt-storage`; these non-secret identifiers are configured as Worker vars.
- GitHub repository/folder StorageLocators, GitHub App pairing, signed HttpOnly pairing state, server-side installation tokens and Vault v1 synchronization are implemented.
- GitHub sync writes provider-neutral Vault files and creates one atomic Git commit per logical sync after initial empty-repository bootstrap.
- Browser UI never asks for a PAT/token; local Vault remains usable when GitHub is unavailable or unconfigured.
- ADR 0004 is accepted.
- Production activation runbook: `docs/github-storage-setup.md`.
- Remaining Slice B external gate: configure `GITHUB_APP_PRIVATE_KEY` and `GITHUB_SESSION_SECRET` on the production Worker, then run one real private-repository smoke test.
- External release track remains Feature 4: the public DashGPT plugin implementation is merged and publisher verification is complete.

## DONE

- M0 repository/bootstrap and durable product/development summaries.
- M1 local-first Result → dashboard → Context Pack vertical slice.
- Feature 2 shared ChatGPT link → published Result.
- Stable standalone Result pages with shared renderer and immutable-content verification.
- DashGPT MCP surface at `/mcp` with stable plugin identity `dashgpt` / **DashGPT**.
- Universal MCP routing and DashGPT instance protocol v1.
- Semantic Result card/continuation-first UX.
- Feature 6 zero-install/privacy/storage architecture in OpenSpec + ADR 0003, merged via PR #11.
- Feature 6 Slice A Vault v1 local core/migration, export/import and append-only state events, merged via PR #12.
- Feature 6 Slice B GitHub storage adapter implementation, privacy guards and deterministic adapter tests, merged via PR #13.
- Public DashGPT GitHub App registered with selected-repository installation model.

## NEXT

1. Configure `GITHUB_APP_PRIVATE_KEY` and `GITHUB_SESSION_SECRET` on the production Worker without putting secrets in chat/repository/Vault.
2. Install `dashgpt-storage` on one disposable/private test repository and prove real pair → sync → idempotent re-sync → disconnect while local Vault survives.
3. Mark Slice B fully activated only after that real smoke test.
4. Start Slice C in a new PR: Google Drive StorageLocator + authorization + adapter contract reuse.
5. Then implement explicit inspectable DashGPT Profile / preference-promotion boundary in Slice D.
6. Refactor compatible DashGPT instance storage onto the same abstraction and add provider switch/mirror UX in Slice E.
7. Separately resume the Feature 4 external OpenAI plugin submission flow when desired.

## BLOCKERS / EXTERNAL HINGES

- GitHub App registration is complete; production GitHub sync activation now requires only the private key + session-signing Worker secret and a real repository smoke test.
- GitHub App private key and session secret must never be pasted into chat, committed to Git or serialized into a Vault.
- Google Drive authorization remains future Slice C work.
- ChatGPT Memory/Project context is not assumed to provide app-owned durable Result storage.
- Public plugin review/approval and final publication remain external Feature 4 hinges.
- When a concrete manual action becomes necessary, record it here before asking the user to do it.

## RULES FOR THIS DASH

- Update after every meaningful merge, deployment, architecture decision, blocker, or external manual step.
- Keep **DONE / NOW / NEXT / BLOCKERS** separate.
- Keep the phone mirror `demo/data/dash.json` synchronized with this file; CI must reject drift.
- Do not duplicate product requirements from `docs/product-summary.md` or development process from `docs/development-summary.md`.
- Prefer links/PR numbers/branches over long narrative history.
- This file is operational state, not an immutable Result.