# Proposal: Zero-DevTools ChatGPT Import Launcher

## Why

Feature 20 made large ChatGPT-history migration resumable, progressive, duplicate-safe and local-first, but the normal launch path still asks the user to paste a generated runner into a browser JavaScript console. That blocks ordinary mobile use.

The browser security boundary is real: DashGPT cannot inject arbitrary JavaScript from the DashGPT origin into `chatgpt.com`. The product therefore needs an explicit same-origin user gesture that can execute the existing Feature 20 source runner without DevTools.

Real-device acceptance on iPhone Safari showed that the initial long `javascript:` bookmark action is not a reliable supported Safari path: the action can be saved but does not execute the importer as required. The scope is therefore revised before further production changes.

A second real-user UX failure exposed a discoverability gap: Feature 20 seeds the operational import card only when the local Vault is newly created and empty. A user who already has cards can therefore open the DashGPT preview and see no import card at all, with only a small top-bar restore action as an escape hatch. That is not an understandable normal product flow.

## Product decision

Keep one product concept named **DashGPT Import**, backed by the same Feature 20 source/receiver protocol, but use platform-appropriate launch adapters:

```text
DashGPT
 -> visible Import ChatGPT history card
 -> set up DashGPT Import once
 -> open authenticated chatgpt.com in the browser
 -> run DashGPT Import
 -> receiver opens/handshakes
 -> Feature 20/F24 progressive import continues
```

The operational import card is the primary entry point. If a local Vault already contains normal/imported cards but has no import progress card, DashGPT SHALL create the import card unless the user explicitly dismissed it. The card remains visually promoted by the existing operational-card styling. An explicit remove/dismiss remains authoritative and prevents automatic resurrection.

### iPhone / iPad Safari

Use Apple's native Shortcuts action **Run JavaScript on Web Page** from the Safari Share Sheet. DashGPT copies a Safari-Shortcut-compatible source script and shows compact one-time setup instructions. The shortcut is named `DashGPT Import` and receives Safari webpages only.

The generated Safari script reuses the same final source runner, creates fresh transient session/nonce values per run, starts receiver connection from the explicit shortcut gesture, and calls the Shortcuts completion handler promptly so the Shortcut action itself does not wait for the full migration.

### Android Chrome

Keep the bounded `javascript:` bookmark action. The user saves `DashGPT Import` once, opens ChatGPT in Chrome, then runs the saved bookmark action.

### Desktop Safari/Chromium

Use the saved bookmark/favorite action where supported. The old Console runner remains diagnostic fallback only.

This is not a second importer architecture: only the execution adapter differs. Imported-card identity, receiver protocol, local Vault, privacy boundaries and resume semantics remain shared.

## What changes

- Make the operational `Import ChatGPT history` card discoverable in existing local Vaults when it has not been explicitly dismissed.
- Preserve explicit dismissal/removal as the only state that suppresses automatic card recreation.
- Replace normal DevTools/Console instructions with platform-appropriate `DashGPT Import` setup.
- Detect iPhone/iPad Safari and show `Copy Safari Shortcut script` + Apple Shortcuts setup instructions instead of bookmarklet instructions.
- Keep `Copy import action` for Android/desktop bookmark-action browsers.
- Add/retain `Open ChatGPT` as a separate explicit user action.
- Generate fresh launch IDs inside either adapter on every run.
- Reuse the final source runtime and receiver handshake; do not fork migration logic.
- Stack/integrate this launcher on Feature 24 / PR #49 so the usable flow consumes per-conversation deferred 429 retries rather than restoring Feature 20's old queue-wide 429 cooldown.
- Keep truthful unsupported/fallback states and diagnostic raw-runner copy only where useful.

## Impact Manifest

### Existing surfaces reused

- `demo/chatgpt-history-import.js` — import-card seeding/discoverability, platform detection, setup dialog and progress-card launch behavior.
- `demo/chatgpt-history-source-runner.js` — shared final runner plus bookmark-action and Safari-Shortcut adapters.
- `demo/chatgpt-history-source-runner-core.js` — supplied by Feature 24 when branches integrate; launcher must not weaken its scheduler semantics.
- `demo/chatgpt-history-import-batch.js` — existing durable batch receiver/ACK path, including F24 coarse source-state handling after integration.
- `demo/vault.js` — unchanged local Vault and deterministic card identity.
- `tests/chatgpt-history-import.spec.mjs` and `scripts/verify-chatgpt-history-import.mjs` — extended for discoverability/platform adapter contracts.

### Active overlap

- Issue #44 is the launcher product input for this change.
- Issue #42 / PR #49 owns per-conversation deferred 429 retries. F23 SHALL consume the final F24 runner when stacked/integrated and SHALL NOT reintroduce the old global 429 cooldown.
- Issue #45 owns generic detail-card action leakage and remains separate.
- PR #47 owns the Safari receiver-focus compatibility bug and remains separate.
- Performance profiling/reindex work remains separate.

### Privacy/security radius

Neither adapter may contain ChatGPT access tokens, cookies, account IDs, authorization headers, session payloads or conversation content. Fresh session/nonce values are generated on the ChatGPT page for every run and remain transient. Discoverability changes only the existing local operational card and do not add a new store or server-side state.

### Tooling

Graphify and Serena are not available through the current ChatGPT/GitHub connector environment. Focused repository/OpenSpec inspection is used instead.

## Non-goals

- Browser extension/plugin/userscript manager requirement.
- Cross-origin injection from DashGPT into ChatGPT.
- Reimplementing or independently tuning the Feature 24 scheduler.
- Changing batching, storage or imported-card identity.
- Automatically publishing/installing an iCloud Shortcut without a user gesture.
- Guaranteeing background execution after the ChatGPT source page is closed.
- Fixing unrelated import-card detail actions (#45).
