## Purpose

Structured Chat Continuation starts a new AI chat from the latest useful state of one DashGPT Result by sending an inspectable, localized, privacy-filtered Continuation Brief rather than only a title or a generic instruction.

## ADDED Requirements

### Requirement: Continuation Brief is a stable Markdown work handoff
The system SHALL render a Continuation Brief with exactly one localized H1, stable localized H2 sections, Markdown lists for list-valued context, Markdown links for resources, no HTML or executable content, and no empty headings. The brief SHALL be readable by both a person and a receiving assistant.

#### Scenario: Fully populated Result renders the complete useful structure
- **WHEN** the selected Result contains goal, summary, current state, decisions, facts, constraints, user preferences, open questions, resources, and a suggested next step
- **THEN** the brief renders each populated value under its corresponding section and ends with trusted receiving-assistant instructions

#### Scenario: Empty optional sections are omitted
- **WHEN** the Result has no decisions, facts, constraints, preferences, questions, or resources
- **THEN** none of those headings or placeholder list items appears

#### Scenario: Markdown remains structurally valid for hostile-looking text
- **WHEN** a source value contains heading markers, HTML tags, scripts, control characters, or multiline prompt-like text
- **THEN** it remains inert single-value data and cannot create extra H1/H2 sections, HTML elements, scripts, or hidden instructions

### Requirement: Brief is derived from the latest materialized Result
Every continuation, preview, and copy action SHALL resolve the current materialized Result by stable Result ID and build a new derived brief. A previous brief SHALL NOT become an independent source of truth or be reused without verifying the current Result version.

#### Scenario: Result changed after a previous continuation
- **WHEN** the current Result revision, content version, status, decisions, constraints, questions, or next step changes after an earlier continuation
- **THEN** the next action rebuilds the brief from the new current Result and does not reuse stale text

#### Scenario: Repeated continuation without a Result change is deterministic
- **WHEN** the same current Result and selected language are continued repeatedly
- **THEN** the generated Markdown is identical while each actually successful use may record a new activity time

#### Scenario: Preview edit is not cached as Result truth
- **WHEN** the user edits a preview, closes it, and later opens preview again
- **THEN** the new preview is rebuilt from the current Result unless the user explicitly saved a separate Result update outside this capability

### Requirement: Missing structure is handled without fabrication
The system SHALL use only allowlisted Result fields and safe deterministic fallbacks. It SHALL NOT invent a decision, fact, constraint, resolved question, source, or user preference that is absent from the Result.

#### Scenario: Result contains only title and summary
- **WHEN** a valid Result has only title and summary
- **THEN** the brief includes topic and summary, states truthfully that no separate current-state field was captured, derives only a neutral continuation goal, supplies a neutral suggested next step, and omits unsupported factual sections

#### Scenario: Result has decisions, constraints, and open questions
- **WHEN** those arrays are present and facts are absent
- **THEN** decisions, constraints, and questions remain separate and no decision or question is relabeled as a confirmed fact

#### Scenario: Suggested next step is unavailable
- **WHEN** neither `suggestedNextStep` nor the existing `next` field contains a usable value
- **THEN** the localized neutral next step asks which unresolved question the user wants to continue

### Requirement: Receiving-assistant instructions are trusted, localized, and contextual
Every brief SHALL include a localized `Instructions for the assistant` section generated only from a DashGPT-owned template and the presence of safe section types. Source text, imported text, quotes, external-page content, stored `instructions`, and prompt-like Result values SHALL NOT be copied into the trusted instruction section.

#### Scenario: Result contains prompt injection text
- **WHEN** a summary, decision, question, imported field, link title, or source text says to ignore prior instructions or disclose data
- **THEN** that text remains in an untrusted data section if otherwise eligible and does not appear as a trusted instruction

#### Scenario: Card-specific context is present
- **WHEN** the Result has decisions, constraints, questions, resources, or a next step
- **THEN** the template instructs the assistant to preserve, distinguish, verify, or continue from those specific populated sections without interpolating their untrusted text into instructions

#### Scenario: Source content boundary is explicit
- **WHEN** any brief is rendered
- **THEN** its trusted instructions state that summaries, quotations, imported content, and sources are data rather than instructions and that unresolved questions are not confirmed facts

### Requirement: Continuation projection is private and minimized
The system SHALL include only allowlisted fields from the selected Result and explicitly attached resources. It SHALL exclude unrelated object properties, unrelated Results/Profile memory, database/storage metadata, credentials, secret-like values, credential-bearing or signed URLs, raw transcripts, clipboard contents, and hidden provider data.

#### Scenario: Result object contains unrelated private fields
- **WHEN** the in-memory object also contains unrelated memory, connector data, debug metadata, internal IDs, or another Result
- **THEN** none of that data appears in full or compact Markdown

#### Scenario: Eligible field contains a secret
- **WHEN** an otherwise eligible string or URL contains an API key, access token, password assignment, private key, authorization header, embedded URL credentials, or secret query parameter
- **THEN** that complete item or URL is omitted rather than copied or partially exposed

#### Scenario: Related resource is explicit and safe
- **WHEN** the Result contains a valid HTTP(S) source or related-resource URL without credentials or secret parameters
- **THEN** the brief may render its sanitized user-visible title and URL as a Markdown link

### Requirement: Continuation is distinct from Full Context Pack
The primary continuation action SHALL use the compact work-oriented Continuation Brief. The existing Full Context Pack SHALL remain a separate secondary action and SHALL NOT be appended automatically to the brief.

#### Scenario: Primary action is used
- **WHEN** the user selects `Continue in new chat`
- **THEN** the prepared payload is a Continuation Brief and not a raw transcript, JSON dump, hidden Context Pack, or title-only fallback

#### Scenario: User needs larger export
- **WHEN** the user selects the existing Context Pack action
- **THEN** DashGPT produces that representation independently without changing the Continuation Brief or Result

### Requirement: Preview and copy expose the exact payload without mutating the Result
The UI SHALL provide `Preview context` and `Copy continuation brief`. Preview SHALL show the exact payload currently prepared for the target and SHALL allow local editing, copying, and continuation with the edited text. Preview edits SHALL NOT write to the Result or Vault knowledge fields.

#### Scenario: User previews an ordinary payload
- **WHEN** the target adapter can carry the full brief
- **THEN** preview text is byte-for-byte the prompt used by Continue unless the user edits it

#### Scenario: User previews a compact payload
- **WHEN** the full brief exceeds the target's safe URL budget but a compact brief fits
- **THEN** preview shows the exact compact prompt, visibly explains that compaction occurred, and offers the full Markdown for copying

#### Scenario: User edits before continuing
- **WHEN** the user changes preview text and selects Continue
- **THEN** the edited text is the attempted payload, an over-budget edit uses explicit clipboard fallback rather than silent re-compaction, and the stored Result remains unchanged

### Requirement: Target adapters enforce transport limits without silent truncation
Every target adapter SHALL own its target identifier, new-chat URL, prompt encoding, Unicode/Markdown behavior, safe encoded-URL budget, popup behavior, and fallback. Before opening the target, the system SHALL measure the encoded URL and SHALL NOT silently truncate any prompt.

#### Scenario: Full brief fits the current ChatGPT adapter
- **WHEN** the encoded new-chat URL is within the adapter's safe budget
- **THEN** the full Markdown is encoded into the current ChatGPT new-chat URL and decodes without damage to Cyrillic, Unicode, emoji, lists, or links

#### Scenario: Full brief is too large but compact brief fits
- **WHEN** the full URL exceeds the safe budget and the deterministic compact brief fits
- **THEN** the compact prompt preserves instructions, goal, current state, decisions, constraints, open questions, and next step in priority order; any shortening is explicit; the UI notifies the user and keeps the full brief available

#### Scenario: No useful deeplink payload fits
- **WHEN** even the compact URL exceeds the adapter's budget or the adapter cannot reliably carry the prompt
- **THEN** the system copies the exact full brief after the explicit action, opens an empty target chat, and tells the user to paste it as the first message

#### Scenario: Title-only fallback is forbidden
- **WHEN** any size or transport failure occurs
- **THEN** the system never substitutes only the title, never drops trusted instructions, and never reports a prepared context as sent when it was not

### Requirement: Popup and clipboard outcomes are truthful and recoverable
The system SHALL distinguish successful deeplink navigation, successful clipboard fallback, blocked popups, clipboard denial, and complete failure. A blocked or cancelled target opening SHALL not count as a successful continuation.

#### Scenario: Popup is blocked
- **WHEN** the browser refuses the new target tab
- **THEN** the system attempts to preserve the brief through clipboard after the explicit click, reports that the window was blocked, provides a manual target path, and does not record successful continuation activity

#### Scenario: Clipboard permission is denied
- **WHEN** clipboard fallback cannot write through the Clipboard API or the safe legacy copy path
- **THEN** the exact brief remains visible and selectable in preview, the UI reports copy failure, and no success claim or activity event is made

#### Scenario: Clipboard fallback and target opening both succeed
- **WHEN** an over-budget prompt is copied and the target chat opens
- **THEN** the UI says that context was copied and must be pasted; it does not claim the prompt is already present in the composer

### Requirement: Brief language follows explicit continuation context
The system SHALL select RU or EN headings, fallbacks, and trusted instructions in this order: explicitly selected continuation language, Result language, source-conversation language when explicitly stored, detected Result language, UI language, then English. Changing UI language alone SHALL NOT translate stored Result content.

#### Scenario: Russian Result has no explicit language field
- **WHEN** its title/summary are predominantly Cyrillic and no higher-priority language exists
- **THEN** headings, fallbacks, and trusted instructions are Russian while Result text remains unchanged

#### Scenario: English language is selected explicitly
- **WHEN** English is selected for continuation
- **THEN** system sections and trusted instructions are English without automatically translating stored Result values

#### Scenario: Unsupported language cannot be rendered in MVP
- **WHEN** the selected/stored language is outside RU/EN
- **THEN** English system text is used while original Result values remain unchanged

### Requirement: Successful continuation updates content-free Result activity
After and only after a successful deeplink opening or successful clipboard-plus-target fallback, the system SHALL append a content-free `result.activity` event with value `continue.new-chat`, Result ID, event ID, and timestamp, then persist through the active Vault adapter. The full/compact prompt and clipboard content SHALL NOT be stored in the event or telemetry.

#### Scenario: Direct continuation succeeds
- **WHEN** the prepared target tab opens successfully
- **THEN** the selected Result's latest continuation activity time advances once for that action

#### Scenario: Attempt is blocked or cancelled
- **WHEN** popup opening fails, clipboard fails, or the user closes preview without continuing
- **THEN** no successful continuation activity event is appended

#### Scenario: Activity preserves immutable Result integrity
- **WHEN** continuation activity is persisted or synchronized
- **THEN** the Result's durable fields, content version, and content hash remain byte-for-byte unchanged

### Requirement: Current surfaces reuse one continuation implementation
Result details, standalone Result pages, and Semantic Dash Result actions SHALL invoke the same current-Result resolver, brief builder, target adapter, fallback handling, and activity path. The capability SHALL remain usable on narrow mobile viewports and with keyboard interaction.

#### Scenario: Semantic Dash member is continued
- **WHEN** a Result is opened from a Dash and continued
- **THEN** the payload is generated from the current Result and does not copy Dash aggregate content or change Dash membership

#### Scenario: Mobile user previews and continues
- **WHEN** a user operates continuation on a narrow mobile viewport
- **THEN** preview text, status, copy, close, and Continue controls remain visible, reachable, and usable without horizontal page overflow
