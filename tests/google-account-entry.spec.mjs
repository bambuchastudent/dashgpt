import { expect, test } from "./playwright-fixture.mjs";

const SCOPE = "https://www.googleapis.com/auth/drive.file";

async function routeConfig(page, configured) {
  await page.route("**/api/storage/google/config", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      configured,
      clientId: configured ? "test.apps.googleusercontent.com" : null,
      scope: SCOPE
    })
  }));
  await page.route("**/api/storage/github/status", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ configured: true, paired: false })
  }));
}

async function routeDecliningGis(page) {
  await page.route("https://accounts.google.com/gsi/client", route => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: `globalThis.google={accounts:{oauth2:{initTokenClient(config){return{requestAccessToken(){globalThis.__accountEntryActivation=navigator.userActivation?.isActive??null;config.callback({error:\"access_denied\"});}}}}}};`
  }));
}

test("configured personal home exposes a direct Google account entry and preserves user activation", async ({ page }) => {
  await routeConfig(page, true);
  await routeDecliningGis(page);
  await page.goto("/demo/?personal=1");
  await page.waitForFunction(() => Boolean(globalThis.google?.accounts?.oauth2));

  const account = page.locator("#googleAccountButton");
  await expect(account).toBeVisible();
  await expect(account).toContainText(/Continue with Google|Войти через Google/);
  await account.click();
  await expect.poll(async () => page.evaluate(() => globalThis.__accountEntryActivation)).toBe(true);
});

test("unconfigured deployment does not advertise a fake Google sign-in entry", async ({ page }) => {
  await routeConfig(page, false);
  await page.goto("/demo/?personal=1");
  await expect(page.locator("#googleAccountButton")).toBeHidden();
});

test("Google account entry fits the 360px personal header", async ({ page }) => {
  await routeConfig(page, true);
  await routeDecliningGis(page);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/demo/?personal=1");
  await page.waitForFunction(() => Boolean(globalThis.google?.accounts?.oauth2));
  await expect(page.locator("#googleAccountButton")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
