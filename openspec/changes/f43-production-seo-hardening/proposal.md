# Proposal: Production SEO hardening

## Context

F21 / PR #99 established DashGPT browser identity, basic metadata, manifest and conservative crawler rules. The production hostname is now known and public: `https://dashgpt.dimkashir.workers.dev`.

The remaining problem is not keyword stuffing. It is canonical product identity and crawl hygiene: search engines currently have no indexed `site:` result for the production hostname, there is no sitemap contract, the canonical is relative, social previews have no reliable image, preview hosts can present the same metadata, and private/deep application routes rely mainly on robots paths instead of response-level noindex protection.

## Product principle

> Search engines should see one public DashGPT product page; private memory, previews, APIs and deep application state should stay out of the index.

## What changes

- establish `https://dashgpt.dimkashir.workers.dev/demo/` as the absolute production canonical;
- permanently consolidate `/` and `/demo` onto `/demo/` through the Worker entry path;
- serve a root `robots.txt` with a root sitemap declaration;
- serve a root `sitemap.xml` containing only intended public canonical URLs;
- mark preview/non-production hosts and private/deep app views with `X-Robots-Tag: noindex`;
- add `og:url`, a 1200x630 PNG social image and Twitter large-card metadata;
- add truthful `WebApplication` JSON-LD without fake reviews, pricing or organization claims;
- keep the existing human-readable product description aligned across HTML, social metadata, manifest and structured data;
- add deterministic SEO contract tests and Worker/browser coverage.

## Non-goals

- no product rename;
- no keyword doorway pages;
- no fake ratings, reviews, users, pricing or awards;
- no indexing of browser-local cards or private Vault state;
- no Search Console credentials or external webmaster-account automation;
- no change to import, storage, continuation, Semantic Dashes or card semantics.

## Success criteria

- one production canonical URL is declared consistently in HTML, sitemap and social metadata;
- crawlers can discover the canonical through root robots + sitemap;
- duplicate entry URLs permanently resolve to the canonical;
- preview/private/deep URLs receive noindex protection at response level;
- shared links render a branded large social card;
- structured data describes the visible DashGPT web application truthfully;
- existing F21/F42 product behavior remains intact.
