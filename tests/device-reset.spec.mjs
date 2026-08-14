import { expect, test } from "@playwright/test";

const VAULT_KEY = "dashgpt.demo.vault.v1";

function oldVault() {
  return {
    schemaVersion: 1,
    vaultId: "vault-before-device-reset",
    createdAt: "2026-08-14T10:00:00.000Z",
    updatedAt: "2026-08-14T10:00:00.000Z",
    results: [{
      id: "user-card-before-reset",
      schemaVersion: 1,
      title: "User card before reset",
      summary: "Must disappear after device reset.",
      category: "Test",
      tags: ["reset"],
      decisions: [],
      facts: [],
      immutable: false,
      contentVersion: 1
    }],
    events: [],
    profileRevisions: [],
    dashRevisions: []
  };
}

async function routeProviders(page) {
  await page.route("**/api/storage/google/config", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ configured: false, clientId: null, scope: "https://www.googleapis.com/auth/drive.file" })
  }));
  await page.route("**/api/storage/github/status", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ configured: true, paired: false })
  }));
}

test("dashboard reset requires confirmation and returns this device to fresh local state", async ({ page }) => {
  await routeProviders(page);
  await page.addInitScript(({ vaultKey, vault }) => {
    localStorage.setItem(vaultKey, JSON.stringify(vault));
    localStorage.setItem("dashgpt.test.reset-marker", "remove-me");
    localStorage.setItem("foreign.app.preference", "survive-me");
    sessionStorage.setItem("dashgpt.test.session-marker", "remove-me");
    sessionStorage.setItem("foreign.session.preference", "survive-me");
  }, { vaultKey: VAULT_KEY, vault: oldVault() });

  await page.goto("/demo/?personal=1");
  await expect(page.locator("[data-result-id='user-card-before-reset']")).toBeVisible();
  await page.locator("#storageButton").click();
  await expect(page.locator("#deviceResetSection")).toBeVisible();
  await page.locator("#resetDeviceButton").click();
  await expect(page.locator("#deviceResetDialog")).toBeVisible();
  await expect(page.locator("#deviceResetDialog")).toContainText("Google Drive or GitHub Vault is not deleted");

  await page.locator("#cancelDeviceResetButton").click();
  await expect(page.locator("#deviceResetDialog")).not.toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), VAULT_KEY)).toContain("vault-before-device-reset");

  await page.locator("#resetDeviceButton").click();
  await page.locator("#confirmDeviceResetButton").click();
  await page.waitForURL(url => url.pathname === "/demo/");
  await page.waitForLoadState("domcontentloaded");

  const state = await page.evaluate(vaultKey => ({
    vault: JSON.parse(localStorage.getItem(vaultKey) || "null"),
    resetMarker: localStorage.getItem("dashgpt.test.reset-marker"),
    foreignLocal: localStorage.getItem("foreign.app.preference"),
    sessionMarker: sessionStorage.getItem("dashgpt.test.session-marker"),
    foreignSession: sessionStorage.getItem("foreign.session.preference")
  }), VAULT_KEY);

  expect(state.vault?.vaultId).not.toBe("vault-before-device-reset");
  expect(state.vault?.results?.some(result => result.id === "user-card-before-reset")).toBe(false);
  expect(state.resetMarker).toBeNull();
  expect(state.sessionMarker).toBeNull();
  expect(state.foreignLocal).toBe("survive-me");
  expect(state.foreignSession).toBe("survive-me");
});

test("reset confirmation fits a 390px dashboard without horizontal overflow", async ({ page }) => {
  await routeProviders(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo/?personal=1");
  await page.locator("#storageButton").click();
  await page.locator("#resetDeviceButton").click();
  await expect(page.locator("#deviceResetDialog")).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const box = await page.locator("#deviceResetDialog").boundingBox();
  expect(box?.width || 0).toBeLessThanOrEqual(390);
});
