## Purpose

Resumable Progressive ChatGPT History Import lets a user migrate a large authenticated ChatGPT history into the existing local DashGPT Vault as canonical cards, see those cards appear progressively, interrupt/restart safely without duplicates, and understand migration state through one first-class My Dash card.

## ADDED Requirements

### Requirement: A clean new My Dash includes one stable ChatGPT history import card
The system SHALL present one stable operational card for ChatGPT history import in a genuinely clean/new personal My Dash and SHALL reuse the same card identity through the supported import lifecycle.

#### Scenario: New user opens My Dash
- **WHEN** a new personal Vault has no existing user Result cards
- **THEN** My Dash contains one `Import ChatGPT history` card with a `Start import` action and the card is visually prominent without changing the user's explicit favorite state

#### Scenario: Reload before starting
- **WHEN** the clean user reloads My Dash before starting an import
- **THEN** exactly one import card with the same stable Result ID is present

#### Scenario: Existing populated user receives the feature
- **WHEN** an existing personal Vault already contains ordinary user Result cards and no import card
- **THEN** deployment of this feature SHALL NOT silently inject a new default import card merely because the page loaded

### Requirement: The import writes directly to the existing canonical Card/Result Vault path
The system SHALL persist imported conversations as ordinary mutable canonical Results in the existing browser-local DashGPT Vault and SHALL NOT require a parallel imported-chat database or a monolithic export file before cards become useful.

#### Scenario: One conversation is durably accepted
- **WHEN** the receiver accepts and persists a valid ChatGPT conversation candidate
- **THEN** the resulting card is materialized through the normal Vault Result path and can participate in My Dash, search, Semantic Gallery, saved Dashes and continuation like another eligible mutable Result

#### Scenario: Optional sync is configured later
- **WHEN** the user's Vault is later synchronized by an existing supported storage adapter
- **THEN** imported cards follow the normal Vault synchronization behavior and the history importer does not implement provider-specific sync semantics

### Requirement: Stable ChatGPT conversation identity makes import idempotent
The system SHALL use the stable ChatGPT conversation ID as the primary source identity and SHALL deterministically map that identity to one mutable imported Result ID.

#### Scenario: Same conversation delivered twice
- **WHEN** the same ChatGPT conversation source ID is delivered more than once
- **THEN** the Vault contains one logical imported card for that source rather than duplicate cards

#### Scenario: Two conversations share a title
- **WHEN** two different ChatGPT conversation IDs have the same title
- **THEN** they remain two distinct imported source cards

#### Scenario: Source conversation is newer
- **WHEN** a previously imported source ID is rediscovered with a newer provider update time
- **THEN** the same deterministic imported Result is updated rather than creating a second card

#### Scenario: Source conversation is not newer
- **WHEN** a previously imported source ID is rediscovered at equal or older freshness
- **THEN** detail fetching/persistence for that source MAY be skipped and no new card is created

### Requirement: Durable imported cards are the resume checkpoint
The system SHALL derive completed import work from durably stored imported source cards rather than depending on a second giant completed-ID ledger.

#### Scenario: Crash after Vault save before acknowledgement
- **WHEN** a conversation card was durably saved but the source runner did not receive its acknowledgement before interruption
- **THEN** the next launch recognizes the source ID as already current and does not duplicate it

#### Scenario: Resume after interruption
- **WHEN** an import previously saved N source cards and the ChatGPT source context is later relaunched
- **THEN** current ChatGPT history is rediscovered and only missing or stale source IDs require detail import work

#### Scenario: Previously failed sources remain unresolved
- **WHEN** a source conversation did not reach a durable Vault save
- **THEN** it remains missing/stale and is eligible for retry on a later launch without replaying already-current sources

### Requirement: Import is progressive and uses bounded batch persistence
The system SHALL persist accepted conversations in bounded batches and SHALL make imported cards useful before the complete history finishes.

#### Scenario: Batch is saved successfully
- **WHEN** a valid bounded batch is received
- **THEN** deterministic Result upserts and the progress-card update are saved through the existing Vault boundary before the batch is acknowledged

#### Scenario: Persistence fails
- **WHEN** the Vault save for a received batch fails, including quota failure
- **THEN** the batch is not acknowledged as durable and its conversations remain eligible for safe retry

#### Scenario: Large history is in progress
- **WHEN** a 2,000+ conversation history is still importing
- **THEN** previously accepted cards are already available in DashGPT and neither source nor receiver needs to buffer the complete history in memory

### Requirement: Gallery refresh is bounded independently from persistence cadence
The system SHALL allow progressive visual updates without rebuilding the complete Semantic Gallery after every individual conversation.

#### Scenario: Multiple batches arrive quickly
- **WHEN** several import batches are durably accepted in a short interval
- **THEN** the runtime MAY coalesce card-gallery refreshes while keeping the progress card truthful and all accepted cards durable

#### Scenario: User searches during import
- **WHEN** the user interacts with existing My Dash/search while import continues
- **THEN** the existing canonical gallery/search implementation remains authoritative and no parallel imported-card renderer is introduced

### Requirement: The launcher respects cross-origin browser security
The system SHALL provide a visible `Start import` action from the import card, SHALL open/prepare the authenticated ChatGPT source context, and SHALL NOT claim to inject arbitrary JavaScript into a cross-origin ChatGPT document.

#### Scenario: User starts import
- **WHEN** the user presses `Start import`
- **THEN** DashGPT opens the supported ChatGPT source context, prepares the same-origin source runner, and shows the single explicit browser-required execution action for the supported zero-install flow

#### Scenario: Source runner has not started
- **WHEN** ChatGPT was opened but the same-origin source runner has not established the receiver handshake
- **THEN** the progress card says it is waiting for the source rather than falsely saying conversation import is running

#### Scenario: No extension is installed
- **WHEN** a user follows the supported migration flow
- **THEN** no browser extension, plugin, userscript manager or MCP browser helper is required

### Requirement: Browser message transport is local, bounded and authenticated by origin plus transient launch state
The system SHALL use a local browser cross-window message bridge for progressive handoff and SHALL validate source origin, protocol version, transient session/nonce and payload bounds before mutating the Vault.

#### Scenario: Valid source batch arrives
- **WHEN** a message comes from the expected ChatGPT origin with the current transient launch values and a valid bounded batch
- **THEN** DashGPT reconstructs/sanitizes allowed card fields and may persist the batch

#### Scenario: Wrong origin or session arrives
- **WHEN** a message comes from an unrelated origin or mismatched session/nonce
- **THEN** the message is rejected without mutating cards, favorites, Dash membership, Vault identity or activity state

#### Scenario: Unexpected oversized payload arrives
- **WHEN** a message exceeds configured batch/card/payload limits
- **THEN** the receiver rejects it safely and records only bounded credential-free diagnostics

### Requirement: The source runner uses coordinated adaptive throttling
The system SHALL use one global detail-request scheduler with low bounded concurrency and shared cooldown behavior rather than independent fixed-concurrency retry loops.

#### Scenario: Detail requests are healthy
- **WHEN** the source endpoint responds successfully for a sustained period
- **THEN** the scheduler MAY cautiously increase concurrency within a low configured maximum

#### Scenario: One worker receives HTTP 429
- **WHEN** any detail request receives a meaningful rate-limit response
- **THEN** the shared queue observes one cooldown, respects `Retry-After` when supplied, reduces concurrency and prevents independent workers from immediately creating a retry storm

#### Scenario: Rate limiting persists
- **WHEN** the source remains throttled
- **THEN** the progress card presents a human `Waiting for ChatGPT`/rate-limited state and unresolved sources remain resumable rather than being permanently discarded after a small synchronized retry burst

### Requirement: Closing the ChatGPT source context pauses rather than loses progress
The system SHALL keep all durably accepted cards when the ChatGPT source context disappears and SHALL support later continuation from current source identity/freshness.

#### Scenario: User closes ChatGPT during import
- **WHEN** the source page closes or otherwise stops executing
- **THEN** already durable imported cards remain available and the operational state becomes or is next rendered as paused/interrupted rather than pretending work continues in the background

#### Scenario: User continues later
- **WHEN** the user relaunches import from the same progress card
- **THEN** the importer rediscoveries current history and continues missing/stale work without duplicating existing cards

### Requirement: Progress card is a normal card lifecycle surface, not an Import Jobs product
The system SHALL represent migration status and actions through the same stable import card and SHALL not introduce a permanent parallel job-management surface.

#### Scenario: Import is running
- **WHEN** durable batches are arriving
- **THEN** the card shows imported/discovered/remaining progress and appropriate running/pause state

#### Scenario: Import is partial
- **WHEN** current discovery contains unresolved sources after other sources were accepted
- **THEN** the card shows the unresolved count and retry/continue behavior targets missing/stale sources

#### Scenario: Import completes
- **WHEN** every currently discovered conversation is durably current
- **THEN** the card shows completion, automatic operational prominence is removed, and the user can view imported cards or remove the completed operational card

#### Scenario: Completed card is removed
- **WHEN** the user removes the completed operational import card
- **THEN** imported conversation cards and their provenance remain untouched

### Requirement: Imported cards are compact outcome-oriented projections rather than raw transcript archives
The system SHALL create bounded useful cards from conversation metadata/current branch content without persisting the complete raw ChatGPT message mapping/transcript by default.

#### Scenario: Conversation has assistant content
- **WHEN** a conversation detail contains substantial visible assistant content
- **THEN** the imported card summary uses a bounded deterministic projection of useful recent content plus source provenance rather than the full transcript

#### Scenario: Assistant content is unavailable
- **WHEN** no substantial visible assistant content is usable
- **THEN** the importer may fall back to a bounded meaningful user text projection while still producing a valid card or a safe unresolved result

#### Scenario: Synthetic large history is projected
- **WHEN** verification constructs thousands of maximum-sized imported card fixtures
- **THEN** per-card projection limits keep the resulting local Vault within the defined browser-local storage budget target or the implementation explicitly pauses before unsafe persistence

### Requirement: Provider credentials and session state never become DashGPT content
The system SHALL keep authenticated ChatGPT transport credentials transient inside the source context and SHALL not persist or transmit them as imported cards, progress state or diagnostics.

#### Scenario: Session authentication succeeds
- **WHEN** the source runner obtains transient session/access data needed for same-origin ChatGPT requests
- **THEN** only conversation-derived card candidates, stable source IDs/freshness, counts and safe status information may cross into DashGPT

#### Scenario: Diagnostics are copied
- **WHEN** troubleshooting diagnostics are produced
- **THEN** access tokens, cookies, account IDs, authorization headers, session payloads and raw full conversation bodies are absent

### Requirement: Existing card, Dash, search, continuation and sync semantics remain authoritative
The system SHALL compose with existing canonical Result/Vault behavior and SHALL not redefine unrelated product capabilities.

#### Scenario: Imported card enters a saved Dash
- **WHEN** existing Semantic Dash rules select or explicitly include an imported card
- **THEN** normal reference-only Dash membership behavior applies

#### Scenario: Imported card is continued
- **WHEN** the user invokes existing continuation on an imported card
- **THEN** the current Structured Continuation behavior operates on that card without an import-specific parallel continuation format

#### Scenario: Existing My Dash behavior is exercised
- **WHEN** normal search, favorites, saved Dash navigation or Product Board routes are used while/after import
- **THEN** PR #33 and existing gallery/Vault semantics remain intact apart from the explicitly specified operational import-card behavior
