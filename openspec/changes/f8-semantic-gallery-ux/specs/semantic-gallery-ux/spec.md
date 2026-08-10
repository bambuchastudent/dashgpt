## Purpose

Semantic Gallery UX presents every current Result selection as a stable, zoomable memory gallery whose thematic neighborhoods stay coherent and whose recent work rises only within its own topic.

## ADDED Requirements

### Requirement: Gallery ordering keeps semantic neighborhoods adjacent
The system SHALL group the currently selected accessible Results by a stable semantic signature before applying activity order. Activity SHALL NOT move a Result into another semantic neighborhood or reorder the neighborhoods themselves.

#### Scenario: Multiple semantic topics remain contiguous
- **WHEN** a selection contains several food, travel, home, and DashGPT Results in arbitrary storage order
- **THEN** Results with the same stable semantic group are adjacent and the group order is deterministic

#### Scenario: Small semantic perturbation stays in the neighborhood
- **WHEN** a title/tag perturbation changes presentation hue or semantic position but not the dominant group signature
- **THEN** the Result remains in the same neighborhood and only its deterministic within-group tie position may change

#### Scenario: Identical inputs reload identically
- **WHEN** Results, activity events, semantic engine version, selection key, and saved gallery state are unchanged
- **THEN** repeated ordering produces exactly the same Result-ID sequence

### Requirement: Explicit activity ranks Results only inside their topic
Within a semantic group, the system SHALL prioritize latest continuation activity, then latest explicit open activity, then latest update activity, then creation/publication time, with remembered order, semantic position, and stable Result ID as deterministic ties.

#### Scenario: Continued Result leads its topic
- **WHEN** related Results have continuation, open, update, and creation signals respectively
- **THEN** the continued Result appears first, followed by opened, updated, and created Results inside that topic

#### Scenario: Activity does not disturb another topic
- **WHEN** a food Result receives a new continuation event
- **THEN** it may move within the food group while the relative order of every travel Result remains unchanged

#### Scenario: Viewport appearance is not activity
- **WHEN** a Result card is rendered, scrolled into view, hovered, focused, or resized by gallery zoom without an explicit open/continue/update/create/Dash action
- **THEN** no Result activity event is appended and its activity tuple is unchanged

### Requirement: Activity remains mutable portable state outside Result knowledge
The system SHALL record explicit Result activity as append-only Vault events containing Result identity, supported activity kind, and timestamp. It SHALL NOT add activity fields to immutable Result content or change Result hashes.

#### Scenario: Open and continuation actions are recorded
- **WHEN** the user opens card details, opens a standalone Result page, follows the original source, or starts a continuation chat
- **THEN** the matching `opened`, `source.open`, or `continue.new-chat` event is available to gallery ordering

#### Scenario: Update and Dash actions share the contract
- **WHEN** a card edit/update or Semantic Dash add/remove surface records activity
- **THEN** it uses the same Result activity helper and contributes to `updatedAt` without changing Dash membership semantics

#### Scenario: Result integrity is unchanged
- **WHEN** any gallery activity is recorded and synchronized
- **THEN** the Result's durable fields, content version, and immutable `contentHash` remain byte-for-byte unchanged

### Requirement: Internal zoom changes density without changing selection
The gallery SHALL expose five bounded density levels and SHALL render every Result in the current selection at every level. Zoom SHALL change card geometry, column count, and detail level only.

#### Scenario: Zooming out reveals a denser complete overview
- **WHEN** the user moves from focus density to minimum overview density
- **THEN** card minimum width decreases, the possible column count increases, and the set of rendered Result IDs remains exactly the current selection

#### Scenario: Zooming in reveals more card content
- **WHEN** the user moves from overview to comfortable or focus density
- **THEN** fewer columns are possible and cards expose expanded summary, metadata, next action, and available primary actions

#### Scenario: Overflow uses ordinary scrolling
- **WHEN** all selected cards do not physically fit in the viewport at minimum density
- **THEN** every card remains present and reachable through normal page scrolling without semantic hiding or pagination

### Requirement: Touch, trackpad, mouse, and keyboard can control density
The gallery SHALL support two-pointer pinch, browser-supported trackpad pinch, a visible range control, and explicit decrease/increase buttons. Gesture completion SHALL snap to the nearest valid density.

#### Scenario: Touch pinch scales continuously then snaps
- **WHEN** two touch pointers change their distance over the gallery
- **THEN** card geometry follows the bounded distance ratio during the gesture and settles on the nearest density after the gesture ends

#### Scenario: Trackpad pinch uses internal gallery zoom
- **WHEN** the browser reports a trackpad pinch as a control-modified wheel or supported gesture event over the gallery
- **THEN** the event changes internal gallery density rather than relying on browser page zoom

#### Scenario: Density works without gestures
- **WHEN** a keyboard, mouse, switch, or assistive-technology user operates the range or plus/minus controls
- **THEN** the same density states and accessible value label are available

### Requirement: Typography never grows above the 100 percent baseline
The gallery SHALL calculate `fontScale = min(zoomScale, 1)`. Text SHALL shrink below standard density and SHALL remain at baseline size at every density above 100 percent.

#### Scenario: Overview text shrinks but stays identifiable
- **WHEN** density scale is below 1
- **THEN** card typography uses the same sub-1 scale and every card retains a clamped readable title or stable identity plus semantic visual

#### Scenario: Focus cards do not create oversized text
- **WHEN** density scale is greater than 1
- **THEN** card space and content availability grow while computed typography remains at the 100 percent baseline

#### Scenario: Long identity remains contained
- **WHEN** a Result has a very long title at any density
- **THEN** the title wraps or clamps within the card without overlap, horizontal overflow, or complete identity removal

### Requirement: Layout reflow preserves logical and visual context
The gallery SHALL keep one logical DOM order across viewport sizes, use a gap-free responsive grid, and attempt to preserve the card or point under the gesture/focus during density reflow.

#### Scenario: Responsive column changes keep order
- **WHEN** the viewport moves among desktop, tablet, and narrow mobile widths
- **THEN** column count adapts without card overlap, placeholder holes, or a change to the logical Result-ID sequence

#### Scenario: Gesture anchor remains nearby
- **WHEN** density changes around a card under the pinch midpoint or viewport focus
- **THEN** scroll compensation keeps that card approximately in the same screen region after reflow

#### Scenario: Reduced motion is respected
- **WHEN** the user requests reduced motion
- **THEN** the gallery applies the final layout without the optional reflow animation

### Requirement: Zoom composes with All, filters, search, and Semantic Dashes
The gallery SHALL operate on the caller's current selection and SHALL NOT clear or reinterpret All mode, category/favorite filters, a search query, or a materialized Semantic Dash.

#### Scenario: Active search survives zoom
- **WHEN** a search selection is active and the user changes density repeatedly
- **THEN** the query and exact Result-ID set remain unchanged and minimum density shows all search matches

#### Scenario: Semantic Dash survives zoom
- **WHEN** an eligible Semantic Dash member selection is rendered with selection key `dash:<id>`
- **THEN** the shared touch/trackpad/control density path preserves Dash identity, membership, proposals, filters, and every accepted member Result supplied to the gallery

#### Scenario: All mode shows the whole accessible memory
- **WHEN** All mode is active at minimum density
- **THEN** every currently accessible Result supplied by All mode appears in the gallery

### Requirement: Gallery presentation restores safely
The dashboard SHALL restore the last valid density, active category/favorite/query controls, selection key, remembered tie order, and focus hint from versioned browser presentation state before its first gallery render.

#### Scenario: Reload restores density and selection controls
- **WHEN** the dashboard is reopened with valid saved gallery state
- **THEN** it renders the saved density and controls without first resetting to standard/All

#### Scenario: Invalid or stale state is harmless
- **WHEN** saved state has an unknown version, invalid density, malformed order, or Result IDs no longer in the selection
- **THEN** the system falls back to safe defaults and ignores stale IDs without losing Results or Vault data

#### Scenario: Zoom writes no content state
- **WHEN** only gallery density changes
- **THEN** no Result revision, favorite, activity event, Dash membership, search result, or semantic color is modified
