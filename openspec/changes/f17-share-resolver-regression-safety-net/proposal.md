# Share Resolver Regression Safety Net

## Problem

Anonymous ChatGPT Share import has failed repeatedly even when deterministic mocks and browser tests were green. The latest failures were caused by upstream format changes and resolver behavior that only appeared against real public Share URLs in production.

## Goal

Make regressions visible before users report them by covering the resolver contract at three levels:

1. deterministic parser and fallback tests in `npm run check`;
2. browser tests for clean/private-style onboarding and `?share=` handoff;
3. recurring live production smoke checks against multiple real public ChatGPT Share fixtures.

## Scope

- test-only hardening of the current anonymous Share resolver and onboarding contract;
- no new product capability and no change to user storage semantics;
- live smoke retries transient resolver/cache propagation before failing;
- live smoke asserts a usable conversation contract, not a specific provider.

## Non-goals

- guaranteeing availability of ChatGPT or third-party resolvers;
- replacing provider fallbacks;
- changing Result summarization quality.
