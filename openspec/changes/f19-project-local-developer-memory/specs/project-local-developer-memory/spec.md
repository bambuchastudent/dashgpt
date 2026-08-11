## Purpose

Project-local developer memory gives a software repository a portable `.dashgpt` knowledge layer whose canonical cards can be understood by humans and arbitrary AI agents, while a visual developer view explains how sessions, decisions and implementation evidence lead to outcomes.

## ADDED Requirements

### Requirement: Project memory is portable and provider-neutral
The system SHALL define project-local memory in ordinary AI-readable structured files and SHALL NOT require a specific chat client, model provider or binary semantic index to understand canonical project knowledge.

#### Scenario: Generic agent reads project memory
- **WHEN** an agent that has no DashGPT-specific integration can read the repository files
- **THEN** it can discover project context and canonical cards from the documented `.dashgpt` structure without parsing a proprietary binary format

#### Scenario: Different AI clients share one contract
- **WHEN** memory provenance references Copilot, OpenCode, Cline or a local model
- **THEN** the same card/session/relationship contract represents each source without provider-specific canonical fields

### Requirement: Cards remain canonical and sessions remain evidence
The system SHALL treat distilled cards as canonical reusable project memory. Session records SHALL be optional evidence and SHALL NOT be required to preserve knowledge already represented by cards.

#### Scenario: Session can disappear without losing the outcome
- **WHEN** a session referenced by a completed outcome is unavailable or intentionally removed
- **THEN** the canonical card still preserves the problem, decision, outcome and remaining evidence

#### Scenario: Multiple sessions contribute to one card
- **WHEN** several AI sessions contribute to the same engineering result
- **THEN** one canonical card can reference all contributing session IDs without creating duplicate outcome entities

### Requirement: Developer cards can preserve engineering causality
A developer card SHALL support optional structured problem, decision, outcome, code/file references and evidence while preserving the existing card-first identity.

#### Scenario: User inspects why a change exists
- **WHEN** a result card has problem, decision, files and evidence
- **THEN** the developer view can present a coherent path from problem through decision to implementation outcome

#### Scenario: Non-developer card remains valid
- **WHEN** a canonical card does not contain developer-specific metadata
- **THEN** it remains a valid card and is not required to invent problem, code or evidence fields

### Requirement: Relationships connect canonical cards
The project memory SHALL support explicit stable-ID relationships among cards, including causal and implementation relationships, without relying on visual position as stored meaning.

#### Scenario: Visual map is regenerated
- **WHEN** the same cards and relationships are rendered again
- **THEN** the semantic neighborhoods and relationship labels can be reconstructed without storing pixel coordinates as canonical knowledge

### Requirement: Developer visualization uses the same canonical cards
The prototype SHALL render Project Map, Timeline, Results and Sessions views from one project-memory fixture. Results SHALL be derived from canonical cards and SHALL NOT introduce a second Result storage entity.

#### Scenario: Result appears across views
- **WHEN** one completed engineering card is present in the fixture
- **THEN** the same card identity can appear in Project Map, Timeline and Results views and its detail panel without duplication into another canonical entity

#### Scenario: Session view remains secondary
- **WHEN** the Sessions view lists a contributing AI session
- **THEN** it shows links to canonical card outcomes rather than presenting the transcript itself as the main project result

### Requirement: Detail view exposes decision and evidence
The prototype SHALL allow a user to inspect a card and see available engineering context including problem, decision, outcome, files, evidence and contributing sessions.

#### Scenario: Completed bug fix has evidence
- **WHEN** the user opens a completed bug-fix card with a regression test and pull-request evidence
- **THEN** the detail surface identifies both the decision/outcome and the evidence that supports it

### Requirement: Session privacy is explicit
The prototype SHALL describe session history as local/private evidence by default and SHALL NOT claim that raw sessions are committed, synchronized or automatically captured.

#### Scenario: User views session provenance
- **WHEN** the user opens Sessions
- **THEN** the UI labels session information as evidence and does not expose a control or status claiming that automatic IDE capture is already active

### Requirement: Prototype is usable on desktop and mobile
The standalone developer view SHALL remain readable and operable at desktop and 390px mobile widths without horizontal page overflow.

#### Scenario: Mobile project map
- **WHEN** the developer prototype is opened at a 390px viewport
- **THEN** navigation, semantic cards and detail content reflow vertically and the document does not overflow horizontally

### Requirement: Existing DashGPT product behavior is unchanged
This prototype SHALL remain isolated from the current main dashboard, Semantic Dashes, Semantic Gallery controller, search, storage providers, continuation and MCP runtime behavior.

#### Scenario: Concurrent Unified Card Dashboard work remains independent
- **WHEN** the prototype is implemented while the Unified Card Dashboard change is active
- **THEN** no Unified Card Dashboard-owned production files need to be modified for the developer prototype to render
