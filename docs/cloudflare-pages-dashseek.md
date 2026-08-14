# Moving the public front door to `dashseek.pages.dev`

This note is an operator handoff, not an automatic deployment change.

## Important: current DashGPT is a Worker, not a Pages site

The repository currently deploys one Cloudflare Worker (`wrangler.jsonc`) that combines:

- the `./demo` static assets;
- `/api/*` routes;
- `/mcp`;
- `/.well-known/*` discovery/challenge routes;
- GitHub storage callbacks/state;
- Browser Rendering-assisted share resolution.

A `*.pages.dev` hostname is created by a **Cloudflare Pages project**. Renaming the existing Worker cannot turn `dashgpt.dimkashir.workers.dev` into `dashseek.pages.dev`.

Cloudflare also documents that an existing Pages project's `*.pages.dev` subdomain cannot be renamed. To obtain `dashseek.pages.dev`, create a Pages project whose project name is `dashseek` (or recreate an existing Pages project if that exact Pages subdomain needs to change).

## Safe first step: reserve `dashseek.pages.dev`

1. Open Cloudflare Dashboard → **Workers & Pages**.
2. Create a **Pages** project and connect the GitHub repository `bambuchastudent/dashgpt`.
3. Use project name **`dashseek`**. That is what produces `dashseek.pages.dev` if the name is available.
4. Set the production branch to **`develop`**.
5. Do **not** switch production traffic from the current Worker merely because a static Pages build renders the demo.

The current browser code makes same-origin requests to Worker endpoints. Publishing only the `demo/` directory as a static Pages site would make the page look healthy while `/api/*`, `/mcp`, GitHub sync and share resolution are missing.

## Follow-up required before `dashseek.pages.dev` can replace the Worker

Use a dedicated deployment/migration change and choose one supported Pages runtime approach:

- bundle/port the current Worker into Pages Advanced Mode via an output `_worker.js`; or
- refactor the required dynamic routes into Pages Functions.

Before cutover, recreate and verify every required runtime binding/secret/variable and exercise at least:

- `/demo/` and deep routes;
- `/api/shared-chat`;
- `/api/storage/github/*` including OAuth return/session behavior;
- `/api/dashgpt/*`;
- `/mcp` POST behavior;
- `/.well-known/dashgpt.json` and the OpenAI challenge route;
- Browser Rendering-dependent behavior;
- current local-first Vault behavior.

Also update any external configuration that is hostname-specific (for example GitHub App callback URLs or published MCP/app URLs) only after the new endpoint is verified.

Keep the existing Worker live as rollback/compatibility until the new Pages deployment has passed the real smoke tests. Do not blindly redirect `/mcp` or OAuth/API traffic with a browser-style redirect.

## If the goal is only a new Cloudflare hostname today

Keeping the present Worker architecture is lower risk. A separate rename change could rename the Worker to `dashseek`, which would use the account's Workers hostname form (for this account, directionally `dashseek.dimkashir.workers.dev`) rather than `dashseek.pages.dev`.

## Cloudflare references

- Pages known issues (`*.pages.dev` names cannot currently be changed): https://developers.cloudflare.com/pages/platform/known-issues/
- GitHub integration / production branch: https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/
- Worker → Pages migration: https://developers.cloudflare.com/pages/migrations/migrating-from-workers/
- Refactor Worker to Pages Functions / `_worker.js` Advanced Mode: https://developers.cloudflare.com/pages/how-to/refactor-a-worker-to-pages-functions/
- Current Workers static-assets model: https://developers.cloudflare.com/workers/static-assets/
