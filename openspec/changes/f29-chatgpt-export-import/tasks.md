# Tasks — F29 ChatGPT export import

## OpenSpec
- [x] Create dedicated issue and branch.
- [x] Define proposal, design, and spec delta before production edits.
- [ ] Inspect current import, Vault, card provenance, storage, and tests.
- [ ] Complete Impact Manifest and validate the change structure.

## Implementation
- [ ] Add a local ChatGPT export parser for supported JSON/archive inputs.
- [ ] Normalize exported conversation message trees into stable conversation records.
- [ ] Reuse canonical card creation/provenance and deduplicate against live-import cards.
- [ ] Add recommended full-history file import to the existing import operation UX.
- [ ] Persist progress in bounded batches and isolate malformed records.
- [ ] Keep existing live import available as the optional quick path.

## Tests
- [ ] Standard conversations JSON.
- [ ] Larger numbered conversation files.
- [ ] Archive input.
- [ ] Repeat import is idempotent.
- [ ] Prior live-import card is deduplicated.
- [ ] Malformed conversation does not discard successful work.
- [ ] File input stays local.
- [ ] Mobile/import progress UI regression.

## Verification
- [ ] Run targeted verification.
- [ ] Run OpenSpec validation when executable infrastructure permits.
- [ ] Run canonical `npm run verify:full` once before merge where applicable.
- [ ] Verify Cloudflare preview and mobile viewport.
- [ ] Merge to `develop` with actual verification state recorded.
