## Purpose

Provide compact, honest project metrics in the user profile without creating a separate analytics content model.

## ADDED Requirements

### Requirement: Profile metrics are collapsible
The system SHALL expose token, spent, and donated metrics in a compact user-profile surface and SHALL allow that metrics header to collapse without changing Vault metric data.

#### Scenario: Collapse profile metrics
- **WHEN** the user collapses the metrics header
- **THEN** the counters are hidden and the device-local presentation preference is preserved

### Requirement: Imported token usage is explicitly estimated
The system SHALL estimate token usage from visible imported user/assistant text before card distillation and SHALL persist estimate provenance on the current canonical card.

#### Scenario: Import a conversation
- **WHEN** a ChatGPT conversation is imported
- **THEN** its canonical card stores a deterministic `visible-text-v1` token estimate and the profile presents the total as approximate

#### Scenario: Re-import the same conversation
- **WHEN** the same mutable source is imported again
- **THEN** only the current canonical card contributes to the aggregate

### Requirement: Money totals are explicit profile data
The system SHALL store spent and donated totals as non-negative integer minor units with a three-letter currency and SHALL NOT derive money from token estimates.

#### Scenario: Save money totals
- **WHEN** the user saves valid spent, donated, and currency values
- **THEN** a new project-metrics profile revision is appended

### Requirement: Profile metrics are portable
The system SHALL use existing Vault v1 profile revisions for project money metrics and SHALL preserve them through Vault portability and supported object sync.

#### Scenario: Round trip the Vault
- **WHEN** a Vault containing project-metrics revisions is exported and imported
- **THEN** the same latest money totals materialize

### Requirement: Profile metrics are localized and mobile-safe
The system SHALL provide Russian and English copy with English fallback and SHALL remain usable without horizontal overflow at a 360px viewport.

#### Scenario: Russian mobile profile
- **WHEN** the Russian interface is opened at 360px
- **THEN** the metrics remain reachable and use «Проебано токенов», «Потрачено», and «Задоначено» labels
