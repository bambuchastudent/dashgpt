# Impact Manifest — F48 Share capture retry resilience

## Directly affected

- `demo/public-onboarding.js`
  - link-first Share resolution retry loop
  - retry progress status copy
- `tests/save-chat-flow.spec.mjs`
  - transient recovery regression
  - retry exhaustion regression
- `openspec/changes/f48-share-capture-retry-resilience/**`

## Contract dependencies to preserve

- `src/shared-chat.js`
  - `/api/shared-chat` response contract
  - `SHARED_CHAT_UNREADABLE` remains the transient unreadability code
- `demo/chatgpt-share-url.js`
  - current supported Share URL normalization
- F36 `save-chat-flow`
  - link-first capture, canonical Card provenance, human error states, local-first save
- F45 Project shared-chat compatibility
- F46 live production smoke behavior

## User-visible blast radius

Only the personal Save-chat Share-link submission path changes. Successful capture, review, Card persistence, source provenance, fallback capture, storage provider UI, Dashes, search, Semantic Gallery and continuation remain unchanged.

## Operational blast radius

The browser may issue several `/api/shared-chat` requests for one user submit when the resolver reports transient unreadability. The retry budget is bounded and applies only to transient failure classes. Normal successful capture remains one request.

## Security/privacy

No credentials, authenticated ChatGPT session data, cookies, or new remote storage are introduced. Only already-supported public Share URLs are sent to the existing endpoint.

## Rollback

Remove the bounded retry helper/progress callback and restore the single request behavior in `resolveSharedChatCard()`. No data migration is required.
