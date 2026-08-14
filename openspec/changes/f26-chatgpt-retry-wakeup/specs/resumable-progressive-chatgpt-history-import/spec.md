## MODIFIED Requirements

### Requirement: Deferred retries SHALL self-wake
The history importer SHALL not rely solely on a long background-page timer to resume deferred conversation detail work.

#### Scenario: Deferred retry becomes due while ChatGPT is backgrounded
- **WHEN** Safari throttles or suspends ordinary timers in the ChatGPT source tab
- **THEN** a validated bounded wake signal from the DashGPT receiver SHALL be able to wake the source scheduler and re-evaluate due deferred work

#### Scenario: User returns to the ChatGPT source tab
- **WHEN** the source document becomes visible or receives focus
- **THEN** the scheduler SHALL immediately re-evaluate deferred work instead of waiting for a stale timer

### Requirement: Shared 429 cooldown SHALL honor detail retry pressure
The importer SHALL apply the computed detail retry delay to the shared scheduler cooldown after HTTP 429.

#### Scenario: One detail request receives HTTP 429
- **WHEN** a detail request is deferred with a computed retry delay
- **THEN** the shared scheduler SHALL not issue unrelated ready detail requests before the shared cooldown expires

#### Scenario: Rate limiting clears
- **WHEN** a later detail request succeeds after the cooldown
- **THEN** the importer SHALL return to running state and continue the same durable import without resetting or duplicating existing conversation cards

### Requirement: Wake signaling SHALL remain bounded and authenticated
The receiver SHALL only send wake control messages to the currently validated ChatGPT source window for the active session/nonce.

#### Scenario: Rate-limited source is connected
- **WHEN** the receiver has a validated source window and the source reports `rate_limited`
- **THEN** the receiver MAY send a low-frequency wake heartbeat until running resumes, the source changes, or the receiver unloads
