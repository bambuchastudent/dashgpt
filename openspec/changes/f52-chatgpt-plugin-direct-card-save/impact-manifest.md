# Impact Manifest — F52

## Primary surfaces

- public DashGPT MCP tool contract;
- canonical Card save/upsert path and private write authorization boundary;
- ChatGPT app/plugin submission metadata and reviewer tests;
- bundled `use-dashgpt` skill instructions;
- support/setup documentation for supported ChatGPT surfaces.

## Adjacent capabilities to preserve

- F36 link-first Share capture remains available and best-effort;
- F50 unreadable-Share recovery remains a separate web UX change;
- canonical Cards, Vault storage, Search, Semantic Gallery, Dashes and Structured Continuation keep their existing entity model;
- `prepare_result_import` remains available during migration unless this change explicitly and safely supersedes it;
- public read MCP tools keep their current access boundary.

## Security/privacy blast radius

A write tool can modify user-controlled DashGPT state, so authorization and tenant/storage binding are critical. This change must not convert the current no-auth public MCP surface into an arbitrary private write endpoint. No ChatGPT cookies, session tokens or OpenAI credentials may be collected as DashGPT authorization. Secret-storage safeguards remain in force.

## External/release impact

Repository readiness does not equal Plugin Directory publication. Domain verification, publisher/portal actions, attestations and submission are externally consequential and require explicit user authorization outside normal code implementation. Mobile custom MCP remains unsupported by ChatGPT at the time of this change; public plugin capability on native mobile must be verified before product claims are made.