## Purpose

Living Product Board makes DashGPT's own product state a stable saved Semantic Dash built from curated Result cards, eliminating the separately maintained product-status dataset while preserving explicit review and delivery semantics.

## ADDED Requirements

### Requirement: Product board is a saved Semantic Dash over Result cards
The system SHALL represent DashGPT Product Board using the existing `dashgpt-product` Semantic Dash identity and stable Result references. Product topics SHALL remain ordinary Result records rather than copied board-only knowledge objects.

#### Scenario: Stable board reopens from repository-backed data
- **WHEN** `/demo/dash/dashgpt-product/` is opened in a browser with no existing DashGPT localStorage
- **THEN** the saved product board renders from the repository-backed Dash and Result catalogs

#### Scenario: Board deletion semantics remain Dash semantics
- **WHEN** a board view or local Dash revision is removed
- **THEN** referenced Result knowledge is not deleted

### Requirement: Product topics expose explicit delivery state
Each board topic SHALL expose exactly one primary delivery state from `idea`, `specified`, `in_development`, `merged`, `deployed`, `product_verified`, `blocked`, or `archived`. `merged`, `deployed`, and `product_verified` SHALL remain distinct states.

#### Scenario: Merge is not deployment
- **WHEN** a linked PR is merged but stable production deployment is not confirmed
- **THEN** the topic may be `merged` but SHALL NOT be shown as `deployed`

#### Scenario: Deployment is not product acceptance
- **WHEN** a stable production deployment is confirmed without explicit product verification
- **THEN** the topic may be `deployed` but SHALL NOT be shown as `product_verified`

### Requirement: Board cards carry trackable product metadata
Each product-board Result SHALL expose a stable card ID, title, concise summary, product area, primary and secondary tags, delivery status, last meaningful update, decision log, current state, next action, optional blocker, OpenSpec change ID when applicable, PR URL when applicable, merge commit when applicable, preview/production URLs when applicable, safe source reference when available, structured continuation instructions, updated timestamp, and provenance/update source.

#### Scenario: Future topic remains explicit rather than omitted
- **WHEN** a topic such as Semantic Navigator or Chat-to-Result capture has no implementation PR
- **THEN** it remains present as an `idea` or `specified` card with current state and next action instead of disappearing from product memory

#### Scenario: Storage work is not collapsed into one done state
- **WHEN** portability/storage slices have different delivery states
- **THEN** the board exposes those slices separately or through explicitly linked child state rather than one ambiguous completion value

### Requirement: Board summary is derived from current cards
The board SHALL compute its summary from current accessible member cards instead of storing a manually duplicated status paragraph.

#### Scenario: Summary counts statuses deterministically
- **WHEN** the same ordered set of accessible board Results is rendered repeatedly
- **THEN** total topics and counts for specified, in-development, merged, deployed, product-verified, blocked, and other supported stages are identical

#### Scenario: Missing member does not leak content
- **WHEN** a referenced Result becomes unavailable
- **THEN** the board may show an unavailable reference state but SHALL NOT retain or reconstruct its private content in the aggregate summary

### Requirement: Stable routes expose one product-board dataset
The canonical board route SHALL be `/demo/dash/dashgpt-product/`. `/demo/dash/` SHALL render or redirect to the same product board identity and SHALL NOT maintain a second manually authored project-status dataset.

#### Scenario: Compatibility route matches canonical board
- **WHEN** a user opens `/demo/dash/` and then the canonical product-board route
- **THEN** both surfaces resolve to the same board ID and current saved revision data

#### Scenario: Link survives browser state reset
- **WHEN** local browser storage is cleared
- **THEN** the canonical product-board URL remains valid and renders the latest repository-backed saved board revision

### Requirement: Reconciliation is deterministic and review-based
The system SHALL support deterministic reconciliation evidence for linked GitHub work. GitHub evidence MAY propose delivery-state advancement according to explicit rules, but SHALL NOT overwrite product decisions, summaries, continuation instructions, or private notes. Automatic invisible mutation SHALL remain disabled for this MVP.

#### Scenario: Open PR proposes in-development
- **WHEN** a topic has current evidence that its linked PR is open
- **THEN** refresh may propose `in_development` without immediately mutating the saved card

#### Scenario: Merged PR proposes merged
- **WHEN** a topic has current evidence that its linked PR is merged
- **THEN** refresh may propose `merged` and include merged timestamp/commit evidence

#### Scenario: Repeated refresh is idempotent
- **WHEN** refresh is run multiple times against identical evidence and saved state
- **THEN** the same proposal set is produced without duplicate pending changes

#### Scenario: GitHub does not grant product verification
- **WHEN** all GitHub checks and deployment evidence are successful
- **THEN** reconciliation SHALL NOT set `product_verified` without explicit manual product acceptance

### Requirement: Board exposes freshness and provenance
The board SHALL expose last refreshed time, last saved time, update source, pending proposed changes, refresh action, and stale-state warning when available evidence differs from saved state.

#### Scenario: External evidence becomes newer than saved state
- **WHEN** persisted evidence indicates a newer merged/deployed state than the saved card
- **THEN** the board shows the proposed/stale state without silently rewriting the card

### Requirement: Product board generates structured continuation context
The board SHALL generate a Markdown continuation package containing role, product definition, current objective, current product state, completed work, active work, decisions already made, constraints, open questions, ordered next actions, and relevant sources.

#### Scenario: Continuation contains enough state without raw chat
- **WHEN** a user copies continuation context from the product board
- **THEN** the package identifies relevant board topics, current statuses, decisions, next actions, OpenSpec/PR links where available, and product constraints without embedding raw private conversation history

#### Scenario: Transport remains outside this change
- **WHEN** the continuation package is generated
- **THEN** this change does not require implementing provider-specific prompt transport, URL payload encoding, or target-AI security hardening owned by the separate Structured Chat Continuation work

### Requirement: Initial product-board state reflects merged semantic features
The initial migrated board SHALL include Semantic Dashes and Semantic Gallery UX using verified repository evidence and SHALL include the future product topics identified in the proposal.

#### Scenario: Semantic Dashes reflects PR 18
- **WHEN** the initial board is rendered
- **THEN** Semantic Dashes references OpenSpec `f7-semantic-dashes`, PR #18, and a primary state no earlier than `merged`

#### Scenario: Semantic Gallery reflects PR 19 without overclaiming verification
- **WHEN** the initial board is rendered
- **THEN** Semantic Gallery UX references OpenSpec `f8-semantic-gallery-ux` and PR #19, while stable deployment and physical mobile/trackpad product verification remain separately represented unless confirmed

### Requirement: Product board is discoverable from existing DashGPT surfaces
The normal demo and Dash navigation SHALL expose a visible entry point to DashGPT Product Board, and the board SHALL remain discoverable through the saved Dash catalog.

#### Scenario: User starts from normal Results dashboard
- **WHEN** the user opens `/demo/`
- **THEN** a visible Product Board action reaches the stable board route without requiring knowledge of its slug

