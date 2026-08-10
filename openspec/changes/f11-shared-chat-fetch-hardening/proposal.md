# Shared Chat Fetch Hardening

## Problem

Public ChatGPT share pages open correctly in a real user browser, but DashGPT's `/api/shared-chat` currently relies on a direct Worker `fetch()` through `chatgpt-share-parser`. ChatGPT can return HTTP 403 to that server-side request, so the own-chat onboarding fails even for a valid public share URL.

## Goal

A valid public ChatGPT share link should remain importable when the direct server fetch is blocked, without weakening URL validation or exposing unrelated browsing capability.

## Scope

- keep the existing strict ChatGPT hostname/share-path validation;
- fetch and parse the public share page directly first;
- when direct retrieval fails or returns an unparsable shell, retry through the configured Cloudflare Browser Run binding;
- parse Browser Run HTML with the same `chatgpt-share-parser` parser;
- expose a stable in-place error when both retrieval methods fail;
- add regression tests for direct success, direct 403 + browser success, and total failure;
- configure a `BROWSER` binding for the production Worker.

## Non-goals

- private or authenticated ChatGPT conversations;
- bypassing login/CAPTCHA challenges;
- arbitrary user-controlled web scraping beyond validated public ChatGPT share URLs;
- cross-device storage/sync.
