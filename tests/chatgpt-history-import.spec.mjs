import { expect, test } from "@playwright/test";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const IMPORT_ID = "dashgpt-chatgpt-history-import";
const PROTOCOL = "dashgpt-chatgpt-history-import";

async function storedResults(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || "null")?.results || [], VAULT_KEY);
}

async function dispatchSourceMessage(page, data, origin = "https://chatgpt.com") {
  await page.evaluate(({ payload, sourceOrigin }) => {
    window.dispatchEvent(new MessageEvent("message", {
      origin: sourceOrigin,
      source: window,
      data: payload
    }));
  }, { payload: data, sourceOrigin: origin });
}

function envelope(type, extra = {}) {
  return {
    protocol: PROTOCOL,
    version: 1,
    sessionId: "browser-test-session",
    nonce: "browser-test-nonce",
    type,
    ...extra
  };
}

function importedCandidate(updatedAt = "2026-08-11T10:00:00.000Z", summary = "First imported outcome") {
  return {
    sourceId: "browser-conversation-1",
    title: "Browser imported conversation",
    summary,
    currentState: "Continue from the latest saved user state",
    tags: ["browser", "chatgpt"],
    facts: ["Imported from ChatGPT"],
    updatedAt
  };
}

test("new My Dash shows one import card while keeping chat-first capture available", async ({ page }) => {
  await page.goto("/demo/?personal=1");

  await expect(page.locator(`[data-result-id="${IMPORT_ID}"]`)).toHaveCount(1);
  await expect(page.locator(`[data-result-id="${IMPORT_ID}"]`)).toBeVisible();
  await expect(page.locator(`[data-result-id="${IMPORT_ID}"] .title`)).toContainText(/Import ChatGPT history|Импортировать историю ChatGPT/);
  await expect(page.locator(`[data-result-id="${IMPORT_ID}"] .favorite-button`)).toBeHidden();
  await expect(page.locator("#publicWelcome")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Сохрани разговор через ChatGPT" })).toBeVisible();

  const results = await storedResults(page);
  expect(results.filter(result => result.id === IMPORT_ID)).toHaveLength(1);

  await page.reload();
  await expect(page.locator(`[data-result-id="${IMPORT_ID}"]`)).toHaveCount(1);
  expect((await storedResults(page)).filter(result => result.id === IMPORT_ID)).toHaveLength(1);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("360px My Dash keeps the import action usable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/demo/?personal=1");

  const card = page.locator(`[data-result-id="${IMPORT_ID}"]`);
  await expect(card).toBeVisible();
  await expect(card.locator(".open-button")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("Start import opens ChatGPT, copies one runner, and truthfully waits for source handshake", async ({ page }) => {
  await page.addInitScript(() => {
    window.__dashgptOpened = null;
    window.__dashgptCopied = "";
    window.open = (url, name) => {
      window.__dashgptOpened = { url, name };
      return { closed: false };
    };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async text => { window.__dashgptCopied = text; } }
    });
  });
  await page.goto("/demo/?personal=1");

  const importCard = page.locator(`[data-result-id="${IMPORT_ID}"]`);
  await importCard.locator(".open-button").click();

  await expect(page.locator("#chatgptImportLaunchDialog")).toBeVisible();
  const opened = await page.evaluate(() => window.__dashgptOpened);
  expect(opened?.url).toBe("https://chatgpt.com/");
  const copied = await page.evaluate(() => window.__dashgptCopied);
  expect(copied).toContain("dashgpt-progressive-import-source");
  expect(copied).toContain("https://chatgpt.com");
  expect(copied).not.toContain("SECRET_ACCESS_TOKEN");

  const progress = await page.evaluate(key => {
    const vault = JSON.parse(localStorage.getItem(key));
    return vault.results.find(result => result.id === "dashgpt-chatgpt-history-import")?.result;
  }, VAULT_KEY);
  expect(progress?.state).toBe("waiting_for_source");
});

test("receiver rejects wrong origin, wrong session and oversized messages without importing cards", async ({ page }) => {
  await page.goto("/demo/?personal=1&chatgptImportReceiver=1&session=browser-test-session&nonce=browser-test-nonce");

  const batch = envelope("BATCH", {
    sequence: 1,
    cards: [importedCandidate()],
    progress: { discovered: 1, processed: 1, unresolved: 0 }
  });

  await dispatchSourceMessage(page, batch, "https://evil.example");
  await dispatchSourceMessage(page, { ...batch, sessionId: "wrong-session" });
  await dispatchSourceMessage(page, { ...batch, nonce: "wrong-nonce" });
  await dispatchSourceMessage(page, envelope("BATCH", {
    sequence: 2,
    cards: [importedCandidate("2026-08-11T10:00:00.000Z", "x".repeat(241_000))],
    progress: { discovered: 1, processed: 1, unresolved: 0 }
  }));

  const results = await storedResults(page);
  expect(results.filter(result => result.id === "chatgpt-conversation-browser-conversation-1")).toHaveLength(0);
});

test("untrusted candidate fields cannot rewrite unrelated Results or persist credentials/raw transcript", async ({ page }) => {
  await page.goto("/demo/?personal=1&chatgptImportReceiver=1&session=browser-test-session&nonce=browser-test-nonce");

  await page.evaluate(key => {
    const vault = JSON.parse(localStorage.getItem(key));
    vault.results.push({
      id: "unrelated-result",
      schemaVersion: 1,
      title: "Keep me",
      summary: "Unrelated canonical user card",
      tags: [],
      decisions: [],
      immutable: false,
      contentVersion: 1
    });
    localStorage.setItem(key, JSON.stringify(vault));
  }, VAULT_KEY);

  const malicious = {
    ...importedCandidate(),
    id: "unrelated-result",
    favorite: true,
    immutable: true,
    accessToken: "SECRET_ACCESS_TOKEN_SHOULD_NOT_SURVIVE",
    authorization: "Bearer secret",
    accountId: "acct-secret",
    cookies: "session=secret",
    rawMessages: [{ role: "user", text: "RAW_TRANSCRIPT_SHOULD_NOT_SURVIVE" }],
    dashRevisions: [{ dashId: "attack" }]
  };
  await dispatchSourceMessage(page, envelope("BATCH", {
    sequence: 1,
    cards: [malicious],
    progress: { discovered: 1, processed: 1, unresolved: 0 }
  }));

  const serialized = await page.evaluate(key => localStorage.getItem(key) || "", VAULT_KEY);
  const results = JSON.parse(serialized).results;
  const unrelated = results.find(result => result.id === "unrelated-result");
  const imported = results.find(result => result.id === "chatgpt-conversation-browser-conversation-1");
  expect(unrelated?.title).toBe("Keep me");
  expect(unrelated?.summary).toBe("Unrelated canonical user card");
  expect(imported?.immutable).toBe(false);
  expect(imported?.favorite).toBeUndefined();
  expect(serialized).not.toContain("SECRET_ACCESS_TOKEN_SHOULD_NOT_SURVIVE");
  expect(serialized).not.toContain("acct-secret");
  expect(serialized).not.toContain("RAW_TRANSCRIPT_SHOULD_NOT_SURVIVE");
});

test("Pause from the progress card sends CONTROL_PAUSE to the active source and persists paused state", async ({ page }) => {
  await page.addInitScript(() => {
    window.__dashgptPosted = [];
    window.postMessage = (message, targetOrigin) => {
      window.__dashgptPosted.push({ message, targetOrigin });
    };
  });
  await page.goto("/demo/?personal=1&chatgptImportReceiver=1&session=browser-test-session&nonce=browser-test-nonce");

  await dispatchSourceMessage(page, envelope("HELLO", { sourceVersion: 1 }));
  await dispatchSourceMessage(page, envelope("DISCOVERED", { total: 12, archived: 0 }));

  const importCard = page.locator(`[data-result-id="${IMPORT_ID}"]`);
  await expect(importCard.locator(".open-button")).toContainText(/Pause|Пауза/);
  await importCard.locator(".open-button").click();

  const posted = await page.evaluate(() => window.__dashgptPosted);
  expect(posted.some(item => item.targetOrigin === "https://chatgpt.com" && item.message?.type === "CONTROL_PAUSE")).toBe(true);

  const progress = await page.evaluate(key => {
    const vault = JSON.parse(localStorage.getItem(key));
    return vault.results.find(result => result.id === "dashgpt-chatgpt-history-import")?.result;
  }, VAULT_KEY);
  expect(progress?.state).toBe("paused");
  expect(progress?.discovered).toBe(12);
});

test("receiver persists progressively, exposes durable cards before completion, replays idempotently, updates newer source, and removal keeps imported card", async ({ page }) => {
  await page.goto("/demo/?personal=1&chatgptImportReceiver=1&session=browser-test-session&nonce=browser-test-nonce");

  await dispatchSourceMessage(page, envelope("DISCOVERED", { total: 1, archived: 0 }));
  await dispatchSourceMessage(page, envelope("BATCH", {
    sequence: 1,
    cards: [importedCandidate()],
    progress: { discovered: 1, processed: 1, unresolved: 0 }
  }));

  let results = await storedResults(page);
  expect(results.filter(result => result.id === "chatgpt-conversation-browser-conversation-1")).toHaveLength(1);
  expect(results.find(result => result.id === "chatgpt-conversation-browser-conversation-1")?.summary).toBe("First imported outcome");

  // COMPLETE has not been received yet. A canonical refresh must already make
  // the durable imported card visible/searchable.
  await page.reload();
  await expect(page.locator("[data-result-id='chatgpt-conversation-browser-conversation-1']")).toBeVisible();
  const search = page.locator("#searchInput");
  await search.fill("Browser imported conversation");
  await expect(page.locator("#resultsGrid [data-result-id='chatgpt-conversation-browser-conversation-1']")).toBeVisible();
  await search.fill("");

  // Replay the same durable source after a hypothetical lost ACK: no duplicate.
  await dispatchSourceMessage(page, envelope("BATCH", {
    sequence: 2,
    cards: [importedCandidate()],
    progress: { discovered: 1, processed: 1, unresolved: 0 }
  }));
  results = await storedResults(page);
  expect(results.filter(result => result.id === "chatgpt-conversation-browser-conversation-1")).toHaveLength(1);

  // A newer provider update replaces the same deterministic mutable card.
  await dispatchSourceMessage(page, envelope("BATCH", {
    sequence: 3,
    cards: [importedCandidate("2026-08-11T11:00:00.000Z", "Newer imported outcome")],
    progress: { discovered: 1, processed: 1, unresolved: 0 }
  }));
  results = await storedResults(page);
  expect(results.find(result => result.id === "chatgpt-conversation-browser-conversation-1")?.summary).toBe("Newer imported outcome");

  await dispatchSourceMessage(page, envelope("COMPLETE", { total: 1, skipped: 0, unresolved: 0 }));
  const completed = await page.evaluate(key => {
    const vault = JSON.parse(localStorage.getItem(key));
    return vault.results.find(result => result.id === "dashgpt-chatgpt-history-import")?.result;
  }, VAULT_KEY);
  expect(completed?.state).toBe("completed");
  expect(completed?.imported).toBe(1);

  await page.reload();
  await expect(page.locator("[data-result-id='chatgpt-conversation-browser-conversation-1']")).toBeVisible();
  await expect(page.locator(`[data-result-id="${IMPORT_ID}"]`)).toBeVisible();
  await expect(page.locator(`[data-result-id="${IMPORT_ID}"] .chatgpt-import-extra`)).toContainText(/Remove|Удалить/);

  await page.locator(`[data-result-id="${IMPORT_ID}"] .chatgpt-import-extra`).filter({ hasText: /Remove|Удалить/ }).click();
  await page.waitForLoadState("domcontentloaded");

  results = await storedResults(page);
  expect(results.some(result => result.id === IMPORT_ID)).toBe(false);
  expect(results.filter(result => result.id === "chatgpt-conversation-browser-conversation-1")).toHaveLength(1);
});
