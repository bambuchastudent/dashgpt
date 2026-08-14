# Tasks

- [x] Complete strict structural OpenSpec validation before production-code edits; official OpenSpec CLI Action remains queued behind the shared self-hosted runner backlog.
- [x] Add one shared browser URL normalizer for classic and Project shared-chat routes while preserving existing delegated compatibility behavior.
- [x] Extend backend shared-chat canonicalization to preserve supported Project routes and only the allowed routing query parameter.
- [x] Keep existing resolver fallbacks and human unreadable-share behavior for membership/authentication-gated Project links.
- [x] Add regression coverage for the reported `/g/.../shared/c/...` URL shape, legacy/classic compatibility, malformed/private URL rejection, canonical provenance, and resolver fallback routing.
- [x] Run targeted shared-chat verification: syntax checks plus `scripts/verify-project-shared-chat-links.mjs` pass.
- [ ] Run canonical `npm run verify:full` once before merge. GitHub Action is queued and has not executed on the F45 head; the repository already has a documented baseline browser readiness timeout on unrelated `develop` runs.
- [ ] Verify Save chat in a production preview at desktop and 390px with a Project shared-chat URL. No F45 preview deployment has been confirmed from the available integration.
- [ ] Merge the dedicated PR to `develop` only after required verification succeeds or a repository-wide baseline/infrastructure gate failure is proven unrelated and documented.
