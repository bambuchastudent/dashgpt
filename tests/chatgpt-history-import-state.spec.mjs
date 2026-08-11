import { expect, test } from "@playwright/test";
import { buildChatGptHistorySourceRunner } from "../demo/chatgpt-history-source-runner.js";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const IMPORT_ID = "dashgpt-chatgpt-history-import";
const PROTOCOL = "dashgpt-chatgpt-history-import";
const SESSION = "state-test-session";
const NONCE = "state-test-nonce";

function envelope(type, extra = {}) {
  return {
    protocol: PROTOCOL,
    version: 1,
    sessionId: SESSION,
    nonce: NONCE,
    type,
    ...extra
  };
}

async function dispatchSourceMessage(page, data) {
  await page.evaluate(payload => {
    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://chatgpt.com",
      source: window,
      data: payload
    }));
  }, data);
}

async function progress(page) {
  return page.evaluate(({ key, id }) => {
    const vault = JSON.parse(localStorage.getItem(key));
    return vault.results.find(result => result.id === id)?.result || null;
  }, { key: VAULT_KEY, id: IMPORT_ID });
}

test("generated ChatGPT runner reports bounded shared rate-limit state to DashGPT", async () => {
  const runner = buildChatGptHistorySourceRunner({
    receiverOrigin: "https://dashgpt.example",
    receiverPath: "/demo/",
    sessionId: "runner-state-session",
    nonce: "runner-state-nonce"
  });

  expect(runner).toContain('type: "SOURCE_STATE"');
  expect(runner).toContain('state: "rate_limited"');
  expect(runner).toContain('retryAfterMs: Math.min(60_000');
  expect(runner).toContain('state: "running"');
  expect(runner).toContain("scheduler.throttled(delay)");
});

test("rate-limit source state updates the existing progress card and recovers to running", async ({ page }) => {
  await page.goto(`/demo/?personal=1&chatgptImportReceiver=1&session=${SESSION}&nonce=${NONCE}`);
  await dispatchSourceMessage(page, envelope("HELLO", { sourceVersion: 2 }));
  await dispatchSourceMessage(page, envelope("DISCOVERED", { total: 12, archived: 0 }));

  expect((await progress(page))?.state).toBe("running");

  await dispatchSourceMessage(page, envelope("SOURCE_STATE", {
    state: "rate_limited",
    retryAfterMs: 4200
  }));
  expect((await progress(page))?.state).toBe("rate_limited");
  const card = page.locator(`[data-result-id="${IMPORT_ID}"]`);
  await expect(card).toHaveAttribute("data-import-state", "rate_limited");
  await expect(card.locator(".card-status")).toContainText(/Waiting for ChatGPT|Жду ChatGPT/);

  await dispatchSourceMessage(page, envelope("SOURCE_STATE", { state: "running", retryAfterMs: 0 }));
  expect((await progress(page))?.state).toBe("running");
  await expect(card).toHaveAttribute("data-import-state", "running");
  await expect(card.locator(".card-status")).toContainText(/Importing|Импорт идёт/);
});

test("invalid or unbounded source-state messages cannot mutate progress", async ({ page }) => {
  await page.goto(`/demo/?personal=1&chatgptImportReceiver=1&session=${SESSION}&nonce=${NONCE}`);
  await dispatchSourceMessage(page, envelope("HELLO", { sourceVersion: 2 }));
  const before = await progress(page);

  await dispatchSourceMessage(page, envelope("SOURCE_STATE", { state: "paused", retryAfterMs: 10 }));
  await dispatchSourceMessage(page, envelope("SOURCE_STATE", { state: "rate_limited", retryAfterMs: 60001 }));

  const after = await progress(page);
  expect(after?.state).toBe(before?.state);
});

test("quota failure emits storage-full NACK and never makes the batch durable", async ({ page }) => {
  await page.goto(`/demo/?personal=1&chatgptImportReceiver=1&session=${SESSION}&nonce=${NONCE}`);
  await dispatchSourceMessage(page, envelope("HELLO", { sourceVersion: 2 }));

  await page.evaluate(key => {
    window.__dashgptStatePosts = [];
    window.postMessage = (message, targetOrigin) => {
      window.__dashgptStatePosts.push({ message, targetOrigin });
    };
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function patchedSetItem(name, value) {
      if (name === key && String(value).includes("chatgpt-conversation-quota-test")) {
        throw new DOMException("Synthetic quota", "QuotaExceededError");
      }
      return original.call(this, name, value);
    };
  }, VAULT_KEY);

  await dispatchSourceMessage(page, envelope("BATCH", {
    sequence: 77,
    cards: [{
      sourceId: "quota-test",
      title: "Quota test",
      summary: "This candidate must not become durable when the Vault write fails.",
      currentState: "Synthetic browser regression",
      tags: ["chatgpt"],
      facts: ["Synthetic"],
      updatedAt: "2026-08-11T12:00:00.000Z"
    }],
    progress: { discovered: 1, processed: 1, unresolved: 0 }
  }));

  const snapshot = await page.evaluate(key => ({
    vault: localStorage.getItem(key) || "",
    posts: window.__dashgptStatePosts || []
  }), VAULT_KEY);
  expect(snapshot.vault).not.toContain("chatgpt-conversation-quota-test");
  expect(snapshot.posts.some(item => item.message?.type === "NACK" && item.message?.sequence === 77 && item.message?.reason === "storage-full")).toBe(true);
  expect(snapshot.posts.some(item => item.message?.type === "ACK" && item.message?.sequence === 77)).toBe(false);
});
