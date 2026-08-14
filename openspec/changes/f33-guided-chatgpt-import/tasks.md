# Tasks — F33 Guided ChatGPT history import

## Spec / design gate

- [x] Inspect current F29 official export importer, F20/F23 live import surfaces, populated-Vault discoverability, Storage labels, remote-provider sync, F28 semantic enrichment, and mobile layout.
- [x] Create dedicated F33 OpenSpec proposal, design, spec delta, tasks, and Impact Manifest before production edits.
- [x] Run strict OpenSpec validation for `f33-guided-chatgpt-import` before production-code edits. GitHub Actions could not start any steps because of the repository billing/spending-limit blocker, so the exact strict command was run through a temporary validation-only Cloudflare `postinstall`; Cloudflare successfully built commit `bcea9dca52ca833a144df2e8b09a7d32c711a004`, and the validation-only hook was removed immediately afterward.

## Implementation

- [x] Add a focused guided-import UI module that reuses `importChatGptExportFiles()` rather than duplicating parser/import logic.
- [x] Add a permanent secondary `Import ChatGPT` entry for the personal dashboard.
- [x] Add a separate ChatGPT-history import section to Storage.
- [x] Add the three-step official export guide, local-only privacy copy, official help link, and supported ZIP/JSON copy.
- [x] Show reading/importing/completion/error progress through the guided entry.
- [x] Preserve the existing live importer as a secondary quick/recent action.
- [x] Rename Storage Vault actions to `Export DashGPT Vault` and `Import DashGPT Vault` without changing Vault behavior.
- [x] Preserve existing optional remote Vault synchronization after successful local import.

## Regression coverage

- [x] Add deterministic/browser coverage for the permanent entry on a populated Vault, Storage disambiguation, JSON/ZIP import, deduplication, local-only network behavior, F28 semantic enrichment, and 360px overflow.
- [ ] Execute the committed Playwright regression proving the populated-Vault entry and Storage labels in a supported browser runner.
- [ ] Execute the committed Playwright JSON import twice and prove one canonical card remains.
- [ ] Execute the committed Playwright ZIP import and prove existing semantic enrichment is preserved.
- [ ] Execute the committed browser assertion that the guided file-import path emits no archive POST/PUT/PATCH.
- [ ] Execute the committed 360px viewport assertion with no horizontal overflow.

## Verification / handoff

- [x] Run targeted syntax/deterministic checks for changed modules/tests. `npm run verify:fast` completed successfully inside the Cloudflare build for verification-only commit `14590fb07a0ecea0dd29521c581aae527e043d25`.
- [x] Run `npm run verify:fast` with the new F33 verifier registered in the canonical fast gate; Cloudflare deployment succeeded only after that gate completed.
- [ ] Run canonical `npm run verify:full` once before merge. GitHub Actions still cannot start jobs because of the account billing/spending-limit blocker.
- [ ] Execute Playwright/browser acceptance in an environment able to launch Chromium. Cloudflare can download the Chromium bundle (`5540c113208e36cf02406db484fc950da63b9384`) but a minimal headless `chromium.launch()` fails in that build environment (`207ca0d3fd9d628c8f06f2048cb8ce06224eaa25`), so the failed Cloudflare Playwright attempts are environment evidence, not a product-test result.
- [x] Verify the final clean Cloudflare branch preview after diagnostic hooks are removed. Commit `f6f73e3a9bd19c52c24c5524c6107d608ac99a14` deployed successfully and the branch preview is available at `https://feature-f33-guided-chatgpt-import-dashgpt.dimkashir.workers.dev`.
- [x] Keep the PR draft while the mandatory full/browser gate remains unavailable; no browser-pass claim is made.
