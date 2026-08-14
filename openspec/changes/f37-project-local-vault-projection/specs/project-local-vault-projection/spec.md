## ADDED Requirements

### Requirement: Project-local memory SHALL remain a projection of canonical Vault Cards
DashGPT SHALL treat generated `.dashgpt/` project files as derived output from canonical Cards in the existing Vault and SHALL NOT treat the project folder as a second authoritative Card store.

#### Scenario: Developer exports project memory
- **WHEN** the developer exports a saved Dash as `.dashgpt`
- **THEN** the source canonical Cards SHALL remain unchanged in the active Vault
- **AND** the export SHALL NOT create a new Vault, Card database or sync provider

#### Scenario: Generated files are edited outside DashGPT
- **WHEN** a developer edits a generated `.dashgpt` Markdown file in an IDE
- **THEN** F37 SHALL NOT write that edit back into the Vault
- **AND** a later export MAY replace the generated snapshot from current canonical Vault state

### Requirement: One saved Dash SHALL define project export membership
F37 SHALL export only accepted/current members of one existing saved Dash and SHALL NOT export the user's entire personal Vault by default.

#### Scenario: Dash contains accepted members and proposals
- **WHEN** a saved Dash materializes accepted members A and B plus proposal C
- **THEN** the project projection SHALL contain Cards A and B
- **AND** SHALL NOT contain proposal C

#### Scenario: Vault contains unrelated Cards
- **WHEN** the Vault contains Card X that is not a current member of the exported Dash
- **THEN** Card X SHALL NOT appear in `.dashgpt/`

#### Scenario: Dash excludes or cannot access a referenced Card
- **WHEN** a referenced Card is excluded or unavailable under existing Dash materialization rules
- **THEN** F37 SHALL NOT serialize that Card's content into the project projection

### Requirement: Project projection SHALL preserve stable source identity
The `.dashgpt` manifest and Card paths SHALL preserve existing Vault, Dash and canonical Card identity without deriving identity from mutable Card titles.

#### Scenario: Projection is generated
- **WHEN** F37 builds `.dashgpt/`
- **THEN** `manifest.json` SHALL record source `vaultId`, `dashId`, `dashRevisionId` and each exported canonical Card ID
- **AND** Card file paths SHALL be deterministically derived from canonical Card IDs

#### Scenario: Card title changes
- **WHEN** a canonical Card keeps the same ID but its title changes
- **THEN** the projected Card path SHALL remain stable
- **AND** the Markdown title/content MAY update

#### Scenario: Source Vault identity changes
- **WHEN** the same Dash-shaped data is exported from a different `vaultId`
- **THEN** the manifest SHALL expose the different source Vault identity
- **AND** F37 SHALL NOT silently claim the projection came from the previous Vault

### Requirement: Project projection SHALL provide one human-and-agent project overview
The generated project memory SHALL contain a primary Markdown overview that is immediately useful to both developers and generic coding agents without a DashGPT-specific plugin.

#### Scenario: Developer opens `.dashgpt/project.md` in an IDE
- **WHEN** the project projection contains one or more Cards
- **THEN** `project.md` SHALL show the Dash/project identity, concise project summary, Card count and current source state
- **AND** SHALL list every exported Card with a readable title and summary
- **AND** SHALL expose current-state/next-step cues when those fields exist

#### Scenario: Developer uses Markdown preview
- **WHEN** the overview contains relationships or multiple Cards
- **THEN** `project.md` SHALL include a Mermaid diagram representing the exported Card set and safe known relationships
- **AND** the surrounding Markdown SHALL remain understandable even when Mermaid rendering is unavailable

#### Scenario: Generic AI agent reads project files
- **WHEN** an AI agent can read ordinary repository files
- **THEN** `.dashgpt/README.md` SHALL explain that `project.md` is the starting point
- **AND** the agent SHALL be able to follow stable Markdown links from `project.md` to individual Card files

### Requirement: Individual Card files SHALL expose portable working context
Each exported Card SHALL have one ordinary UTF-8 Markdown file containing useful canonical working state without client-specific transport data.

#### Scenario: Card contains useful state
- **WHEN** a Card has summary, goal, current state, decisions, facts/context, constraints, user preferences, unresolved questions, next step, tags, related materials or safe source links
- **THEN** the generated Markdown SHALL include the non-empty useful fields in a predictable heading order
- **AND** empty optional sections SHALL be omitted

#### Scenario: Card contains complex structured values
- **WHEN** an included Card field cannot be represented as a short string/list
- **THEN** F37 SHALL render a bounded readable representation without executing embedded content

### Requirement: Projection bytes SHALL be deterministic for unchanged source state
F37 SHALL produce byte-stable project files and archive entry order for unchanged Vault/Dash inputs.

#### Scenario: Same source is exported twice
- **WHEN** Vault content, Dash revision and materialized membership are unchanged
- **THEN** `.dashgpt/README.md`, `manifest.json`, `project.md` and Card Markdown bytes SHALL be identical across exports
- **AND** the ZIP archive entry ordering/metadata SHALL NOT depend on current wall-clock time or randomness

#### Scenario: One Card changes
- **WHEN** one exported canonical Card changes while unrelated Cards and Dash membership remain unchanged
- **THEN** that Card's projected content SHALL change as required
- **AND** unrelated Card IDs and paths SHALL remain stable

### Requirement: Project export SHALL preserve Vault and Google privacy boundaries
F37 SHALL NOT serialize provider credentials/account metadata or unrelated Vault state into `.dashgpt`.

#### Scenario: Google Drive is connected
- **WHEN** the active browser has Google OAuth/token/account identity and Drive binding state
- **THEN** the project projection SHALL NOT contain the OAuth token, Google account email/display name/photo, Drive file/folder IDs, binding metadata or authorization headers
- **AND** the existing Google OAuth scope SHALL remain unchanged

#### Scenario: Vault contains profile/provider state
- **WHEN** Vault/profile/provider state exists outside selected canonical Card fields
- **THEN** F37 SHALL NOT export profile revisions, provider bindings, raw sessions, cookies or credentials

#### Scenario: Card source URL is unsafe
- **WHEN** a Card contains a source/reference URL whose scheme is not HTTP or HTTPS
- **THEN** F37 SHALL omit that executable/unsafe URL from generated Markdown

### Requirement: Existing Google-backed Vault continuity SHALL regenerate project identity
F37 SHALL compose with F25/F34 Google Vault restore rather than adding another Google synchronization mechanism.

#### Scenario: Second device adopts the same Google-backed Vault
- **WHEN** existing Google Drive behavior restores the same `vaultId`, Dash IDs and Card IDs on another device
- **THEN** exporting the same saved Dash SHALL preserve the same project source identity and canonical Card paths

#### Scenario: F37 export runs
- **WHEN** the developer downloads `.dashgpt`
- **THEN** F37 SHALL NOT call Google Drive APIs or create/update a second Drive artifact for `.dashgpt`
- **AND** SHALL NOT alter provider-exclusivity behavior

### Requirement: Saved Dash SHALL offer a portable Download .dashgpt action
An opened saved Dash SHALL expose an explicit action that prepares the project-memory package using browser-local canonical state.

#### Scenario: Developer downloads project memory
- **WHEN** the developer activates `Download .dashgpt` on a saved Dash
- **THEN** DashGPT SHALL create a ZIP containing one `.dashgpt/` tree
- **AND** SHALL include `.dashgpt/README.md`, `.dashgpt/manifest.json`, `.dashgpt/project.md` and exactly one Card Markdown file per accepted/current member
- **AND** SHALL leave Vault and Dash state unchanged

#### Scenario: Browser lacks direct directory-write APIs
- **WHEN** the browser cannot write directly to an arbitrary repository folder
- **THEN** the ZIP download SHALL remain a supported complete flow
- **AND** the UX SHALL NOT require a Chromium-only directory picker

#### Scenario: Package creation fails
- **WHEN** the archive cannot be prepared or downloaded
- **THEN** DashGPT SHALL show a human-readable failure state
- **AND** SHALL leave canonical Vault data unchanged

### Requirement: Project-local export SHALL remain usable on narrow viewports
The saved-Dash export action and explanatory copy SHALL not break the existing mobile Dash experience.

#### Scenario: Saved Dash is opened at 360 or 390 pixels
- **WHEN** the developer views the saved Dash and export action
- **THEN** the page SHALL have no horizontal overflow
- **AND** the `Download .dashgpt` action SHALL remain reachable and understandable
