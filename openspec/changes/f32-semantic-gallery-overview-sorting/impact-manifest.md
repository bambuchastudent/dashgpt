# Impact Manifest

## Directly changed surfaces

- `demo/gallery-overview-sorting.js`: Time/Color/Tag ordering, isolated sort preference, compact/heat-map overview planning, shared My Dash/Semantic Dash post-render controller, and overview presentation styles.
- `demo/catalog-bootstrap.js`: initializes the F32 controller after the existing app module starts.
- `scripts/verify-gallery-overview-sorting.mjs`: deterministic ordering and overview-planner regressions.
- `tests/gallery-overview-sorting.spec.mjs`: browser regression for sort modes, persistence, 100-card compact overview, and 2,200-card heat-map membership/actionability.
- `package.json`: wires F32 syntax/deterministic/browser test files into existing verification commands while preserving F25 checks from current `develop`.

## Read-only dependencies

- canonical card fields `id`, `updatedAt`, `publishedAt`, `createdAt`, and `tags`.
- existing Vault `result.activity` events for meaningful create/update/Dash mutations; open/continue/source-open activity is intentionally ignored by Time ordering.
- existing `semanticHue(result)` behavior and semantic CSS variables.
- Feature 8 gallery density/detail state and canonical `.result-card` DOM identity.
- search/category/favorite selection pipeline.
- Semantic Dash accepted-member gallery.
- canonical tags produced by enrichment work such as F28 / PR #66 when available.

## Explicitly unchanged

- canonical card identity and immutable hashes;
- Vault portable card schema and activity-event schema;
- Feature 8 gallery-state storage key/shape;
- semantic color algorithm;
- search relevance and selection membership;
- Semantic Dash definitions, proposals, and membership;
- import transport/retry/enrichment logic;
- storage/sync providers;
- continuation and favorite semantics.

## Regression risks

- DOM ordering could accidentally alter membership instead of only moving existing card nodes;
- observer-driven reordering could self-trigger or churn on large collections;
- sort persistence could overwrite unrelated Feature 8 presentation state;
- heat-map geometry could cause horizontal overflow or collapse cards below the defined visual floor;
- heat-map presentation could hide identity without preserving focus/open/hover/accessibility cues;
- My Dash and Dash member galleries could diverge;
- progressive import could change card count without recalculating overview;
- rerender or sort could lose focus.

## Required gates

- strict OpenSpec validation before production code; currently externally blocked because GitHub Actions cannot start runners while the repository account reports a billing/spending-limit issue;
- targeted deterministic gallery verification during development;
- desktop and narrow browser regressions, including a 2,200-card desktop heat-map case;
- canonical `npm run verify:full` on the final code head;
- production-preview verification before merge.
