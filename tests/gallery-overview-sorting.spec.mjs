import { expect, test } from "@playwright/test";

const VAULT_KEY = "dashgpt.demo.vault.v1";

function fixtureVault(count = 100) {
  const results = Array.from({ length: count }, (_, index) => ({
    id: `f32-${String(index).padStart(4, "0")}`,
    schemaVersion: 1,
    title: `F32 Fixture ${String(index).padStart(4, "0")}`,
    summary: `Gallery overview fixture ${index}`,
    category: index % 3 === 0 ? "Food" : index % 3 === 1 ? "Travel" : "Software",
    tags: [index % 2 === 0 ? "alpha" : "beta", `fixture-${index % 7}`],
    decisions: [],
    publishedAt: new Date(Date.UTC(2026, 7, 1, 0, index)).toISOString(),
    immutable: false,
    contentVersion: 1
  }));
  return {
    schemaVersion: 1,
    vaultId: "vault-f32-browser",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-13T00:00:00.000Z",
    results,
    events: [],
    profileRevisions: [],
    dashRevisions: []
  };
}

async function openFixture(page, count = 100) {
  await page.addInitScript(({ key, vault }) => localStorage.setItem(key, JSON.stringify(vault)), { key: VAULT_KEY, vault: fixtureVault(count) });
  await page.goto("/demo/?personal=1");
  await page.locator("#searchInput").fill("F32 Fixture");
  await expect(page.locator("#resultsGrid > .result-card")).toHaveCount(count);
  await expect(page.locator("#galleryRegion .gallery-sort")).toBeVisible();
}

async function setOverview(page) {
  await page.locator("#galleryZoom").evaluate(element => {
    element.value = "0";
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

test("Time is default and Color/Tag preserve the exact card set", async ({ page }) => {
  await openFixture(page);

  const cards = page.locator("#resultsGrid > .result-card");
  await expect(page.locator('[data-gallery-sort="time"]')).toHaveAttribute("aria-pressed", "true");
  await expect(cards.first().locator(".title")).toHaveText("F32 Fixture 0099");

  const initialIds = new Set(await cards.evaluateAll(nodes => nodes.map(node => node.dataset.resultId)));

  await page.locator('[data-gallery-sort="color"]').click();
  await expect(page.locator('[data-gallery-sort="color"]')).toHaveAttribute("aria-pressed", "true");
  const colorIds = new Set(await cards.evaluateAll(nodes => nodes.map(node => node.dataset.resultId)));
  expect(colorIds).toEqual(initialIds);
  const hues = await cards.evaluateAll(nodes => nodes.map(node => Number(node.style.getPropertyValue("--semantic-hue"))));
  expect(hues).toEqual([...hues].sort((left, right) => left - right));

  await page.locator('[data-gallery-sort="tag"]').click();
  await expect(page.locator('[data-gallery-sort="tag"]')).toHaveAttribute("aria-pressed", "true");
  const tagIds = new Set(await cards.evaluateAll(nodes => nodes.map(node => node.dataset.resultId)));
  expect(tagIds).toEqual(initialIds);
  const primaryTags = await cards.evaluateAll(nodes => nodes.map(node => node.querySelector(".tag")?.textContent || "~untagged"));
  const firstBeta = primaryTags.findIndex(tag => tag === "#beta");
  expect(firstBeta).toBeGreaterThan(0);
  expect(primaryTags.slice(0, firstBeta).every(tag => tag === "#alpha")).toBe(true);
  expect(primaryTags.slice(firstBeta).every(tag => tag === "#beta")).toBe(true);

  await page.reload();
  await page.locator("#searchInput").fill("F32 Fixture");
  await expect(page.locator('[data-gallery-sort="tag"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#resultsGrid > .result-card")).toHaveCount(100);
});

test("minimum density keeps every selected card and avoids horizontal overflow", async ({ page }, testInfo) => {
  await openFixture(page);
  await setOverview(page);

  await expect(page.locator("#galleryRegion")).toHaveAttribute("data-f32-overview", /compact|heatmap|overflow/);
  await expect(page.locator("#resultsGrid > .result-card")).toHaveCount(100);

  const geometry = await page.evaluate(() => {
    const root = document.querySelector("#galleryRegion");
    const grid = document.querySelector("#resultsGrid");
    return {
      mode: root?.dataset.f32Overview,
      gridHeight: grid?.getBoundingClientRect().height || 0,
      viewportHeight: innerHeight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      columns: Number.parseInt(getComputedStyle(root).getPropertyValue("--f32-overview-columns"), 10) || 0
    };
  });
  expect(geometry.columns).toBeGreaterThan(1);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  if (testInfo.project.name === "desktop-chromium") {
    expect(geometry.mode).toBe("compact");
    expect(geometry.gridHeight).toBeLessThanOrEqual(geometry.viewportHeight * 0.72 + 8);
  }
});

test("2200-card desktop history is simultaneously visible as actionable heat-map tiles", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "large DOM regression is covered once on desktop; mobile geometry is deterministic-tested separately");
  await openFixture(page, 2200);
  await setOverview(page);

  const cards = page.locator("#resultsGrid > .result-card");
  await expect(cards).toHaveCount(2200);
  await expect(page.locator("#galleryRegion")).toHaveAttribute("data-f32-overview", "heatmap");
  await expect(cards.first()).toHaveAttribute("title", /F32 Fixture/);

  const geometry = await page.evaluate(() => {
    const grid = document.querySelector("#resultsGrid");
    return {
      gridHeight: grid?.getBoundingClientRect().height || 0,
      viewportHeight: innerHeight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.gridHeight).toBeLessThanOrEqual(geometry.viewportHeight * 0.72 + 8);

  await cards.first().focus();
  await cards.first().press("Enter");
  await expect(page.locator("#resultDialog")).toBeVisible();
});
