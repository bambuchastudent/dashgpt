## MODIFIED Requirements

### Requirement: Official ChatGPT export is the recommended bulk migration path
The system SHALL present the official ChatGPT data export as the recommended way to migrate a large existing ChatGPT history, SHALL keep the live browser importer available as an optional quick/recent path, and SHALL expose the export migration path through a permanent secondary entry for existing personal Vaults rather than only first-run or operational-card surfaces.

#### Scenario: Existing user opens the personal dashboard
- **WHEN** a user with an already-populated local Vault opens the personal DashGPT dashboard
- **THEN** DashGPT SHALL expose a visible secondary `Import ChatGPT` action without requiring the user to find an operational import card

#### Scenario: User opens Storage
- **WHEN** the user opens the Storage dialog
- **THEN** DashGPT SHALL show an explicit `Import ChatGPT history` section for official ZIP/JSON migration
- **AND** the export route SHALL be identified as the reliable full-history path

#### Scenario: User wants only recent chats
- **WHEN** the user chooses the quick/recent path from the guided import surface
- **THEN** DashGPT SHALL delegate to the existing live importer rather than create a second live-import implementation

## ADDED Requirements

### Requirement: ChatGPT archive migration instructions are self-contained
The system SHALL explain the official ChatGPT export workflow directly in DashGPT using short, concrete steps and SHALL provide a primary file-selection action from the same guide.

#### Scenario: User opens the guided import
- **WHEN** the user opens `Import ChatGPT history`
- **THEN** the guide SHALL explain `ChatGPT → Settings → Data Controls → Export data`
- **AND** SHALL tell the user to download the ZIP after the export becomes available
- **AND** SHALL tell the user to return to DashGPT and select that ZIP
- **AND** SHALL state that `conversations.json` or compatible numbered conversation JSON files are also accepted

#### Scenario: User needs official instructions
- **WHEN** the user wants more detail about obtaining the export
- **THEN** the guide SHALL offer a user-clicked link to the official OpenAI export documentation

### Requirement: Permanent guided import reuses the canonical F29 importer
The system SHALL route ZIP/JSON files selected through the permanent guided entry into the existing F29 export-import implementation and SHALL preserve its canonical identity, idempotency, semantic-enrichment, progress, and local-first behavior.

#### Scenario: User chooses a supported ChatGPT export
- **WHEN** the user selects a supported ZIP or JSON export through the permanent guide
- **THEN** DashGPT SHALL import through the existing canonical export-import function
- **AND** SHALL report reading/importing/completion progress on the guided surface
- **AND** SHALL NOT create a parallel parser, import database, or card type

#### Scenario: Same export is selected twice
- **WHEN** the same ChatGPT conversation is imported repeatedly through the guided entry
- **THEN** the existing stable ChatGPT source identity SHALL converge on the same canonical card without duplication

### Requirement: Guided archive import remains local-first
The system SHALL keep raw ChatGPT export files and raw conversation bodies on the user's device while using the guided import surface.

#### Scenario: User selects an archive
- **WHEN** the guided import receives a ChatGPT ZIP or JSON file
- **THEN** the file SHALL be passed only to the local browser parser
- **AND** no new DashGPT network upload route SHALL receive the raw archive or raw conversation bodies

### Requirement: ChatGPT history import and DashGPT Vault import are unambiguous
The system SHALL label ChatGPT-history migration separately from DashGPT Vault bundle import/export so a user cannot reasonably confuse the two operations.

#### Scenario: User opens Storage
- **WHEN** Storage renders its portable Vault controls
- **THEN** the Vault import action SHALL be labeled `Import DashGPT Vault` rather than generic `Import / merge`
- **AND** the Vault export action SHALL be labeled `Export DashGPT Vault`
- **AND** ChatGPT history migration SHALL appear as a separate guided action

### Requirement: Guided import is responsive for narrow mobile viewports
The system SHALL keep the permanent entry, guide, progress state, and Storage import section usable without horizontal page overflow at a 360px viewport.

#### Scenario: User imports from a narrow browser
- **WHEN** the personal dashboard is rendered at 360px width
- **THEN** the import entry and guide actions SHALL remain reachable
- **AND** the document SHALL NOT horizontally overflow because of the guided-import UI
