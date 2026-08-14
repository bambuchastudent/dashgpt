# F39 Impact Manifest

## User-visible surfaces

- Personal card detail modal on `/demo/`.
- Standalone card detail route `/demo/result/<id>/`.
- F36 link-first Save-chat review/save flow for public ChatGPT Share links.

## Production code expected to change

- `demo/public-onboarding.js` — link-first prepared-card projection.
- `demo/app.js` — modal/standalone rich summary rendering and conditional structured blocks.
- new focused browser utility under `demo/` for card-content normalization/rendering.
- card-detail CSS only as required for readable block/list/code/link layout and 360px wrapping.

## Tests / verification expected to change

- focused deterministic regression script/test for card-content normalization and safe rendering contracts;
- `tests/save-chat-flow.spec.mjs` and/or a focused card-detail Playwright spec for the escaped F36 case;
- package verification lists only as required to include the new production/test file.

## Contracts intentionally unchanged

- Vault/card schema and storage layout.
- canonical `source.type` / `source.url` provenance.
- repeat Share capture identity semantics.
- `/api/shared-chat` response contract.
- Semantic Dash membership/reference behavior.
- Semantic Gallery ranking/color behavior.
- Structured Continuation transport and privacy rules.
- Google Drive/GitHub provider ownership and sync semantics.
- bulk ChatGPT history import.

## Security / privacy

Captured text is untrusted. F39 must not use captured HTML with `innerHTML`. Link targets are allowlisted to `http:` / `https:` and receive `noopener noreferrer`. Provider-internal presentation markers are removed; no additional raw conversation content is persisted beyond the already-selected prepared summary.

## Migration / existing data

No destructive migration. Display-time cleanup makes already-saved affected cards readable. Future link-first saves persist cleaned structured content.

## Rollback

The change is presentation/projection-only with no schema migration. Reverting the PR restores the previous plain-text renderer and F36 projection without making existing Vault data unreadable.
