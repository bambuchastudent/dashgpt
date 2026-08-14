## ADDED Requirements

### Requirement: Link-first capture preserves readable card structure
The system SHALL preserve meaningful block structure from the selected public ChatGPT Share assistant reply when preparing a canonical card and SHALL remove provider-internal rendering/reference markers before persistence.

#### Scenario: Share reply contains Markdown structure
- **WHEN** the final useful assistant reply contains paragraphs, headings, lists, inline code, emphasis, or Markdown links
- **THEN** the prepared card summary SHALL preserve enough source structure for the card detail renderer to present it readably
- **AND** line breaks SHALL NOT be collapsed into one undifferentiated text line before review/save

#### Scenario: Share reply contains provider-internal marker
- **WHEN** captured text contains a provider UI/reference marker such as `memcite`
- **THEN** that marker SHALL NOT be persisted as meaningful card content
- **AND** already-saved affected content SHALL be cleaned for display without requiring a destructive Vault migration

### Requirement: Explicit structured sections are projected without invention
The system SHALL project explicit Decisions/Решения and Next/Следующий шаг sections from the selected Share reply into existing card fields when those sections are unambiguous and SHALL NOT infer missing decisions or next actions from arbitrary prose.

#### Scenario: Explicit decisions section exists
- **WHEN** the selected reply contains an explicit Decisions/Решения section followed by one or more items
- **THEN** those items SHALL populate the existing `decisions` field
- **AND** the extracted section SHALL not also remain duplicated in the summary body

#### Scenario: Explicit next section exists
- **WHEN** the selected reply contains an explicit Next/Следующий шаг section with non-empty content
- **THEN** that content SHALL populate the existing `next` field
- **AND** the extracted section SHALL not also remain duplicated in the summary body

#### Scenario: Structured section is absent
- **WHEN** the selected reply has no explicit Decisions/Решения or Next/Следующий шаг section
- **THEN** the system SHALL keep the corresponding existing field empty
- **AND** SHALL NOT invent a decision or next step from unrelated prose

### Requirement: Canonical card detail safely renders useful Markdown
The system SHALL render the card summary in modal and standalone detail as a bounded safe Markdown subset without executing captured HTML or script content.

#### Scenario: Supported rich text renders
- **WHEN** a card summary contains supported paragraph, heading, ordered/unordered list, emphasis, strong, inline-code, or Markdown-link syntax
- **THEN** modal and standalone card detail SHALL render corresponding readable DOM structure
- **AND** the raw Markdown control characters SHALL not be shown merely because the renderer uses plain `textContent`

#### Scenario: Safe web link renders
- **WHEN** a Markdown link target uses `https:` or `http:`
- **THEN** card detail SHALL render a clickable anchor
- **AND** external navigation SHALL use `noopener noreferrer`

#### Scenario: Unsafe link target is captured
- **WHEN** a Markdown link target uses a non-web scheme such as `javascript:` or `data:`
- **THEN** card detail SHALL render the human label as text rather than creating a clickable unsafe target

#### Scenario: Captured HTML is present
- **WHEN** summary text contains raw HTML/script-like content
- **THEN** it SHALL remain inert text
- **AND** the renderer SHALL NOT inject captured content through `innerHTML`

### Requirement: Card detail shows only meaningful structured blocks
The system SHALL display Decisions and Next blocks only when the corresponding existing card fields contain meaningful content.

#### Scenario: Decisions are empty
- **WHEN** a card has no decisions
- **THEN** card detail SHALL omit the Decisions block
- **AND** SHALL NOT show synthetic copy such as `No decisions captured yet.`

#### Scenario: Next is empty
- **WHEN** a card has no next step
- **THEN** card detail SHALL omit the Next block
- **AND** SHALL NOT show synthetic copy such as `No next step captured yet.`

### Requirement: Rich card detail preserves F36 and card-platform compatibility
The system SHALL keep existing card identity, Share provenance, continuation, search/Dash semantics, storage behavior and structured-handoff fallback compatible while changing capture projection and presentation.

#### Scenario: Same Share URL is captured again
- **WHEN** a public Share URL already has a canonical local card
- **THEN** the existing F36 reuse/update identity behavior SHALL remain unchanged

#### Scenario: Existing canonical actions render
- **WHEN** a rich card detail is opened
- **THEN** Original chat and Continue in new chat SHALL keep using the existing source/continuation contracts

### Requirement: Rich card detail remains usable on narrow mobile
The system SHALL keep rich summary content, links, code, lists, structured blocks and primary actions usable without horizontal page overflow at a 360px viewport.

#### Scenario: 360px card detail
- **WHEN** a rich captured card is opened at 360px width
- **THEN** long text, links and inline code SHALL wrap or scroll within their content bounds rather than forcing horizontal page overflow
- **AND** the primary card actions SHALL remain reachable
