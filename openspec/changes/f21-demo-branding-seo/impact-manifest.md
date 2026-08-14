# Impact Manifest

## Directly affected

- `demo/index.html` public document head
- public browser favicon/manifest assets under `demo/`
- crawler policy under the same static asset root
- deterministic verification and Playwright metadata coverage
- deployment documentation for the requested `dashseek.pages.dev` hostname

## Must remain unchanged

- canonical Card/legacy Result data model
- My Dash/Semantic Gallery/Semantic Dash membership and search behavior
- Vault/local-first persistence and GitHub sync
- Structured Continuation
- ChatGPT Share/import behavior and Feature 20 work
- Worker API, MCP and discovery protocol contracts
- privacy/security behavior
- plugin submission identity and current product name

## Deployment risk

The current production application is a Cloudflare Worker with Worker-owned dynamic routes. `*.pages.dev` belongs to Cloudflare Pages projects, so the hostname change cannot be represented as a harmless rename of `wrangler.jsonc`. The implementation PR must not break the Worker while documenting a migration/alias path separately.

## Rollback

The runtime change is limited to static metadata/assets plus test wiring. Reverting those files restores the previous browser metadata without data migration or storage rollback.
