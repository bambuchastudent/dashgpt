# Feature 21 — Demo Branding, Browser Identity and SEO

## Why

The public DashGPT demo currently has a generic `DashGPT Demo` document title and no configured favicon. Browsers therefore show an inconsistent/default tab icon even though the repository already contains a starter DashGPT brand mark. The public shell also lacks a useful search description and social metadata, so a shared or indexed URL does not explain the product's value clearly.

The first impression should communicate the product in human terms: useful outcomes from AI conversations become reusable cards that can be found and continued later.

## What changes

- reuse the existing DashGPT `D` monogram as the source for the demo favicon instead of inventing another logo;
- give the public demo a concise product title and value-first meta description;
- add minimal Open Graph and Twitter/X text metadata suitable for link previews;
- add a self-canonical demo path that remains valid across branch previews and a future production hostname;
- add a web-app manifest using the same brand mark where supported;
- add conservative crawler rules so the public entry can be indexed while API/MCP and personal/deep application surfaces are not advertised for crawling;
- add deterministic metadata/assets verification and browser regression coverage;
- document the deployment boundary for a future `dashseek.pages.dev` front door without renaming the DashGPT product in this PR.

## Non-goals

- no DashGPT -> DashSeek/DashMemory/etc product rename;
- no new logo or visual identity redesign;
- no changes to cards, Dashes, search ranking, storage, continuation, capture/import, MCP, or GitHub sync;
- no fake review/rating/pricing structured data;
- no sitemap tied to a hostname that is not yet verified live;
- no migration from the current Cloudflare Worker runtime to Pages in production code.

## User-visible outcome

Opening the demo shows the existing DashGPT mark in the browser tab instead of a default/strange icon, and the browser/search/share metadata describes what the product is for rather than exposing implementation terminology.

## Dependencies and overlap

This composes with the merged Unified Card Dashboard (`f18-unified-card-dashboard`) and the existing mobile/onboarding surfaces. It must not interfere with the open Feature 20 import work, private Vault data, public Result compatibility routes, or the Worker API/MCP runtime.

## Success criteria

- `/demo/` has a non-generic product title, description and favicon;
- the favicon is served from the Worker asset directory and is derived from the existing starter brand mark;
- Open Graph and Twitter/X text metadata are present and consistent with the current card-first product statement;
- canonical metadata is host-portable rather than hardcoding an unverified future hostname;
- crawler policy does not invite indexing of API/MCP or personal deep application routes;
- deterministic verifier and Playwright regression tests cover the contract;
- existing demo behavior remains unchanged.
