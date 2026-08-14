# Design — One-sentence product explanation

## Current state

The public header subtitle is `Useful AI outcomes, not chat history.` It differentiates DashGPT from a transcript archive, but it does not explain the product model or the action a user can take with it.

The existing SEO description is closer to the intended value proposition but still omits the connected-card and combine/context-preservation parts of the current card-first product model.

## Copy contract

Use one plain-language English sentence on the public shell:

> DashGPT is your personal AI memory: it turns useful parts of conversations with ChatGPT and other assistants into connected cards you can find, combine, and continue later with the context preserved.

The same sentence is the canonical public description for meta description, Open Graph description, Twitter/X description and the web-app manifest. This keeps the first-view explanation and external previews consistent.

## Boundaries

This is a copy-only UX change. It does not change runtime behavior, data models, storage providers, card rendering, Dashes, search, capture/import or continuation behavior.

## Verification

Extend the existing deterministic branding verifier and Playwright branding test to assert the canonical sentence both as visible header copy and as public metadata.
