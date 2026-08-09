# Feature 4 — Public DashGPT plugin

## Why

DashGPT already exposes a working MCP surface, but a public MVP must be usable by someone other than the developer and against that person's own DashGPT site. A developer-only custom MCP connection is not the acceptance criterion.

OpenAI's current public plugin flow uses the universal Plugins Directory and the OpenAI Platform submission portal. Most submissions should use one universal MCP URL; template MCP URLs are restricted to approved cases. DashGPT therefore needs one public gateway that can address a user-selected DashGPT instance without hard-coding the developer's data.

## Change

Prepare **DashGPT** (`dashgpt`) as a submit-ready MCP + skill plugin:

- keep one production MCP endpoint for the public plugin;
- let read/context tools target a user-supplied DashGPT site that implements the small public DashGPT instance protocol;
- keep Result import explicit and user-opened rather than silently writing browser state;
- provide listing metadata, support/privacy/terms surfaces, domain verification, starter prompts, reviewer test cases and release notes;
- make tool annotations accurately describe read-only/open-world behavior;
- maintain the complete implementation and acceptance state in OpenSpec and the mobile DASH.

## Success

1. The production DashGPT MCP endpoint passes submission-oriented smoke checks and exposes accurate metadata.
2. A separate DashGPT site can be selected as the source/target instance without changing the plugin package or MCP URL.
3. All submission materials are ready in the repository.
4. The plugin is submitted through the OpenAI Platform, approved, and published.
5. A second person installs/connects DashGPT and demonstrates list/read, Context Pack, and explicit save/import against their own DashGPT site.

Only after step 5 is the MVP complete.
