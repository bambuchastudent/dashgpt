## MODIFIED Requirements

### Requirement: First value can come from the visitor's own current chat or public share

The clean personal welcome MUST keep the current-chat `dashgpt` handoff as the primary path and MUST also offer a compact anonymous public-share fallback for visitors who only have a ChatGPT Share URL.

#### Scenario: Anonymous visitor submits a public ChatGPT Share URL
- **GIVEN** a clean visitor with no saved Results
- **WHEN** they submit a valid public `https://chatgpt.com/share/...` URL
- **THEN** DashGPT MUST attempt the provider-neutral anonymous share resolver
- **AND** MUST present a reviewable title and summary when any resolver succeeds
- **AND** MUST NOT require account creation before the first local Result.

#### Scenario: Direct mobile handoff query
- **GIVEN** a clean visitor opens `/demo/?share=<public ChatGPT URL>`
- **WHEN** the page loads
- **THEN** the same anonymous share flow MUST be prefilled and started without requiring the visitor to retype the URL.

#### Scenario: Resolver provider failure
- **WHEN** one resolver provider fails, rate-limits, or returns unreadable content
- **THEN** DashGPT MUST try the next configured compatibility path
- **AND** MUST NOT expose provider names, HTTP 403 details, parser internals, or raw transport errors to the visitor.

#### Scenario: Invalid proxy target
- **WHEN** the submitted URL is not a supported public ChatGPT Share URL
- **THEN** DashGPT MUST reject it before contacting any external resolver.
