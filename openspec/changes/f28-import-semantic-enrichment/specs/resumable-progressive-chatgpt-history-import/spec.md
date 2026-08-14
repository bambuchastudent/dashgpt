## MODIFIED Requirements

### Requirement: Imported conversations become canonical cards with stable source identity
The system SHALL project each imported ChatGPT conversation into the same deterministic mutable canonical card identity while deriving bounded semantic category/tag inputs from visible conversation meaning instead of using the ChatGPT provider as the card's semantic category.

#### Scenario: A new live conversation is imported
- **WHEN** the source runner reads a conversation detail that is not already current
- **THEN** it SHALL project deterministic source identity, compact summary/current state, meaning-oriented category and bounded content-derived tags before sending the candidate to DashGPT

#### Scenario: A conversation is imported from the official export
- **WHEN** DashGPT projects a valid ChatGPT conversation from ZIP/JSON export data
- **THEN** it SHALL apply the same semantic category/tag contract and canonical card identity rules as live import

#### Scenario: Source provenance is preserved
- **WHEN** semantic category/tags describe the conversation topic
- **THEN** the card SHALL still preserve `source.provider=chatgpt`, `source.type=conversation`, stable source ID and original conversation URL independently from semantic fields

#### Scenario: No model service is configured
- **WHEN** the user imports ChatGPT history without an external LLM/API key
- **THEN** semantic enrichment SHALL still complete locally from already-available bounded visible conversation content

#### Scenario: Classifier confidence is low
- **WHEN** no broad semantic concept is confidently detected
- **THEN** the importer SHALL emit bounded lexical topic tags and a neutral content category rather than failing or reverting to provider-oriented semantic metadata

### Requirement: Resume freshness skips only cards current for the active projection contract
The system SHALL treat provider freshness and semantic projection freshness as separate conditions for a semantic-aware live import run.

#### Scenario: An enriched card is current
- **WHEN** an imported card has a provider timestamp at least as new as the source summary and carries the current semantic projection version
- **THEN** the live source MAY skip refetching that conversation under existing resumable freshness behavior

#### Scenario: A legacy card has the same provider timestamp
- **WHEN** a ChatGPT card is provider-current but recognized as the legacy provider-oriented projection without the current semantic version
- **THEN** a semantic-aware live run SHALL consider that source ID eligible for reprojection

#### Scenario: Same-timestamp repair reaches either importer
- **WHEN** existing and incoming provider timestamps are equal, the existing card needs defined semantic backfill, and the incoming card carries the current semantic projection version
- **THEN** live and official-export import SHALL update the same mutable canonical card instead of skipping it or creating a duplicate

#### Scenario: Repaired card is imported again
- **WHEN** the same current semantic projection is repeated at the same provider timestamp
- **THEN** import SHALL converge by skipping the duplicate enrichment update

### Requirement: Semantic-aware live import preserves the F25 pressure policy
The semantic source projection SHALL compose with the merged ChatGPT 429 circuit-breaker behavior rather than replacing it.

#### Scenario: ChatGPT returns 429 while semantic import is running
- **WHEN** a conversation detail is deferred by the F25 pressure policy
- **THEN** staged retry/cooldown, durable progress accounting, bounded batch flush and duplicate-free resume behavior SHALL remain in force
