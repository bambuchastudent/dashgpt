import { expect, test } from "./playwright-fixture.mjs";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const SHARE_URL = "https://chatgpt.com/share/share-123";

function result(id, title = id) {
  return { id, schemaVersion: 1, title, summary: `${title} summary`, category: "Test", tags: [], decisions: [], immutable: false, contentVersion: 1 };
}

function vault(vaultId = "vault-save-chat", results = [result("existing-card", "Existing card")]) {
  return { schemaVersion: 1, vaultId, createdAt: "2026-08-13T10:00:00.000Z", updatedAt: "2026-08-13T10:00:00.000Z", results, events: [], profileRevisions: [], dashRevisions: [] };
}

async function seedExistingUser(page, localVault = vault()) {
  await page.addInitScript(({ key, value }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
  }, { key: VAULT_KEY, value: localVault });
}

async function routeStorage(page, { googleConfigured = false, githubConfigured = true, githubPaired = false, githubDelayMs = 0 } = {}) {
  await page.route("**/api/storage/google/config", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ configured: googleConfigured, clientId: googleConfigured ? "test.apps.googleusercontent.com" : null, scope: SCOPE }) }));
  await page.route("**/api/storage/github/status", async route => {
    if (githubDelayMs) await new Promise(resolve => setTimeout(resolve, githubDelayMs));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ configured: githubConfigured, paired: githubPaired, locator: null }) });
  });
}

async function routeSharedChat(page, { expectedUrl = SHARE_URL, title = "Импортированный чат", summary = "Полезный итог из публичного ChatGPT Share-чата.", onRequest } = {}) {
  await page.route("**/api/shared-chat?*", route => {
    const requestUrl = new URL(route.request().url());
    const sourceUrl = requestUrl.searchParams.get("url");
    onRequest?.(sourceUrl);
    expect(sourceUrl).toBe(expectedUrl);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sourceUrl,
        title,
        replies: [
          { type: "user", statement: "Сохрани этот разговор" },
          { type: "assistant", statement: summary }
        ]
      })
    });
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

async function saveSharedChat(page, inputUrl = SHARE_URL) {
  await page.locator("#addResultButton").click();
  await page.locator("#saveChatLink").fill(inputUrl);
  await page.locator("#saveChatLinkForm").getByRole("button", { name: "Добавить карточку" }).click();
  await expect(page.locator("#saveChatReview")).toBeVisible();
  const documentToken = await markDocument(page);
  await page.locator("#saveChatCommit").click();
  await page.waitForURL(/\/demo\/$/);
  await waitForNewDocument(page, documentToken);
}

async function markDocument(page) {
  const token = `test-${Date.now()}-${Math.random()}`;
  await page.evaluate(value => { document.documentElement.dataset.testDocument = value; }, token);
  return token;
}

async function waitForNewDocument(page, token) {
  await page.waitForFunction(value => document.documentElement.dataset.testDocument !== value, token);
  await page.locator('html[data-dashgpt-ready="true"]').waitFor();
}

const CAPTURE = JSON.stringify({ title: "Сохранённый разговор", summary: "Сохранили полезный итог существующего разговора через нормальный Save chat flow.", category: "DashGPT", tags: ["capture"], decisions: ["Одна карточка, один Vault"], facts: [], constraints: [], userPreferences: [], openQuestions: [], next: "Продолжить с карточки" });

test("existing user Save chat opens link-first capture, not generic Add Result", async ({ page }) => {
  await seedExistingUser(page);
  await routeStorage(page);
  await page.goto("/demo/?personal=1");
  await page.locator("#addResultButton").click();
  await expect(page.locator("#saveChatDialog")).toBeVisible();
  await expect(page.locator("#addDialog")).not.toBeVisible();
  await expect(page.locator("#saveChatLink")).toBeVisible();
  await expect(page.locator("#saveChatLink")).toBeFocused();
  const linkComesFirst = await page.evaluate(() => {
    const link = document.querySelector("#saveChatLink");
    const handoff = document.querySelector("#saveChatPayload");
    return Boolean(link && handoff && (link.compareDocumentPosition(handoff) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(linkComesFirst).toBe(true);
  await expect(page.locator("#saveChatDialog")).toContainText("Это устройство");
  await expect(page.locator("#saveChatDialog")).toContainText("Google Drive");
  await expect(page.locator("#saveChatDialog")).toContainText("GitHub");
});

test("Save chat resolves a public Share link into one local canonical card", async ({ page }) => {
  await seedExistingUser(page);
  await routeStorage(page, { googleConfigured: false, githubConfigured: false });
  await routeSharedChat(page);
  await page.goto("/demo/?personal=1");
  await page.locator("#addResultButton").click();
  await page.locator("#saveChatLink").fill("https://chat.openai.com/share/e/share-123?utm_source=test#fragment");
  await page.locator("#saveChatLinkForm").getByRole("button", { name: "Добавить карточку" }).click();
  await expect(page.locator("#saveChatReview")).toBeVisible();
  await expect(page.locator("#saveChatReviewTitle")).toHaveValue("Импортированный чат");
  await expect(page.locator("#saveChatReviewSummary")).toHaveValue("Полезный итог из публичного ChatGPT Share-чата.");
  const documentToken = await markDocument(page);
  await page.locator("#saveChatCommit").click();
  await page.waitForURL(/\/demo\/$/);
  await waitForNewDocument(page, documentToken);
  await expect(page.locator(".result-card").filter({ hasText: "Импортированный чат" })).toHaveCount(1);

  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "null"), VAULT_KEY);
  const saved = stored.results.filter(item => item.source?.url === SHARE_URL);
  expect(saved).toHaveLength(1);
  expect(saved[0].source).toEqual({ type: "chatgpt-share", url: SHARE_URL, title: "Импортированный чат" });
  expect(saved[0].tags).toEqual(expect.arrayContaining(["chatgpt", "share"]));
});

test("Save chat updates the same card when the same Share URL is imported again", async ({ page }) => {
  await seedExistingUser(page);
  await routeStorage(page, { googleConfigured: false, githubConfigured: false });
  await routeSharedChat(page);
  await page.goto("/demo/?personal=1");

  await saveSharedChat(page);
  await saveSharedChat(page, "https://chat.openai.com/s/share-123");

  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "null"), VAULT_KEY);
  const saved = stored.results.filter(item => item.source?.url === SHARE_URL);
  expect(saved).toHaveLength(1);
  expect(saved[0].contentVersion).toBe(2);
});

test("Save chat explains that a private /c link must be shared first", async ({ page }) => {
  let resolverCalls = 0;
  await seedExistingUser(page);
  await routeStorage(page, { googleConfigured: false, githubConfigured: false });
  await page.route("**/api/shared-chat?*", route => {
    resolverCalls += 1;
    return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "raw backend failure" }) });
  });
  await page.goto("/demo/?personal=1");
  await page.locator("#addResultButton").click();
  await page.locator("#saveChatLink").fill("https://chatgpt.com/c/private-conversation-id");
  await page.locator("#saveChatLinkForm").getByRole("button", { name: "Добавить карточку" }).click();

  await expect(page.locator("#saveChatLinkStatus")).toContainText("приватная ссылка");
  await expect(page.locator("#saveChatLinkStatus")).toContainText("Share");
  await expect(page.locator("#saveChatLinkStatus")).not.toContainText("backend");
  expect(resolverCalls).toBe(0);
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "null"), VAULT_KEY);
  expect(stored.results).toHaveLength(2);
});

test("Save chat keeps structured ChatGPT handoff as a secondary local fallback", async ({ page }) => {
  await seedExistingUser(page);
  await routeStorage(page, { googleConfigured: false, githubConfigured: false });
  await page.goto("/demo/?personal=1");
  await page.locator("#addResultButton").click();
  await page.locator("#saveChatFallback > summary").click();
  await page.locator("#saveChatPayload").fill(CAPTURE);
  await page.locator("#saveChatForm").getByRole("button", { name: "Проверить карточку" }).click();
  await expect(page.locator("#saveChatReview")).toBeVisible();
  const documentToken = await markDocument(page);
  await page.locator("#saveChatCommit").click();
  await page.waitForURL(/\/demo\/$/);
  await waitForNewDocument(page, documentToken);
  await expect(page.locator(".result-card").filter({ hasText: "Сохранённый разговор" })).toHaveCount(1);
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
  await expect(page.locator("#saveChatLink")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator("#saveChatCommit")).toBeAttached();
});
