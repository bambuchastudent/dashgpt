## Purpose

Semantic Dashes let a user treat related DashGPT Results from multiple conversations and accessible storage locations as one living, saved topic without copying or mutating the Results themselves.

## ADDED Requirements

### Requirement: Dash is a reference-only living topic
The system SHALL represent a saved Dash with a stable identity, name, description, semantic topic definition, update mode, Result references, last-update time, and user overrides. A Dash SHALL NOT contain independent copies of referenced Result knowledge.

#### Scenario: Results from multiple chats form one Dash
- **WHEN** accessible matching Results have different source chat identifiers or URLs
- **THEN** the system includes references to those Results in one Dash without changing either Result

#### Scenario: One Result belongs to multiple Dashes
- **WHEN** the same Result matches or is manually added to two saved Dashes
- **THEN** both Dashes reference the same Result identity independently

#### Scenario: Dash deletion preserves Results
- **WHEN** the user deletes a saved Dash
- **THEN** the system removes or tombstones only the Dash and leaves every referenced Result unchanged

### Requirement: Topic request produces a temporary Dash before durable creation
When no saved Dash confidently matches a topic request, the system SHALL semantically select matching accessible Results, materialize a temporary Dash, show it to the user, and require an explicit save action before writing a durable Dash.

#### Scenario: Topic has matching Results but no saved Dash
- **WHEN** the user requests `Даш про еду` and no saved Dash confidently matches while accessible food Results do
- **THEN** the system shows a temporary food Dash and offers to save it instead of silently creating one

#### Scenario: Topic has no matching Results
- **WHEN** neither a saved Dash nor any accessible Result meets the semantic relevance floor
- **THEN** the system returns an empty temporary Dash with a clear no-match state and does not create durable state

#### Scenario: User saves a temporary Dash
- **WHEN** the user explicitly saves the temporary Dash
- **THEN** the system creates a stable Dash definition and initial membership snapshot with a default update mode of `review`

### Requirement: Saved Dashes reopen by semantic intent
The system SHALL match a natural-language request against saved Dash names, descriptions, and semantic topic definitions without requiring an exact title or the word `dash`.

#### Scenario: One confident saved Dash opens directly
- **WHEN** one saved Dash is above the confident-match threshold and sufficiently ahead of every alternative
- **THEN** the system opens and refreshes that Dash without asking the user to repeat its exact title

#### Scenario: Materially ambiguous saved Dashes require a choice
- **WHEN** multiple semantically distinct saved Dashes have similarly confident scores for the request
- **THEN** the system returns a short choice containing those Dash names and does not silently select one

#### Scenario: Natural continuation wording resolves a Dash
- **WHEN** the user says `Продолжим про квас` and a saved food or kvass Dash is the single confident match
- **THEN** the system treats the command as a Dash-open intent and returns that Dash

### Requirement: Semantic retrieval is deterministic and shared
The same topic, Result fields, Dash definitions, eligibility set, and semantic-engine version SHALL produce the same ranking in dashboard and chat surfaces without requiring a paid model or network service.

#### Scenario: Semantically related wording matches
- **WHEN** the topic and a Result use supported related wording rather than an exact phrase, such as `еда` and a Result tagged `recipe`
- **THEN** the Result receives a semantic match score high enough to be selected or proposed according to the same thresholds on both surfaces

#### Scenario: Result search remains compatible
- **WHEN** a user performs an ordinary Result search instead of opening a Dash
- **THEN** the system uses the shared ranking while preserving category, favorites, limit, and exact-text filtering behavior

### Requirement: Review refresh separates dynamic membership from overrides
The system SHALL recalculate semantic candidates from the current eligible Result set while keeping dynamic membership separate from append-only user overrides. In `review` mode, new matches SHALL be proposals until the user accepts them.

#### Scenario: New matching Result becomes a proposal
- **WHEN** a high-confidence matching Result appears after a saved Dash's previous membership snapshot
- **THEN** refresh lists it as a proposal and does not silently add it to accepted membership

#### Scenario: Accepted proposal joins membership
- **WHEN** the user accepts a proposed Result
- **THEN** the Result becomes an included Dash member and the aggregate summary is regenerated

#### Scenario: Rejected proposal does not return
- **WHEN** the user rejects or excludes a proposed Result
- **THEN** later refreshes do not propose or include that Result unless the user explicitly reverses the override

#### Scenario: Pinned Result survives recalculation
- **WHEN** a pinned Result falls below the current semantic membership threshold but remains accessible
- **THEN** refresh keeps it in the Dash as a pinned member

#### Scenario: Manual addition is durable
- **WHEN** the user manually adds an accessible Result that semantic retrieval did not select
- **THEN** the Result remains included across refreshes until the user reverses that manual override or excludes it

#### Scenario: Automatic mode is not enabled in this change
- **WHEN** a caller requests update mode `automatic`
- **THEN** the system preserves forward-compatible mode data but rejects or disables activation and continues to default new Dashes to `review`

### Requirement: Eligibility and privacy precede retrieval and summarization
At every creation, open, and refresh, the system SHALL apply the user's current source scope, storage-provider authorization, archival/deletion state, and access eligibility before semantic scoring, membership materialization, or aggregate-summary generation.

#### Scenario: Inaccessible Result is not selected
- **WHEN** a semantically strong Result is outside the selected scope or is currently inaccessible, deleted, or excluded by source policy
- **THEN** its content does not affect ranking, proposals, member content, counts, or aggregate summary

#### Scenario: Previously accessible Result loses access
- **WHEN** a saved Dash references a Result that is no longer accessible
- **THEN** the Dash may show a content-free unavailable reference state but SHALL NOT reveal the Result title, summary, source URL, or previously aggregated text

#### Scenario: Access returns later
- **WHEN** a referenced Result becomes accessible again within the Dash scope
- **THEN** a later refresh may materialize it according to the saved topic and overrides without relying on a copied Result body

### Requirement: Materialized Dash is concise and current
The system SHALL derive an aggregate summary from the currently accessible included Results, record the refresh time, separate members from proposals and unavailable references, and avoid rendering an unbounded flat card list by default.

#### Scenario: Aggregate summary follows accepted membership
- **WHEN** a proposal is accepted, a member is excluded, or access eligibility changes
- **THEN** the next materialization regenerates the summary solely from the resulting accessible included members

#### Scenario: Large Dash uses a top-level structure
- **WHEN** a Dash contains more Results than the default conversational display limit
- **THEN** chat output shows a meaningful grouped overview and a bounded set of leading Results with an action to inspect the remainder

#### Scenario: Chat representation includes continuation actions
- **WHEN** a Dash is loaded into chat
- **THEN** the response includes its name, aggregate summary, leading Results, new proposals, update time, Result/source links when available, and a continuation action

### Requirement: Dashboard supports Dash lifecycle and member actions
The dashboard SHALL show saved Dashes alongside Results and SHALL provide temporary Dash preview, save, open, refresh, rename, description edit, review proposal, pin, exclude, manual add, update-mode display, and delete actions.

#### Scenario: Dash appears after saving
- **WHEN** a user saves a temporary Dash
- **THEN** the dashboard immediately lists it and can reopen it after a page reload from the active Vault

#### Scenario: Result actions remain continuation-first
- **WHEN** the user inspects a Result inside a Dash
- **THEN** opening the Result, opening its original chat when available, and continuing in a new chat are primary actions while Context Pack remains secondary

#### Scenario: Excluding from one Dash is isolated
- **WHEN** the user excludes a Result from one Dash that also references it elsewhere
- **THEN** the Result remains unchanged and continues to appear in every other Dash whose own rules and overrides include it

### Requirement: Chat tools load accessible Dashes without silent writes
The provider-neutral instance and MCP surfaces SHALL support semantic Dash lookup/materialization from Results and Dash definitions exposed by the selected compatible instance. A chat request that produces only a temporary Dash SHALL not durably save it without explicit user confirmation.

#### Scenario: Natural command loads a saved accessible Dash
- **WHEN** an assistant invokes Dash lookup for `Открой мой даш про DashGPT` against an instance that exposes one confident matching saved Dash
- **THEN** the tool returns the refreshed Dash representation directly in the current chat

#### Scenario: Chat has no saved accessible Dash
- **WHEN** an assistant invokes Dash lookup and only matching Results are available
- **THEN** the tool returns a temporary Dash plus an explicit import/save action rather than claiming it is saved

#### Scenario: Private Vault is not made public for chat lookup
- **WHEN** browser-local or paired private-provider Dash data is not authorized and exposed through the selected instance
- **THEN** the public instance/MCP endpoint cannot read or infer that data and only searches its accessible catalog

### Requirement: Vault and immutable Result compatibility are preserved
Dash persistence SHALL be an additive, provider-neutral extension of Vault v1. Existing Vaults without Dash revisions SHALL remain readable, Dash objects SHALL serialize as ordinary Vault objects, and no Dash operation SHALL alter immutable Result content or Result `contentHash` inputs.

#### Scenario: Existing Vault opens with no Dashes
- **WHEN** a Vault v1 payload created before this capability has Results, events, and profile revisions but no Dash revisions
- **THEN** the system loads it successfully with an empty Dash collection

#### Scenario: Vault export and provider object round trip preserves Dash state
- **WHEN** a Vault containing Dash revisions and Dash override events is exported, imported, or mapped through the existing provider-neutral object layout
- **THEN** Dash definitions, reference snapshots, deletion state, and user overrides materialize equivalently

#### Scenario: Dash operations leave Result hashes unchanged
- **WHEN** a Result is selected, proposed, pinned, manually added, excluded, or removed by Dash deletion
- **THEN** its durable knowledge fields and immutable `contentHash` remain byte-for-byte unchanged

### Requirement: DashGPT product-discussion scenario uses the general mechanism
The system SHALL represent `DashGPT / Product discussions` as an ordinary Semantic Dash rather than a special entity or hard-coded workflow.

#### Scenario: Product Results from different chats are collected
- **WHEN** accessible Results from different conversations contain both `DashGPT` and `Product` semantic signals
- **THEN** the general semantic engine includes or proposes them for the saved `DashGPT` Dash according to its topic and overrides

#### Scenario: New product discussion is proposed and reopening preserves overrides
- **WHEN** a new matching Product Result appears and the user later issues `Открой даш про DashGPT`
- **THEN** the saved Dash reopens, presents the new Result for review, and retains prior pins and exclusions
