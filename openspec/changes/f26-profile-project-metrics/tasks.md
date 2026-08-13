# Feature 26 — Tasks

- [x] Inspect current product model, topbar, ChatGPT history importer, Vault v1 profile storage, remote object layout, and verification scripts.
- [x] Capture Feature 26 as GitHub issue #57 and dedicated OpenSpec change.
- [ ] Strictly validate `f26-profile-project-metrics` before production-code changes. GitHub Actions cannot execute the job (`runner_id: 0`, no steps); the change was checked against the current strict-validator contract using the established F25 infrastructure fallback, but this is not recorded as a successful CLI validation.
- [x] Add deterministic `visible-text-v1` token estimator and tests.
- [x] Preserve usage/provenance through ChatGPT candidate sanitization and portable Vault via the existing `result.usage` envelope.
- [x] Add project-metrics profile revision creation, validation, latest materialization, and token aggregation helpers.
- [x] Add compact topbar Profile / Профиль and hideable metrics header.
- [x] Add explicit spent/donated/currency editor using integer minor units.
- [x] Add RU/EN copy, accessibility states, and 360px responsive styles.
- [x] Add Vault export/import/object-layout and same-Vault merge regression coverage.
- [x] Add browser/UI regression coverage for disclosure, collapse persistence, editing, and 360px overflow.
- [ ] Run targeted verification. Regression scripts are registered, but the current GitHub Actions runner exits before checkout and the local environment cannot resolve GitHub to obtain a runnable checkout.
- [ ] Run `npm run verify:full` once before merge.
- [ ] Verify production preview on desktop and 360px mobile.
- [ ] Reconcile current-state docs and PR evidence before merge.
