## Purpose

Demo Branding and SEO gives the public DashGPT shell a consistent browser identity and value-first metadata while keeping private/personal application surfaces out of the intended crawler surface.

## ADDED Requirements

### Requirement: Public demo uses the established DashGPT brand mark as its favicon
The system SHALL expose a favicon from the configured demo static-asset root that preserves the existing DashGPT starter monogram rather than introducing a second visual identity.

#### Scenario: Browser opens the demo
- **WHEN** `/demo/` is loaded in a browser
- **THEN** the document references the served DashGPT favicon asset and does not rely on a browser default icon

### Requirement: Public demo metadata explains the product value
The system SHALL provide a concise document title and meta description that describe saving useful AI outcomes as reusable cards that can be found and continued later, without leading with storage, MCP, Vault, or legacy Result terminology.

#### Scenario: Search crawler reads the public shell
- **WHEN** a crawler reads the `/demo/` HTML document
- **THEN** it receives a product title and human-readable description that explain the save/find/continue value

### Requirement: Link-preview text metadata is consistent with the public product message
The system SHALL provide Open Graph and Twitter/X text metadata for the public demo and SHALL NOT claim unsupported social-image, pricing, rating, or organization data.

#### Scenario: Link preview metadata is inspected
- **WHEN** a link-preview crawler reads `/demo/`
- **THEN** title and description metadata are present and consistent with the public product message

### Requirement: Canonical metadata remains host-portable until production hostname is verified
The system SHALL use a canonical demo path that resolves on the current origin rather than hardcoding an unverified future hostname.

#### Scenario: Branch preview is crawled
- **WHEN** the same HTML is served from a branch preview or current production origin
- **THEN** canonical resolution remains on that origin's `/demo/` path

### Requirement: Public manifest reuses the same mark
The system SHALL expose a minimal web-app manifest that names the current DashGPT product and references the same public brand mark where SVG manifest icons are supported.

#### Scenario: Browser requests manifest metadata
- **WHEN** the browser follows the manifest link
- **THEN** it receives valid manifest JSON with a DashGPT name and the public favicon mark as an icon

### Requirement: Crawler policy avoids API and personal deep application surfaces
The system SHALL provide crawler directives that do not advertise API/MCP and personal/deep Result or Dash application routes for indexing while allowing the public shell.

#### Scenario: Crawler requests robots.txt
- **WHEN** `/robots.txt` is requested
- **THEN** the crawler is allowed to discover the public shell and is directed away from API/MCP and personal/deep application routes

### Requirement: Branding metadata is regression-tested
The system SHALL include deterministic and served-browser verification for the title, description, favicon, manifest, canonical, Open Graph/Twitter text metadata, and crawler policy.

#### Scenario: Repository verification runs
- **WHEN** the focused or full verification command runs
- **THEN** missing or drifted public branding/SEO metadata fails verification

### Requirement: This change does not rename the product
The system SHALL continue to use the current DashGPT product identity until a separate approved rebrand change supersedes it.

#### Scenario: Future hostname is documented
- **WHEN** deployment instructions mention `dashseek.pages.dev`
- **THEN** application branding in this change remains DashGPT and the hostname is treated as deployment configuration rather than an implicit product rename
