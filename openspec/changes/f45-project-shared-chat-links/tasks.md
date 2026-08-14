# Tasks

- [ ] Validate `f45-project-shared-chat-links` with strict OpenSpec validation before production-code edits.
- [ ] Add one shared browser URL normalizer for classic and Project shared-chat routes while preserving the existing public-onboarding export contract.
- [ ] Extend backend shared-chat canonicalization to preserve supported Project routes and only the allowed routing query parameter.
- [ ] Keep existing resolver fallbacks and human unreadable-share behavior for membership/authentication-gated Project links.
- [ ] Add regression coverage for the reported `/g/.../shared/c/...` URL shape, legacy/classic compatibility, malformed/private URL rejection, canonical provenance, and resolver fallback routing.
- [ ] Run targeted shared-chat and UI verification.
- [ ] Run canonical `npm run verify:full` once before merge.
- [ ] Verify Save chat in the production preview at desktop and 390px with a Project shared-chat URL.
- [ ] Merge the dedicated PR to `develop` only after required verification succeeds or a repository-wide baseline gate failure is proven unrelated and documented.
