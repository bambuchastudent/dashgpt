# Impact Manifest

## Product surfaces

- `/demo/` first-run dashboard and hero — **changed**
- Result card compact presentation — **changed**
- Result detail presentation — **changed**
- local save/create dialog — **changed to capture + review**
- persistence onboarding — **new presentation behavior**
- `/demo/?showcase=1` — **new presentation mode**
- Semantic Gallery ordering/density — **reused, contract unchanged**
- Semantic Dashes domain model — **unchanged; demo strip is presentation seed**
- Vault v1 storage/layout — **unchanged**
- Result immutable payload/hash/version — **unchanged**
- continuation payload/link construction — **unchanged**

## Expected code touch set

- `demo/index.html`
- `demo/app.js`
- `demo/styles.css`
- `demo/gallery.css` only if a narrow-layout contract cannot be expressed in the primary stylesheet
- new small F9 presentation module/data file if separation improves testability
- `scripts/verify-zero-friction-demo.mjs`
- `scripts/verify-ui-contract.mjs` only for shared mobile contracts
- `package.json` verification scripts

## Data and privacy

- Demo content: static/in-memory, never persisted as user Result data.
- New durable product data: none.
- New remote calls: none.
- New auth: none.
- New provider permissions: none.
- New local presentation state: confirmed save IDs/count and persistence-prompt suppression metadata only.

## Collision guard

Do not modify `continuationText`, `continuationUrl`, Result durable field definitions, Vault serialization/layout, GitHub sync protocol, Semantic Dash membership/ranking semantics, or semantic hue generation in this PR.

## Verification impact

- Add `verify:fast`.
- Add `verify:full`.
- Keep `check` compatible with full verification.
- Add F9 deterministic verifier.
- Require narrow 360px and mobile-Safari-style viewport preview evidence.
- Record real human grandmother-test evidence separately; never synthesize it from automation.
