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

test("generated ChatGPT runner separates conversation 429 deferral from service-wide cooldown", async () => {
  const runner = buildChatGptHistorySourceRunner({
    receiverOrigin: "https://dashgpt.example",
    receiverPath: "/demo/",
    sessionId: "runner-state-session",
    nonce: "runner-state-nonce"
  });

  expect(runner).toContain('type: "SOURCE_STATE"');
  expect(runner).toContain('publishReceiverState("rate_limited"');
  expect(runner).toContain('publishReceiverState("running"');
  expect(runner).toContain("scheduler.rateLimited(delay)");
  expect(runner).toContain("scheduler.serviceThrottled(delay)");
  expect(runner).toContain("ChatGptDetailDeferredError");
  expect(runner).toContain("nextRetryAt");
  expect(runner).not.toContain("scheduler.throttled");
});

test("mixed deferred work stays running, all-deferred state waits, then recovers", async ({ page }) => {
  await page.goto(`/demo/?personal=1&chatgptImportReceiver=1&session=${SESSION}&nonce=${NONCE}`);
  await dispatchSourceMessage(page, envelope("HELLO", { sourceVersion: 3 }));
  await dispatchSourceMessage(page, envelope("DISCOVERED", { total: 12, archived: 0 }));

  expect((await progress(page))?.state).toBe("running");

  await dispatchSourceMessage(page, envelope("SOURCE_STATE", {
    state: "running",
    retryAfterMs: 0,
    deferred: 4
  }));
  expect((await progress(page))?.state).toBe("running");
  expect((await progress(page))?.deferred).toBe(4);
  const card = page.locator(`[data-result-id="${IMPORT_ID}"]`);
  await expect(card).toHaveAttribute("data-import-state", "running");
  await expect(card.locator(".summary")).toContainText(/4 waiting to retry|4 ждут повтора/);

  await dispatchSourceMessage(page, envelope("SOURCE_STATE", {
    state: "rate_limited",
    retryAfterMs: 4200,
    deferred: 4
  }));
  expect((await progress(page))?.state).toBe("rate_limited");
  expect((await progress(page))?.deferred).toBe(4);
  await expect(card).toHaveAttribute("data-import-state", "rate_limited");
  await expect(card.locator(".card-status")).toContainText(/Waiting for ChatGPT|Жду ChatGPT/);

  await dispatchSourceMessage(page, envelope("SOURCE_STATE", { state: "running", retryAfterMs: 0, deferred: 2 }));
  expect((await progress(page))?.state).toBe("running");
  expect((await progress(page))?.deferred).toBe(2);
  await expect(card).toHaveAttribute("data-import-state", "running");
  await expect(card.locator(".card-status")).toContainText(/Importing|Импорт идёт/);
});

test("invalid source-state messages cannot mutate progress", async ({ page }) => {
  await page.goto(`/demo/?personal=1&chatgptImportReceiver=1&session=${SESSION}&nonce=${NONCE}`);
  await dispatchSourceMessage(page, envelope("HELLO", { sourceVersion: 3 }));
  const before = await progress(page);

  await dispatchSourceMessage(page, envelope("SOURCE_STATE", { state: "paused", retryAfterMs: 10, deferred: 1 }));
  await dispatchSourceMessage(page, envelope("SOURCE_STATE", { state: "rate_limited", retryAfterMs: -1, deferred: 1 }));
  await dispatchSourceMessage(page, envelope("SOURCE_STATE", { state: "rate_limited", retryAfterMs: 10, deferred: 100001 }));

  const after = await progress(page);
  expect(after?.state).toBe(before?.state);
  expect(after?.deferred || 0).toBe(before?.deferred || 0);
});

test("one conversation 429 does not block later ready conversation details", async ({ page }) => {
  const runtimeSession = "runtime-deferred-session";
  const runtimeNonce = "runtime-deferred-nonce";
  const runner = buildChatGptHistorySourceRunner({
    receiverOrigin: "https://dashgpt.example",
    receiverPath: "/demo/",
    sessionId: runtimeSession,
    nonce: runtimeNonce
  });

  await page.route("https://chatgpt.com/**", route => route.fulfill({
    status: 200,
    contentType: "text/html",
    body: "<!doctype html><html><body><main>Mock ChatGPT</main></body></html>"
  }));
  await page.goto("https://chatgpt.com/");

  await page.evaluate(({ runnerSource, protocol, sessionId, nonce }) => {
    const activeItems = ["conversation-a", "conversation-b", "conversation-c"].map((id, index) => ({
      id,
      title: `Conversation ${index + 1}`,
      update_time: `2026-08-12T10:0${index}:00.000Z`
    }));
    window.__dashgptDetailEvents = [];
    window.__dashgptReceiverMessages = [];
    window.__dashgptDetailAttempts = {};

    Object.defineProperty(window, "opener", { configurable: true, value: window });
    Object.defineProperty(window, "postMessage", {
      configurable: true,
      value(message) {
        window.__dashgptReceiverMessages.push({ ...message, at: performance.now() });
        const base = {
          protocol,
          version: 1,
          sessionId,
          nonce
        };
        const reply = payload => setTimeout(() => {
          window.dispatchEvent(new MessageEvent("message", {
            origin: "https://dashgpt.example",
            source: window,
            data: { ...base, ...payload }
          }));
        }, 0);
        if (message?.type === "HELLO") reply({ type: "READY", usageAware: true, semanticEnrichmentVersion: 1, known: [] });
        if (message?.type === "BATCH") reply({
          type: "ACK",
          sequence: message.sequence,
          accepted: message.cards?.length || 0,
          updated: 0
        });
        if (message?.type === "COMPLETE") reply({ type: "COMPLETE_ACK" });
      }
    });

    const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", ...headers }
    });

    window.fetch = async input => {
      const url = new URL(typeof input === "string" ? input : input.url, location.href);
      if (url.pathname === "/api/auth/session") return json({});
      if (url.pathname === "/backend-api/conversations") {
        if (url.searchParams.get("is_archived") === "true") return json({ items: [], total: 0 });
        return json({ items: activeItems, total: activeItems.length });
      }
      if (url.pathname.startsWith("/backend-api/conversation/")) {
        const id = decodeURIComponent(url.pathname.split("/").pop());
        const attempt = (window.__dashgptDetailAttempts[id] || 0) + 1;
        window.__dashgptDetailAttempts[id] = attempt;
        const at = performance.now();
        if (id === "conversation-a" && attempt === 1) {
          window.__dashgptDetailEvents.push({ id, attempt, status: 429, at });
          return json({ error: "rate-limited" }, 429, { "Retry-After": "1" });
        }
        window.__dashgptDetailEvents.push({ id, attempt, status: 200, at });
        return json({
          id,
          title: id,
          update_time: "2026-08-12T10:30:00.000Z",
          current_node: "m1",
          mapping: {
            m1: {
              parent: null,
              children: [],
              message: {
                author: { role: "assistant" },
                content: { parts: [`Useful result for ${id} with enough detail to persist as a card.`] },
                status: "finished_successfully",
                metadata: {},
                create_time: "2026-08-12T10:30:00.000Z"
              }
            }
          }
        });
      }
      throw new Error(`Unexpected mock fetch ${url.href}`);
    };

    // eslint-disable-next-line no-eval
    eval(runnerSource);
  }, { runnerSource: runner, protocol: PROTOCOL, sessionId: runtimeSession, nonce: runtimeNonce });

  await page.waitForFunction(() =>
    Array.isArray(window.__dashgptDetailEvents)
    && window.__dashgptDetailEvents.filter(event => event.status === 200).length === 3,
  null, { timeout: 10_000 });

  const snapshot = await page.evaluate(() => ({
    events: window.__dashgptDetailEvents,
    messages: window.__dashgptReceiverMessages
  }));
  const firstA = snapshot.events.find(event => event.id === "conversation-a" && event.attempt === 1);
  const secondA = snapshot.events.find(event => event.id === "conversation-a" && event.attempt === 2);
  const successB = snapshot.events.find(event => event.id === "conversation-b" && event.status === 200);
  const successC = snapshot.events.find(event => event.id === "conversation-c" && event.status === 200);

  expect(firstA?.status).toBe(429);
  expect(successB?.at).toBeLessThan(secondA?.at);
  expect(successC?.at).toBeLessThan(secondA?.at);
  expect(secondA.at - firstA.at).toBeGreaterThanOrEqual(950);
  expect(snapshot.messages.some(message => message.type === "SOURCE_STATE" && message.state === "rate_limited")).toBe(true);
  expect(snapshot.messages.filter(message => message.type === "SOURCE_STATE" && message.state === "running").length).toBeGreaterThanOrEqual(2);
});

test("quota failure emits storage-full NACK and never makes the batch durable", async ({ page }) => {
  await page.goto(`/demo/?personal=1&chatgptImportReceiver=1&session=${SESSION}&nonce=${NONCE}`);
  await dispatchSourceMessage(page, envelope("HELLO", { sourceVersion: 3 }));

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
    progress: { discovered: 1, processed: 1, unresolved: 0, deferred: 0 }
  }));

  const snapshot = await page.evaluate(key => ({
    vault: localStorage.getItem(key) || "",
    posts: window.__dashgptStatePosts || []
  }), VAULT_KEY);
  expect(snapshot.vault).not.toContain("chatgpt-conversation-quota-test");
  expect(snapshot.posts.some(item => item.message?.type === "NACK" && item.message?.sequence === 77 && item.message?.reason === "storage-full")).toBe(true);
  expect(snapshot.posts.some(item => item.message?.type === "ACK" && item.message?.sequence === 77)).toBe(false);
});
