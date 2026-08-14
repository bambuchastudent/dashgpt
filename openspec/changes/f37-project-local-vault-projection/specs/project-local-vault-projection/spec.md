## ADDED Requirements

### Requirement: Project memory SHALL be one saved-Dash projection across site and IDE
DashGPT SHALL represent project memory as one existing saved Dash over canonical Vault Cards, with a visual site Project view and a local `.dashgpt/` representation derived from the same current membership and stable Card identities.

#### Scenario: Developer opens the saved Dash on the site
- **WHEN** a saved Dash has current accepted members
- **THEN** the saved-Dash page SHALL offer a Project view derived from those same current member Card IDs
- **AND** SHALL NOT create a separate Product Board, Project database or copied Card set

#### Scenario: Developer materializes `.dashgpt`
- **WHEN** the same saved Dash is materialized for a repository
- **THEN** `.dashgpt/manifest.json` SHALL identify the same Dash and canonical Card IDs represented by the site Project view
- **AND** the local representation SHALL NOT become a second authoritative store

### Requirement: Site Project view SHALL make current project memory visually understandable
The saved-Dash Project view SHALL summarize the current project state from canonical Card fields while retaining direct navigation to normal Card detail.

#### Scenario: Project view renders
- **WHEN** the Dash contains one or more current member Cards
- **THEN** the view SHALL show project/Dash identity, a concise summary and current Card count
- **AND** SHALL show each current member with title and summary
- **AND** SHALL show current-state and next-step cues when those canonical fields exist

#### Scenario: Developer selects a Project-view Card
- **WHEN** the developer activates a Card represented in Project view
- **THEN** DashGPT SHALL open the existing canonical Card using its stable Card ID
- **AND** SHALL NOT open a copied project-only Card

#### Scenario: Explicit Card relationships exist
- **WHEN** exported/project Cards contain explicit relationships to other current member Card IDs
- **THEN** the Project view SHALL expose a visual memory map using those relationships
- **AND** SHALL NOT invent factual dependency/blocking semantics solely from semantic similarity

### Requirement: Project-local memory SHALL remain a projection of canonical Vault Cards
DashGPT SHALL treat generated `.dashgpt/` project files as derived output from canonical Cards in the existing Vault and SHALL NOT treat the project folder as a second authoritative Card store.

#### Scenario: Developer materializes project memory
- **WHEN** the developer materializes a saved Dash as `.dashgpt`
- **THEN** the source canonical Cards SHALL remain unchanged in the active Vault
- **AND** the operation SHALL NOT create a new Vault, Card database or sync provider

#### Scenario: Generated files are edited outside DashGPT
- **WHEN** a developer edits a generated `.dashgpt` Markdown file in an IDE
- **THEN** F37 SHALL NOT write that edit back into the Vault
- **AND** a later materialization MAY replace the generated snapshot from current canonical Vault state

### Requirement: One saved Dash SHALL define project membership
F37 SHALL include only accepted/current members of one existing saved Dash and SHALL NOT expose the user's entire personal Vault by default.

#### Scenario: Dash contains accepted members and proposals
- **WHEN** a saved Dash materializes accepted members A and B plus proposal C
- **THEN** both the site Project view and local project projection SHALL contain Cards A and B
- **AND** SHALL NOT contain proposal C as project memory

#### Scenario: Vault contains unrelated Cards
- **WHEN** the Vault contains Card X that is not a current member of the project Dash
- **THEN** Card X SHALL NOT appear in the site Project view or `.dashgpt/`

#### Scenario: Dash excludes or cannot access a referenced Card
- **WHEN** a referenced Card is excluded or unavailable under existing Dash materialization rules
- **THEN** F37 SHALL NOT serialize or display that Card's content as current project memory

### Requirement: Project projection SHALL preserve stable source identity
The `.dashgpt` manifest and Card paths SHALL preserve existing Vault, Dash and canonical Card identity without deriving identity from mutable Card titles.

#### Scenario: Projection is generated
- **WHEN** F37 builds `.dashgpt/`
- **THEN** `manifest.json` SHALL record source `vaultId`, `dashId`, `dashRevisionId` and each exported canonical Card ID
- **AND** Card file paths SHALL be deterministically derived from canonical Card IDs

#### Scenario: Card title changes
- **WHEN** a canonical Card keeps the same ID but its title changes
- **THEN** the projected Card path SHALL remain stable
- **AND** the site Project view and Markdown title/content MAY update

#### Scenario: Source Vault identity changes
- **WHEN** the same Dash-shaped data is materialized from a different `vaultId`
- **THEN** the manifest SHALL expose the different source Vault identity
- **AND** F37 SHALL NOT silently claim the projection came from the previous Vault

### Requirement: Project projection SHALL provide one human-and-agent project overview
The generated project memory SHALL contain a primary Markdown overview that mirrors the site Project view's mental model and is immediately useful to both developers and generic coding agents without a DashGPT-specific plugin.

#### Scenario: Developer opens `.dashgpt/project.md` in an IDE
- **WHEN** the project projection contains one or more Cards
- **THEN** `project.md` SHALL show the Dash/project identity, concise project summary, Card count and current source state
- **AND** SHALL list every exported Card with a readable title and summary
- **AND** SHALL expose current-state/next-step cues when those fields exist

#### Scenario: Developer uses Markdown preview
- **WHEN** explicit safe relationships exist among current project Cards
- **THEN** `project.md` SHALL include a Mermaid diagram representing those same known relationships
- **AND** the surrounding Markdown SHALL remain understandable when Mermaid rendering is unavailable

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

### Requirement: Project relation extraction SHALL be shared across site and local representation
F37 SHALL derive project relations once from explicit safe Card references and SHALL use that normalized relation set for both the site memory map and local Markdown/Mermaid representation.

#### Scenario: Card A explicitly references Card B
- **WHEN** both Card A and Card B are current members of the same project Dash
- **THEN** the normalized project relation set SHALL contain one stable A-to-B relationship
- **AND** both site Project view and `.dashgpt/project.md` SHALL represent that same relationship

#### Scenario: Referenced Card is outside the Dash
- **WHEN** Card A references Card X that is not a current project member
- **THEN** the project graph SHALL NOT expose Card X's content or create a project edge to it

### Requirement: Projection bytes SHALL be deterministic for unchanged source state
F37 SHALL produce byte-stable project files and archive entry order for unchanged Vault/Dash inputs.

#### Scenario: Same source is materialized twice
- **WHEN** Vault content, Dash revision and materialized membership are unchanged
- **THEN** `.dashgpt/README.md`, `manifest.json`, `project.md` and Card Markdown bytes SHALL be identical across materializations
- **AND** fallback archive entry ordering/metadata SHALL NOT depend on current wall-clock time or randomness

#### Scenario: One Card changes
- **WHEN** one project Card changes while unrelated Cards and Dash membership remain unchanged
- **THEN** that Card's Project-view content and projected Markdown SHALL change as required
- **AND** unrelated Card IDs and paths SHALL remain stable

### Requirement: Project representation SHALL preserve Vault and Google privacy boundaries
F37 SHALL NOT serialize provider credentials/account metadata or unrelated Vault state into the site Project model or `.dashgpt`.

#### Scenario: Google Drive is connected
- **WHEN** the active browser has Google OAuth/token/account identity and Drive binding state
- **THEN** `.dashgpt` SHALL NOT contain the OAuth token, Google account email/display name/photo, Drive file/folder IDs, binding metadata or authorization headers
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
- **THEN** opening the same saved Dash SHALL regenerate the same Project-view identity
- **AND** materializing that Dash SHALL preserve the same canonical Card paths

#### Scenario: F37 materialization runs
- **WHEN** the developer gets `.dashgpt`
- **THEN** F37 SHALL NOT call Google Drive APIs or create/update a second Drive artifact for `.dashgpt`
- **AND** SHALL NOT alter provider-exclusivity behavior

### Requirement: Saved Dash SHALL offer a portable Get .dashgpt action
An opened saved Dash Project view SHALL expose an explicit action that materializes project memory using browser-local canonical state.

#### Scenario: Developer gets project memory
- **WHEN** the developer activates `Get .dashgpt` or equivalent on a saved Dash Project view
- **THEN** DashGPT SHALL prepare one `.dashgpt/` tree containing `.dashgpt/README.md`, `.dashgpt/manifest.json`, `.dashgpt/project.md` and exactly one Card Markdown file per accepted/current member
- **AND** SHALL leave Vault and Dash state unchanged

#### Scenario: Browser lacks direct directory-write APIs
- **WHEN** the browser cannot write directly to an arbitrary repository folder
- **THEN** a deterministic ZIP containing the `.dashgpt/` tree SHALL remain a supported fallback transport
- **AND** the product SHALL describe the target as the repository-root `.dashgpt` folder rather than treating ZIP download as a separate memory concept

#### Scenario: Package creation fails
- **WHEN** local project memory cannot be prepared
- **THEN** DashGPT SHALL show a human-readable failure state
- **AND** SHALL leave canonical Vault data unchanged

### Requirement: Project view and local materialization SHALL remain usable on narrow viewports
The saved-Dash Project view and project-memory action SHALL not break the existing mobile Dash experience.

#### Scenario: Saved Dash is opened at 360 or 390 pixels
- **WHEN** the developer views Project mode and the `.dashgpt` action
- **THEN** the page SHALL have no horizontal overflow
- **AND** project Cards, current-state cues and the materialization action SHALL remain reachable and understandable
