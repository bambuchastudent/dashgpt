## MODIFIED Requirements

### Requirement: Imported conversations become canonical cards with stable source identity
The system SHALL project each imported ChatGPT conversation into the same deterministic mutable canonical card identity while deriving bounded semantic category/tag inputs from the visible conversation meaning instead of using the ChatGPT provider as the card's semantic category.

#### Scenario: A new conversation is imported
- **WHEN** the source runner successfully reads a conversation detail that is not already current
- **THEN** it SHALL project the deterministic source ID, compact summary/current state, meaning-oriented category and bounded content-derived tags before sending the candidate to DashGPT

#### Scenario: Source provenance is preserved
- **WHEN** semantic category and tags describe the conversation topic
- **THEN** the card SHALL still preserve `source.provider=chatgpt`, `source.type=conversation`, the stable source ID and original conversation URL independently from those semantic fields

#### Scenario: Bulk import has no model service configured
- **WHEN** the user runs ChatGPT history import without an external LLM/API key
- **THEN** semantic enrichment SHALL still complete locally from the already-fetched bounded visible conversation content

#### Scenario: The classifier has low concept confidence
- **WHEN** no broad semantic concept is confidently detected
- **THEN** the importer SHALL emit bounded lexical topic tags and a neutral content category rather than failing the card or reverting to provider-oriented semantic metadata

### Requirement: Resume freshness skips only cards current for the active projection contract
The system SHALL treat provider freshness and projection enrichment freshness as separate conditions for an enrichment-aware import run.

#### Scenario: An already-enriched card is current
- **WHEN** an imported card has a provider timestamp at least as new as the source summary and carries the current semantic enrichment version
- **THEN** the source MAY skip refetching that conversation under the existing resumable freshness behavior

#### Scenario: A legacy card has the same provider timestamp but weak import metadata
- **WHEN** an imported ChatGPT card is provider-current but is recognized as a legacy source-oriented projection without the current enrichment version
- **THEN** an enrichment-aware run SHALL consider that source ID eligible for reprojection so semantic metadata can be repaired without inventing a newer provider timestamp

#### Scenario: Same-timestamp semantic repair reaches the receiver
- **WHEN** the existing and incoming provider timestamps are equal, the existing card needs the defined semantic backfill, and the incoming card carries the current enrichment version
- **THEN** the receiver SHALL update the same mutable canonical card instead of skipping it or creating a duplicate

#### Scenario: Repaired card is imported again
- **WHEN** the same current semantic projection is repeated at the same provider timestamp
- **THEN** the receiver SHALL converge by skipping the duplicate enrichment update
