import { expect, test } from "@playwright/test";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const NOW = "2026-08-11T08:00:00.000Z";

const RESULTS = [
  { id: "travel-one", schemaVersion: 1, title: "Fuente Muñoz", summary: "Ночёвка.", category: "Поездки", tags: ["camping"], decisions: [], immutable: false, contentVersion: 1 },
  { id: "food-one", schemaVersion: 1, title: "Лосось", summary: "Малосольный.", category: "Еда", tags: ["salmon"], decisions: [], immutable: false, contentVersion: 1 }
];

const DASH = {
  schemaVersion: 1,
  dashId: "dash_history_travel",
  dashRevisionId: "dashrev_history_travel_1",
  baseRevisionId: null,
  title: "Поездки",
  description: "Поездки и ночёвки.",
  semanticDefinition: { query: "поездки", normalizedTerms: ["поездк"], engineVersion: 1 },
  scope: {
    providers: ["*"], sourceTypes: ["*"], includeArchived: false,
    excludedResultIds: [], excludedSourceIds: [], excludedSourceUrls: []
  },
  updateMode: "review",
  automaticResultIds: ["travel-one"],
  suggestedResultIds: [],
  createdAt: NOW,
  lastUpdatedAt: NOW
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ key, results, dash, now }) => {
    localStorage.setItem(key, JSON.stringify({
      schemaVersion: 1,
      vaultId: "vault_history_test",
      createdAt: now,
      updatedAt: now,
      results,
      events: [],
      profileRevisions: [],
      dashRevisions: [dash]
    }));
  }, { key: VAULT_KEY, results: RESULTS, dash: DASH, now: NOW });
});

test("saved Dash context survives browser back, forward, and reload", async ({ page }) => {
  await page.goto("/demo/?personal=1");
  await expect(page.locator("#dashContextTitle")).toHaveText("My Dash");

  await page.locator("#unifiedDashContext .my-dashes-trigger").click();
  await page.locator("#unifiedDashContext .my-dash-item", { hasText: "Поездки" }).click();
  await page.waitForURL(/\/demo\/dashes\/dash_history_travel\/$/);
  await expect(page.locator("#savedDashUnifiedContext h2")).toHaveText("Dash: Поездки");

  await page.goBack();
  await expect(page).toHaveURL(/\/demo\/\?personal=1$/);
  await expect(page.locator("#dashContextTitle")).toHaveText("My Dash");
  await expect(page.locator("#resultsGrid .result-card")).toHaveCount(2);

  await page.goForward();
  await expect(page).toHaveURL(/\/demo\/dashes\/dash_history_travel\/$/);
  await expect(page.locator("#savedDashUnifiedContext h2")).toHaveText("Dash: Поездки");

  await page.reload();
  await expect(page.locator("#savedDashUnifiedContext h2")).toHaveText("Dash: Поездки");
  await expect(page.locator(".dash-result-card")).toHaveCount(1);
});
