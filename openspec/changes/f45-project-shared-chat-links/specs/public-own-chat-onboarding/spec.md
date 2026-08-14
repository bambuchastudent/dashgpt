## MODIFIED Requirements

### Requirement: Shared-chat URL normalization supports current ChatGPT share routes
The system SHALL accept supported ChatGPT shared-chat URLs only from approved ChatGPT HTTPS hosts, SHALL normalize legacy classic share syntax without changing source identity, and SHALL preserve the distinct ChatGPT Project shared-chat route when that route is supplied.

#### Scenario: Classic public Share URL is supplied
- **WHEN** the user supplies `https://chatgpt.com/share/<share-id>`
- **THEN** DashGPT SHALL preserve the canonical `https://chatgpt.com/share/<share-id>` URL

#### Scenario: Legacy short Share URL is supplied
- **WHEN** the user supplies `https://chatgpt.com/s/<share-id>`
- **THEN** DashGPT SHALL canonicalize it to `https://chatgpt.com/share/<share-id>`

#### Scenario: Project shared-chat URL is supplied
- **WHEN** the user supplies `https://chatgpt.com/g/<project-or-gpt-slug>/shared/c/<conversation-id>` with an optional `owner_user_id` query parameter
- **THEN** DashGPT SHALL accept the URL as a supported ChatGPT shared-chat source
- **AND** SHALL preserve `/g/<project-or-gpt-slug>/shared/c/<conversation-id>` rather than rewriting the conversation id into `/share/<conversation-id>`
- **AND** SHALL preserve `owner_user_id` when present while removing unrelated query parameters and fragments

#### Scenario: Unsupported ChatGPT path is supplied
- **WHEN** the user supplies a private `/c/...` URL, malformed Project route, non-HTTPS URL, URL credentials, or a non-ChatGPT host
- **THEN** DashGPT SHALL reject it as unsupported
- **AND** SHALL NOT attempt authenticated scraping or credential storage

### Requirement: Shared-chat resolver attempts supported Project links without bypassing access controls
The system SHALL route accepted Project shared-chat URLs through the existing shared-chat retrieval stack and SHALL treat upstream membership/authentication restrictions as an unreadable shared-chat product state.

#### Scenario: Project shared chat is anonymously readable
- **WHEN** an accepted Project shared-chat URL can be read by an existing retrieval layer
- **THEN** DashGPT SHALL return the same normalized shared-chat payload contract used by classic Share links
- **AND** source provenance SHALL retain the canonical Project shared-chat URL

#### Scenario: Project shared chat requires access that DashGPT does not have
- **WHEN** ChatGPT does not expose readable shared-chat content to the existing anonymous resolver
- **THEN** DashGPT SHALL return the existing human unreadable-share state
- **AND** SHALL NOT expose raw upstream HTTP, proxy, browser-rendering, or parser errors
- **AND** SHALL NOT request or persist ChatGPT credentials
