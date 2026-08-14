## 1. OpenSpec and overlap

- [x] 1.1 Inspect F19/PR #34 developer-memory prototype and preserve its visualization-only boundary.
- [x] 1.2 Inspect Vault v1/Card sanitization, saved Dash materialization, Google Drive F25/F34/F35 contracts and provider exclusivity.
- [x] 1.3 Define `.dashgpt` as a derived saved-Dash projection from canonical Vault Cards, not a second store.
- [x] 1.4 Define cross-device identity through existing `vaultId`/Dash/Card IDs after ordinary Google-backed Vault restore.
- [x] 1.5 Define a human-and-agent representation: README entry point, project Markdown overview, Mermaid relationship map and stable Card Markdown files.
- [ ] 1.6 Strictly validate this OpenSpec change before production-code edits.

## 2. Pure project-memory projection

- [ ] 2.1 Add a provider-neutral pure projection module that consumes portable Vault + materialized saved Dash membership.
- [ ] 2.2 Generate deterministic `.dashgpt/README.md`, `manifest.json`, `project.md` and one stable Markdown file per accepted/current Card.
- [ ] 2.3 Derive Card paths only from canonical Card IDs with traversal-safe deterministic encoding.
- [ ] 2.4 Render useful Card working context while omitting empty sections and unsafe source URLs.
- [ ] 2.5 Render the project overview with readable Card summaries/current-state/next cues plus Mermaid links/relationships that degrade to understandable plain Markdown.
- [ ] 2.6 Keep profile revisions, provider bindings, Google identity, credentials, sessions and unrelated Vault Cards outside the projection.

## 3. Deterministic archive transport

- [ ] 3.1 Add a dependency-free deterministic ZIP builder for UTF-8 `.dashgpt/` entries.
- [ ] 3.2 Sort archive paths and use fixed ZIP metadata so unchanged source state produces byte-stable output.
- [ ] 3.3 Add a browser download helper with a safe Dash-derived archive filename and no Vault mutation.

## 4. Saved-Dash UX

- [ ] 4.1 Add `Download .dashgpt` to the opened saved-Dash action surface.
- [ ] 4.2 Build the package from the current browser-local Vault and current materialized Dash without provider network calls.
- [ ] 4.3 Show concise success/failure guidance, including extraction at project root and review-before-commit privacy guidance.
- [ ] 4.4 Preserve existing Refresh/Edit/Delete/Dash membership behavior and 360/390px no-overflow layout.

## 5. Regression coverage

- [ ] 5.1 Add deterministic tests for exact accepted-member projection and exclusion of proposals/unrelated/unavailable Cards.
- [ ] 5.2 Verify stable Vault/Dash/Card identity, stable paths, unchanged-input byte determinism and one-Card-update locality.
- [ ] 5.3 Verify no Google token/account/binding/provider/profile/session data can appear in generated files.
- [ ] 5.4 Verify ZIP entry set/order/CRC/container integrity and generated Markdown/Mermaid links.
- [ ] 5.5 Add browser regression for the saved-Dash download action, archive contents, no Vault mutation and 360/390px no horizontal overflow.

## 6. Verification and delivery

- [ ] 6.1 Run targeted syntax/deterministic verification during implementation.
- [ ] 6.2 Run canonical `npm run verify:fast` after implementation.
- [ ] 6.3 Run canonical `npm run verify:full` once before merge when repository/browser infrastructure is runnable; record infrastructure blockers truthfully.
- [ ] 6.4 Verify branch preview deployment and saved-Dash export UX where executable preview inspection is available.
- [ ] 6.5 Open a dedicated PR linked to issue #88 and reconcile this checklist/current-state documentation.
- [ ] 6.6 Merge to `develop` only after required verification evidence is available under the current project delivery policy.
