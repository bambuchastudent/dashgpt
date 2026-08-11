# Design: Zero-DevTools ChatGPT Import Launcher

## Context

Feature 20 already has the hard parts of migration: authenticated same-origin ChatGPT reads, bounded projection, adaptive fetching, local `postMessage` bridge, durable batch ACKs, deterministic `conversationId` upserts, resume from current Vault state, and one progress card.

The remaining launcher problem is narrower: how to get the source runtime to execute inside `https://chatgpt.com` without asking a normal user to open DevTools.

A DashGPT page cannot programmatically evaluate code in a cross-origin ChatGPT page. The new design therefore keeps one explicit user gesture on the ChatGPT origin and makes that gesture reusable.

## Chosen mechanism: reusable browser action

The launcher exposes one generated `javascript:` bookmark action named **DashGPT Import**.

The action is generated from the same Feature 20 source runtime rather than maintaining a second importer implementation.

Properties:

- static with respect to the current DashGPT receiver origin/path;
- creates fresh random `sessionId` and `nonce` every time it is executed;
- only runs successfully when `location.origin === https://chatgpt.com` because the source runtime already enforces that boundary;
- contains no ChatGPT credentials or conversation content;
- opens/connects a DashGPT receiver using the current action's receiver origin;
- falls back to the existing `Connect DashGPT` source overlay if popup/receiver opening is blocked;
- can be reused for resume because receiver freshness comes from durable imported cards, not from action state.

## Why not a remote script loader

A tiny bookmarklet that downloads/evals a remote DashGPT script would be visually attractive but creates avoidable CSP/`eval`/external-script uncertainty on `chatgpt.com`. The first implementation therefore packages the existing bounded runtime directly in the saved browser action.

Verification SHALL impose a conservative maximum action length and fail if the generated action unexpectedly becomes huge. If real-device browser limits make the inline action impractical, the OpenSpec scope must be revised before switching to a remote-loader architecture.

## Source-runner reuse

`demo/chatgpt-history-source-runner.js` already post-processes the core runner to add Feature 20 receiver-state hooks and handshake recovery. The action generator SHALL reuse that final generated runner, not bypass it.

Implementation direction:

1. Build the normal final runner with unique sentinel strings for `sessionId` and `nonce`.
2. Replace the quoted sentinel values in the generated config with runtime variable references.
3. Wrap the runner in a `javascript:` IIFE that creates fresh random IDs.
4. Execute the final runner on the current ChatGPT page.

This keeps one source-runtime implementation and avoids copy/paste drift.

## Receiver connection

Normal action launch should attempt to connect to DashGPT without requiring a second technical step.

Directionally, the generated action/source runtime may enable an `autoOpenReceiver` launch option:

```text
user runs DashGPT Import on chatgpt.com
 -> source overlay mounts
 -> source opens receiver URL with transient session/nonce
 -> receiver stores transient launch config
 -> source handshakes through existing protocol
 -> import starts
```

If the popup/open is blocked, source state remains visible and the existing `Connect DashGPT` button is the fallback. No browser setting is silently weakened.

The receiver URL continues to use transient query parameters only long enough for DashGPT to place them in session storage and strip them from the visible URL.

## DashGPT launcher UX

The import progress card remains the product entry point.

For `ready`, `paused`, `partial`, and source-unavailable states, the primary action opens a compact setup/resume dialog rather than telling the user to open a console.

Dialog content:

- title: `Import ChatGPT history` / localized equivalent;
- short explanation: save `DashGPT Import` once, then run it on ChatGPT;
- `Copy import action` button;
- `Open ChatGPT` button;
- small browser-specific setup instructions;
- optional troubleshooting disclosure containing the old raw-runner copy only as diagnostic fallback if retained.

The dialog SHALL not claim the action has been installed automatically. Copying the action and saving/running it are separate explicit user gestures.

## Browser-specific instructions, one product concept

Capability detection may inspect user agent/platform only to choose instructions. The underlying action format and import protocol remain the same.

### iPhone/iPad Safari

Explain how to create/edit a Safari bookmark named `DashGPT Import`, replace its address with the copied action, open ChatGPT, then run that bookmark.

Do not call this a plugin or extension.

Apple's native Shortcuts `Run JavaScript on Web Page` is a possible future alternate adapter, but it is not required by this PR and must not create a parallel import model.

### Android Chrome

Explain how to save/edit a bookmark named `DashGPT Import`, open ChatGPT, type/select that bookmark from the address bar/bookmark suggestions, and run it.

### Desktop

Explain bookmarks/favorites/bookmarks-bar use. Do not lead with DevTools.

## Resume semantics

The browser action is intentionally stateless across runs.

Every run:

- creates a new transient session/nonce;
- opens/connects the same DashGPT origin;
- receiver returns `known sourceId -> publishedAt` freshness from the current local Vault;
- source skips already-current conversations;
- missing/stale conversations continue.

Therefore the same installed action supports both `Start import` and `Continue import` without storing a giant checkpoint in the action.

## Origin and Vault semantics

A generated action targets the DashGPT origin from which it was copied. This is necessary because browser local storage is origin-scoped.

The setup dialog SHALL show the target DashGPT host in compact form so preview testing is understandable. If a user moves from a branch preview to the canonical develop/production origin, the action must be regenerated/saved for that origin; cards do not magically migrate between browser origins.

## Action size bound

The deterministic verifier SHALL generate the action and assert:

- it begins with `javascript:`;
- it contains no credential-shaped fixture values;
- it contains the expected receiver origin/path;
- it creates fresh runtime session/nonce values rather than embedding one fixed pair;
- it remains below a conservative configured size ceiling (initial target: 64 KiB, tighten if real devices require it).

A failing size guard blocks merge rather than silently shipping an action that mobile browsers cannot store reliably.

## Security

Preserved Feature 20 boundaries:

- runtime refuses to run outside the supported ChatGPT origin;
- source requests remain same-origin;
- receiver messages still validate exact source origin, protocol/version, session/nonce and payload bounds;
- credentials remain transient inside ChatGPT;
- imported data still crosses only the local browser bridge;
- no private conversation is POSTed to a DashGPT server to make launch easier.

New action-specific boundaries:

- action copies only generated runtime code and receiver location;
- action setup text clearly says it should be run only on ChatGPT;
- no arbitrary user-supplied code is interpolated into the action;
- receiver origin is normalized and HTTPS outside local development.

## Failure states

### Action copied but not saved
DashGPT remains in a setup/waiting state and offers `Copy import action` again.

### Action run on the wrong page
The source runtime refuses to proceed and surfaces a safe error/alert; no DashGPT Vault mutation occurs.

### Receiver popup blocked
The ChatGPT overlay provides `Connect DashGPT` and explains that the browser blocked the receiver window.

### ChatGPT app opens instead of browser
The setup dialog instructs the user to keep the flow in the browser. No claim is made that the native ChatGPT app can execute the browser action.

### Browser does not support JavaScript bookmark actions
Show a clear unsupported/fallback product state and retain diagnostic desktop runner copy only where actually usable. Do not ask the user to disable browser security.

## Verification strategy

### Deterministic tests

- action generation reuses the final Feature 20 runner hooks;
- sentinel session/nonce values are replaced by runtime-generated IDs;
- receiver origin/path are normalized;
- action length is bounded;
- credentials/session fixtures are absent;
- resume action is stateless and uses durable receiver freshness.

### Browser tests

- ready import card opens action setup rather than DevTools instructions;
- copy action writes a `javascript:` payload;
- mobile-sized dialog has no horizontal overflow;
- iPhone-like and Android-like user agents receive understandable platform instructions but the same product action;
- opening ChatGPT remains a user gesture;
- simulated action runner/receiver handshake still adds progressive cards;
- existing Feature 20 pause/resume/idempotency tests remain green.

### Real-device acceptance

Before merge, verify the actual generated action on:

1. iPhone Safari;
2. Android Chrome;
3. desktop Safari or Chromium as regression.

For each device verify: save action, run from authenticated ChatGPT page, receiver connection, at least one durable card, pause/close/re-run resume, and no duplicate card for an already-current source.

Real-device acceptance is required because bookmark execution/popup behavior cannot be proven fully by Playwright alone.
