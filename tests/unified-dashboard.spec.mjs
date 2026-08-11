import { expect, test } from "@playwright/test";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const NOW = "2026-08-11T08:00:00.000Z";

const RESULTS = [
  { id: "food-salmon", schemaVersion: 1, title: "Малосольный лосось", summary: "Лосось малой соли из 250 г филе.", category: "Еда", tags: ["salmon"], decisions: [], immutable: false, contentVersion: 1 },
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
    vaultId: "vault_unified_browser",
    createdAt: NOW,
    updatedAt: NOW,
    results: RESULTS,
    events: [],
    profileRevisions: [],
    dashRevisions: [TRAVEL_DASH]
  };
}

async function searchVisibilitySnapshot(page) {
  return page.locator("#searchInput").evaluate(input => {
    const chain = [];
    for (let node = input; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      chain.push({
        tag: node.tagName,
        id: node.id,
        className: typeof node.className === "string" ? node.className : "",
        hidden: Boolean(node.hidden),
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        width: rect.width,
        height: rect.height
      });
    }
    return chain;
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ key, vault }) => localStorage.setItem(key, JSON.stringify(vault)), {
    key: VAULT_KEY,
    vault: seedVault()
  });
});

test("My Dash is one card surface and a search selection saves reference-only", async ({ page }) => {
  await page.goto("/demo/?personal=1");

  await expect(page.locator("#unifiedDashContext")).toBeVisible();
  await expect(page.locator("#dashContextTitle")).toHaveText("My Dash");
  await expect(page.locator(".semantic-dashes")).toBeHidden();
  await expect(page.locator("#resultsGrid .result-card")).toHaveCount(4);

  await page.locator("#unifiedDashContext .my-dashes-trigger").click();
  await expect(page.locator("#unifiedDashContext .my-dash-item").first()).toContainText("My Dash");
  await expect(page.locator("#unifiedDashContext .my-dash-item", { hasText: "Поездки" })).toBeVisible();
  const menu = page.locator("#unifiedDashContext .my-dashes-menu");
  await menu.evaluate(node => { node.open = false; });
  await expect(menu).not.toHaveAttribute("open", "");

  const searchInput = page.locator("#searchInput");
  if (!(await searchInput.isVisible())) {
    console.log("UNIFIED_SEARCH_VISIBILITY", JSON.stringify(await searchVisibilitySnapshot(page)));
  }
  await expect(searchInput).toBeVisible();
  await searchInput.fill("лосось");
  await expect(page.locator("#resultsGrid .result-card")).toHaveCount(1);
  await expect(page.locator("#dashContextTitle")).toContainText("Selection: лосось");
  await expect(page.locator("#dashContextMeta")).toContainText("Not saved");
  await expect(page.locator("#saveSelectionButton")).toBeVisible();

  const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), VAULT_KEY);
  expect(before.dashRevisions).toHaveLength(1);
  expect(before.results).toHaveLength(4);

  await page.locator("#saveSelectionButton").click();
  await expect(page.locator("#saveSelectionDialog")).toBeVisible();
  await expect(page.locator("#saveSelectionSummary")).toContainText("1 cards");
  await expect(page.locator("#saveSelectionName")).toHaveValue("Лосось");
  await page.locator("#saveSelectionForm button[type=submit]").click();
  await page.waitForURL(/\/demo\/dashes\/dash_/);

  await expect(page.locator("#savedDashUnifiedContext")).toBeVisible();
  await expect(page.locator("#savedDashUnifiedContext h2")).toHaveText("Dash: Лосось");
  await expect(page.getByRole("link", { name: "Back to My Dash" }).first()).toBeVisible();

  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), VAULT_KEY);
  expect(after.results).toHaveLength(4);
  expect(after.dashRevisions).toHaveLength(2);
  const saved = after.dashRevisions.find(item => item.title === "Лосось");
  expect(saved.automaticResultIds).toEqual(["food-salmon"]);
  expect(saved.suggestedResultIds).toEqual([]);
  expect(saved.updateMode).toBe("review");
  expect(saved.results).toBeUndefined();
});

test("saved Dash keeps context, searches its cards, and returns to My Dash", async ({ page }) => {
  await page.goto("/demo/dashes/dash_travel/");

  await expect(page.locator("#savedDashUnifiedContext h2")).toHaveText("Dash: Поездки");
  await expect(page.locator(".dash-result-card")).toHaveCount(2);
  await expect(page.locator("#savedDashSearchScope")).toHaveValue("dash");

  await page.locator("#savedDashSearch").fill("девять дней");
  await expect(page.locator(".dash-result-card:not([hidden])")).toHaveCount(1);
  await expect(page.locator(".dash-result-card:not([hidden])")).toContainText("Марокко");

  await page.locator("#savedDashSearch").fill("");
  await expect(page.locator(".dash-result-card:not([hidden])")).toHaveCount(2);

  await page.getByRole("link", { name: "Back to My Dash" }).first().click();
  await page.waitForURL(/\/demo\/$/);
  await expect(page.locator("#dashContextTitle")).toHaveText("My Dash");
  await expect(page.locator("#resultsGrid .result-card")).toHaveCount(4);
});

test("360px mobile flow keeps search, My Dashes, active context, and gallery on screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/demo/?personal=1");

  await expect(page.locator("#dashContextTitle")).toBeVisible();
  await expect(page.locator("#searchInput")).toBeVisible();
  await expect(page.locator("#unifiedDashContext .my-dashes-trigger")).toBeVisible();
  await expect(page.locator("#resultsGrid .result-card").first()).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.locator("#unifiedDashContext .my-dashes-trigger").click();
  await page.locator("#unifiedDashContext .my-dash-item", { hasText: "Поездки" }).click();
  await page.waitForURL(/\/demo\/dashes\/dash_travel\/$/);
  await expect(page.locator("#savedDashUnifiedContext h2")).toHaveText("Dash: Поездки");
  await expect(page.getByRole("link", { name: "Back to My Dash" }).first()).toBeVisible();

  const savedOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(savedOverflow).toBeLessThanOrEqual(1);
});
