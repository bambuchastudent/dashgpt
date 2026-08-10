# Anonymous Share Resolver

## Problem

A public ChatGPT share URL is an important zero-account capture path, especially on mobile, but DashGPT currently depends on retrieval paths that ChatGPT may classify as automated traffic. A clean/private device can therefore receive an unreadable-share error even though the same URL opens normally for the user.

## Goal

Make public share-link capture a useful anonymous fallback again without making it the only product path. DashGPT should try multiple safe public resolvers, keep provider details invisible, and let a mobile visitor paste or pass a Share URL directly into onboarding.

## Scope

- add provider-neutral public-share resolver fallbacks before the existing direct/browser paths;
- start with no-key Jina Reader and AllOrigins compatibility providers;
- parse either clean reader text or proxied raw ChatGPT share HTML into the existing shared-chat response contract;
- preserve strict ChatGPT host/share-id validation before any proxy request;
- restore a compact secondary `Share link` flow on clean onboarding while keeping `dashgpt` chat-first as the primary path;
- support `?share=<chatgpt share URL>` so future iPhone Shortcut/Share Sheet glue can hand off directly;
- never expose proxy/provider/403 internals to the visitor;
- cover provider success/failure and onboarding with deterministic regression tests.

## Non-goals

- bypassing access controls on private conversations;
- browser extensions;
- making free proxy infrastructure a permanent production SLA;
- replacing the planned direct `save_result` plugin path.
