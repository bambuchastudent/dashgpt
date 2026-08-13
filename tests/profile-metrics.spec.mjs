import { expect, test } from "@playwright/test";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const COLLAPSED_KEY = "dashgpt.profile.metrics.collapsed.v1";
const NOW = "2026-08-13T12:00:00.000Z";

function seedVault() {
  const card = (id, tokens) => ({
    id,
    schemaVersion: 1,
    title: id,
    summary: `Imported ${id}`,
    category: "ChatGPT",
    tags: ["chatgpt"],
    decisions: [],
    source: { type: "conversation", provider: "chatgpt", sourceId: id },
    publishedAt: NOW,
    immutable: false,
    contentVersion: 1,
    result: {
      kind: "chatgpt-conversation",
      usage: { tokenCount: tokens, tokenCountKind: "estimated", estimator: "visible-text-v1" }
    }
  });
  return {
    schemaVersion: 1,
    vaultId: "vault_profile_browser",
    createdAt: NOW,
    updatedAt: NOW,
    results: [card("conv_a", 120), card("conv_b", 180)],
    events: [],
    profileRevisions: [],
    dashRevisions: []
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ key, vault }) => {
    Object.defineProperty(navigator, "language", { configurable: true, get: () => "ru-RU" });
    localStorage.setItem(key, JSON.stringify(vault));
  }, { key: VAULT_KEY, vault: seedVault() });
});

test("profile shows approximate token total and revisioned money values", async ({ page }) => {
  await page.goto("/demo/?personal=1");

  const trigger = page.locator(".profile-metrics-trigger");
  await expect(trigger).toHaveText("Профиль");
  await trigger.click();

  const panel = page.locator(".profile-metrics-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Проебано токенов");
  await expect(panel).toContainText("≈ 300");
  await expect(panel).toContainText("Потрачено");
  await expect(panel).toContainText("Задоначено");

  await page.locator(".profile-metrics-edit").click();
  await page.locator('.profile-metrics-form input[name="currency"]').fill("EUR");
  await page.locator('.profile-metrics-form input[name="spent"]').fill("12,34");
  await page.locator('.profile-metrics-form input[name="donated"]').fill("5,00");
  await page.locator('.profile-metrics-form button[type="submit"]').click();

  await expect(panel).toContainText(/12[,.]34/);
  await expect(panel).toContainText(/5[,.]00/);
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), VAULT_KEY);
  expect(stored.profileRevisions).toHaveLength(1);
  expect(stored.profileRevisions[0]).toMatchObject({
    kind: "project-metrics",
    currency: "EUR",
    spentMinor: 1234,
    donatedMinor: 500
  });
});

test("metrics header collapse survives reload without writing a profile revision", async ({ page }) => {
  await page.goto("/demo/?personal=1");
  await page.locator(".profile-metrics-trigger").click();
  await page.locator(".profile-metrics-collapse").click();
  await expect(page.locator(".profile-metrics-grid")).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), COLLAPSED_KEY)).toBe("1");

  const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).profileRevisions.length, VAULT_KEY);
  expect(before).toBe(0);
  await page.reload();
  await page.locator(".profile-metrics-trigger").click();
  await expect(page.locator(".profile-metrics-grid")).toBeHidden();
  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).profileRevisions.length, VAULT_KEY);
  expect(after).toBe(0);
});

test("360px profile remains reachable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/demo/?personal=1");
  await page.locator(".profile-metrics-trigger").click();
  await expect(page.locator(".profile-metrics-panel")).toBeVisible();
  await expect(page.locator(".profile-metrics-grid .profile-metric")).toHaveCount(3);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
