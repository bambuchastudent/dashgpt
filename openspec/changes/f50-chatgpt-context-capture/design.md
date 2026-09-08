# Design — F50 ChatGPT context capture recovery

## Context and ownership

`demo/public-onboarding.js` already owns the personal **Save chat** interaction. It contains:

- the Share-link form introduced by F36;
- `DASHGPT_CAPTURE_COMMAND` for asking the original ChatGPT conversation to distill itself;
- structured JSON parsing/validation;
- the review fields;
- local-first Card/legacy-Result persistence;
- duplicate-free update by canonical Share source URL;
- optional Google Drive/GitHub controls owned by the existing storage flow.

F14 already defined current-chat structured handoff as the dependable no-network capture model. F36 later made Share-link capture the primary convenience path while retaining that handoff below it. F50 does not create a third capture model; it reconnects an exhausted Share attempt to the existing current-chat path.

## Trigger

Recovery activates only after a valid supported Share URL reaches `/api/shared-chat` and the endpoint returns an error payload with:

`code === "SHARED_CHAT_UNREADABLE"`.

Invalid URLs, private `/c/...` URLs, malformed client input and unrelated network/runtime failures keep their existing product errors. This prevents F50 from misclassifying every failure as upstream anti-bot blocking.

## Mobile recovery interaction

On exact unreadable Share:

1. keep the Save-chat dialog open;
2. replace the generic dead-end wording with concise human copy explaining that ChatGPT did not allow DashGPT to read the link automatically;
3. automatically open the existing structured-handoff `<details>` section;
4. change its visible framing from an obscure fallback to the next recovery action, conceptually **Save from the original chat**;
5. scroll that recovery into view on the existing narrow/mobile dialog;
6. expose the existing **Copy DashGPT command** action without requiring the user to discover another settings surface;
7. after the user sends the command in the original conversation and pastes the returned JSON, reuse the existing parser, review and save controls unchanged.

No automatic navigation back into ChatGPT is required for the first slice because mobile/browser clients differ and a forced deep-link can be less reliable than a clear copy action.

## Provenance carry-over

A successful Share resolution already saves:

`source: { type: "chatgpt-share", url: canonicalShareUrl, title }`.

The structured fallback normally uses `chatgpt-handoff` because no source URL is known. F50 records one transient in-memory `recoveryShareUrl` only after exact unreadable failure for a valid canonical Share.

When a structured response is then successfully parsed in that same Save-chat dialog, the prepared Card inherits:

`source: { type: "chatgpt-share", url: recoveryShareUrl, title }`.

This means:

- the useful content came from ChatGPT's current conversation context, not a server scrape;
- the Card still links back to the public source the user supplied;
- repeated capture of the same Share reuses the existing Card id through the current source-url upsert rule;
- no transcript, cookie or account state is attached to provenance.

If the user opens a fresh handoff without a failed Share, provenance remains the existing `chatgpt-handoff` behavior.

## Data and security boundaries

F50 adds no persisted schema and no server endpoint.

The browser stores only the structured fields the user explicitly pastes and the already user-supplied canonical Share URL. It never reads or stores ChatGPT cookies, authorization headers, session tokens, passwords, account ids or project credentials.

The failed Share diagnostic evidence remains support/debug information and is not copied into Cards. F50 does not expose raw 403/429/provider/parser details in normal user copy.

## Relationship to MCP / ChatGPT App

`src/index.js` already exposes `prepare_result_import`, which is the future lower-friction version of the same product intent: the AI client has the current conversation context, distills it and returns an explicit DashGPT import URL.

The repository submission packet still describes portal submission/publishing steps, and directory discovery does not currently surface DashGPT. Therefore F50 must not render copy claiming the plugin is installed or published. The structured handoff remains the portable working recovery until an integration is actually available.

Publishing/installing the plugin and authenticated direct private-Vault writes are separate capabilities/PRs.

## Compatibility

- successful F36 Share-link capture remains unchanged;
- F27 local-first storage and provider controls remain unchanged;
- F26 Safari delegated Google click ordering remains untouched;
- no bulk-history/import behavior changes;
- no Card detail/F39 or project-memory/F37 changes;
- no server resolver retry/provider additions;
- the personal Save-chat dialog remains usable at 360–390px with no horizontal overflow.

## Verification

Add deterministic/browser coverage for:

- exact `SHARED_CHAT_UNREADABLE` automatically opens recovery;
- user-facing recovery copy does not expose HTTP/provider/parser internals;
- a successful structured paste after failed Share reaches normal review;
- saving that review preserves canonical Share provenance;
- repeating the same failed-Share + structured capture updates rather than duplicates;
- structured handoff opened without a Share keeps `chatgpt-handoff` provenance;
- invalid/private/unrelated failures do not incorrectly enter this recovery;
- existing successful Share flow remains unchanged;
- narrow-mobile dialog scroll/action layout remains usable;
- final canonical `npm run verify:full` passes before merge readiness.
