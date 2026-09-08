## MODIFIED Requirements

### Requirement: Unreadable Share transitions to current-chat capture

The personal Save-chat flow MUST treat server-side Share retrieval as a best-effort convenience and MUST provide a direct current-chat capture recovery when a valid Share exhausts as `SHARED_CHAT_UNREADABLE`.

#### Scenario: Public Share resolves normally
- **GIVEN** a visitor submits a supported public ChatGPT Share URL
- **WHEN** `/api/shared-chat` returns a readable conversation
- **THEN** DashGPT MUST keep the existing Share review/save flow unchanged
- **AND** MUST NOT force the structured handoff recovery open.

#### Scenario: Valid Share is public but server-unreadable
- **GIVEN** the visitor submits a valid supported public ChatGPT Share URL
- **WHEN** `/api/shared-chat` returns `SHARED_CHAT_UNREADABLE`
- **THEN** the Save-chat dialog MUST remain open
- **AND** MUST explain in human product language that DashGPT could not read the link automatically
- **AND** MUST automatically reveal the existing current-chat structured capture recovery
- **AND** MUST make the copy-command action immediately discoverable
- **AND** MUST NOT require DevTools, storage setup, ChatGPT credentials or another server proxy.

#### Scenario: Recovery remains mobile-usable
- **GIVEN** unreadable-Share recovery is activated on a narrow mobile viewport
- **WHEN** the recovery appears
- **THEN** its actionable controls MUST fit the dialog without horizontal overflow
- **AND** the recovery region MUST be brought into view without requiring the user to discover a collapsed fallback manually.

#### Scenario: Structured recovery preserves Share provenance
- **GIVEN** a valid Share URL failed with `SHARED_CHAT_UNREADABLE`
- **AND** the visitor then pastes a valid structured response produced in the original ChatGPT conversation
- **WHEN** the visitor reviews and saves the Card
- **THEN** the Card MUST preserve the canonical failed Share URL as `chatgpt-share` source provenance
- **AND** MUST use the existing canonical Card/local Vault persistence path
- **AND** MUST NOT persist retrieval diagnostics, cookies, session state or raw server error details.

#### Scenario: Repeated recovery for the same Share does not duplicate
- **GIVEN** a Card already exists with the same canonical `chatgpt-share` source URL
- **WHEN** the same Share again requires current-chat structured recovery and is saved
- **THEN** DashGPT MUST update/revise the existing Card using the existing source-url identity rule
- **AND** MUST NOT create a second primary Card for the same Share source.

#### Scenario: Standalone structured handoff keeps its existing provenance
- **GIVEN** the visitor uses the structured current-chat handoff without first submitting an unreadable Share
- **WHEN** the Card is saved
- **THEN** existing `chatgpt-handoff` provenance behavior MUST remain unchanged.

#### Scenario: Recovery trigger is not over-broad
- **WHEN** the user submits an invalid URL, a private `/c/...` URL, or an unrelated client/network failure occurs without the `SHARED_CHAT_UNREADABLE` code
- **THEN** DashGPT MUST keep the appropriate existing human error state
- **AND** MUST NOT falsely classify the failure as the exhausted public-Share recovery case.

#### Scenario: No credential or anti-bot workaround
- **WHEN** Share retrieval is unreadable
- **THEN** DashGPT MUST NOT request, copy, store or replay ChatGPT cookies, authorization/session tokens, passwords, account identifiers or project credentials
- **AND** MUST NOT add CAPTCHA/Turnstile solving or another server-side anti-bot bypass as part of this recovery.
