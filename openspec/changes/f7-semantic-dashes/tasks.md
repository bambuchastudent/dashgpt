## 1. OpenSpec Gate

- [x] 1.1 Validate `f7-semantic-dashes` with OpenSpec strict validation before editing production code.
- [x] 1.2 Keep the implementation diff inside the validated proposal/spec/design scope; update and revalidate the change before any scope adjustment.

## 2. Shared Semantic Domain

- [x] 2.1 Add a dependency-free, versioned semantic normalizer/ranker shared by browser and Worker, including intent stripping, multilingual concepts, field weighting, deterministic tie-breaking, and centralized thresholds.
- [x] 2.2 Implement Dash semantic-definition creation, saved-Dash confident/ambiguous lookup, temporary-Dash construction, related-Dash ranking, and eligibility-first Result filtering.
- [x] 2.3 Implement Review-mode refresh/materialization with dynamic snapshots, proposals, pin/exclude/manual/accept precedence, unavailable placeholders, bounded aggregate summaries, and disabled Automatic activation.
- [x] 2.4 Route existing dashboard and MCP Result search through the shared ranker while preserving category, favorite, limit, and exact-text behavior.

## 3. Vault and Provider-Neutral Persistence

- [x] 3.1 Extend Vault sanitization/validation/portable export with optional Dash revisions while loading existing Vault v1 payloads as an empty Dash collection.
- [x] 3.2 Add append-only Dash override/tombstone event operations and deterministic Dash revision projection/merge without mutating Results.
- [x] 3.3 Extend Vault object layout with `dashes/<dash-id>/<dash-revision-id>.json` and verify GitHub/local object round trips preserve Dash state and conflicts.

## 4. Dashboard Experience

- [x] 4.1 Add a saved-Dashes dashboard section and natural topic input that shows a temporary preview and requires explicit Save.
- [x] 4.2 Add `/demo/dashes/<dash-id>/` detail rendering with summary, grouped members, proposals, unavailable/related state, refresh time, and bounded default content.
- [x] 4.3 Add save, refresh, rename/description, proposal accept/reject, pin, exclude, manual add, mode display, and delete interactions backed by Vault revisions/events.
- [x] 4.4 Reuse Result page/source/new-chat actions inside Dashes, keep Context Pack secondary, and preserve the operational `/demo/dash/` route.
- [x] 4.5 Implement explicit `#dash-import=` preview/save handling and semantic-Dash styling with responsive behavior.

## 5. Instance and Chat/MCP Surfaces

- [x] 5.1 Add an intentionally exposed Dash catalog fixture and additive instance discovery/Dash read endpoint with remote-instance fallback when the endpoint is absent.
- [x] 5.2 Add `open_semantic_dash` MCP behavior for confident saved lookup, ambiguity choices, temporary Dash fallback, Review refresh, bounded chat output, and explicit import links.
- [x] 5.3 Update DashGPT MCP instructions/plugin skill/metadata so natural commands route to Dash lookup without implying access to private unexposed Vault data.

## 6. Verification

- [x] 6.1 Add deterministic semantic tests for food, DashGPT Product, travel, phone repair, fuzzy wording, confidence margins, ambiguity, and ordinary Result search compatibility.
- [x] 6.2 Add domain tests for cross-chat membership, one Result in multiple Dashes, new proposals, accept/reject, pin/exclude/manual precedence, deletion isolation, related Dashes, and aggregate-summary updates.
- [x] 6.3 Add privacy tests proving inaccessible/deleted/archived/out-of-scope sentinel content never enters scores, counts, members, links, or summaries.
- [x] 6.4 Extend Vault/GitHub-layout tests for legacy loading, Dash export/import/merge/conflicts, reference-only persistence, and unchanged immutable Result hashes.
- [x] 6.5 Extend UI and Worker/MCP smoke contracts for Dash lifecycle, source/continuation actions, explicit save, disabled Automatic mode, endpoint discovery, and remote fallback.
- [x] 6.6 Run OpenSpec strict validation and the full `npm run check` suite with all feature tasks complete.

## 7. Project State and Pull Request

- [x] 7.1 Update product/roadmap/operational documentation without mixing product requirements with development workflow, then synchronize `DASH.md` to its mobile JSON mirror.
- [ ] 7.2 Review the exact diff for unrelated changes, publish a dedicated feature branch, and open a draft PR to `develop` linking `openspec/changes/f7-semantic-dashes/` and reporting validation results.
