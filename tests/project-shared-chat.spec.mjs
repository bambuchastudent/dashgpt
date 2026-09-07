import { expect, test } from "./playwright-fixture.mjs";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const PROJECT_PATH = "/g/g-p-6a7ae11856fc8191aad4d68742133156-dashgpt/shared/c/6a7f3509-886c-83eb-af4c-cf71f8a3599b";
const PROJECT_INPUT = `https://chatgpt.com${PROJECT_PATH}?owner_user_id=user-test&utm_source=ignored#fragment`;
const PROJECT_CANONICAL = `https://chatgpt.com${PROJECT_PATH}?owner_user_id=user-test`;
const SEED_KEY = "dashgpt.test.project-share.seeded";

function vault() {
  return {
    schemaVersion: 1,
    vaultId: "vault-project-share",
    createdAt: "2026-08-14T10:00:00.000Z",
    updatedAt: "2026-08-14T10:00:00.000Z",
    results: [{
      id: "existing-card",
      schemaVersion: 1,
      title: "Existing card",
      summary: "Existing card summary",
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

async function seed(page) {
  await page.addInitScript(({ key, seedKey, value }) => {
    if (sessionStorage.getItem(seedKey) === "1") return;
    localStorage.setItem(key, JSON.stringify(value));
    sessionStorage.setItem(seedKey, "1");
  }, { key: VAULT_KEY, seedKey: SEED_KEY, value: vault() });
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

test("Save chat accepts a ChatGPT Project shared-chat URL and preserves canonical provenance", async ({ page }) => {
  await seed(page);
  let resolverUrl = null;
  await page.route("**/api/shared-chat?*", route => {
    resolverUrl = new URL(route.request().url()).searchParams.get("url");
    expect(resolverUrl).toBe(PROJECT_CANONICAL);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sourceUrl: PROJECT_CANONICAL,
        title: "Project shared chat",
        replies: [
          { type: "user", statement: "Сохрани этот разговор" },
          { type: "assistant", statement: "Полезный итог из общего чата проекта." }
        ]
      })
    });
  });

  await page.goto("/demo/?personal=1");
  await page.locator("#addResultButton").click();
  await page.locator("#saveChatLink").fill(PROJECT_INPUT);
  await page.locator("#saveChatLinkForm").getByRole("button", { name: "Добавить карточку" }).click();

  await expect(page.locator("#saveChatReview")).toBeVisible();
  await expect(page.locator("#saveChatReviewTitle")).toHaveValue("Project shared chat");
  expect(resolverUrl).toBe(PROJECT_CANONICAL);

  const token = `project-share-${Date.now()}`;
  await page.evaluate(value => { document.documentElement.dataset.testDocument = value; }, token);
  await page.locator("#saveChatCommit").click();
  await page.waitForURL(/\/demo\/$/);
  await page.waitForFunction(value => document.documentElement.dataset.testDocument !== value, token);
  await page.locator('html[data-dashgpt-ready="true"]').waitFor({ timeout: 5_000 });

  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "null"), VAULT_KEY);
  const saved = stored.results.filter(item => item.source?.url === PROJECT_CANONICAL);
  expect(saved).toHaveLength(1);
  expect(saved[0].source).toEqual({ type: "chatgpt-share", url: PROJECT_CANONICAL, title: "Project shared chat" });
});

test("recognized Project shared-chat URL reports access/readability failure instead of invalid URL", async ({ page }) => {
  await seed(page);
  await page.route("**/api/shared-chat?*", route => route.fulfill({
    status: 502,
    contentType: "application/json",
    body: JSON.stringify({ code: "SHARED_CHAT_UNREADABLE", error: "Unable to read this public ChatGPT conversation." })
  }));

  await page.goto("/demo/?personal=1");
  await page.locator("#addResultButton").click();
  await page.locator("#saveChatLink").fill(PROJECT_INPUT);
  await page.locator("#saveChatLinkForm").getByRole("button", { name: "Добавить карточку" }).click();

  await expect(page.locator("#saveChatLinkStatus")).toContainText("Ссылка распознана");
  await expect(page.locator("#saveChatLinkStatus")).toContainText("участникам проекта");
  await expect(page.locator("#saveChatLinkStatus")).not.toContainText("Нужна ссылка Share");
  await expect(page.locator("#saveChatFallback")).toBeAttached();
});
