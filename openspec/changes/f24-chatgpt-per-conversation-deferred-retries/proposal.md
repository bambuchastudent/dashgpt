# Proposal: Per-conversation deferred retries for ChatGPT 429s

## Why

Feature 20 is merged and provides resumable, duplicate-safe progressive ChatGPT history import, but its conversation-detail scheduler still treats every HTTP 429 as a queue-wide throttle: one response sets a shared cooldown and prevents unrelated ready conversations from progressing.

A real 2,123-conversation import showed that this behavior sacrifices useful throughput. The desired behavior from Issue #42 is narrower: a 429 should defer only the affected conversation until its own `nextRetryAt`, while other ready conversation-detail tasks continue. The original Feature 20 safety goal remains valid: bounded concurrency and coordinated retry timing must still prevent retry storms.

## What changes

This change modifies the Feature 20 conversation-detail scheduler so that:

- each pending conversation-detail task has transient retry state (`attempt`, `nextRetryAt`, safe status/error class);
- HTTP 429 removes that task from the ready queue and places it in a deferred queue;
- workers immediately continue with other ready tasks instead of sleeping while holding the deferred conversation;
- a deferred task becomes eligible again only at or after `nextRetryAt`;
- `Retry-After` is respected when present, otherwise bounded exponential backoff is used;
- per-source stagger/jitter prevents equal-delay tasks from re-entering simultaneously;
- repeated 429s increase the affected conversation's delay and eventually leave that conversation unresolved for a later resumable run rather than replaying completed work;
- if every unfinished conversation is deferred and none is in flight, the source runtime sleeps until useful work can resume instead of busy-looping;
- HTTP 503 remains eligible for a conservative service-wide cooldown because it is a stronger service-level signal than one conversation's 429;
- the import progress model can expose a bounded deferred/waiting count and only presents the whole import as `Waiting for ChatGPT` when no ready/in-flight conversation work remains.

## Preserved behavior

The change keeps Feature 20's existing:

- stable ChatGPT `conversationId` → deterministic mutable card identity;
- durable Vault card as the resume checkpoint;
- progressive bounded batch persistence and ACK-after-save semantics;
- local browser `postMessage` bridge and origin/session/nonce validation;
- compact card projection and credential-free diagnostics;
- pause/cancel behavior;
- low bounded adaptive concurrency;
- canonical My Dash/Search/Semantic Gallery/Dash integration.

## Scope boundaries

This change does **not** implement:

- Issue #41 import performance profiling/root-cause work;
- Issue #43 card reindex/semantic enrichment;
- Issue #44 / Feature 23 launcher UX;
- Issue #45 import-card detail actions;
- storage redesign or a second import database;
- higher fixed concurrency or a throughput-only tuning pass;
- permanent persistence of provider credentials, raw responses, or raw transcripts.

## Compatibility / overlap

Primary implementation surfaces:

- `demo/chatgpt-history-source-runner-core.js` — request scheduling and task queue;
- `demo/chatgpt-history-source-runner.js` — current source-runner bridge injection;
- `demo/chatgpt-history-import.js` — receiver/progress projection;
- `scripts/verify-chatgpt-history-import.mjs` — deterministic import contracts;
- browser import tests where progress behavior changes.

Open PR #48 also touches the generated source runner for launcher packaging. This PR does not adopt launcher changes; later branch integration must preserve the F24 scheduler semantics when Feature 23 is rebased/merged.

## Verification direction

Before merge, verification must prove at minimum:

- one conversation receiving 429 does not stop unrelated ready conversation tasks;
- the deferred conversation is not retried before `nextRetryAt`;
- repeated 429s increase only that conversation's backoff;
- `Retry-After` establishes a minimum retry delay;
- equal retry delays are staggered across source IDs;
- all-deferred queues sleep rather than spin;
- completed cards are not replayed;
- pause/cancel prevents future retry scheduling;
- progress distinguishes deferred work without falsely marking mixed active work as globally waiting;
- stable source identity/privacy/ACK semantics remain green.
