## MODIFIED Requirements

### Requirement: Product board is discoverable from existing DashGPT surfaces
The normal personal DashGPT dashboard SHALL NOT expose DashGPT Product Board as a global navigation action. The Product Board route MAY remain available as an internal/compatibility surface, but ordinary card/Dash use SHALL NOT require or promote it.

#### Scenario: User starts from normal personal dashboard
- **WHEN** the user opens `/demo/`
- **THEN** the global header SHALL NOT show a Product Board action
- **AND** normal Card, Dash, search, capture and storage actions SHALL remain available

#### Scenario: Existing internal Product Board link is used
- **WHEN** project-maintenance tooling or an existing direct link opens `/demo/dash/dashgpt-product/`
- **THEN** this change SHALL NOT require deletion of the compatibility route or its repository-backed Product Board data
