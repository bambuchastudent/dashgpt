# Proposal — Safari-safe Google Drive connect

Issue: #59

## Problem

The current Google Drive connect handler performs an asynchronous GitHub-provider status request before asking Google Identity Services to open its sign-in UI. Chromium can tolerate this path, but Safari on macOS may treat the later popup request as no longer belonging to the original user click and block or ignore it.

This creates a false support state: DashGPT shows an enabled `Connect Google Drive` action although that action is not reliable in a supported desktop browser.

## Proposed change

1. Keep the Google sign-in request directly in the synchronous user-click path: no awaited fetch, timer, or unrelated async work may run first.
2. Preload Google Identity Services once deployment configuration is known.
3. While Google Identity Services is not ready, show an explicit preparing/retry state instead of an enabled Connect action.
4. Preserve the existing one-remote-provider rule. Re-check GitHub state after Google returns and before any Drive synchronization.
5. Add deterministic regression coverage that records browser user activation at the instant the Google sign-in request is made, with provider-status networking deliberately delayed.
6. Make macOS Safari acceptance an explicit completion gate for browser-sensitive sign-in/launch changes.
7. Add a reusable recommendations document and a structured handoff for the next agent.

## Scope boundaries

This change does not alter Vault format, Drive file layout, Drive scope, merge semantics, remote-provider identity, or add persistent background sign-in. The separate `Save chat` UX redesign remains separate capability work.

## User-visible result

On Safari for macOS, opening Storage and pressing `Connect Google Drive` should reliably open Google sign-in instead of appearing inert. If the Google library has not loaded yet, DashGPT tells the user it is preparing and only enables a safe action when ready.
