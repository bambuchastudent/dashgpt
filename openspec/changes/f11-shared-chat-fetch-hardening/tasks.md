# Tasks

- [x] Confirm production failure mode: valid public ChatGPT share opens in user browser but `/api/shared-chat` returns an upstream 403.
- [x] Preserve strict ChatGPT public-share URL validation.
- [ ] Move shared-chat retrieval behind a dedicated Worker module.
- [ ] Add direct HTML fetch + `chatgpt-share-parser` parsing.
- [ ] Add Cloudflare Browser Run HTML fallback for direct fetch/parse failures.
- [ ] Configure the `BROWSER` Worker binding.
- [ ] Add regression tests for direct success, 403 fallback success, invalid URL, and double failure.
- [ ] Add the regression verifier to `npm run check`.
- [ ] Validate OpenSpec and run the full repository CI/browser checks.
- [ ] Merge into `develop` only after green checks.
