import { expect, test } from "./playwright-fixture.mjs";

const SCOPE = "https://www.googleapis.com/auth/drive.file";

async function routeConfig(page) {
  await page.route("**/api/storage/google/config", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ configured: true, clientId: "test.apps.googleusercontent.com", scope: SCOPE })
  }));
  await page.route("**/api/storage/github/status", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ configured: true, paired: false })
  }));
}

async function routeGis(page) {
  await page.route("https://accounts.google.com/gsi/client", route => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: `globalThis.google={accounts:{oauth2:{initTokenClient(config){return{requestAccessToken(){globalThis.__f35Activation=navigator.userActivation?.isActive??null;config.callback({access_token:\"F35_TEST_TOKEN\",expires_in:3600});}}}}}};`
  }));
}

async function routeDrive(page) {
  let createdVault = null;
  const folder = {
    id: "f35-folder", name: "DashGPT", mimeType: "application/vnd.google-apps.folder",
    appProperties: { dashgptKind: "folder-v1" }, createdTime: "2026-08-14T10:00:00.000Z",
    modifiedTime: "2026-08-14T10:00:00.000Z", version: "1"
  };
  const file = {
    id: "f35-file", name: "dashgpt-vault.json", mimeType: "application/json", parents: ["f35-folder"],
    appProperties: { dashgptKind: "vault-v1", dashgptVaultId: "" }, createdTime: "2026-08-14T10:00:01.000Z",
    modifiedTime: "2026-08-14T10:00:01.000Z", version: "1"
  };

  await page.route("https://www.googleapis.com/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    expect(request.headers().authorization).toBe("Bearer F35_TEST_TOKEN");

    if (url.pathname === "/drive/v3/about") {
      expect(url.searchParams.get("fields")).toBe("user(displayName,emailAddress,photoLink,me)");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: {
          displayName: "Dmitrii Kashirin",
          emailAddress: "bambuchastudent@gmail.com",
          photoLink: "https://example.test/photo.jpg",
          me: true
        } })
      });
    }

    if (url.pathname === "/drive/v3/files" && request.method() === "GET") {
      const q = url.searchParams.get("q") || "";
      const files = q.includes("folder-v1") ? [folder] : [];
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ files }) });
    }

    if (url.pathname === "/upload/drive/v3/files" && request.method() === "POST") {
      const contentType = request.headers()["content-type"] || "";
      const boundary = contentType.match(/boundary=([^;]+)/)?.[1];
      const parts = String(request.postData() || "").split(`--${boundary}`).filter(part => part.trim() && part.trim() !== "--");
      createdVault = JSON.parse(parts[1]?.split("\r\n\r\n")[1]?.replace(/\r\n$/, "").trim() || "{}");
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...file, appProperties: { ...file.appProperties, dashgptVaultId: createdVault.vaultId } }) });
    }

    return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { message: `Unhandled ${request.method()} ${url.pathname}` } }) });
  });

  return { createdVault: () => structuredClone(createdVault) };
}

test("authorized Google identity is visible for the current token and never enters the Vault", async ({ page }) => {
  await routeConfig(page);
  await routeGis(page);
  const drive = await routeDrive(page);

  await page.goto("/demo/?personal=1");
  await page.locator("#storageButton").click();
  await page.waitForFunction(() => Boolean(globalThis.google?.accounts?.oauth2));
  await page.locator("#connectGoogleDriveButton").click();

  await expect.poll(async () => page.evaluate(() => globalThis.__f35Activation)).toBe(true);
  await expect(page.locator("#googleDriveIdentity")).toBeVisible();
  await expect(page.locator("#googleDriveIdentity")).toContainText("Dmitrii Kashirin · bambuchastudent@gmail.com");
  await expect.poll(() => Boolean(drive.createdVault())).toBe(true);
  const serialized = JSON.stringify(drive.createdVault());
  expect(serialized).not.toContain("bambuchastudent@gmail.com");
  expect(serialized).not.toContain("Dmitrii Kashirin");
  expect(serialized).not.toContain("F35_TEST_TOKEN");
});

test("identity disappears after disconnect and after a reload without a token", async ({ page }) => {
  await routeConfig(page);
  await routeGis(page);
  await routeDrive(page);

  await page.goto("/demo/?personal=1");
  await page.locator("#storageButton").click();
  await page.waitForFunction(() => Boolean(globalThis.google?.accounts?.oauth2));
  await page.locator("#connectGoogleDriveButton").click();
  await expect(page.locator("#googleDriveIdentity")).toBeVisible();

  await page.reload();
  await page.locator("#storageButton").click();
  await expect(page.locator("#googleDriveIdentity")).toBeHidden();
  await expect(page.locator("#connectGoogleDriveButton")).toContainText(/Reconnect Google|Continue with Google/);

  await page.locator("#connectGoogleDriveButton").click();
  await expect(page.locator("#googleDriveIdentity")).toBeVisible();
  await page.locator("#disconnectGoogleDriveButton").click();
  await expect(page.locator("#googleDriveIdentity")).toBeHidden();
});

test("authorized identity fits the 390px storage surface", async ({ page }) => {
  await routeConfig(page);
  await routeGis(page);
  await routeDrive(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/demo/?personal=1");
  await page.locator("#storageButton").click();
  await page.waitForFunction(() => Boolean(globalThis.google?.accounts?.oauth2));
  await page.locator("#connectGoogleDriveButton").click();
  await expect(page.locator("#googleDriveIdentity")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
