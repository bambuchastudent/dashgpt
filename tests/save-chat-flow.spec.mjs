import { expect, test } from "@playwright/test";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const SCOPE = "https://www.googleapis.com/auth/drive.file";

function result(id, title = id) {
  return { id, schemaVersion: 1, title, summary: `${title} summary`, category: "Test", tags: [], decisions: [], immutable: false, contentVersion: 1 };
}

function vault(vaultId = "vault-save-chat", results = [result("existing-card", "Existing card")]) {
  return { schemaVersion: 1, vaultId, createdAt: "2026-08-13T10:00:00.000Z", updatedAt: "2026-08-13T10:00:00.000Z", results, events: [], profileRevisions: [], dashRevisions: [] };
}

async function seedExistingUser(page, localVault = vault()) {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: VAULT_KEY, value: localVault });
}

async function routeStorage(page, { googleConfigured = false, githubConfigured = true, githubPaired = false, githubDelayMs = 0 } = {}) {
  await page.route("**/api/storage/google/config", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ configured: googleConfigured, clientId: googleConfigured ? "test.apps.googleusercontent.com" : null, scope: SCOPE }) }));
  await page.route("**/api/storage/github/status", async route => {
    if (githubDelayMs) await new Promise(resolve => setTimeout(resolve, githubDelayMs));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ configured: githubConfigured, paired: githubPaired, locator: null }) });
  });
}

async function routeFakeGoogle(page, remoteVault) {
  await page.route("https://accounts.google.com/gsi/client", route => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: `globalThis.google={accounts:{oauth2:{initTokenClient(config){return{requestAccessToken(){globalThis.__saveChatGoogleActivation=navigator.userActivation?.isActive??null;config.callback({access_token:\"SAVE_CHAT_TEST_TOKEN\",expires_in:3600});}}}}}};`
  }));

  const folder = { id: "save-chat-folder", name: "DashGPT", mimeType: "application/vnd.google-apps.folder", appProperties: { dashgptKind: "folder-v1" }, createdTime: "2026-08-13T09:00:00.000Z", modifiedTime: "2026-08-13T09:00:00.000Z", version: "1" };
  const file = { id: "save-chat-file", name: "dashgpt-vault.json", mimeType: "application/json", parents: [folder.id], appProperties: { dashgptKind: "vault-v1", dashgptVaultId: remoteVault.vaultId }, createdTime: "2026-08-13T09:00:01.000Z", modifiedTime: "2026-08-13T09:00:02.000Z", version: "2" };

  await page.route("https://www.googleapis.com/**", route => {
    const request = route.request();
    const url = new URL(request.url());
    expect(request.headers().authorization).toBe("Bearer SAVE_CHAT_TEST_TOKEN");
    expect(url.searchParams.has("access_token")).toBe(false);
    if (url.pathname === "/drive/v3/files") {
      const query = url.searchParams.get("q") || "";
      const files = query.includes("folder-v1") ? [folder] : query.includes("vault-v1") ? [file] : [];
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ files }) });
    }
    if (url.pathname === `/drive/v3/files/${file.id}` && url.searchParams.get("alt") === "media") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(remoteVault) });
    if (url.pathname === `/drive/v3/files/${file.id}`) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(file) });
    return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { message: `Unhandled ${request.method()} ${url.pathname}` } }) });
  });
}

const CAPTURE = JSON.stringify({ title: "Сохранённый разговор", summary: "Сохранили полезный итог существующего разговора через нормальный Save chat flow.", category: "DashGPT", tags: ["capture"], decisions: ["Одна карточка, один Vault"], facts: [], constraints: [], userPreferences: [], openQuestions: [], next: "Продолжить с карточки" });

test("existing user Save chat opens the dedicated capture flow, not generic Add Result", async ({ page }) => {
  await seedExistingUser(page);
  await routeStorage(page);
  await page.goto("/demo/?personal=1");
  await page.locator("#addResultButton").click();
  await expect(page.locator("#saveChatDialog")).toBeVisible();
  await expect(page.locator("#addDialog")).not.toBeVisible();
  await expect(page.locator("#saveChatDialog")).toContainText("Это устройство");
  await expect(page.locator("#saveChatDialog")).toContainText("Google Drive");
  await expect(page.locator("#saveChatDialog")).toContainText("GitHub");
});

test("Save chat creates one local ChatGPT-handoff card without requiring a remote provider", async ({ page }) => {
  await seedExistingUser(page);
  await routeStorage(page, { googleConfigured: false, githubConfigured: false });
  await page.goto("/demo/?personal=1");
  await page.locator("#addResultButton").click();
  await page.locator("#saveChatPayload").fill(CAPTURE);
  await page.locator("#saveChatForm").getByRole("button", { name: "Проверить карточку" }).click();
  await expect(page.locator("#saveChatReview")).toBeVisible();
  await page.locator("#saveChatCommit").click();
  await page.waitForURL(/\/demo\/$/);
  await expect(page.locator(".result-card")).toContainText("Сохранённый разговор");
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "null"), VAULT_KEY);
  const saved = stored.results.filter(item => item.title === "Сохранённый разговор");
  expect(saved).toHaveLength(1);
  expect(saved[0].source).toEqual({ type: "chatgpt-handoff", title: "ChatGPT conversation" });
});

test("Save chat delegates Google Drive connect inside the same active user click", async ({ page }) => {
  const localVault = vault("vault-save-chat-google");
  await seedExistingUser(page, localVault);
  await routeStorage(page, { googleConfigured: true, githubDelayMs: 120 });
  await routeFakeGoogle(page, localVault);
  await page.goto("/demo/?personal=1");
  await page.waitForFunction(() => Boolean(globalThis.google?.accounts?.oauth2));
  await page.locator("#addResultButton").click();
  await expect(page.locator("#saveChatGoogleAction")).toBeEnabled();
  await page.locator("#saveChatGoogleAction").click();
  await expect.poll(async () => page.evaluate(() => globalThis.__saveChatGoogleActivation)).toBe(true);
});

test("Save chat GitHub setup opens and focuses the canonical Storage provider", async ({ page }) => {
  await seedExistingUser(page);
  await routeStorage(page, { githubConfigured: true });
  await page.goto("/demo/?personal=1");
  await page.locator("#addResultButton").click();
  await page.locator("#saveChatGithubAction").click();
  await expect(page.locator("#storageDialog")).toBeVisible();
  await expect(page.locator("#githubStorageUrl")).toBeFocused();
});

test("Save chat remains usable without horizontal overflow at 360px", async ({ page }) => {
  await seedExistingUser(page);
  await routeStorage(page);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/demo/?personal=1");
  await page.locator("#addResultButton").click();
  await expect(page.locator("#saveChatDialog")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator("#saveChatCommit")).toBeAttached();
});
