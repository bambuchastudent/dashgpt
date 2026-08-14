# F36 Impact Manifest

## User-visible surfaces

- Personal dashboard `+ Сохранить чат` dialog.
- Public ChatGPT Share-link capture inside that dialog.
- Review/save feedback and unsupported-link error states.
- Card `Original chat ↗` provenance after save.

## Production files expected to change

- `demo/public-onboarding.js` — reorder capture UX and orchestrate Share resolution / duplicate-safe persistence.
- `tests/save-chat-flow.spec.mjs` — browser regressions for link-first capture while preserving F27 provider behavior.
- targeted verification wiring only if required by the repository's existing verification conventions.

`src/shared-chat.js` is expected to remain the retrieval source of truth unless implementation discovers a missing compatibility case; any such scope expansion requires updating this OpenSpec first.

## Data impact

- No Vault schema change.
- No new card type.
- New personal Share captures use existing card source provenance with `source.type = "chatgpt-share"` and canonical `source.url`.
- Repeat captures for the same canonical Share URL reuse the existing user-visible card identity rather than creating duplicates.

## Security / privacy

- Only public Share URLs are fetched by `/api/shared-chat`.
- Private authenticated `/c/...` URLs are rejected with human guidance rather than attempting to capture session credentials.
- No OAuth token, ChatGPT cookie, provider credential or raw conversation is added to portable Vault content.

## Compatibility

Must preserve:

- F27 local-first save and provider UX;
- F26 Safari user-activation ordering for Google Drive connect;
- Google/GitHub provider exclusivity;
- existing structured JSON handoff fallback;
- bulk ChatGPT history/export import behavior;
- canonical card search/gallery/Dash consumers;
- 360px mobile layout.

## Rollback

Reverting the F36 production commit restores the F27 structured-handoff-first dialog. Cards already saved with existing `chatgpt-share` provenance remain valid canonical cards and require no migration.
