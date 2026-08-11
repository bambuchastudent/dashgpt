# DashGPT Demo

Zero-build browser demo for the current `develop` product/runtime compatibility surface.

The implementation still contains legacy `Result` identifiers. Product terminology is **Card**; treat legacy names as compatibility details rather than a separate user-facing model.

## Run the static demo locally

From the repository root:

```bash
python3 -m http.server 8080 -d demo
```

Open `http://localhost:8080`.

For repository-integrated behavior and automated browser verification, use the project scripts/Worker setup rather than assuming a plain static server exercises every endpoint-backed feature.

## Included on current `develop`

The demo codebase includes compatibility implementations for:

- seeded/published legacy Result records rendered as cards;
- local Vault persistence/migration;
- search/category/favorite behavior;
- stable semantic grouping and Semantic Gallery density/zoom;
- Semantic Dashes and Review-mode membership behavior;
- card/detail and standalone legacy Result routes;
- structured RU/EN Continuation Brief generation, preview/edit/copy and ChatGPT fallback transport;
- portable Full Context Pack compatibility export;
- chat-first/onboarding and public Share fallback flows;
- GitHub storage pairing/sync UI when the Worker is configured;
- Product Board dogfooding compatibility surface;
- responsive desktop/mobile layouts covered by the repository browser suite.

## What is not implied by this demo

- A fixture/card appearing in the browser does not prove durable user save through the public ChatGPT integration.
- GitHub production sync is not considered activated until protected secrets and the real private-repository smoke test pass.
- Public ChatGPT App availability is a separate external release/acceptance gate.
- PR #33 Unified Card Dashboard / `My Dash` is not in current `develop` until merged.
- PR #34 Project-local Developer Memory is not in current `develop` until merged.

The current demo is an evolving compatibility/product surface, not the final storage architecture or final canonical terminology.
