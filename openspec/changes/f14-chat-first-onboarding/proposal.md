# Chat-First Onboarding

## Problem

The clean-device onboarding currently asks a new visitor to paste a public ChatGPT share URL. That makes a compatibility importer look like the core product. In production, public ChatGPT pages can be readable by a person while automated retrieval is blocked or changed, so a first-time visitor can hit an error before seeing any DashGPT value.

## Goal

Make the first-run path reflect the real product: the useful summary is produced from the user's current AI conversation, not scraped from a public web page. The clean-device flow must work without reading chatgpt.com, without existing DashGPT state, and without showing infrastructure errors.

## Scope

- replace the public-share form as the primary first-run action;
- provide one compact ChatGPT command that asks the current conversation to produce a portable DashGPT Result envelope;
- accept that envelope locally, preview it, and save the user's first card to the browser Vault;
- keep public-share import code as compatibility infrastructure, but do not advertise it in the primary welcome view;
- preserve the existing empty personal board and no-publisher-data guarantees;
- keep the UX mobile-first and usable in a private/incognito browser session.

## Non-goals

- authenticated direct `save_result` from the DashGPT plugin; that is the next capability;
- browser extensions or DOM scraping in the user's browser;
- making public ChatGPT share scraping reliable enough to be a product dependency;
- account sync or cross-device identity.
