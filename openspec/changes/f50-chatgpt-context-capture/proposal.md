# F50 — ChatGPT context capture recovery

## Problem

DashGPT currently prefers a ChatGPT Share URL in **Save chat** and keeps a structured ChatGPT handoff as a secondary fallback. A real public Share can open normally in the user's logged-out mobile browser while every DashGPT server-side retrieval path is blocked or rate-limited before useful conversation content reaches the parser.

The production diagnostic reproduction showed `403` from direct ChatGPT and Cloudflare Browser Run paths and `429`/`403` from the compatibility resolver paths. More parsers, retries, or server proxies cannot make that a reliable product contract.

This is consistent with the earlier chat-first design: automated access to ChatGPT public pages is a convenience path, not the dependable foundation for capture.

## Goal

When a recognized public Share exhausts with `SHARED_CHAT_UNREADABLE`, turn the dead-end error into a short mobile-friendly recovery that captures the useful outcome **from the original ChatGPT conversation context** and saves/updates the same canonical Card model.

## Scope

- keep successful Share-link capture unchanged;
- on exact `SHARED_CHAT_UNREADABLE`, automatically reveal the existing structured current-chat handoff instead of leaving it hidden below a red error;
- explain in human language that ChatGPT did not allow DashGPT's server to read the link and that saving from the original chat is the reliable recovery;
- surface the existing one-tap **copy DashGPT command** action and move/focus the recovery into view on narrow mobile screens;
- accept the existing structured JSON response and reuse the existing review/save flow;
- when recovery started from a valid Share URL, preserve that canonical Share URL as Card source provenance after the structured response is saved;
- preserve duplicate-free upsert behavior for repeated capture of the same Share source;
- keep local-first save and optional provider sync behavior unchanged;
- keep public Share retrieval as best-effort convenience and do not add another proxy, credential flow, cookie replay, CAPTCHA/Turnstile bypass, or browser-extension dependency;
- keep the existing MCP `prepare_result_import` capability as the preferred integration direction when DashGPT is actually available in the AI client, without claiming the public plugin is published today.

## Non-goals

- guaranteeing server-side extraction of every public ChatGPT Share;
- authenticated scraping of private/member-only ChatGPT data;
- requesting/storing ChatGPT cookies, session tokens, passwords, account identifiers or project credentials;
- publishing the DashGPT ChatGPT plugin/App in this PR;
- changing the MCP tool contract;
- changing Card schema, Vault schema, Search, Semantic Gallery, Dashes, continuation, F39 Card detail or F37 project memory;
- changing bulk ChatGPT history import.

## User-visible result

Instead of:

`Share link → red unreadable error → user must discover a hidden fallback`

F50 makes the failure path:

`Share link → ChatGPT blocks server retrieval → "Save from the original chat" → copy command → paste ChatGPT result → review → canonical Card`

The user does not need DevTools and does not give DashGPT ChatGPT credentials.
