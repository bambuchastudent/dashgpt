import { expect, test } from "./playwright-fixture.mjs";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const SHARE_URL = "https://chatgpt.com/share/retry-share-123";

function vault() {
  return {
    schemaVersion: 1,
    vaultId: "vault-shared-chat-retry",
    createdAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
    results: [{
      id: "existing-card",
      schemaVersion: 1,
      title: "Existing card",
      summary: "Existing summary",
      category: "Test",
      tags: [],
      decisions: [],
      immutable: false,
      contentVersion: 1
    }],
    events: [],
    profileRevisions: [],
    dashRevisions: []
  };
}

async function seedExistingUser(page) {
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: VAULT_KEY, value: vault() });
}

async function routeStorage(page) {
  await page.route("**/api/storage/google/config", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ configured: false, clientId: null, scope: "https://www.googleapis.com/auth/drive.file" })
  }));
  await page.route("**/api/storage/github/status", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ configured: false, paired: false, locator: null })
  }));
}

async function openSaveChat(page) {
  await page.goto("/demo/?personal=1");
  await page.locator("#addResultButton").click();
  await page.locator("#saveChatLink").fill(SHARE_URL);
}

function unreadableBody() {
  return JSON.stringify({
    code: "SHARED_CHAT_UNREADABLE",
    error: "Unable to read this public ChatGPT conversation."
  });
}

test("Save chat retries transient unreadability and recovers from one submit", async ({ page }) => {
  await seedExistingUser(page);
  await routeStorage(page);
  let calls = 0;

  await page.route("**/api/shared-chat?*", async route => {
    calls += 1;
    if (calls <= 2) {
      return route.fulfill({ status: 502, contentType: "application/json", body: unreadableBody() });
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sourceUrl: SHARE_URL,
        title: "Recovered Share chat",
        replies: [
          { type: "user", statement: "Сохрани этот разговор" },
          { type: "assistant", statement: "Полезный итог после временного сбоя." }
        ]
      })
    });
  });

  await openSaveChat(page);
  await page.locator("#saveChatLinkForm").getByRole("button", { name: "Добавить карточку" }).click();

  await expect(page.locator("#saveChatLinkStatus")).toContainText("Пробую ещё раз");
  await expect(page.locator("#saveChatReview")).toBeVisible();
  await expect(page.locator("#saveChatReviewTitle")).toHaveValue("Recovered Share chat");
  await expect(page.locator("#saveChatReviewSummary")).toHaveValue("Полезный итог после временного сбоя.");
  await expect(page.locator("#saveChatLinkStatus")).toContainText("Готово");
  expect(calls).toBe(3);
});

test("Save chat exhausts bounded retries before showing the human fallback state", async ({ page }) => {
  await seedExistingUser(page);
  await routeStorage(page);
  let calls = 0;

  await page.route("**/api/shared-chat?*", route => {
    calls += 1;
    return route.fulfill({ status: 502, contentType: "application/json", body: unreadableBody() });
  });

  await openSaveChat(page);
  await page.locator("#saveChatLinkForm").getByRole("button", { name: "Добавить карточку" }).click();

  await expect(page.locator("#saveChatLinkStatus")).toContainText("Ссылка распознана, но общий чат не удалось прочитать");
  await expect(page.locator("#saveChatLinkStatus")).not.toContainText("SHARED_CHAT_UNREADABLE");
  await expect(page.locator("#saveChatLinkStatus")).not.toContainText("502");
  await expect(page.locator("#saveChatReview")).toBeHidden();
  expect(calls).toBe(6);

  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "null"), VAULT_KEY);
  expect(stored.results).toHaveLength(1);
});

test("Save chat does not retry unexpected hard resolver failures", async ({ page }) => {
  await seedExistingUser(page);
  await routeStorage(page);
  let calls = 0;

  await page.route("**/api/shared-chat?*", route => {
    calls += 1;
    return route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "unexpected internal contract failure" })
    });
  });

  await openSaveChat(page);
  await page.locator("#saveChatLinkForm").getByRole("button", { name: "Добавить карточку" }).click();

  await expect(page.locator("#saveChatLinkStatus")).toContainText("Ссылка распознана, но общий чат не удалось прочитать");
  await expect(page.locator("#saveChatLinkStatus")).not.toContainText("unexpected internal contract failure");
  expect(calls).toBe(1);
});
