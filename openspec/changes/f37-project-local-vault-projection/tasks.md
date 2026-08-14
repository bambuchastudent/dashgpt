## 1. OpenSpec and overlap

- [x] 1.1 Inspect F19/PR #34 developer-memory prototype and reuse its useful Project State direction without exposing a separate general-user product surface.
- [x] 1.2 Inspect Vault v1/Card sanitization, saved Dash materialization, Google Drive F25/F34/F35 contracts and provider exclusivity.
- [x] 1.3 Define one saved Dash as project memory, with site Project view + `.dashgpt` derived from the same canonical Cards.
- [x] 1.4 Define cross-device identity through existing `vaultId`/Dash/Card IDs after ordinary Google-backed Vault restore.
- [x] 1.5 Define a human-and-agent representation: Project view, README entry point, project Markdown overview, Mermaid relationship map and stable Card Markdown files.
- [x] 1.6 Strictly validate this OpenSpec change before production-code edits.

## 2. Shared project model

- [x] 2.1 Add a pure provider-neutral project model derived from portable Vault + materialized saved Dash members.
- [x] 2.2 Normalize current member Card IDs, summaries, current-state/next cues and explicit Card-to-Card relationships once for reuse by site and filesystem views.
- [x] 2.3 Ensure proposals, excluded/unavailable references and unrelated Vault Cards never enter the project model.
- [x] 2.4 Keep profile revisions, provider bindings, Google identity, credentials and sessions outside the model.

## 3. Saved-Dash Project view

- [x] 3.1 Add a Project/Gallery presentation switch inside the existing saved-Dash page rather than a separate Project Board route/entity.
- [x] 3.2 Render project overview, current Cards/state/next cues and a visual relation map from the shared project model.
- [x] 3.3 Keep Card clicks routed to the existing canonical Card detail by stable ID.
- [x] 3.4 Preserve semantic Card color where already available and avoid inventing hard dependency semantics from similarity.
- [ ] 3.5 Preserve Refresh/Edit/Delete/member review behavior and verify 360/390px no-overflow layout in an executable browser gate.

## 4. Project-local `.dashgpt` projection

- [x] 4.1 Generate deterministic `.dashgpt/README.md`, `manifest.json`, `project.md` and one stable Markdown file per current accepted Card.
- [x] 4.2 Derive Card paths only from canonical Card IDs with traversal-safe deterministic encoding.
- [x] 4.3 Render the local project overview from the same shared model used by the site, including readable state/next cues and Mermaid relationships that degrade to plain Markdown.
- [x] 4.4 Render useful Card working context while omitting empty sections and unsafe source URLs.
- [x] 4.5 Record `vaultId`, Dash identity/revision and canonical Card IDs without introducing wall-clock generation identity.

## 5. Local materialization transport

- [x] 5.1 Add a `Get .dashgpt` action from saved-Dash Project view.
- [x] 5.2 Add a dependency-free deterministic ZIP fallback containing the `.dashgpt/` tree for browsers without direct repository-directory write support.
- [x] 5.3 Sort archive paths/use fixed ZIP metadata so unchanged source state produces byte-stable fallback output.
- [x] 5.4 Show concise extraction-at-project-root and review-before-commit guidance; do not present ZIP as a separate memory product.
- [x] 5.5 Materialization must not mutate Vault/Dash state or invoke Google/GitHub provider networking.

## 6. Regression coverage

- [x] 6.1 Verify exact member IDs are identical between site Project model and `.dashgpt` manifest/project Markdown.
- [x] 6.2 Verify proposals/unrelated/unavailable/excluded Cards stay out of both representations.
- [x] 6.3 Verify shared explicit relation extraction drives both site graph and local Mermaid graph.
- [x] 6.4 Verify stable Vault/Dash/Card identity, stable paths, unchanged-input byte determinism and one-Card-update locality.
- [x] 6.5 Verify no Google token/account/binding/provider/profile/session data can appear in generated files.
- [x] 6.6 Verify ZIP entry set/order/CRC/container integrity.
- [x] 6.7 Add browser regression for Project/Gallery switching, canonical Card open, `.dashgpt` materialization, no Vault mutation and 360/390px no horizontal overflow.

## 7. Verification and delivery

- [x] 7.1 Run targeted syntax/deterministic verification during implementation.
- [ ] 7.2 Run canonical `npm run verify:fast` after implementation.
- [ ] 7.3 Run canonical `npm run verify:full` once before merge when repository/browser infrastructure is runnable; record infrastructure blockers truthfully.
- [ ] 7.4 Verify branch preview deployment and saved-Dash Project view/materialization UX where executable preview inspection is available.
- [x] 7.5 Open a dedicated PR linked to issue #88 and reconcile this checklist/current-state documentation.
- [ ] 7.6 Merge to `develop` only after required verification evidence is available under the current project delivery policy.
