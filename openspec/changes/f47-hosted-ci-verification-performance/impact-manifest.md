# Impact Manifest

## Directly affected

- `.github/workflows/check.yml`
  - Node/npm cache setup;
  - deterministic dependency installation;
  - canonical hosted verification wall-clock.
- `playwright.config.mjs`
  - bounded CI worker concurrency only.
- deterministic verification for the CI/config contract;
- `npm run check` wiring for the new verifier.

## Maintainer-visible impact

Pull-request and `develop` canonical checks should complete with useful margin inside the existing 30-minute budget instead of being cancelled at the job timeout. The required verification surface remains the same command and the same deterministic/browser coverage.

## Preserved gates

- all existing `npm run check` verifiers;
- both desktop Chromium and mobile Chromium Playwright projects;
- CI `retries: 1`;
- Playwright per-test timeout;
- `fullyParallel: false` per-file ordering behavior;
- repository-owner CI execution guard;
- `ubuntu-latest` hosted runner policy;
- existing 30-minute hard timeout.

## Explicitly unaffected

- product/API/UI behavior;
- Cards, Dashes, search, Semantic Gallery and continuation;
- storage/sync/import behavior;
- Shared Chat resolver behavior;
- F46 scheduled-vs-strict smoke classification;
- deployment configuration and credentials.

## Main risks

- Two concurrent browser workers can increase peak CPU/memory use on a hosted runner.
- Cache behavior can conceal performance variance but cannot change package correctness because `npm ci` still validates the committed lockfile.
- If hosted execution remains too slow, a later spec update may permit project/shard matrix jobs; that wider architecture is intentionally excluded until benchmark evidence requires it.
