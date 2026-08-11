## Purpose

Unified Card Dashboard makes the personal DashGPT experience one card surface: `My Dash` shows all eligible cards, search creates an unsaved selection, and saved Semantic Dashes are named views over the same cards.

## ADDED Requirements

### Requirement: My Dash is the virtual personal home
The system SHALL present the default personal dashboard as `My Dash` / `Мой Dash` and SHALL derive it from all currently eligible personal Result cards without creating a persistent Dash revision, Vault Dash object, or duplicated Result content.

#### Scenario: Opening the personal dashboard
- **WHEN** an existing user opens `/demo/`
- **THEN** the page identifies the current context as `My Dash`, shows the eligible card gallery, and does not create any new Dash revision or event merely because the page rendered

#### Scenario: Clean user has no personal cards
- **WHEN** a user has no eligible personal Result cards
- **THEN** the shell still identifies `My Dash` and offers the existing save-conversation path without leading with Vault, MCP, or storage terminology

### Requirement: Cards are the only top-level personal content surface
The system SHALL NOT expose separate top-level `Living Topics` and `Results` sections on the personal home. Saved Semantic Dashes SHALL be navigation/views over the same Result cards rather than a parallel content section.

#### Scenario: Personal home information architecture
- **WHEN** the unified dashboard renders
- **THEN** one search control, one saved-Dash navigation control, and one Semantic Gallery are the primary content UI

### Requirement: Search creates an explicit temporary selection
The system SHALL apply search and ordinary filters directly to the active gallery. A non-default home search/filter state SHALL be identified as an unsaved temporary selection and SHALL NOT persist a Semantic Dash without explicit Review-mode confirmation.

#### Scenario: Searching My Dash
- **WHEN** the user searches `еда в Валенсии` from My Dash
- **THEN** only matching eligible cards are shown, the context identifies an unsaved selection, and no Dash revision is created

#### Scenario: Clearing home search
- **WHEN** the user clears the query and default filters are restored
- **THEN** the full My Dash card set returns

#### Scenario: Empty search result
- **WHEN** the active selection contains no cards
- **THEN** `Save as Dash` is unavailable and the user can reset or change the search

### Requirement: Temporary selections can be saved as reference-only Semantic Dashes
The system SHALL allow a non-empty temporary selection to enter the existing Review-mode Semantic Dash save flow. Saving SHALL store Result references and Dash metadata only and SHALL NOT copy or mutate Result content.

#### Scenario: Save a useful selection
- **WHEN** the user confirms saving a non-empty temporary selection
- **THEN** one saved Dash revision is created, the new Dash becomes the active context, and the source Results remain unchanged

#### Scenario: Duplicate selection exists
- **WHEN** an equivalent saved Dash already exists
- **THEN** the system SHALL NOT silently create an indistinguishable duplicate and SHALL offer an explicit existing-Dash/update/rename path

### Requirement: Saved Dashes remain discoverable from the unified shell
The system SHALL provide a `My Dashes` / `Мои Dash` navigation control whose first permanent item is My Dash followed by current saved Dashes. The control MAY collapse, but the active saved Dash name SHALL remain visible outside the collapsed navigation.

#### Scenario: Select a saved Dash
- **WHEN** the user selects `Ремонт Pixel`
- **THEN** the gallery context shows `Dash: Ремонт Pixel`, only its currently accessible materialized members are rendered, and `Back to My Dash` is available

#### Scenario: Delete a saved Dash
- **WHEN** the user confirms deleting a saved Dash
- **THEN** that Dash is removed from navigation and its referenced Result cards remain available in My Dash

### Requirement: Saved Dash search has explicit scope
The system SHALL default saved-Dash search to the current Dash membership and SHALL provide an explicit way to search all eligible personal cards instead.

#### Scenario: Search inside saved Dash
- **WHEN** the user searches while scope is `In this Dash`
- **THEN** only matching members of that Dash are displayed

#### Scenario: Expand search scope
- **WHEN** the user switches scope to `All cards`
- **THEN** search runs against all eligible personal cards without altering the saved Dash membership

#### Scenario: Clear saved-Dash search
- **WHEN** the query is cleared while scoped to the current Dash
- **THEN** the full materialized saved Dash returns

### Requirement: Every card context uses the existing Semantic Gallery behavior
The system SHALL render My Dash, temporary selections, and saved-Dash member selections through the existing Semantic Gallery ordering/density model. Zoom SHALL NOT change membership, semantic color, or Dash ownership.

#### Scenario: Zoom a saved Dash
- **WHEN** the user changes density while viewing a saved Dash
- **THEN** the Result-ID set is unchanged and all existing semantic ordering/activity rules remain applicable

### Requirement: Unified context survives navigation
The system SHALL preserve correct context across supported deep links, reload, Result open/return, and browser back/forward navigation.

#### Scenario: Reload a saved Dash deep link
- **WHEN** `/demo/dashes/<id>/` is reloaded
- **THEN** the same saved Dash is materialized and its true name remains visible

#### Scenario: Browser back to My Dash
- **WHEN** navigation returns from a saved Dash to `/demo/`
- **THEN** the shell shows My Dash rather than stale saved-Dash context

### Requirement: Product Board route remains stable
The system SHALL preserve `/demo/dash/dashgpt-product/` and SHALL NOT convert Product Board into a personal My Dash record.

#### Scenario: Open Product Board
- **WHEN** the stable Product Board route is opened
- **THEN** existing Product Board behavior remains available and personal My Dash storage is unchanged

### Requirement: New unified-shell copy supports RU and EN
The system SHALL source new unified dashboard labels through one localization boundary with English fallback and Russian translations.

#### Scenario: Russian locale
- **WHEN** the resolved UI locale is Russian
- **THEN** the shell uses `Мой Dash`, `Мои Dash`, `Все карточки`, `Сохранить как Dash`, and `Вернуться в Мой Dash` equivalents

#### Scenario: Unsupported locale
- **WHEN** the browser locale has no supplied dictionary
- **THEN** the unified shell uses English strings and remains functional

### Requirement: Mobile unified flow works at 360px
The system SHALL keep the gallery visible near the top and provide usable search, saved-Dash selection, active-context identification, return-to-home, and save-selection controls at a 360px viewport without horizontal overflow.

#### Scenario: Narrow mobile saved-Dash navigation
- **WHEN** the viewport is 360px wide
- **THEN** saved-Dash navigation can collapse into a compact disclosure/drawer-like control and selection closes or collapses without hiding the active Dash name

## MODIFIED Requirements

### Requirement: Semantic Dash detail composes with the shared gallery
Semantic Dash member rendering SHALL be treated as a context of the unified card dashboard rather than a separate user-facing Results surface. Existing Review proposals, overrides, refresh, edit, delete, continuation, privacy eligibility, and member activity behavior remain Feature 7 concerns.
