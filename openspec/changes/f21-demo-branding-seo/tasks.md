# Tasks

## 1. Spec gate

- [x] Inspect current `demo/index.html`, Worker asset root, existing brand asset, OpenSpec workflow, Unified Card Dashboard overlap and open Feature 20 boundary.
- [x] Record proposal, design, spec delta and Impact Manifest.
- [ ] Strictly validate `f21-demo-branding-seo` before production-code edits.

## 2. Browser identity

- [ ] Copy the existing starter DashGPT monogram into the public demo asset root without changing its geometry/colors.
- [ ] Reference the public favicon from `/demo/` and provide a minimal manifest using the same mark.
- [ ] Keep legal/support pages from falling back to an unrelated/default browser icon where practical within scope.

## 3. SEO and previews

- [ ] Replace the generic demo title with value-first product copy.
- [ ] Add meta description, robots, relative canonical, Open Graph text metadata and Twitter/X text metadata.
- [ ] Do not publish unsupported social-image/rating/pricing claims.
- [ ] Add conservative `robots.txt` directives for API/MCP and personal/deep application routes.

## 4. Deployment handoff

- [ ] Document the current Worker-vs-Pages constraint and safe operator path toward `dashseek.pages.dev` without changing the product name or silently dropping Worker APIs.

## 5. Regression coverage

- [ ] Add deterministic metadata/assets verifier.
- [ ] Wire the verifier into `npm run check` and `npm run verify:fast`.
- [ ] Add Playwright coverage against the actually served `/demo/` page on desktop/mobile.

## 6. Verification and PR

- [ ] Run targeted verification after implementation.
- [ ] Run canonical `npm run verify:full` once on the final implementation head.
- [ ] Verify the branch/deployment preview and narrow mobile viewport when a preview is available.
- [ ] Open/update a dedicated PR to `develop` with OpenSpec, verification and deployment-boundary notes.
