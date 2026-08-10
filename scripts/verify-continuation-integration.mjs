import assert from "node:assert/strict";
import {
  appendContinuationActivity,
  buildContinuationBrief,
  createChatGptAdapter,
  executePreparedContinuation,
  latestContinuedAt,
  prepareContinuation,
  prepareEditedContinuation
} from "../demo/continuation.js";
import {
  createVault,
  materializeResults,
  mergeVaults,
  portableVault,
  putResult
} from "../demo/vault.js";

function fakeWindow(options = {}) {
  const state = { navigated: null, closed: false, opener: "dashgpt" };
  return {
    state,
    get opener() { return state.opener; },
    set opener(value) { state.opener = value; },
    location: {
      assign(url) {
        if (options.navigationFails) throw new Error("navigation failed");
        state.navigated = url;
      }
    },
    close() { state.closed = true; }
  };
}

async function continueAndRecord(vault, result, options = {}) {
  const prepared = prepareContinuation(result, { adapter: options.adapter });
  const outcome = await executePreparedContinuation(prepared, options.dependencies);
  if (outcome.ok) appendContinuationActivity(vault, result.id, {
    eventId: options.eventId,
    createdAt: options.createdAt
  });
  return { prepared, outcome };
}

const vault = createVault({ vaultId: "vault_continuation", createdAt: "2026-08-10T00:00:00.000Z" });
putResult(vault, {
  id: "work",
  title: "Initial topic",
  summary: "Initial summary",
  goal: "Initial goal",
  currentState: "Initial state",
  decisions: ["Initial decision"],
  facts: ["Initial fact"],
  constraints: ["Initial constraint"],
  userPreferences: ["Answer concisely"],
  openQuestions: ["Initial question"],
  relatedMaterials: [{ title: "Reference", url: "https://example.com/reference" }],
  suggestedNextStep: "Initial next step",
  language: "en",
  immutable: false,
  contentVersion: 1
}, { updatedAt: "2026-08-10T00:00:01.000Z" });

let current = materializeResults(vault).find(item => item.id === "work");
const firstMarkdown = buildContinuationBrief(current).markdown;
assert.match(firstMarkdown, /Initial decision/);
assert.match(firstMarkdown, /Initial constraint/);
assert.match(firstMarkdown, /Initial question/);
assert.match(firstMarkdown, /\[Reference\]\(https:\/\/example\.com\/reference\)/);

putResult(vault, {
  ...current,
  summary: "Updated summary",
  currentState: "Updated state",
  decisions: ["Updated decision"],
  constraints: ["Updated constraint"],
  openQuestions: ["Updated question"],
  suggestedNextStep: "Updated next step"
}, { updatedAt: "2026-08-10T01:00:00.000Z" });
current = materializeResults(vault).find(item => item.id === "work");
const secondMarkdown = buildContinuationBrief(current).markdown;
assert.match(secondMarkdown, /Updated summary/);
assert.match(secondMarkdown, /Updated state/);
assert.doesNotMatch(secondMarkdown, /Initial decision|Initial constraint|Initial question/);
assert.equal(secondMarkdown, buildContinuationBrief(current).markdown, "unchanged current Result must render deterministically");

const directWindow = fakeWindow();
const direct = await continueAndRecord(vault, current, {
  adapter: createChatGptAdapter({ maxSafeUrlBytes: 100_000 }),
  dependencies: {
    openWindow: () => directWindow,
    writeClipboard: async () => { throw new Error("not needed"); },
    legacyCopy: () => false
  },
  eventId: "evt_direct",
  createdAt: "2026-08-10T02:00:00.000Z"
});
assert.equal(direct.outcome.ok, true);
assert.equal(direct.outcome.method, "deeplink");
assert.equal(directWindow.state.opener, null);
assert.equal(new URL(directWindow.state.navigated).searchParams.get("q"), direct.prepared.payloadMarkdown);
assert.equal(latestContinuedAt(vault, "work"), "2026-08-10T02:00:00.000Z");

let blockedClipboard = "";
const eventCountBeforeBlocked = vault.events.length;
const blocked = await continueAndRecord(vault, current, {
  adapter: createChatGptAdapter({ maxSafeUrlBytes: 100_000 }),
  dependencies: {
    openWindow: () => null,
    writeClipboard: async text => { blockedClipboard = text; },
    legacyCopy: () => false
  },
  eventId: "evt_blocked",
  createdAt: "2026-08-10T03:00:00.000Z"
});
assert.equal(blocked.outcome.ok, false);
assert.equal(blocked.outcome.reason, "popup-blocked");
assert.equal(blocked.outcome.copied, true);
assert.equal(blockedClipboard, blocked.prepared.fullMarkdown);
assert.equal(vault.events.length, eventCountBeforeBlocked, "popup-blocked action must not record success");

const clipboardWindow = fakeWindow();
let copiedText = "";
const clipboard = await continueAndRecord(vault, current, {
  adapter: createChatGptAdapter({ maxSafeUrlBytes: 64 }),
  dependencies: {
    openWindow: () => clipboardWindow,
    writeClipboard: async text => { copiedText = text; },
    legacyCopy: () => false
  },
  eventId: "evt_clipboard",
  createdAt: "2026-08-10T04:00:00.000Z"
});
assert.equal(clipboard.prepared.mode, "clipboard");
assert.equal(clipboard.outcome.ok, true);
assert.equal(clipboard.outcome.method, "clipboard");
assert.equal(copiedText, clipboard.prepared.fullMarkdown);
assert.equal(clipboardWindow.state.navigated, "https://chatgpt.com/");
assert.equal(latestContinuedAt(vault, "work"), "2026-08-10T04:00:00.000Z");

const deniedWindow = fakeWindow();
const eventCountBeforeDenied = vault.events.length;
const denied = await continueAndRecord(vault, current, {
  adapter: createChatGptAdapter({ maxSafeUrlBytes: 64 }),
  dependencies: {
    openWindow: () => deniedWindow,
    writeClipboard: async () => { throw new Error("permission denied"); },
    legacyCopy: () => false
  },
  eventId: "evt_denied",
  createdAt: "2026-08-10T05:00:00.000Z"
});
assert.equal(denied.outcome.ok, false);
assert.equal(denied.outcome.reason, "clipboard-failed");
assert.equal(deniedWindow.state.closed, true);
assert.equal(vault.events.length, eventCountBeforeDenied);

const navigationWindow = fakeWindow({ navigationFails: true });
const navigationFailure = await executePreparedContinuation(prepareContinuation(current), {
  openWindow: () => navigationWindow,
  writeClipboard: async () => {},
  legacyCopy: () => false
});
assert.equal(navigationFailure.ok, false);
assert.equal(navigationFailure.reason, "navigation-failed");

const resultBeforeEdit = JSON.stringify(current);
const editedText = `${secondMarkdown}\nExplicit preview edit.`;
const edited = prepareEditedContinuation(editedText, { adapter: createChatGptAdapter({ maxSafeUrlBytes: 64 }) });
assert.equal(edited.mode, "clipboard");
assert.equal(edited.payloadMarkdown, editedText);
assert.equal(JSON.stringify(current), resultBeforeEdit, "preview text preparation must not mutate the Result");

const portable = portableVault(vault);
const continuationEvents = portable.events.filter(event => event.type === "result.activity" && event.value === "continue.new-chat");
assert.equal(continuationEvents.length, 2);
for (const event of continuationEvents) {
  assert.deepEqual(Object.keys(event).sort(), ["createdAt", "eventId", "resultId", "schemaVersion", "type", "value"]);
}
assert.equal(JSON.stringify(continuationEvents).includes("Updated summary"), false);
assert.equal(JSON.stringify(continuationEvents).includes("chatgpt.com/?q="), false);

const remote = createVault({ vaultId: vault.vaultId, createdAt: vault.createdAt });
remote.events.push(continuationEvents[0]);
const merged = mergeVaults(remote, vault, { updatedAt: "2026-08-10T06:00:00.000Z" });
assert.equal(merged.events.filter(event => event.type === "result.activity").length, 2, "activity events must merge append-only by identity");

await continueAndRecord(vault, current, {
  adapter: createChatGptAdapter({ maxSafeUrlBytes: 100_000 }),
  dependencies: { openWindow: () => fakeWindow(), writeClipboard: async () => {}, legacyCopy: () => false },
  eventId: "evt_repeat",
  createdAt: "2026-08-10T07:00:00.000Z"
});
assert.equal(latestContinuedAt(vault, "work"), "2026-08-10T07:00:00.000Z");

console.log("Structured continuation freshness, Vault, popup, clipboard and activity integration tests passed.");
