# Feature 26 — Profile project metrics

## Why

DashGPT preserves useful AI work as portable cards, but it has no compact profile view for project-wide usage and money totals.

## Product decision

Add a compact Profile / Профиль disclosure to the personal top bar. Inside it, a collapsible project-metrics header shows estimated tokens consumed, money spent, and money donated/received. These metrics are profile data, not Cards, Dashes, search results, or a separate analytics dashboard.

## Truthfulness decision

ChatGPT history import exposes visible conversation text but not authoritative provider billing usage or a trustworthy per-conversation price. Token counts from history import are estimates and money is never inferred from those estimates.

Spent and donated values are explicit user-maintained profile values. Payment-provider, donation-provider, FX, and provider billing integrations are out of scope.

## Storage decision

Metric data uses existing Vault v1 `profileRevisions`, so it remains local-first and participates in Vault export/import and current remote object sync. Collapse state is a device-local UI preference and does not create profile revisions.

## Acceptance

1. The personal top bar exposes a compact Profile control without displacing the card-first dashboard.
2. Profile shows token, spent, and donated metrics and can collapse/expand.
3. Token estimates are visibly approximate.
4. Money is never derived from token estimates.
5. Metric revisions survive Vault portability.
