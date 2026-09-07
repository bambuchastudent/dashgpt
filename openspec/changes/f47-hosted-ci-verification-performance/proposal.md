# Hosted CI canonical verification performance

## Problem

After PR #117 moved DashGPT canonical verification from the dedicated macOS self-hosted runner to `ubuntu-latest`, both the clean `develop` baseline and PR #113 exact head exhaust the existing 30-minute `DashGPT checks` job budget while still inside `npm run verify:full`.

The same timeout on an untouched `develop` commit demonstrates a baseline hosted-CI performance defect rather than an F46 regression. Raising the timeout alone would hide the performance regression and keep slow feedback on every pull request.

The browser gate is the largest parallelizable surface: the repository contains desktop Chromium and mobile Chromium projects over the same Playwright suite. Verification coverage must remain intact, including CI retry behavior.

## Goal

Restore materially faster, reliable GitHub-hosted canonical verification while preserving the full repository gate:

- keep `npm run verify:full` as the canonical command;
- preserve all deterministic `npm run check` coverage;
- preserve both Playwright projects and CI retries;
- use explicit hosted-CI parallelism instead of deleting/skipping tests;
- make dependency installation deterministic and cache-friendly;
- retain enough timeout headroom that normal hosted variance does not turn healthy branches red.

## Scope

- `.github/workflows/check.yml` hosted CI setup/performance behavior;
- `playwright.config.mjs` CI worker scheduling only if benchmark evidence requires it;
- deterministic regression verification for the hosted-CI contract;
- `package.json` wiring needed for that verifier;
- OpenSpec/current development-state documentation for the verification behavior.

## Non-goals

- changing product/API/UI behavior;
- changing F46 Shared Chat smoke classification semantics;
- removing desktop or mobile browser coverage;
- disabling CI retries merely to reduce runtime;
- converting back to self-hosted runners;
- masking the issue only by increasing `timeout-minutes`.
