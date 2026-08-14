# Tasks: F43 Production SEO hardening

- [x] Inspect merged F21 / PR #99 and current `develop` metadata/runtime.
- [x] Check public search visibility and current production hostname assumptions.
- [x] Review current Google Search Central guidance for canonical URLs, sitemaps and software/web application structured data.
- [x] Create proposal, design and spec delta before production code.
- [ ] Strictly validate the OpenSpec change. GitHub self-hosted validation is queued without starting.
- [x] Consolidate `/` and `/demo` to `/demo/` on the Worker path.
- [x] Add production-aware root robots and sitemap responses.
- [x] Add response-level noindex for preview/private/deep views.
- [x] Upgrade canonical/Open Graph/Twitter metadata and add JSON-LD.
- [x] Add deterministic 1200x630 social-card PNG.
- [x] Extend deterministic and browser/worker verification.
- [x] Run available delivery verification: exact-head Cloudflare preview deployment succeeded; GitHub self-hosted checks remain queued without executed steps.
- [ ] Merge the dedicated PR to `develop` and close Issue #109.
