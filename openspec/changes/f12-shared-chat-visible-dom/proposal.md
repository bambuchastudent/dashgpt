# Shared Chat Visible DOM Fallback

## Problem

A valid public `chatgpt.com/share/...` URL opens in a normal browser, while DashGPT's server-side fetch receives HTTP 403. The Browser Run fallback can render the page but the current parser still depends on ChatGPT's embedded React/legacy hydration payload. Current share pages can render the visible conversation without exposing that payload in the shape expected by the parser, so onboarding still fails with `Legacy share payload not found`.

## Goal

When a public ChatGPT share is visibly readable in the rendered page, DashGPT must be able to import its visible user/assistant turns without depending on undocumented hydration payloads.

## Scope

- keep strict allow-listing for public ChatGPT share URLs;
- keep direct HTML + structured payload parsing as the cheap first attempt;
- if direct parsing fails, use Cloudflare Browser Run `/scrape` to extract rendered message elements;
- prefer `data-message-author-role` to preserve user/assistant roles;
- derive a safe fallback title from the visible page or first user message;
- return the same shared-chat response shape consumed by onboarding;
- add regression coverage for direct 403 + rendered DOM success and empty/challenge DOM failure.

## Non-goals

- private/authenticated ChatGPT chats;
- bypassing access controls or CAPTCHA challenges;
- scraping arbitrary hosts;
- preserving every rich attachment/tool widget in this hotfix.
