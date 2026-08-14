# Design — Demo Branding, Browser Identity and SEO

## Current-state findings

`demo/index.html` currently defines `DashGPT Demo` plus viewport/theme metadata but no favicon, description, canonical, Open Graph, Twitter/X or manifest metadata.

The existing starter brand asset is `plugins/dashgpt/assets/logo.svg`: a 512×512 rounded-square DashGPT `D` monogram. The Worker static asset binding serves only `./demo`, so the plugin asset cannot be referenced reliably as a browser asset at runtime. A byte-equivalent demo copy is therefore justified at the public asset boundary.

The current deployment is a Cloudflare Worker (`wrangler.jsonc`, `src/worker.js`) with `./demo` static assets plus Worker-owned API/MCP/storage/share routes. A `pages.dev` hostname is therefore a deployment migration concern, not a safe one-line hostname rename in application code.

## Asset strategy

Create `demo/favicon.svg` from the existing starter monogram without redesigning it. Keep its vector geometry/colors identical. The demo copy exists because `./demo` is the configured public asset root.

Use the SVG for:

- browser `rel=icon`;
- manifest icon (`sizes: any`).

Do not pretend an SVG is an Apple Touch PNG or social-card raster. A dedicated raster/social asset can be added with the final production brand when an actual supported asset exists.

## Metadata strategy

Main page metadata remains current-brand (`DashGPT`) and value-first:

- title: concise product name + save/find/continue value;
- description: useful AI outcomes become cards that can be found and continued later;
- canonical: relative `/demo/`, so previews/current production/future host resolve to themselves and no unverified hostname is declared canonical;
- Open Graph: title, description, website type, site name;
- Twitter/X: summary card, title, description.

Omit `og:image`/`twitter:image` rather than publish an SVG most social crawlers do not reliably support.

Do not add schema.org ratings, pricing, organization claims or other facts that are not established.

## Crawler boundary

The public shell may be indexed, but DashGPT must not turn local/private application state into a crawler target. `demo/robots.txt` therefore allows the public surface by default while disallowing API/MCP and personal/deep application routes such as Result/Dash detail paths.

This is a crawler directive, not a privacy/security boundary; private data must remain protected by the existing storage/runtime model independently of robots.txt.

## Rebrand boundary

This change deliberately does not rename DashGPT. Candidate names and the requested future `dashseek.pages.dev` hostname are separate branding/deployment decisions. Metadata is kept compact and centralized in the public document head so a later approved rebrand can replace it without touching cards/storage logic.

## `dashseek.pages.dev` deployment boundary

The existing deployment combines static assets and Worker APIs. Creating a Cloudflare Pages project named `dashseek` can reserve/provide `dashseek.pages.dev`, but moving the existing application to that hostname must preserve API/MCP behavior. This PR will document the safe operator steps and explicitly avoid claiming that renaming the Worker automatically creates a `pages.dev` hostname.

## Verification strategy

Add a deterministic Node verifier to check metadata, favicon/manifest references and robots policy. Add Playwright coverage for the actual served `/demo/` document on desktop/mobile. Include the verifier in `npm run check` and the focused `verify:fast` path.
