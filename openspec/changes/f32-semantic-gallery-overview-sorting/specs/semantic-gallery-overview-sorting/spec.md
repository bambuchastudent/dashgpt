## Purpose

Define chronological default sorting, Color and Tag alternatives, and full-membership overview behavior for the gallery.

## ADDED Requirements

### Requirement: Time is the default ordering
The system SHALL default to Time ordering and SHALL place cards with newer meaningful `updatedAt`, `publishedAt`, or `createdAt` values before older cards, with stable ID as a deterministic tie.

#### Scenario: Newer cards lead
- **WHEN** selected cards have different valid timestamps
- **THEN** the newest card appears first regardless of storage order

#### Scenario: Viewing does not change Time order
- **WHEN** an older card is opened or continued
- **THEN** that interaction alone does not move it ahead of a newer card

### Requirement: Color ordering preserves semantic color
The system SHALL provide Color ordering based on the existing semantic hue and SHALL NOT change a card's semantic hue because of sorting.

#### Scenario: Color order is deterministic
- **WHEN** Color ordering is selected
- **THEN** cards follow hue order with Time and stable ID resolving ties

### Requirement: Tag ordering uses canonical tags
The system SHALL provide Tag ordering using the first normalized non-empty canonical tag, with a deterministic final untagged group for cards without tags. Each card SHALL appear once.

#### Scenario: Multi-tag card appears once
- **WHEN** a card has several tags
- **THEN** Tag ordering uses its primary tag without duplicating the card

#### Scenario: Untagged cards follow tagged groups
- **WHEN** tagged and untagged cards are present together
- **THEN** the untagged group appears after named tag groups

### Requirement: Sorting never changes selection
The system SHALL apply Time, Color, and Tag only after the current accessible selection is produced and SHALL preserve the exact selected card IDs, search/filter state, and Semantic Dash membership.

#### Scenario: Search selection survives sorting
- **WHEN** a search subset switches among Time, Color, and Tag
- **THEN** all three modes contain exactly the same card IDs

### Requirement: Sort preference is versioned presentation state
The system SHALL persist `sortMode` in isolated versioned browser presentation state and SHALL default missing or invalid sort state to Time without rewriting the existing gallery density/filter/query/focus state.

#### Scenario: Reload restores sort mode
- **WHEN** a valid sort mode was saved
- **THEN** reload restores it before ordering the gallery

#### Scenario: Existing gallery state is preserved
- **WHEN** a user already has valid Feature 8 gallery presentation state and no F32 sort preference
- **THEN** Time is used by default and the existing density, filters, query, focus, and remembered-order data remain unchanged

### Requirement: Minimum density attempts whole-board compact fit
At minimum density the system SHALL first calculate compact-card layout using available gallery width, available viewport height, selected card count, grid gap, and useful text-tile dimensions. The calculation SHALL use both columns and rows.

#### Scenario: Representative desktop sets fit with identity text
- **WHEN** 20, 50, or 100 cards can fit above the compact useful tile floor
- **THEN** all selected cards fit in the available gallery viewport with semantic color and a short identity cue

### Requirement: Large selections use a one-card-per-tile heat map
When the full selection cannot fit at the compact-card floor, the system SHALL attempt a semantic heat-map representation with one distinct visual tile per selected canonical card, smaller map floors, and preserved semantic color, focus/open behavior, and accessible identity.

#### Scenario: Realistic large history fits as a heat map
- **WHEN** approximately 2,200 cards are selected and the desktop or 390px mobile viewport has sufficient geometry for the defined heat-map floor
- **THEN** every selected card is simultaneously represented by its own semantic-color tile in the overview without pagination or membership removal

#### Scenario: Heat-map tile remains actionable
- **WHEN** a user focuses, hovers, or activates a heat-map tile
- **THEN** card identity remains available through accessible/native cues and activation opens the same canonical card

### Requirement: Extreme selections preserve all cards
If literal viewport fit would require tiles below the defined heat-map minimum, the system SHALL retain every selected card and SHALL use deterministic vertical overflow instead of pagination, aggregation, sampling, or membership removal.

#### Scenario: Collection exceeds heat-map capacity
- **WHEN** the selected set is too large for even the useful heat-map floor
- **THEN** every card remains mounted, focusable, openable, and reachable by scrolling

### Requirement: My Dash and Semantic Dash share the contract
The system SHALL use the same sorting primitives and overview-planning rules for My Dash and accepted Semantic Dash members.

#### Scenario: Narrow mobile remains usable
- **WHEN** the gallery renders at 360px or 390px width
- **THEN** sort controls remain usable and overview tiles create no horizontal overflow
