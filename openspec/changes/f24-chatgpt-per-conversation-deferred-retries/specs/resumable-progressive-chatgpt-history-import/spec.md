## MODIFIED Requirements

### Requirement: The source runner uses coordinated adaptive throttling
The system SHALL use one bounded detail-request scheduler that coordinates low adaptive concurrency while deferring an individual conversation-detail HTTP 429 independently from unrelated ready conversation work.

#### Scenario: Detail requests are healthy
- **WHEN** conversation-detail requests succeed for a sustained period
- **THEN** the scheduler MAY cautiously increase concurrency within the existing low configured maximum

#### Scenario: One conversation receives HTTP 429 while other work is ready
- **WHEN** one conversation-detail request receives HTTP 429 and at least one unrelated conversation is ready to run
- **THEN** only the throttled conversation is assigned a future `nextRetryAt`, the worker is released to ready work, and the unrelated conversation MAY proceed without waiting for the throttled conversation's delay

#### Scenario: Retry-After is supplied for a conversation 429
- **WHEN** ChatGPT supplies a valid `Retry-After` value on a conversation-detail HTTP 429
- **THEN** that conversation SHALL NOT be retried before the represented delay/date and the scheduler SHALL stagger its eventual re-entry so equal server delays do not create a synchronized retry burst

#### Scenario: Retry-After is absent
- **WHEN** a conversation-detail HTTP 429 has no valid `Retry-After`
- **THEN** that conversation receives bounded exponential backoff plus per-source/per-attempt jitter or stagger, and repeated 429 responses increase that conversation's delay up to the configured ceiling

#### Scenario: Every unfinished conversation is deferred
- **WHEN** no conversation is ready or in flight and one or more unfinished conversation tasks have future `nextRetryAt` values
- **THEN** the source runtime sleeps until the earliest useful retry time instead of busy-looping and MAY present the whole import as `Waiting for ChatGPT`

#### Scenario: Some conversations are deferred while others can progress
- **WHEN** deferred conversations coexist with ready or in-flight conversation work
- **THEN** the operation remains in a running/importing state and exposes a bounded deferred/waiting count without falsely presenting a queue-wide wait

#### Scenario: Repeated 429 responses exhaust the current run policy
- **WHEN** one conversation reaches the configured per-run deferred-retry attempt ceiling
- **THEN** only that conversation becomes unresolved for a later resumable run, while already completed conversations remain current and are not replayed

#### Scenario: Service-level HTTP 503 is received
- **WHEN** the source receives a service-level HTTP 503 signal
- **THEN** the scheduler MAY use the existing conservative shared cooldown and concurrency reduction because the signal is treated separately from an individual conversation's 429

#### Scenario: User pauses during a deferred wait
- **WHEN** the import is paused while one or more conversations are deferred
- **THEN** abortable waits stop, no new deferred retry is issued, already durable cards remain intact, and missing/stale conversations are naturally eligible again on a later launch

## ADDED Requirements

### Requirement: Per-conversation retry scheduling state remains transient and credential-free
The system SHALL keep per-conversation deferred-retry scheduler state transient to the current authenticated ChatGPT source runtime and SHALL NOT persist provider credentials or raw provider responses in DashGPT progress/card state.

#### Scenario: A conversation is deferred
- **WHEN** one conversation-detail task is deferred after HTTP 429
- **THEN** its transient scheduler state MAY contain stable source identity, attempt count, `nextRetryAt`, numeric status and a bounded safe error class, but SHALL NOT contain access tokens, cookies, account IDs, authorization headers, session payloads or raw response bodies

#### Scenario: The source runtime is closed and later relaunched
- **WHEN** a run ends with deferred or unresolved conversations and the user later continues the import
- **THEN** DashGPT reconstructs completed work from durable imported cards and rediscovers missing/stale source IDs rather than requiring persisted per-source retry timers
