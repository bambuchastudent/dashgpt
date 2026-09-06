# Shared Chat smoke upstream-flake classification

## Problem

`Shared Chat live production smoke` currently treats every exhausted public-Share read as a hard GitHub Actions failure. The probe depends on external ChatGPT/public-reader availability, so transient `502 SHARED_CHAT_UNREADABLE` responses and network timeouts can turn a healthy DashGPT deployment into a red scheduled workflow and repeated failure email notifications.

The current shell also stops after the first exhausted fixture because `set -e` observes the function's non-zero return, so the run cannot distinguish a single bad fixture from a broader resolver outage.

## Goal

Keep the live smoke useful as a production regression detector while making scheduled external availability flaps non-paging:

- always probe every configured fixture before classifying the run;
- distinguish expected upstream unreadability from hard DashGPT contract failures;
- keep scheduled runs green-with-warning for exhausted upstream-only failures so GitHub does not emit recurring failure emails;
- keep push and manual runs strict so maintainers can still use the smoke as a release/regression gate;
- keep malformed `200` responses and unexpected HTTP/error shapes as hard failures on every trigger.

## Scope

- `.github/workflows/shared-chat-live.yml` failure semantics and bounded retry timing;
- deterministic repository verification for the workflow contract;
- OpenSpec/docs for the monitoring behavior.

## Non-goals

- changing `/api/shared-chat` user-facing resolver behavior;
- hiding malformed production payloads or unexpected server errors;
- guaranteeing ChatGPT/Jina/other external resolver availability;
- changing cards, Dashes, storage, continuation, import semantics, or UI.
