import { expect, test } from "./playwright-fixture.mjs";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const NOW = "2026-08-11T08:00:00.000Z";

const RESULT = {
  id: "pixel-card",
  schemaVersion: 1,
  title: "Ремонт Pixel 8",
  summary: "Корпус и экран.",
  category: "Техника",
  tags: ["pixel"],
  decisions: [],
  immutable: false,
  contentVersion: 1
};

const DASH = {
  schemaVersion: 1,
  dashId: "dash_pixel",
  dashRevisionId: "dashrev_pixel_1",
  baseRevisionId: null,
  title: "Ремонт Pixel",
  description: "Карточки про ремонт телефона.",
  semanticDefinition: { query: "pixel", normalizedTerms: ["pixel"], engineVersion: 1 },
  scope: {
    providers: ["*"], sourceTypes: ["*"], includeArchived: false,
    excludedResultIds: [], excludedSourceIds: [], excludedSourceUrls: []
  },
  updateMode: "review",
  automaticResultIds: [RESULT.id],
  suggestedResultIds: [],
  createdAt: NOW,
  lastUpdatedAt: NOW
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ key, result, dash, now }) => {
    localStorage.setItem(key, JSON.stringify({
      schemaVersion: 1,
      vaultId: "vault_delete_test",
      createdAt: now,
      updatedAt: now,
      results: [result],
      events: [],
      profileRevisions: [],
      dashRevisions: [dash]
    }));
  }, { key: VAULT_KEY, result: RESULT, dash: DASH, now: NOW });
});

test("deleting a saved Dash returns to canonical My Dash without deleting its card", async ({ page }) => {
  await page.goto("/demo/dashes/dash_pixel/");
  await expect(page.locator("#savedDashUnifiedContext h2")).toHaveText("Dash: Ремонт Pixel");

  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Delete Dash" }).click();
  await page.waitForURL(url => url.pathname === "/demo/");

  await expect(page.locator("#unifiedDashContext")).toBeVisible();
  await expect(page.locator("#dashContextTitle")).toHaveText("My Dash");
  await expect(page.locator("#resultsGrid .result-card")).toHaveCount(1);
  await expect(page.locator("#resultsGrid .result-card")).toContainText("Ремонт Pixel 8");

  const vault = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), VAULT_KEY);
  expect(vault.results).toHaveLength(1);
  expect(vault.results[0].id).toBe("pixel-card");
});
