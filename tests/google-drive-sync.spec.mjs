import { expect, test } from "@playwright/test";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const BINDING_KEY = "dashgpt.google-drive.binding.v1";
const SCOPE = "https://www.googleapis.com/auth/drive.file";

function result(id, summary = id) {
  return {
    id,
    schemaVersion: 1,
    title: id,
    summary,
    tags: [],
    decisions: [],
    immutable: false,
    contentVersion: 1
  };
}

function vault(vaultId, results = []) {
  return {
    schemaVersion: 1,
    vaultId,
    createdAt: "2026-08-13T10:00:00.000Z",
    updatedAt: "2026-08-13T10:00:00.000Z",
    results,
    events: [],
    profileRevisions: [],
    dashRevisions: []
  };
}

async function routeProviderConfig(page, { configured = true, githubPaired = false, githubDelayMs = 0 } = {}) {
  await page.route("**/api/storage/google/config", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ configured, clientId: configured ? "test.apps.googleusercontent.com" : null, scope: SCOPE })
  }));
  await page.route("**/api/storage/github/status", async route => {
    if (githubDelayMs > 0) await new Promise(resolve => setTimeout(resolve, githubDelayMs));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ configured: true, paired: githubPaired })
    });
  });
}

async function routeFakeGis(page) {
  await page.route("https://accounts.google.com/gsi/client", route => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: `globalThis.google={accounts:{oauth2:{initTokenClient(config){globalThis.__dashgptGoogleTokenConfig={client_id:config.client_id,scope:config.scope};return{requestAccessToken(options){globalThis.__dashgptGooglePrompt=options?.prompt||\"\";globalThis.__dashgptGoogleUserActivation=navigator.userActivation?.isActive??null;config.callback({access_token:\"BROWSER_TEST_TOKEN\",expires_in:3600});}}}}}};`
  }));
}

async function routeFakeDrive(page, initialVault) {
  let remoteVault = structuredClone(initialVault);
  let version = 2;
  let patchCount = 0;
  const authHeaders = [];

  const folder = () => ({
    id: "folder-browser", name: "DashGPT", mimeType: "application/vnd.google-apps.folder",
    appProperties: { dashgptKind: "folder-v1" }, createdTime: "2026-08-13T09:00:00.000Z",
    modifiedTime: "2026-08-13T09:00:00.000Z", version: "1"
  });
  const file = () => ({
    id: "file-browser", name: "dashgpt-vault.json", mimeType: "application/json", parents: ["folder-browser"],
    appProperties: { dashgptKind: "vault-v1", dashgptVaultId: remoteVault.vaultId },
    createdTime: "2026-08-13T09:00:01.000Z", modifiedTime: "2026-08-13T09:00:02.000Z", version: String(version)
  });

  await page.route("https://www.googleapis.com/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    authHeaders.push(request.headers().authorization || "");
    expect(url.searchParams.has("access_token")).toBe(false);

    if (url.pathname === "/drive/v3/files") {
      const q = url.searchParams.get("q") || "";
      const files = q.includes("folder-v1") ? [folder()] : q.includes("vault-v1") ? [file()] : [];
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ files }) });
    }
    if (url.pathname === "/drive/v3/files/file-browser" && url.searchParams.get("alt") === "media") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(remoteVault) });
    }
    if (url.pathname === "/drive/v3/files/file-browser" && url.searchParams.has("fields")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(file()) });
    }
    if (url.pathname === "/upload/drive/v3/files/file-browser" && request.method() === "PATCH") {
      remoteVault = JSON.parse(request.postData() || "{}");
      version += 1;
      patchCount += 1;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(file()) });
    }
    return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { message: `Unhandled ${request.method()} ${url.pathname}` } }) });
  });

  return {
    remoteVault: () => structuredClone(remoteVault),
    patchCount: () => patchCount,
    authHeaders
  };
}

test("Storage dialog exposes Google Drive as optional and remains usable at 390px", async ({ page }) => {
  await routeProviderConfig(page, { configured: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo/?personal=1");
  await page.locator("#storageButton").click();

  const provider = page.locator("#googleDriveStorageProvider");
  await expect(provider).toBeVisible();
  await expect(provider).toContainText("Google Drive sync is not configured");
  await expect(page.locator("#connectGoogleDriveButton")).toBeDisabled();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("Connect Google Drive requests Google account access inside the click activation before delayed provider networking", async ({ page }) => {
  await routeProviderConfig(page, { githubDelayMs: 150 });
  await routeFakeGis(page);
  const remote = vault("vault-safari-activation", [result("activation-card")]);
  await routeFakeDrive(page, remote);

  await page.goto("/demo/?personal=1");
  await page.locator("#storageButton").click();
  await page.waitForFunction(() => Boolean(globalThis.google?.accounts?.oauth2));
  await expect(page.locator("#connectGoogleDriveButton")).toBeEnabled();
  await page.locator("#connectGoogleDriveButton").click();

  await expect.poll(async () => page.evaluate(() => globalThis.__dashgptGoogleUserActivation)).toBe(true);
  await expect.poll(async () => page.evaluate(key => JSON.parse(localStorage.getItem(key) || "null")?.vaultId, VAULT_KEY)).toBe("vault-safari-activation");
});

test("fresh second device authorizes with drive.file and adopts the remote Vault without persisting the token", async ({ page }) => {
  await routeProviderConfig(page);
  await routeFakeGis(page);
  const remote = vault("vault-browser-remote", [result("remote-browser-card", "Arrived from Google Drive")]);
  const drive = await routeFakeDrive(page, remote);

  await page.goto("/demo/?personal=1");
  await page.locator("#storageButton").click();
  await page.waitForFunction(() => Boolean(globalThis.google?.accounts?.oauth2));
  await page.locator("#connectGoogleDriveButton").click();

  await expect.poll(async () => page.evaluate(key => JSON.parse(localStorage.getItem(key) || "null")?.vaultId, VAULT_KEY)).toBe("vault-browser-remote");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("[data-result-id='remote-browser-card']")).toBeVisible();

  const state = await page.evaluate(({ vaultKey, bindingKey }) => ({
    vault: JSON.parse(localStorage.getItem(vaultKey) || "null"),
    binding: JSON.parse(localStorage.getItem(bindingKey) || "null"),
    tokenConfig: globalThis.__dashgptGoogleTokenConfig || null
  }), { vaultKey: VAULT_KEY, bindingKey: BINDING_KEY });
  expect(state.vault.vaultId).toBe("vault-browser-remote");
  expect(state.binding.vaultId).toBe("vault-browser-remote");
  expect(JSON.stringify(state.binding)).not.toContain("BROWSER_TEST_TOKEN");
  expect(drive.authHeaders.every(value => value === "Bearer BROWSER_TEST_TOKEN")).toBe(true);
  expect(drive.patchCount()).toBe(0);

  await page.locator("#storageButton").click();
  await expect(page.locator("#connectGoogleDriveButton")).toContainText("Reconnect Google Drive");
});

test("different meaningful Vaults require explicit merge before Drive is written", async ({ page }) => {
  await routeProviderConfig(page);
  await routeFakeGis(page);
  const remote = vault("vault-drive-existing", [result("drive-card")]);
  const drive = await routeFakeDrive(page, remote);

  await page.addInitScript(({ key, local }) => localStorage.setItem(key, JSON.stringify(local)), {
    key: VAULT_KEY,
    local: vault("vault-device-local", [result("device-card")])
  });
  await page.goto("/demo/?personal=1");
  await page.locator("#storageButton").click();
  await page.waitForFunction(() => Boolean(globalThis.google?.accounts?.oauth2));
  await page.locator("#connectGoogleDriveButton").click();

  await expect(page.locator("#googleDriveMigration")).toBeVisible();
  await expect(page.locator("#googleDriveMigrationText")).toContainText("vault-device-local");
  await expect(page.locator("#googleDriveMigrationText")).toContainText("vault-drive-existing");
  expect(drive.patchCount()).toBe(0);

  await page.locator("#mergeGoogleDriveButton").click();
  await expect.poll(() => drive.patchCount()).toBe(1);
  await expect.poll(async () => page.evaluate(key => JSON.parse(localStorage.getItem(key) || "null")?.vaultId, VAULT_KEY)).toBe("vault-drive-existing");
  expect(drive.remoteVault().results.some(item => item.id === "device-card")).toBe(true);
  expect(drive.remoteVault().results.some(item => item.id === "drive-card")).toBe(true);
});

test("GitHub pairing blocks Google Drive connect instead of silently mirroring providers", async ({ page }) => {
  await routeProviderConfig(page, { configured: true, githubPaired: true });
  await page.goto("/demo/?personal=1");
  await page.locator("#storageButton").click();
  await expect(page.locator("#googleDriveStatus")).toContainText("Disconnect GitHub");
  await expect(page.locator("#connectGoogleDriveButton")).toBeDisabled();
});
