# Tasks — F29 ChatGPT export import

## OpenSpec
- [x] Create dedicated issue and branch.
- [x] Define proposal, design, and spec delta before production edits.
- [x] Inspect current F20/F24 import behavior, canonical Vault/card provenance, storage composition, bootstrap order, and import verification.
- [x] Complete canonical `impact-manifest.md`.
- [x] Structural validation before production edits: one `## ADDED Requirements` delta; every requirement uses SHALL; every scenario uses WHEN/THEN; no schema/provider/card-type widening.

## Implementation
- [x] Add local ChatGPT export parsing for JSON and supported ZIP inputs.
- [x] Normalize exported conversation message trees into stable conversation records.
- [x] Reuse canonical card creation/provenance and deduplicate against live-import cards.
- [x] Add recommended full-history file import to the existing import operation UX.
- [x] Persist progress in bounded batches and isolate malformed records.
- [x] Keep existing live import available as the optional quick path.

## Test coverage committed
- [x] Standard conversations JSON and numbered conversation files.
- [x] ZIP input.
- [x] Repeat import idempotency and prior live-import deduplication.
- [x] Malformed conversation isolation.
- [x] Local file path and 360px UI regressions.

## Verification
- [x] Cloudflare Workers build succeeds for the branch preview.
- [ ] GitHub `check` / executable OpenSpec validation: blocked before project steps by the repository account billing/spending state.
- [ ] Canonical `npm run verify:full`: not executed because the GitHub Actions job cannot start and the current execution container cannot resolve GitHub to clone the repository.
- [ ] Real user export acceptance with an OpenAI-generated archive.
- [ ] Merge to `develop` with the unavailable gates recorded accurately.
