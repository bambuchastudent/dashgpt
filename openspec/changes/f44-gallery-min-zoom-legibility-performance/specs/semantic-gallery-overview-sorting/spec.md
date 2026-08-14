## Purpose

Refine the existing whole-selection Semantic Gallery overview so minimum density keeps a visible short content cue on every card and large-board zoom avoids unnecessary full-board rendering work.

## MODIFIED Requirements

### Requirement: Minimum density fits the whole current selection when reasonably possible
At minimum density the system SHALL calculate both columns and rows from available Gallery width, available viewport height and exact selected-card count. It SHALL first try compact identity cards and SHALL switch to a one-card-per-tile heat map when compact cards cannot all fit. Every minimum-density card representation SHALL retain a visible clipped short text cue without increasing the planned tile size.

#### Scenario: Common card sets fit with compact identity and text
- **WHEN** 20, 50, or 100 cards fit above the compact useful tile floor
- **THEN** every selected card SHALL be visible inside the overview rectangle with semantic color, title identity, and a clipped short summary cue when summary content exists

#### Scenario: Dense heat map still exposes visible text
- **WHEN** the selected set requires heat-map or deterministic overflow representation
- **THEN** every mounted card tile SHALL retain one visible clipped text cue derived from its summary when available and otherwise from its title
- **AND** the cue SHALL NOT expand the tile, remove cards, aggregate cards, or introduce horizontal overflow

### Requirement: Representative imported history fits on one screen as a Color heat map
The system SHALL support a heat-map floor that allows approximately 2,200 selected cards to be simultaneously represented on desktop and 360/390px mobile viewports without pagination, sampling, aggregation, membership removal, or horizontal overflow. Each tile SHALL retain semantic color and a visible clipped text cue, while full card identity remains available through accessible or native cues.

#### Scenario: 2200-card Color overview
- **WHEN** approximately 2,200 cards are selected at minimum density with the default Color mode
- **THEN** every card SHALL be mounted as one semantic-color tile inside the available overview rectangle when the defined heat-map floor permits it
- **AND** every tile SHALL render a visible clipped text cue without changing the overview geometry
- **AND** tiles SHALL follow palette-slot order so same/near semantic colors remain contiguous

#### Scenario: Tiny tile remains actionable and identifiable
- **WHEN** a heat-map tile is too small to show its complete visible cue
- **THEN** the clipped cue SHALL remain visible
- **AND** the tile SHALL remain focusable and openable as the same canonical card
- **AND** full card identity SHALL remain available through accessible or native cues

## ADDED Requirements

### Requirement: Large-board density interaction avoids unnecessary full-board work
The Gallery SHALL avoid expensive work unrelated to the visible density change when the user zooms or resizes a large card board.

#### Scenario: Large board commits a density change
- **WHEN** the Gallery contains more cards than the bounded reflow-animation threshold
- **THEN** committing a density change SHALL NOT capture before-and-after geometry for every card solely to animate reflow
- **AND** every card SHALL remain mounted, ordered, focusable and openable

#### Scenario: Continuous pinch or trackpad zoom
- **WHEN** multiple transient scale inputs arrive before the next animation frame
- **THEN** presentation geometry writes SHALL be coalesced to the latest scale for that frame
- **AND** scale calculation SHALL remain continuous across the gesture

#### Scenario: Density-only mutation or viewport resize
- **WHEN** Gallery density detail changes or the viewport resizes without a card-tree or sort change
- **THEN** the overview layout SHALL refresh
- **AND** the system SHALL NOT re-materialize and re-sort the Vault solely because of that density or resize event
