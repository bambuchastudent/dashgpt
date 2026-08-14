# Tasks — F33 Guided ChatGPT history import

## Spec / design gate

- [x] Inspect current F29 official export importer, F20/F23 live import surfaces, populated-Vault discoverability, Storage labels, remote-provider sync, F28 semantic enrichment, and mobile layout.
- [x] Create dedicated F33 OpenSpec proposal, design, spec delta, tasks, and Impact Manifest before production edits.
- [ ] Run strict OpenSpec validation for `f33-guided-chatgpt-import` and record the result before production-code edits.

## Implementation

- [ ] Add a focused guided-import UI module that reuses `importChatGptExportFiles()` rather than duplicating parser/import logic.
- [ ] Add a permanent secondary `Import ChatGPT` entry for the personal dashboard.
- [ ] Add a separate ChatGPT-history import section to Storage.
- [ ] Add the three-step official export guide, local-only privacy copy, official help link, and supported ZIP/JSON copy.
- [ ] Show reading/importing/completion/error progress through the guided entry.
- [ ] Preserve the existing live importer as a secondary quick/recent action.
- [ ] Rename Storage Vault actions to `Export DashGPT Vault` and `Import DashGPT Vault` without changing Vault behavior.
- [ ] Preserve existing optional remote Vault synchronization after successful local import.

## Regression coverage

- [ ] Add deterministic/browser coverage proving the permanent entry is visible for a populated Vault.
- [ ] Prove Storage visibly distinguishes ChatGPT history import from DashGPT Vault import.
- [ ] Import a compatible `conversations.json` through the permanent entry and prove canonical card creation.
- [ ] Import the same JSON twice through the permanent entry and prove no duplicate canonical card.
- [ ] Import a compatible ZIP through the permanent entry and prove existing semantic enrichment is preserved.
- [ ] Assert no archive upload POST/PUT/PATCH is introduced by the guided file-import path.
- [ ] Verify the guided flow at a 360px viewport with no horizontal overflow.

## Verification / handoff

- [ ] Run targeted syntax/deterministic checks for changed modules/tests.
- [ ] Run `npm run verify:fast` when executable infrastructure is available.
- [ ] Run canonical `npm run verify:full` once before merge when executable infrastructure is available.
- [ ] Verify the Cloudflare production preview and relevant 360px/mobile state.
- [ ] Update this checklist with concrete verification evidence and keep the PR draft if mandatory gates cannot run.
