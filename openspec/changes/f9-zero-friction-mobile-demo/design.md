## Context

The current `/demo/` page is a single dependency-light HTML/CSS/JavaScript dashboard. It already owns Result loading, browser Vault composition, Semantic Dash UI, semantic-gallery ordering/density, detail dialogs, and local Result creation. This change must improve first-run comprehension without forking those systems or changing durable storage/continuation contracts.

## UX Principle

Use progressive disclosure in this order:

1. **Value:** what DashGPT does.
2. **Evidence:** a populated semantic board.
3. **Mechanism:** a short deterministic conversation-to-card story.
4. **Agency:** save/review a user's own conversation.
5. **Persistence:** only after repeated demonstrated value.
6. **Architecture:** Settings/storage management only when requested.

The first screen must never require a user to interpret MCP, Vault, local storage, immutable verification, hashes, versions, or sync provider terminology.

## First Meaningful Render

The HTML shell contains the compact hero and demo-board placeholders so the value proposition is visible before async Result catalog loading finishes. Static demo Results are supplied synchronously by the UI module and merged for presentation with accessible real Results after initialization.

Demo entities carry an in-memory marker such as `_demo: true`. This field is UI-only and MUST NOT be persisted through `putResult`, included in immutable durable payloads, written into the Vault, or counted as user-created Results.

The initial visual board contains at least the themes:

- DashGPT
- Еда
- Поездки
- Дом
- Здоровье

and saved demonstration Dashes named:

- `Про DashGPT`
- `Что приготовить`
- `Поездки и планы`

The demo Dashes are rendered as a compact curated strip in the first-run surface. Existing Semantic Dash domain objects remain unchanged.

## Hero

Exact primary copy:

- Title: `Важное из разговоров с ИИ — всегда под рукой`
- Subtitle: `DashGPT превращает полезные итоги, решения и планы в карточки, которые легко найти и продолжить.`
- Primary action: `Показать за 20 секунд`
- Secondary action: `Сохранить разговор`

At 360 CSS px width, the hero remains compact enough that at least the beginning of the populated board is visible without a long scroll. Interactive targets have a minimum 44 px hit area.

## Deterministic Demo Story

The story is a modal/sheet that is optional and immediately closable. It uses no AI request and no keyboard input.

State machine:

`chat -> card -> details -> neighborhood -> complete`

Each state has a short deterministic transition. The user may advance with a single primary button; an automatic visual transition MAY occur inside a step, but the story never traps the user or blocks closing.

1. **Chat:** show a small ordinary AI exchange, using a food/planning example understandable without product context.
2. **Card:** animate/collapse that exchange into a Result-style card.
3. **Details:** expose summary, decisions, important facts/current state, and next step.
4. **Neighborhood:** show the card landing next to semantically related demo cards using the same semantic hue/group cues as the gallery.
5. **Complete:** show `Теперь это можно найти и продолжить в любой момент.` with `Открыть карточку` and `Попробовать со своим разговором`.

`showcase=1` opens the same populated interactive board and emphasizes the story CTA. Completing or closing the story leaves the user on the real board; it never writes demo content to the user's Vault.

## Main Card Presentation

First-screen cards show only:

- theme/category;
- title;
- short clamped summary;
- human-readable recency/relevance state;
- semantic color/region cue.

Favorite stars, tags, technical status, hash/version, raw schema labels, related-material counts, and multiple competing action buttons are hidden from the compact first-screen presentation. The whole card remains a one-tap open target.

The existing gallery selection/order engine remains the source of ordering for real Results. Demo Results are passed through the same semantic signature/hue logic when combined with the presentation list.

## Opened Card Presentation

The primary detail view is reorganized into:

- `Главное` — summary;
- `Что решили` — decisions;
- `Сейчас` — current/relevance state or captured important facts;
- `Дальше` — next action;
- `Открыть исходный чат` when a source URL exists;
- `Продолжить разговор` using the existing continuation URL.

Technical integrity and storage diagnostics remain available only outside this primary detail surface. This PR does not alter continuation text generation.

## Save Conversation and Review

The old `Add Result` dialog becomes a two-stage flow.

### Stage 1: import/capture input

The UI calls the action `Сохранить разговор`. Until a ChatGPT App exists, the existing manual/import-capable fields remain usable, but labels describe the outcome rather than internal Result terminology.

### Stage 2: review

Before any `putResult`/Vault write, show `Вот что DashGPT сохранит` and a review card. The user can edit title and summary, remove optional next-step/category/tag material, cancel, or explicitly confirm.

Only explicit confirmation creates the Result, records `created`, and renders it in the gallery. After creation, the existing semantic gallery ordering determines adjacency; no custom hard-coded destination slot is introduced.

## User-owned Count

Persistence onboarding is driven by confirmed local Result creation, not by the total materialized gallery size. The UI stores a small versioned presentation record in localStorage:

```text
{
  version: 1,
  confirmedUserResultIds: [...],
  persistencePrompt: {
    lastShownAtCount: 0,
    dismissedAtCount: 0
  }
}
```

On migration/first use, Results that were already in the Vault are not retroactively treated as newly confirmed by this demo flow. The counter is incremented only when the current UI confirms a save. This avoids prompting immediately because published/demo Results already exist.

Demo IDs are never added to `confirmedUserResultIds`.

## Value-triggered Persistence Prompt

Show a non-blocking bottom sheet when:

- confirmed user count first reaches 3; or
- after a dismissal, confirmed user count reaches `dismissedAtCount + 5`.

Copy:

- `Сохранить свою память?`
- `У тебя уже три полезные карточки. Можно сохранить их надолго и открывать на других устройствах.` for the first threshold; subsequent copy may say that more cards have accumulated without technical storage warnings.
- actions: `Сохранить мои карточки`, `Не сейчас`.

`Не сейчас` closes the sheet and writes only presentation-state suppression metadata.

`Сохранить мои карточки` MUST open only a persistence route that is genuinely functional in the current build. The current product has export/import and GitHub storage controls; the F9 first-run sheet routes to the existing storage management surface without advertising unsupported Google Drive behavior. Unsupported provider copy is hidden from the F9 value path.

## Mobile Layout

At 360 px and above:

- no horizontal overflow;
- top-level actions stack/wrap without shrinking below 44 px;
- cards use the existing responsive semantic-gallery grid but enforce a one-column minimum when needed;
- modal/sheet content respects safe-area insets and fits within `100dvh` with internal scrolling;
- detail close/back action stays visible and understandable;
- demo story requires no keyboard;
- no first-render dependency on AI/auth.

Safari/mobile-specific CSS avoids fixed viewport assumptions where possible and uses `dvh` with safe fallbacks.

## Showcase Mode

`new URLSearchParams(location.search).get("showcase") === "1"` activates showcase presentation state only:

- populated demo board is guaranteed visible;
- technical storage button/status is not surfaced in the first screen;
- hero highlights `Показать за 20 секунд`;
- closing/completing the story returns to the same interactive board;
- no demo object is written to Vault/local user-result tracking.

## Verification Design

Add a dependency-free verifier for F9 DOM/copy/state contracts and extend smoke/UI checks where useful. Verification covers:

- forbidden first-screen strings absent from `index.html`;
- exact hero/CTA/demo-Dash copy present;
- 360 px CSS contract and 44 px touch target contract;
- demo Result marker excluded from persistence and creation count;
- review confirmation required before `addResult` persistence path;
- threshold 3 and repeat +5 logic;
- showcase query handling;
- opened-card human labels and technical-field suppression;
- existing semantic gallery/Dash/Vault tests remain green.

`npm run verify:fast` runs syntax plus F9-focused and core UI verification. `npm run verify:full` runs the complete existing suite plus F9 verification. `npm run check` aliases `verify:full` for CI compatibility.

## Tooling Check

Serena and Graphify are optional repository exploration/editing aids per `AGENTS.md`; they are not runtime dependencies. For F9, the code surface is small and already localized to `demo/index.html`, `demo/app.js`, presentation CSS, Semantic Gallery/Dash modules, and verification scripts. The implementation SHALL document whether each tool was available/used and MUST NOT add either to product runtime dependencies merely to satisfy the workflow.

## Risks and Mitigations

- **Demo data leaking into user memory:** hard separation by `_demo` presentation objects and verifier assertions around `putResult`/user-count paths.
- **Forking Semantic Gallery behavior:** reuse `createCard`, semantic hue/signature, and current ordering pipeline; no second placement algorithm.
- **Persistence prompt overpromising sync:** route only to existing functional management and suppress future-provider marketing in the prompt.
- **Mobile hero pushing content below fold:** compact spacing, no summary/status block before gallery, 360px contract checks.
- **Scope collision with Structured Chat Continuation:** continuation generator remains untouched and is explicitly checked in diff review.
