import { expect, test } from "@playwright/test";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const NOW = "2026-08-11T08:00:00.000Z";

const RESULTS = [
  { id: "travel-camp", schemaVersion: 1, title: "Fuente Muñoz", summary: "Официальная зона для ночёвки и рыбалки.", category: "Поездки", tags: ["camping"], decisions: [], immutable: false, contentVersion: 1 },
  { id: "travel-morocco", schemaVersion: 1, title: "Марокко", summary: "Маршрут на девять дней.", category: "Поездки", tags: ["travel"], decisions: [], immutable: false, contentVersion: 1 },
  { id: "phone-pixel", schemaVersion: 1, title: "Ремонт Pixel 8", summary: "Корпус, экран и аккумулятор.", category: "Техника", tags: ["pixel"], decisions: [], immutable: false, contentVersion: 1 }
];

const TRAVEL_DASH = {
  schemaVersion: 1,
  dashId: "dash_travel",
  dashRevisionId: "dashrev_travel_1",
  baseRevisionId: null,
  title: "Поездки",
  description: "Сохранённая подборка поездок.",
  semanticDefinition: { query: "поездки", normalizedTerms: ["поездк"], engineVersion: 1 },
  scope: {
    providers: ["*"], sourceTypes: ["*"], includeArchived: false,
    excludedResultIds: [], excludedSourceIds: [], excludedSourceUrls: []
  },
  updateMode: "review",
  automaticResultIds: ["travel-camp", "travel-morocco"],
  suggestedResultIds: [],
  createdAt: NOW,
  lastUpdatedAt: NOW
};

function seedVault() {
  return {
    schemaVersion: 1,
    vaultId: "vault_unified_scope",
    createdAt: NOW,
    updatedAt: NOW,
    results: RESULTS,
    events: [],
    profileRevisions: [],
    dashRevisions: [TRAVEL_DASH]
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ key, vault }) => localStorage.setItem(key, JSON.stringify(vault)), {
    key: VAULT_KEY,
    vault: seedVault()
  });
});

test("saved Dash search can widen to all cards and clear back to the source Dash", async ({ page }) => {
  await page.goto("/demo/dashes/dash_travel/");
  await expect(page.locator("#savedDashUnifiedContext h2")).toHaveText("Dash: Поездки");

  await page.locator("#savedDashSearch").fill("Pixel 8");
  await expect(page.locator(".dash-result-card:not([hidden])")).toHaveCount(0);
  await page.locator("#savedDashSearchScope").selectOption("all");

  await page.waitForURL(url => url.pathname === "/demo/" && url.searchParams.get("fromDash") === "dash_travel" && url.searchParams.get("scope") === "all");
  await expect(page.locator("#originDashSearchScope")).toHaveValue("all");
  await expect(page.locator("#dashContextMeta")).toContainText("Dash: Поездки");
  await expect(page.locator("#searchInput")).toHaveValue("Pixel 8");
  await expect(page.locator("#resultsGrid .result-card")).toHaveCount(1);
  await expect(page.locator("#resultsGrid .result-card")).toContainText("Ремонт Pixel 8");

  await page.locator("#searchInput").fill("");
  await page.waitForURL(url => url.pathname === "/demo/dashes/dash_travel/" && !url.searchParams.has("q"));
  await expect(page.locator("#savedDashUnifiedContext h2")).toHaveText("Dash: Поездки");
  await expect(page.locator(".dash-result-card:not([hidden])")).toHaveCount(2);
});

test("scope can return to the saved Dash with the same query", async ({ page }) => {
  await page.goto("/demo/dashes/dash_travel/");
  await page.locator("#savedDashSearch").fill("девять дней");
  await page.locator("#savedDashSearchScope").selectOption("all");
  await page.waitForURL(url => url.pathname === "/demo/" && url.searchParams.get("fromDash") === "dash_travel");

  await page.locator("#originDashSearchScope").selectOption("dash");
  await page.waitForURL(url => url.pathname === "/demo/dashes/dash_travel/" && url.searchParams.get("q") === "девять дней");
  await expect(page.locator("#savedDashSearch")).toHaveValue("девять дней");
  await expect(page.locator(".dash-result-card:not([hidden])")).toHaveCount(1);
  await expect(page.locator(".dash-result-card:not([hidden])")).toContainText("Марокко");
});
