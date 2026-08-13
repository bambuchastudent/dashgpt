# Proposal — ChatGPT export import

Issue: #65

## Problem

Large-history migration through repeated browser requests can hit rate limits. Bulk migration needs a user-owned path that does not depend on repeatedly requesting individual conversations.

## Proposed change

Use the official ChatGPT data export as the recommended bulk-migration input. DashGPT accepts the downloaded ZIP or exported conversation JSON files, parses them locally in the browser, converts conversations into the same canonical card model and Vault used everywhere else, and deduplicates against cards already created by live import.

The existing live importer remains available as an optional quick/recent path.

## User-visible result

A user can drop the ChatGPT export into DashGPT, see progressive import status, and then use the same cards in My Dash and optional Google Drive/GitHub sync without per-conversation rate limits.

## Scope boundaries

No server upload of raw exports. No new card type. No new remote provider. No removal of the existing live importer.
