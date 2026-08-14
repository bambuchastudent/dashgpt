## MODIFIED Requirements

### Requirement: Public DashGPT entry has one production canonical identity
The public DashGPT product entry SHALL declare and resolve to one production canonical URL.

#### Scenario: Search crawler opens the canonical page
- **WHEN** the crawler opens `https://dashgpt.dimkashir.workers.dev/demo/`
- **THEN** the page SHALL return indexable product HTML with an absolute self-canonical and matching `og:url`

#### Scenario: Client opens duplicate root aliases
- **WHEN** the client opens `/` or `/demo`
- **THEN** the Worker SHALL permanently redirect to `/demo/`

#### Scenario: Preview host serves DashGPT
- **WHEN** the application is served from a hostname other than `dashgpt.dimkashir.workers.dev`
- **THEN** the response SHALL advertise the production canonical and SHALL carry `X-Robots-Tag: noindex, nofollow`

### Requirement: Crawlers can discover intended public content without discovering private application state
DashGPT SHALL publish explicit root crawl-discovery endpoints.

#### Scenario: Crawler requests production robots
- **WHEN** `/robots.txt` is requested on the production host
- **THEN** it SHALL allow the public `/demo/` entry, disallow API/MCP/private deep surfaces and declare the absolute production sitemap URL

#### Scenario: Crawler requests production sitemap
- **WHEN** `/sitemap.xml` is requested on the production host
- **THEN** it SHALL return valid XML containing the absolute canonical public entry and SHALL NOT list private Results, Dashes, APIs or preview URLs

#### Scenario: Crawler requests robots on a preview host
- **WHEN** `/robots.txt` is requested on a non-production host
- **THEN** it SHALL disallow all crawling

### Requirement: Private and deep application views are noindexed at response level
DashGPT SHALL supplement robots rules with response metadata for views that are not search landing pages.

#### Scenario: Personal root state is requested
- **WHEN** `/demo/` is opened with personal/import receiver query state
- **THEN** the response SHALL include `X-Robots-Tag: noindex, nofollow`

#### Scenario: Deep application route is requested
- **WHEN** a Result, Dash or equivalent deep application route is served
- **THEN** the response SHALL include `X-Robots-Tag: noindex, nofollow`

### Requirement: Public shares have rich branded social metadata
The canonical public entry SHALL expose a reliable large social preview.

#### Scenario: Social crawler reads metadata
- **WHEN** a social crawler parses the canonical HTML
- **THEN** Open Graph SHALL include title, description, site name, canonical URL and an absolute 1200x630 PNG image with alt text
- **AND** Twitter metadata SHALL use a large-image card with matching title, description, image and alt text

### Requirement: Search engines receive truthful structured product identity
The canonical page SHALL describe DashGPT with machine-readable structured data that matches visible product claims.

#### Scenario: Structured data is parsed
- **WHEN** the JSON-LD block is parsed
- **THEN** it SHALL describe DashGPT as a `WebApplication` with name, canonical URL, description and web operating environment
- **AND** it SHALL NOT invent reviews, ratings, pricing, user counts or organization claims
