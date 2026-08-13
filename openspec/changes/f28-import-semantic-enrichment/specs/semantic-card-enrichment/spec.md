## ADDED Requirements

### Requirement: Canonical card semantic metadata is meaning-oriented and bounded
The system SHALL use a small bounded set of meaning-oriented semantic tags and a content-oriented category as card inputs for search, semantic grouping and card color whenever an import/capture path can derive them from the conversation outcome.

#### Scenario: Tags are visible on an imported card
- **WHEN** an enriched imported card is rendered by the canonical card renderer
- **THEN** its semantic tags SHALL be available through the existing card tag UI and SHALL describe the topic/outcome rather than merely the provider/client

#### Scenario: Semantic Gallery renders enriched imports
- **WHEN** two imported cards have materially different semantic category/tag inputs
- **THEN** existing Semantic Gallery signature/hue behavior SHALL consume those same canonical fields so provider identity alone does not collapse them into one semantic group/color family

#### Scenario: Related imported conversations are rendered
- **WHEN** multiple imported cards share strong meaning-oriented concept/tag signals
- **THEN** existing semantic grouping/color behavior SHOULD keep them visually coherent without introducing a separate user-facing taxonomy entity

### Requirement: Direct DashGPT AI capture follows the same tag quality contract
The DashGPT skill SHALL instruct the host AI to include a bounded set of relevant meaning-oriented tags in a distilled card and SHALL NOT make an unspecified summarize skill or provider-name tags the required semantic source.

#### Scenario: The user asks DashGPT to save a useful conversation outcome
- **WHEN** the host AI distills the outcome for DashGPT import preparation
- **THEN** it SHALL select a small reusable set of topic/concept tags from the actual outcome and SHOULD omit generic tags such as provider/client/conversation/result unless those words are genuinely the subject

#### Scenario: Bulk history import runs without the DashGPT skill
- **WHEN** the browser history importer runs independently of a ChatGPT plugin/skill invocation
- **THEN** it SHALL still satisfy the semantic-tag contract through its deterministic local enrichment fallback
