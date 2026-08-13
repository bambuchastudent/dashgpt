# Feature 26 — Design

## Model

Feature 26 has three layers: usage metadata on canonical cards, revisioned project-metric profile data, and a compact profile projection.

Imported ChatGPT cards persist usage inside the existing portable card `result` envelope as `result.usage`, containing a numeric token count, a count kind (`estimated` or future `reported`), and an estimator identifier. Reusing the existing `result` envelope avoids adding a new top-level Vault Result field or changing Vault schema v1. History import estimates from the full selected visible user/assistant message text before card distillation. The estimator is deterministic, Unicode-aware, versioned as `visible-text-v1`, and clearly presented as approximate.

The profile aggregate reads current materialized canonical cards and their `result.usage`. Re-importing the same mutable ChatGPT source replaces the stable card, so its previous estimate is not counted twice.

Project metrics use existing Vault v1 `profileRevisions`. A revision contains an ID, kind `project-metrics`, optional base revision ID, three-letter currency, `spentMinor`, `donatedMinor`, and update timestamp. Amounts are non-negative safe integers in minor units. Editing appends a new revision; latest valid revision is selected deterministically.

## UI

A profile metrics module mounts a compact Profile / Профиль disclosure in the existing topbar. It shows the three counters and supports collapse/expand. Collapse is a device-local display preference and does not create Vault revisions. Tokens are read-only; spent/donated values have an explicit edit flow.

RU/EN strings share one localization boundary with English fallback. Mobile layout must work at 360px without horizontal overflow.

## Privacy and compatibility

Only numeric usage metadata is added to the canonical card `result` envelope. No raw transcript is added to profile data. No payment credentials are collected. Vault schema remains v1 because `result` and `profileRevisions` are already portable fields handled by the existing storage adapters.
