## ADDED Requirements

### Requirement: Official ChatGPT export is the recommended bulk migration path
The system SHALL present the official ChatGPT data export as the recommended way to migrate a large existing ChatGPT history and SHALL keep the live browser importer available as an optional quick/recent path.

#### Scenario: User opens history import
- **WHEN** the user opens the ChatGPT history import operation
- **THEN** DashGPT SHALL offer `Надёжно всю историю` using an official export file and `Быстро последние чаты` using the existing live importer
- **AND** the export path SHALL be identified as recommended for large histories

### Requirement: Export parsing stays local
The system SHALL read supported ChatGPT export files in the browser and SHALL NOT upload raw export bytes or raw conversation bodies to DashGPT infrastructure.

#### Scenario: User selects an export
- **WHEN** the user chooses a supported ZIP or conversation JSON export
- **THEN** DashGPT SHALL parse it locally on the device
- **AND** SHALL NOT send the selected file or raw conversation content to a DashGPT server

### Requirement: Supported export conversation files are discovered safely
The system SHALL support `conversations.json` and numbered conversation JSON files from larger official exports and SHALL reject archives that do not contain a recognizable conversation export with a human-readable message.

#### Scenario: Standard export ZIP
- **WHEN** a ZIP contains `conversations.json`
- **THEN** DashGPT SHALL discover and parse that conversation file

#### Scenario: Large export with numbered conversation files
- **WHEN** a ZIP contains multiple numbered conversation JSON files
- **THEN** DashGPT SHALL discover all compatible conversation files and combine them without duplicating the same conversation id

#### Scenario: Unsupported archive
- **WHEN** no recognizable conversation data is found
- **THEN** DashGPT SHALL keep the existing Vault unchanged and show a short human-facing error

### Requirement: Export conversations become canonical cards
The system SHALL convert supported exported conversations into the same canonical card/Vault model used by existing DashGPT capture and import paths and SHALL NOT create a parallel export-only card type.

#### Scenario: Conversation imports successfully
- **WHEN** a supported exported conversation is processed
- **THEN** exactly one canonical card SHALL be created or matched for its stable ChatGPT conversation identity
- **AND** My Dash, search, Semantic Gallery, continuation, and remote Vault sync SHALL consume that same card

### Requirement: Export import is idempotent across live and file migration
The system SHALL deduplicate by stable ChatGPT conversation identity across repeated export imports and previous live-history imports.

#### Scenario: Same export is imported twice
- **WHEN** the user imports the same conversation export a second time
- **THEN** the canonical card count SHALL NOT increase for conversations already represented

#### Scenario: Conversation was previously imported live
- **WHEN** an export contains a conversation already represented by the live importer
- **THEN** DashGPT SHALL match the existing canonical card rather than create a duplicate

### Requirement: Large imports remain progressive and failure-isolated
The system SHALL process large exports incrementally, persist completed canonical cards in bounded batches, and expose progress without discarding successful work when an individual conversation is malformed.

#### Scenario: Large export is running
- **WHEN** conversations are being processed
- **THEN** the import operation SHALL report discovered, imported, duplicate/skipped, failed, and remaining counts
- **AND** the page SHALL periodically yield so the UI remains usable

#### Scenario: One malformed conversation
- **WHEN** one conversation cannot be normalized
- **THEN** that conversation SHALL be counted as failed or skipped
- **AND** previously imported cards SHALL remain saved
- **AND** processing SHALL continue with later compatible conversations

### Requirement: Remote storage remains a separate Vault synchronization concern
The system SHALL write export-imported cards to the local Vault first and SHALL reuse the existing active Google Drive or GitHub synchronization behavior without uploading the ChatGPT archive itself.

#### Scenario: Remote provider is connected
- **WHEN** export import adds canonical cards locally
- **THEN** existing provider synchronization MAY propagate the updated Vault
- **AND** the raw export file SHALL NOT be persisted as a remote provider asset
