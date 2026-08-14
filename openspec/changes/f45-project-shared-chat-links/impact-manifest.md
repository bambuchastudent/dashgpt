# Impact Manifest

## User-visible surface

- Personal `Save chat` / `Сохранить чат` link field.
- Shared-chat retrieval endpoint and canonical source URL returned to Card provenance.

## Production files expected to change

- `demo/public-onboarding.js`
- `demo/share-link-compat.js`
- one small shared browser URL-normalization module if needed
- `src/shared-chat.js`
- existing shared-chat/UI verification scripts

## Data / storage impact

- No Card/Vault schema migration.
- No new credentials, cookies, tokens, or provider state.
- Existing `source.url` may now legitimately contain a canonical ChatGPT Project shared-chat URL rather than only `/share/<id>`.

## Security / privacy

- HTTPS and ChatGPT-host allowlist remain mandatory.
- Exact route matching rejects private `/c/...` and arbitrary ChatGPT paths.
- Project URLs do not grant DashGPT access to membership-gated content; no access-control bypass is introduced.
- Unrelated query parameters/fragments are not retained in canonical provenance.

## Regression risks

- Accidentally breaking classic `/share` or legacy `/s` capture.
- Mistakenly rewriting Project conversation ids into the classic Share namespace.
- Passing an unnormalized Project URL to one resolver layer while another receives a different source identity.

## Verification

- Strict OpenSpec validation.
- Existing shared-chat parser/resolver verification plus reported Project-link regression cases.
- Save-chat UI contract regression.
- Canonical full verification before merge, with any pre-existing repository-wide browser gate failure compared against `develop` and documented.
