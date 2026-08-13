## MODIFIED Requirements

### Requirement: Import throttling remains bounded
The system SHALL use staged delays and low adaptive concurrency when conversation detail requests are deferred.

#### Scenario: A conversation is deferred
- **WHEN** one conversation needs a later retry
- **THEN** unrelated ready conversations remain eligible after a short shared cooldown

#### Scenario: Retry delays increase
- **WHEN** repeated attempts are required
- **THEN** fallback delays follow 5, 15, 30, 60, 120 and 300 seconds with bounded deterministic stagger

### Requirement: Progress reflects durable cards
The system SHALL distinguish processed conversations from cards acknowledged as saved by DashGPT.

#### Scenario: Import resumes
- **WHEN** a current canonical card already exists for a conversation
- **THEN** the importer SHALL reuse that identity rather than create a duplicate
