# f9-living-product-board

Replace the separately maintained `/demo/dash/` project-status page with the living `dashgpt-product` Semantic Dash, populated by stable product Result cards and review-based status reconciliation.

See `proposal.md`, `design.md`, `specs/living-product-board/spec.md`, and `tasks.md`.

## Verification note

Repository-level OpenSpec and `npm run check` gates are mandatory. A separate live Cloudflare branch-preview browser check validates the canonical Product Board route at desktop and narrow-mobile viewports and captures diagnostics/screenshots when runtime rendering diverges from deterministic repository tests. Product verification is not inferred from merge or deployment alone.

