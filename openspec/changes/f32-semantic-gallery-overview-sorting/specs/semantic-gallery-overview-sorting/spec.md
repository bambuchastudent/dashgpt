## Purpose

Define Color-first gallery sorting, a deterministic 32-color semantic palette and whole-selection one-screen overview behavior.

## ADDED Requirements

### Requirement: Color is the default ordering
The system SHALL default to Color ordering and SHALL present sort controls in the order Color, Tag, Time.

#### Scenario: Fresh gallery starts Color-first
- **WHEN** no valid F32 sort preference exists
- **THEN** Color SHALL be active
- **AND** the visible control order SHALL be Color, Tag, Time

#### Scenario: Invalid old preference does not restore Time default
- **WHEN** persisted F32 sort state is missing, invalid, or from an unsupported presentation-state version
- **THEN** the system SHALL resolve to Color without modifying unrelated Gallery state

### Requirement: Semantic display uses exactly 32 palette slots
The system SHALL derive a deterministic palette slot from the existing semantic hue using 32 evenly spaced hue positions and SHALL use that palette slot consistently across Gallery densities.

#### Scenario: Palette has 32 semantic slots
- **WHEN** all palette indices are enumerated
- **THEN** there SHALL be exactly 32 distinct indices and 32 distinct base display hues

#### Scenario: Density does not change a card color slot
- **WHEN** the same unchanged card is rendered at overview, standard, and focus density
- **THEN** its palette slot SHALL remain identical

### Requirement: Color ordering follows Color then Tag then Time
The system SHALL order Color mode by palette slot first, primary canonical tag second, newest meaningful timestamp third, and stable ID last.

#### Scenario: Same-color cards form deterministic tag neighborhoods
- **WHEN** cards share one palette slot but have different primary tags
- **THEN** their primary tags SHALL determine their relative groups before Time

### Requirement: Tag ordering remains available
The system SHALL provide Tag ordering using the first normalized non-empty canonical tag, palette slot as the next tie-break, and meaningful Time after palette. Untagged cards SHALL form a deterministic final group and each card SHALL appear once.

#### Scenario: Multi-tag card appears once
- **WHEN** a card has several tags
- **THEN** Tag ordering SHALL use its primary tag without duplicating the card

### Requirement: Time ordering remains available
The system SHALL provide newest-first Time ordering using meaningful create/update/Dash-membership time and SHALL NOT promote a card merely because it was opened or continued.

#### Scenario: Viewing does not change Time order
- **WHEN** an older card is opened or continued
- **THEN** that interaction alone SHALL NOT move it ahead of a newer card

### Requirement: Sorting never changes selection
The system SHALL apply Color, Tag, and Time only after the current accessible selection is produced and SHALL preserve the exact selected card IDs, search/filter state, and Semantic Dash membership.

#### Scenario: Search selection survives sorting
- **WHEN** a search subset switches among Color, Tag, and Time
- **THEN** all three modes SHALL contain exactly the same card IDs

### Requirement: Minimum density fits the whole current selection when reasonably possible
At minimum density the system SHALL calculate both columns and rows from available Gallery width, available viewport height and exact selected-card count. It SHALL first try compact identity cards and SHALL switch to a one-card-per-tile heat map when compact cards cannot all fit.

#### Scenario: Common card sets fit with compact identity
- **WHEN** 20, 50, or 100 cards fit above the compact useful tile floor
- **THEN** every selected card SHALL be visible inside the overview rectangle with semantic color and a short identity cue

### Requirement: Representative imported history fits on one screen as a Color heat map
The system SHALL support a heat-map floor that allows approximately 2,200 selected cards to be simultaneously represented on desktop and 360/390px mobile viewports without pagination, sampling, aggregation, membership removal, or horizontal overflow.

#### Scenario: 2200-card Color overview
- **WHEN** approximately 2,200 cards are selected at minimum density with the default Color mode
- **THEN** every card SHALL be mounted as one semantic-color tile inside the available overview rectangle
- **AND** tiles SHALL follow palette-slot order so same/near semantic colors remain contiguous

#### Scenario: Heat-map tile remains actionable
- **WHEN** a heat-map tile has no visible card text
- **THEN** it SHALL remain focusable and openable as the same canonical card
- **AND** card identity SHALL remain available through accessible or native cues

### Requirement: Extreme selections preserve all cards
If the selected set exceeds even the defined heat-map capacity, the system SHALL retain every selected card and SHALL use deterministic vertical overflow instead of pagination, aggregation, sampling, or membership removal.

#### Scenario: Collection exceeds heat-map capacity
- **WHEN** the selected set cannot fit above the minimum heat-map floor
- **THEN** every card SHALL remain mounted, focusable, openable, and reachable by scrolling

### Requirement: My Dash and Semantic Dash share the contract
The system SHALL use the same sorting, palette and overview-planning primitives for My Dash and accepted Semantic Dash members.

#### Scenario: Narrow mobile remains usable
- **WHEN** the Gallery renders at 360px or 390px width
- **THEN** Color, Tag, and Time controls SHALL remain usable
- **AND** overview tiles SHALL create no horizontal overflow
