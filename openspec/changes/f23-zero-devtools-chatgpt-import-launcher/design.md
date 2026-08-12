# Design: Zero-DevTools ChatGPT Import Launcher

## Context

Feature 20 already provides authenticated same-origin ChatGPT reads, bounded projection, local `postMessage` bridge, durable batch ACKs, deterministic `conversationId` upserts, resume from current Vault state and one progress card. Feature 24 / PR #49 evolves the detail scheduler so individual HTTP 429s defer only the affected conversation.

The launcher problem is how to execute that source runtime inside `https://chatgpt.com` without DevTools and make the entry point obvious enough that an ordinary user can actually find and use it.

A DashGPT page cannot programmatically evaluate code in a cross-origin ChatGPT page. The launcher therefore keeps one explicit user gesture on the ChatGPT origin and reuses the same final source runtime behind platform-specific execution adapters.

## Acceptance findings that change the design

### iPhone bookmark action

The first F23 implementation used one long `javascript:` bookmark action everywhere. Real iPhone Safari acceptance showed a saved bookmark with the expected `javascript:` URL but the importer did not execute reliably. That path is therefore not considered supported on iPhone/iPad Safari.

Apple supports running custom JavaScript against the active Safari webpage through Shortcuts using `Run JavaScript on Web Page`, invoked from the Safari Share Sheet. F23 uses that mechanism for iPhone/iPad Safari while retaining bookmark actions on Android/desktop.

### Existing Vault discoverability

Real use of the preview exposed a second failure: Feature 20 seeds the operational import card only when `loadBrowserVault()` reports a newly-created empty Vault. A returning user with existing cards therefore sees no import card. A small top-bar `Import ChatGPT` restore button technically exists, but it is not an acceptable normal entry point because the user must already know the feature exists.

The operational card is now the product entry point for both new and existing Vaults unless it was explicitly dismissed.

## Operational card lifecycle

At pre-app initialization:

```text
load local Vault
 -> import progress card exists? keep it
 -> latest explicit dismissal = true? keep it hidden
 -> otherwise seed/restore one import progress card
      imported = current number of canonical ChatGPT conversation cards
      state = ready unless existing progress exists
```

This deliberately does **not** require `vault.results.length === 0` and does not require `loaded.created === true`.

The existing `.chatgpt-import-card { order: -1000; ... }` treatment remains responsible for visual promotion once the gallery renders the card. We do not overload user favorites with system state.

An explicit Remove action writes the existing dismissal event and removes the operational card. That latest dismissal remains authoritative across reloads. The small top-bar restore action remains only for the explicitly-dismissed state; invoking it clears dismissal and recreates the same operational card.

No imported conversation cards are removed or rewritten by operational-card restoration.

## Shared product concept, platform adapters

The user-facing concept remains **DashGPT Import**.

```text
DashGPT -> visible import card -> set up DashGPT Import once -> open chatgpt.com -> run DashGPT Import -> existing importer
```

Only the final same-origin execution adapter differs:

- iPhone/iPad Safari: Apple Shortcut using `Run JavaScript on Web Page`;
- Android Chrome: saved `javascript:` bookmark action;
- desktop Safari/Chromium: saved bookmark/favorite action where supported.

No adapter may implement its own history-fetching, projection, batching, retry scheduler or Vault semantics.

## Shared source-runner reuse

`demo/chatgpt-history-source-runner.js` remains the composition point around the final source runner. Both adapters are generated from that same runner after bridge/handshake hooks are applied.

Every adapter SHALL:

1. create fresh random `sessionId` and `nonce` at execution time;
2. target the DashGPT receiver origin/path from which the adapter was copied;
3. run only on `https://chatgpt.com` because the source runtime enforces that origin;
4. contain no ChatGPT credentials or conversation data;
5. preserve the existing `Connect DashGPT` fallback;
6. reuse receiver freshness for duplicate-safe resume.

## Feature 24 integration

PR #48 is stacked/integrated on the final F24 source-runner lineage rather than retaining a fork of the older Feature 20 runner.

The integration invariant is:

```text
launcher adapter
  -> final F24 generated source runner
  -> per-conversation 429 deferred queue
  -> existing bounded receiver/batch/Vault path
```

F23 may wrap the runner for launch identity, origin targeting and Safari `completion()`, but it SHALL NOT inject or restore queue-wide 429 throttling. Generated-adapter verification must therefore continue to find F24's separate ready/deferred task state and task-local 429 path after stacking.

## Android/desktop bookmark adapter

The bounded `javascript:` action remains the supported adapter for Android Chrome and desktop browsers where real-device acceptance confirms saved JavaScript actions work.

The action directly embeds the final bounded source runtime rather than remotely downloading/evaluating code. Verification keeps the current conservative action size ceiling.

## iPhone/iPad Safari Shortcut adapter

DashGPT detects iPhone/iPad Safari and does not instruct the user to create a JavaScript bookmark.

Instead the setup dialog provides:

- `Copy Safari Shortcut script`;
- `Open ChatGPT`;
- compact one-time instructions to create a Shortcut named `DashGPT Import`;
- instruction to add Apple's `Run JavaScript on Web Page` action;
- instruction to enable `Show in Share Sheet` and accept only Safari webpages;
- instruction to run the shortcut from the Share Sheet while authenticated on `chatgpt.com`.

The copied script is normal JavaScript for the Shortcuts action, not a `javascript:` URL.

### Shortcut completion behavior

The generated Safari script bootstraps the final source runner and invokes `completion()` promptly after source setup is scheduled/mounted; it does not hold the Shortcut open until thousands of conversations finish importing.

This remains subject to real-device acceptance because Playwright cannot prove Safari Shortcuts lifecycle behavior.

## Receiver connection

Both adapters create receiver connection from the explicit user gesture where the browser permits it:

```text
user runs DashGPT Import on chatgpt.com
 -> source overlay mounts
 -> receiver URL opens with transient session/nonce
 -> receiver stores transient launch config
 -> source handshakes through existing protocol
 -> import starts
```

If popup/open is blocked, the source overlay keeps the existing human `Connect DashGPT` retry action. No browser setting is silently weakened.

## DashGPT launcher UX

The import progress card is the product entry point.

For `ready`, `paused`, `partial`, and source-unavailable states, the primary action opens a compact setup/resume dialog rather than telling the user to open a console.

### iPhone/iPad copy

The dialog explicitly identifies `Safari Shortcut` as the launch adapter and does not tell the user to edit a Safari bookmark URL.

### Android/desktop copy

The dialog offers the generated bookmark action and platform-appropriate bookmark instructions.

All paths show the target DashGPT host so preview-vs-develop local-storage ownership is understandable.

## Resume semantics

Both adapters are stateless across runs.

Every run creates new transient session/nonce values. The receiver returns `known sourceId -> publishedAt` freshness from the current local Vault, so already-current conversations are skipped and stale/missing conversations continue without duplicates.

The operational card's automatically-restored `imported` count is derived from those canonical cards; it is not a second checkpoint.

## Security

Preserved boundaries:

- runtime refuses to run outside the supported ChatGPT origin;
- source requests remain same-origin;
- receiver validates exact source origin, protocol/version, session/nonce and payload bounds;
- credentials remain transient inside ChatGPT;
- imported data crosses only the local browser bridge;
- no private conversation is POSTed to a DashGPT server to simplify launch.

Adapter-specific boundaries:

- generated payloads contain only runtime logic plus configured receiver location;
- no arbitrary user-supplied code is interpolated;
- receiver origin is HTTPS outside local development;
- Safari Shortcut script calls only the documented `completion` handler in addition to the shared source runtime.

Discoverability adds no new provider state: it only materializes the existing local operational card when not explicitly dismissed.

## Failure states

### Import card missing in a populated Vault
Treat this as a product bug, not a hidden-feature state. If no explicit dismissal exists, pre-app initialization recreates the operational card before the main gallery makes its empty/non-empty decisions.

### Safari bookmark action saved but does not execute
Treat this as unsupported iPhone Safari behavior and direct the user to the Safari Shortcut adapter; do not ask them to keep retrying or disable security.

### Safari Shortcut not configured yet
DashGPT remains in setup/waiting state and offers the script copy and concise setup instructions again.

### `Allow Running Scripts` is disabled in Shortcuts
Show a human setup note pointing to the Apple Shortcuts setting; do not claim import is running.

### Action run on the wrong page
The source runtime refuses to perform ChatGPT history requests and no Vault mutation occurs.

### Receiver popup blocked
The source overlay exposes `Connect DashGPT` and explains that the browser blocked the receiver window.

### ChatGPT app opens instead of browser
The setup dialog instructs the user to keep the flow in Safari/Chrome browser. The native ChatGPT app is not claimed as supported execution context.

## Verification strategy

### Deterministic tests

- existing populated Vault without dismissal receives exactly one operational import card;
- explicit dismissal prevents automatic recreation;
- restore clears dismissal without duplicating imported conversation cards;
- both adapters reuse the final F24 runner hooks;
- final generated runner retains per-conversation 429 deferred scheduling and no old global 429 throttle hook;
- fixed session/nonce sentinels are replaced by runtime-generated IDs;
- receiver origin/path are normalized;
- bookmark action remains below size ceiling;
- Safari Shortcut payload is plain JavaScript, not `javascript:`;
- Safari payload invokes `completion()` promptly;
- credentials/session fixtures are absent from both adapters;
- duplicate-safe resume remains green.

### Browser tests

- populated existing Vault renders the promoted import card without requiring the top-bar restore action;
- explicitly dismissed card stays hidden and exposes restore;
- ready import card opens zero-DevTools setup;
- iPhone-like Safari UA receives Shortcut instructions and copied plain-JS payload;
- Android-like UA receives bookmark instructions and copied `javascript:` payload;
- 360/390px setup UI has no horizontal overflow;
- receiver persistence/replay/update/pause behavior remains green.

### Real-device acceptance

Before merge verify:

1. existing-device Vault with prior cards: preview immediately shows the import card;
2. iPhone Safari: create `DashGPT Import` Shortcut, run from authenticated ChatGPT Share Sheet, connect receiver, persist at least one card, close/re-run and confirm duplicate-free resume;
3. Android Chrome: save/run bookmark action with the same acceptance path;
4. desktop Safari/Chromium regression;
5. on an integrated F24 run, observe one detail 429 and continued progress on unrelated conversations.

The failed iPhone bookmarklet attempt and missing-card report are recorded as acceptance evidence, not as user setup failures.
