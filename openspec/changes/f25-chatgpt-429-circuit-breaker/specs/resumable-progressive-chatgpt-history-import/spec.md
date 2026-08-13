## MODIFIED Requirements

### Requirement: The source runner uses coordinated adaptive throttling
The system SHALL use one bounded detail-request scheduler that coordinates low adaptive concurrency, per-conversation deferred retries, and a short shared provider-pressure circuit breaker for repeated conversation-detail HTTP 429 responses.

#### Scenario: One conversation receives HTTP 429 while other work is ready
- **WHEN** one conversation-detail request receives HTTP 429 and unrelated conversations remain ready
- **THEN** only the throttled conversation receives a future `nextRetryAt`, the shared detail scheduler reduces concurrency to one and activates a short provider-pressure cooldown, and unrelated ready conversations remain eligible to run after that short cooldown

#### Scenario: Retry-After is supplied for a conversation 429
- **WHEN** ChatGPT supplies a valid `Retry-After` value on a conversation-detail HTTP 429
- **THEN** that conversation SHALL NOT be retried before the greater of its configured staged retry delay and the represented provider delay/date, plus bounded deterministic stagger

#### Scenario: Retry-After is absent
- **WHEN** a conversation-detail HTTP 429 has no valid `Retry-After`
- **THEN** the conversation SHALL use fallback retry stages of 5, 15, 30, 60, 120 and then 300 seconds for subsequent attempts, plus bounded deterministic stagger

#### Scenario: Repeated provider pressure is observed
- **WHEN** multiple conversation-detail 429 responses occur within the circuit-breaker pressure window
- **THEN** the shared scheduler SHALL keep detail concurrency at one and MAY extend a bounded short shared cooldown before issuing additional ready detail requests

#### Scenario: Healthy responses follow provider pressure
- **WHEN** detail requests succeed for a sustained period after the circuit breaker was activated
- **THEN** the scheduler SHALL decay/reset provider-pressure state and MAY cautiously restore concurrency within the existing low configured maximum

#### Scenario: Some conversations are deferred while others can progress
- **WHEN** deferred conversations coexist with ready conversations
- **THEN** ready conversations SHALL remain in the ready queue and MAY continue after the short shared provider-pressure cooldown rather than waiting for another conversation's full deferred retry interval

#### Scenario: Every unfinished conversation is deferred
- **WHEN** no conversation is ready or in flight and one or more unfinished conversation tasks have future `nextRetryAt` values
- **THEN** the source runtime SHALL sleep until the earliest useful retry time instead of busy-looping and MAY present the whole operation as `Waiting for ChatGPT`

### Requirement: Import progress distinguishes source processing from durable persistence
The system SHALL present source-runner processing progress separately from cards durably accepted/updated by the DashGPT receiver.

#### Scenario: Projected cards are buffered before a batch ACK
- **WHEN** the source has processed conversations whose projected cards have not yet crossed the receiver ACK durability boundary
- **THEN** the source overlay SHALL NOT count those cards as saved in DashGPT

#### Scenario: A batch is ACKed by DashGPT
- **WHEN** the receiver acknowledges accepted or updated cards after Vault persistence
- **THEN** the source MAY advance the displayed durable saved count

#### Scenario: Existing cards were already current before the run
- **WHEN** the receiver handshake reports source conversations already represented by current durable cards
- **THEN** the durable saved total MAY include those already-current conversations so the displayed saved count reflects durable Vault state rather than only newly accepted cards in the current run

## ADDED Requirements

### Requirement: Rate-limit recovery does not clear user/browser state
The system SHALL NOT automatically clear Safari website data, browser HTTP cache, authentication/session state, DashGPT Vault state, or imported cards in response to HTTP 429.

#### Scenario: Conversation-detail requests receive HTTP 429
- **WHEN** the provider rate-limits one or more detail requests
- **THEN** recovery SHALL use bounded scheduling/backoff and durable resumability rather than cache or storage deletion
