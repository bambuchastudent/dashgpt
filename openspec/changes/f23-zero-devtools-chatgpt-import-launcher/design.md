# Design: Zero-DevTools ChatGPT Import Launcher

## Context

Feature 20 already provides authenticated same-origin ChatGPT reads, bounded projection, adaptive fetching, local `postMessage` bridge, durable batch ACKs, deterministic `conversationId` upserts, resume from current Vault state and one progress card.

The remaining problem is only how to execute that source runtime inside `https://chatgpt.com` without DevTools.

A DashGPT page cannot programmatically evaluate code in a cross-origin ChatGPT page. The launcher therefore keeps one explicit user gesture on the ChatGPT origin and reuses the same Feature 20 runtime behind platform-specific execution adapters.

## Acceptance finding that changes the design

The first F23 implementation used one long `javascript:` bookmark action everywhere. Real iPhone Safari acceptance showed a saved bookmark with the expected `javascript:` URL but the importer did not execute reliably. That path is therefore not considered supported on iPhone/iPad Safari.

Apple officially supports running custom JavaScript against the active Safari webpage through Shortcuts using `Run JavaScript on Web Page`, invoked from the Safari Share Sheet. F23 now uses that native mechanism for iPhone/iPad Safari while retaining bookmark actions on Android/desktop.

## Shared product concept, platform adapters

The user-facing concept remains **DashGPT Import**.

```text
DashGPT -> set up DashGPT Import once -> open chatgpt.com -> run DashGPT Import -> existing F20 import
```

Only the final same-origin execution adapter differs:

- iPhone/iPad Safari: Apple Shortcut using `Run JavaScript on Web Page`;
- Android Chrome: saved `javascript:` bookmark action;
- desktop Safari/Chromium: saved bookmark/favorite action where supported.

No adapter may implement its own history-fetching, projection, batching or Vault semantics.

## Shared source-runner reuse

`demo/chatgpt-history-source-runner.js` remains the single composition point around the final Feature 20 runner. Both adapters are generated from that same final runner after Feature 20 bridge-state/handshake hooks are applied.

Every adapter SHALL:

1. create fresh random `sessionId` and `nonce` at execution time;
2. target the DashGPT receiver origin/path from which the adapter was copied;
3. run only on `https://chatgpt.com` because the source runtime enforces that origin;
4. contain no ChatGPT credentials or conversation data;
5. preserve the existing `Connect DashGPT` fallback;
6. reuse receiver freshness for duplicate-safe resume.

## Android/desktop bookmark adapter

The existing bounded `javascript:` action remains the supported adapter for Android Chrome and desktop browsers where real-device acceptance confirms saved JavaScript actions work.

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

Apple requires the script to invoke `completion(...)`, and the Shortcut action has a short execution limit. The generated Safari script SHALL therefore bootstrap the existing Feature 20 runner and invoke `completion()` promptly after source setup is scheduled/mounted; it SHALL NOT hold the Shortcut open until thousands of conversations finish importing.

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

The import progress card remains the product entry point.

For `ready`, `paused`, `partial`, and source-unavailable states, the primary action opens a compact setup/resume dialog rather than telling the user to open a console.

### iPhone/iPad copy

The dialog SHALL explicitly identify `Safari Shortcut` as the launch adapter and SHALL NOT tell the user to edit a Safari bookmark URL.

### Android/desktop copy

The dialog continues to offer the generated bookmark action and platform-appropriate bookmark instructions.

All paths show the target DashGPT host so preview-vs-develop local-storage ownership is understandable.

## Resume semantics

Both adapters are stateless across runs.

Every run creates new transient session/nonce values. The receiver returns `known sourceId -> publishedAt` freshness from the current local Vault, so already-current conversations are skipped and stale/missing conversations continue without duplicates.

## Security

Preserved Feature 20 boundaries:

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

## Failure states

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

- both adapters reuse the final Feature 20 runner hooks;
- fixed session/nonce sentinels are replaced by runtime-generated IDs;
- receiver origin/path are normalized;
- bookmark action remains below size ceiling;
- Safari Shortcut payload is plain JavaScript, not `javascript:`;
- Safari payload invokes `completion()` promptly;
- credentials/session fixtures are absent from both adapters;
- existing Feature 20 duplicate-safe resume and scheduler contracts remain green.

### Browser tests

- ready import card opens zero-DevTools setup;
- iPhone-like Safari UA receives Shortcut instructions and copied plain-JS payload;
- Android-like UA receives bookmark instructions and copied `javascript:` payload;
- 360/390px setup UI has no horizontal overflow;
- existing receiver persistence/replay/update/pause behavior remains green.

### Real-device acceptance

Before merge verify:

1. iPhone Safari: create `DashGPT Import` Shortcut, run from authenticated ChatGPT Share Sheet, connect receiver, persist at least one card, close/re-run and confirm duplicate-free resume;
2. Android Chrome: save/run bookmark action with the same acceptance path;
3. desktop Safari/Chromium regression.

The failed iPhone bookmarklet attempt is recorded as evidence for the adapter switch, not as a user setup failure.
