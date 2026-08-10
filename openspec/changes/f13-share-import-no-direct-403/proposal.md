# Share Import Without Direct 403

## Problem

A public ChatGPT share can open normally for a person while ChatGPT rejects DashGPT's raw server-to-server fetch with HTTP 403. The current importer attempts that raw fetch first, so a normal import begins with a predictable anti-bot failure. If all fallbacks fail, the raw upstream error text is also shown in onboarding.

## Goal

Treat rendered public-share extraction as the preferred compatibility path when the Cloudflare Browser binding is available, and keep raw HTTP retrieval only as a fallback. Users must never see raw upstream HTTP status details such as `403`.

## Scope

- prefer rendered DOM extraction for public ChatGPT share imports when `BROWSER` is configured;
- do not call direct ChatGPT fetch when rendered DOM extraction succeeds;
- preserve direct structured parsing as a fallback for environments without Browser Run or when DOM extraction fails;
- preserve rendered-payload parsing as tertiary compatibility fallback;
- return a stable user-facing unreadable-share error instead of exposing upstream transport/parser details;
- keep strict ChatGPT share-host validation and the existing onboarding response shape on success.

## Non-goals

- making shared-link scraping the primary DashGPT product flow;
- replacing the command/plugin capture path;
- adding browser extensions;
- private ChatGPT conversation access.
