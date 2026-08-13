## Purpose

Profile Project Metrics gives the Vault owner a compact project-level summary of accumulated AI token usage plus explicitly maintained spent/donated totals without creating a second analytics content model.

## ADDED Requirements

### Requirement: Metrics live in the user profile
The system SHALL expose a compact Profile / Профиль control from the personal shell and SHALL render project metrics inside it rather than as Cards, Dashes, or a separate analytics page.

#### Scenario: Open profile
- **WHEN** the user opens the profile
- **THEN** token, spent, and donated metrics appear without changing Dash/card/search state

### Requirement: Metrics can be hidden
The system SHALL allow the metrics header to collapse and expand and SHALL persist that display preference on the current device without creating a profile revision.

#### Scenario: Reload collapsed profile
- **WHEN** the user collapses metrics and reloads
- **THEN** they remain collapsed and metric data is unchanged

### Requirement: ChatGPT history tokens are explicit estimates
The system SHALL estimate token usage from selected visible user/assistant message text before card distillation, persist estimator provenance on the canonical card, and visually distinguish estimates from provider-reported usage.

#### Scenario: Import conversation
- **WHEN** a ChatGPT conversation is converted into a card
- **THEN** it carries a deterministic `visible-text-v1` estimate and the aggregate is marked approximate

#### Scenario: Re-import conversation
- **WHEN** the same source conversation is updated
- **THEN** its stable mutable card is replaced and only the current usage value is counted

### Requirement: Token aggregation uses materialized cards
The system SHALL sum valid usage metadata from current materialized canonical cards and SHALL NOT fabricate usage for older cards that lack it.

### Requirement: Spent and donated totals are explicit profile data
The system SHALL let the user maintain spent and donated totals explicitly and SHALL NOT derive them from estimated ChatGPT tokens.

#### Scenario: Save valid totals
- **WHEN** valid non-negative amounts and currency are saved
- **THEN** a new project-metrics profile revision is appended using integer minor units

#### Scenario: Invalid totals
- **WHEN** input is negative, unsafe, or currency is invalid
- **THEN** no revision is written and validation feedback is shown

### Requirement: Metric revisions are portable
The system SHALL store project metrics in existing Vault v1 `profileRevisions`, materialize the latest valid revision deterministically, and preserve revisions through Vault export/import and supported remote object sync.

### Requirement: New copy is localized
The system SHALL provide Russian and English copy with English fallback. Russian visible metric labels SHALL use «Проебано токенов», «Потрачено», and «Задоначено» in the requested product voice.

### Requirement: Mobile profile remains usable
The system SHALL render profile metrics and editing controls without horizontal overflow at a 360px viewport.
