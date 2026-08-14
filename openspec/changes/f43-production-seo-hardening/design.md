# Design: Production SEO hardening

## Canonical surface

Production canonical: `https://dashgpt.dimkashir.workers.dev/demo/`.

The root `/` and slashless `/demo` are transport aliases only and SHALL permanently redirect to `/demo/`. Branch previews and alternate hosts may serve the application for testing, but their HTML SHALL still declare the production canonical and their responses SHALL carry `X-Robots-Tag: noindex, nofollow`.

## Crawl policy

The Worker owns `/robots.txt` and `/sitemap.xml` so behavior is explicit and testable instead of depending on static-asset mount details.

Production robots:
- allow `/demo/`;
- disallow `/api/`, `/mcp`, `/.well-known/` and deep personal application routes;
- advertise the absolute production sitemap.

Non-production robots: `Disallow: /`.

The production sitemap contains only the canonical public entry. Legal/support pages remain accessible but are not promoted as search landing pages.

## Response-level noindex

Robots rules are crawl hints, not privacy boundaries. Worker responses add `X-Robots-Tag: noindex, nofollow` when:
- host is not the production host;
- `/demo/` is opened with personal/import receiver state query parameters;
- path is a Result, Dash or other deep application route not intended as a search landing page.

This header never replaces application authorization or privacy controls.

## Page metadata

The canonical page uses aligned product copy across:
- title and meta description;
- absolute canonical;
- Open Graph title/description/url/image;
- Twitter large-card metadata;
- web manifest;
- JSON-LD `WebApplication`.

No rating, review, price, user count or organization identity is invented.

## Social image

Ship a deterministic 1200x630 PNG under `/demo/og-card.png`, using the established DashGPT dark background and D monogram visual language. Metadata includes dimensions and alt text.

## Verification

Deterministic verifier checks metadata exactness, JSON-LD parseability, sitemap/robots contracts, Worker redirect/noindex behavior and image dimensions. Browser coverage confirms canonical/social tags are present on the served canonical page and that deep/personal routes are noindexed.
