# Impact Manifest — F36 Product Board internal-only navigation

## Directly changed

- `demo/index.html` — remove the global Product Board header anchor.
- focused regression coverage for the personal dashboard header.
- historical F9 discoverability contract via the F36 spec delta.

## Intentionally unchanged

- `/demo/dash/dashgpt-product/` compatibility route.
- `demo/product-board.js`, `demo/unified-product-board.js`, Product Board data and existing direct-route verifiers.
- canonical Card/legacy Result data.
- saved user Dashes and Semantic Gallery behavior.
- search/filter membership.
- Vault/local/Google/GitHub storage.
- ChatGPT import and continuation.

## Risks

- A stale test may still require the old global navigation link.
- Future code could re-add Product Board to the header unless the negative UI contract is explicit.

## Verification

- strict OpenSpec validation before production edit;
- deterministic UI-contract regression;
- existing Product Board direct-route verification remains green;
- canonical full verification once on final head;
- desktop and 360/390px preview inspection.
