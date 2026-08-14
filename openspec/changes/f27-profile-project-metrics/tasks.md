# Tasks — F27 Profile project metrics

## Spec / design gate
- [x] Rebase the existing F27 OpenSpec change onto current `develop` without production code.
- [x] Re-inspect overlap with canonical Cards, Vault profile revisions, current F25/F26 history import, semantic enrichment, link-first/export import, general-user dashboard/profile UI, remote sync and F32 Gallery.
- [x] Update design and Impact Manifest so F27 adapts to the current F26 runner and cannot restore stale import/bootstrap code.
- [x] Strictly validate `f27-profile-project-metrics` on this spec-only branch before any production edits.

## Implementation
- [x] Transplant the profile metrics model/UI/verifier from the old branch without stale bootstrap or runner snapshots.
- [x] Add deterministic `visible-text-v1` estimated token usage to the current canonical-card import path.
- [x] Preserve current stable identity and allow same-timestamp usage-only enrichment only for a card that lacks valid usage.
- [x] Ensure already-enriched cards resume normal freshness and are not repeatedly fetched for backfill.
- [x] Store spent/donated/currency only in existing Vault v1 profile revisions as explicit user-entered values.
- [x] Keep Project/Profile metrics collapsible, RU/EN, 360px-safe, and outside internal Product Board navigation.

## Regression coverage
- [x] Verify deterministic token estimation and provenance.
- [x] Verify same-source re-import and legacy usage backfill do not duplicate cards or double-count totals.
- [x] Verify current F25/F26 retry/freshness behavior remains intact.
- [x] Verify profile revision portability and remote-object layout compatibility.
- [x] Verify user-entered money validation, localization, collapse persistence and mobile no-overflow.

## Verification / release
- [x] Run targeted F27 deterministic verification on the implementation head.
- [x] Run current import verification including F25/F26 gates.
- [ ] Run canonical `npm run verify:full` once on the final head when an executable browser runner is available; record external GitHub billing failure separately rather than calling it a code failure.
- [x] Restore production build config after removing the temporary verification hook.
- [ ] Close old conflict-blocked PR #63 as superseded only after the clean replacement is ready/merged.
