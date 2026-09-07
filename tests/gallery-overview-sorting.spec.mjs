import { expect, test } from "./playwright-fixture.mjs";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const SORT_KEY = "dashgpt.demo.gallery-sort.v2";

function fixtureVault(count = 100) {
  const results = Array.from({ length: count }, (_, index) => ({
    id: `f32-${String(index).padStart(4, "0")}`,
    schemaVersion: 1,
    title: `F32 Fixture ${String(index).padStart(4, "0")}`,
    summary: `Gallery overview fixture ${index}`,
    category: index % 5 === 0 ? "Food" : index % 5 === 1 ? "Travel" : index % 5 === 2 ? "Software" : index % 5 === 3 ? "Home" : "Language",
    tags: [index % 2 === 0 ? "alpha" : "beta", `fixture-${index % 31}`],
    decisions: [],
    publishedAt: new Date(Date.UTC(2026, 7, 1, 0, index)).toISOString(),
    immutable: false,
    contentVersion: 1
  }));
  return {
    schemaVersion: 1,
    vaultId: "vault-f32-browser",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-14T00:00:00.000Z",
    results,
    events: [],
    profileRevisions: [],
    dashRevisions: []
  };
}

async function openFixture(page, count = 100) {
  await page.addInitScript(({ key, sortKey, vault }) => {
    if (sessionStorage.getItem("dashgpt.f32-fixture-ready") === "1") return;
    localStorage.setItem(key, JSON.stringify(vault));
    localStorage.removeItem(sortKey);
    localStorage.removeItem("dashgpt.demo.gallery-sort.v1");
    sessionStorage.setItem("dashgpt.f32-fixture-ready", "1");
  }, { key: VAULT_KEY, sortKey: SORT_KEY, vault: fixtureVault(count) });
  await page.goto("/demo/");
  await page.locator("#searchInput").fill("F32 Fixture");
  await expect(page.locator("#resultsGrid > .result-card")).toHaveCount(count);
  await expect(page.locator("#galleryRegion .gallery-sort")).toBeVisible();
  await expect.poll(async () => page.locator("#resultsGrid > .result-card").evaluateAll(
    (nodes, expectedCount) => nodes.length === expectedCount && nodes.every(node => /^\d+$/.test(node.dataset.semanticPalette || "")),
    count
  )).toBe(true);
}

async function setOverview(page) {
  await page.locator("#galleryZoom").evaluate(element => {
    element.value = "0";
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function openGalleryStressHarness(page, count) {
  const stressPage = await page.context().newPage();
  const vault = fixtureVault(count);
  await stressPage.goto("/demo/data/results.json");
  await stressPage.evaluate(({ key, sortKey, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.removeItem(sortKey);
    localStorage.removeItem("dashgpt.demo.gallery-sort.v1");
  }, { key: VAULT_KEY, sortKey: SORT_KEY, value: vault });

  const cards = vault.results.map(result => `
    <article class="result-card" data-result-id="${result.id}">
      <div class="card-topline"><span class="category">${result.category}</span></div>
      <h3 class="title">${result.title}</h3>
      <p class="summary">${result.summary}</p>
      <div class="tags"><span class="tag">#${result.tags[0]}</span></div>
    </article>`).join("");

  await stressPage.setContent(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
          html,body{margin:0;width:100%;height:100%;overflow-x:hidden}
          #galleryRegion{box-sizing:border-box;width:100%;padding:8px}
          .gallery-heading-actions{display:flex;align-items:center;gap:8px}
          .results-grid{display:grid;width:100%;box-sizing:border-box}
          .result-card{box-sizing:border-box}
        </style>
      </head>
      <body>
        <section id="galleryRegion" class="gallery-region" data-gallery-detail="compact">
          <div class="gallery-heading-actions"></div>
          <input id="galleryZoom" type="range" min="0" max="4" step="1" value="0" aria-label="Gallery density">
          <div id="resultsGrid" class="results-grid">${cards}</div>
        </section>
      </body>
    </html>`);

  await stressPage.evaluate(async () => {
    const module = await import("/demo/gallery-overview-sorting.js?f47-stress=1");
    module.initializeGalleryOverviewSorting();
  });
  await expect(stressPage.locator("#galleryRegion")).toHaveAttribute("data-f32-overview", "heatmap", { timeout: 10_000 });
  return stressPage;
}

test("Color is default, controls are Color Tag Time, and palette is bounded to 32 slots", async ({ page }) => {
  await openFixture(page);

  const buttons = page.locator("#galleryRegion .gallery-sort [data-gallery-sort]");
  await expect(buttons).toHaveCount(3);
  expect(await buttons.evaluateAll(nodes => nodes.map(node => node.dataset.gallerySort))).toEqual(["color", "tag", "time"]);
  await expect(page.locator('button[data-gallery-sort="color"]')).toHaveAttribute("aria-pressed", "true");

  const cards = page.locator("#resultsGrid > .result-card");
  const initialIds = new Set(await cards.evaluateAll(nodes => nodes.map(node => node.dataset.resultId)));
  const slots = await cards.evaluateAll(nodes => nodes.map(node => Number(node.dataset.semanticPalette)));
  expect(slots).toEqual([...slots].sort((left, right) => left - right));
  expect(new Set(slots).size).toBeLessThanOrEqual(32);
  expect(slots.every(slot => Number.isInteger(slot) && slot >= 0 && slot < 32)).toBe(true);

  const hues = await cards.evaluateAll(nodes => nodes.map(node => Number(node.style.getPropertyValue("--semantic-hue"))));
  expect(new Set(hues).size).toBeLessThanOrEqual(32);
  expect(hues.every(hue => Math.abs((hue / 11.25) - Math.round(hue / 11.25)) < 0.0001)).toBe(true);

  await page.locator('button[data-gallery-sort="tag"]').click();
  await expect(page.locator('button[data-gallery-sort="tag"]')).toHaveAttribute("aria-pressed", "true");
  expect(new Set(await cards.evaluateAll(nodes => nodes.map(node => node.dataset.resultId)))).toEqual(initialIds);
  const primaryTags = await cards.evaluateAll(nodes => nodes.map(node => node.querySelector(".tag")?.textContent || "~untagged"));
  const firstBeta = primaryTags.findIndex(tag => tag === "#beta");
  expect(firstBeta).toBeGreaterThan(0);
  expect(primaryTags.slice(0, firstBeta).every(tag => tag === "#alpha")).toBe(true);
  expect(primaryTags.slice(firstBeta).every(tag => tag === "#beta")).toBe(true);

  await page.locator('button[data-gallery-sort="time"]').click();
  await expect(cards.first().locator(".title")).toHaveText("F32 Fixture 0099");

  await page.reload();
  await page.locator("#searchInput").fill("F32 Fixture");
  await expect(page.locator('button[data-gallery-sort="time"]')).toHaveAttribute("aria-pressed", "true");
});

test("old v1 Time preference is superseded by Color-first v2 default", async ({ page }) => {
  await page.addInitScript(({ key, vault }) => {
    localStorage.setItem(key, JSON.stringify(vault));
    localStorage.setItem("dashgpt.demo.gallery-sort.v1", JSON.stringify({ version: 1, sortMode: "time" }));
    localStorage.removeItem("dashgpt.demo.gallery-sort.v2");
  }, { key: VAULT_KEY, vault: fixtureVault(20) });
  await page.goto("/demo/");
  await page.locator("#searchInput").fill("F32 Fixture");
  await expect(page.locator('button[data-gallery-sort="color"]')).toHaveAttribute("aria-pressed", "true");
});

test("minimum density keeps the complete selection without horizontal overflow", async ({ page }) => {
  await openFixture(page, 100);
  await setOverview(page);

  await expect(page.locator("#galleryRegion")).toHaveAttribute("data-f32-overview", /compact|heatmap/);
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
  expect(geometry.gridHeight).toBeLessThanOrEqual(geometry.viewportHeight + 1);
});

test("2200 cards fit simultaneously on one screen as Color-sorted heat-map tiles", async ({ page }) => {
  test.setTimeout(20_000);
  const stressPage = await openGalleryStressHarness(page, 2200);
  try {
    const cards = stressPage.locator("#resultsGrid > .result-card");
    await expect(cards).toHaveCount(2200);
    await expect(stressPage.locator('button[data-gallery-sort="color"]')).toHaveAttribute("aria-pressed", "true");
    await expect(stressPage.locator("#galleryRegion")).toHaveAttribute("data-f32-overview", "heatmap");
    await expect(cards.first()).toHaveAttribute("title", /F32 Fixture/);

    const geometry = await stressPage.evaluate(() => {
      const grid = document.querySelector("#resultsGrid");
      const root = document.querySelector("#galleryRegion");
      const rect = grid?.getBoundingClientRect();
      const cardNodes = [...document.querySelectorAll("#resultsGrid > .result-card")];
      return {
        gridHeight: rect?.height || 0,
        viewportHeight: innerHeight,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ids: cardNodes.map(node => node.dataset.resultId),
        slots: cardNodes.map(node => Number(node.dataset.semanticPalette)),
        columns: Number.parseInt(getComputedStyle(root).getPropertyValue("--f32-overview-columns"), 10) || 0
      };
    });
    expect(geometry.overflow).toBeLessThanOrEqual(1);
    expect(geometry.gridHeight).toBeLessThanOrEqual(geometry.viewportHeight + 1);
    expect(geometry.columns).toBeGreaterThan(20);
    expect(geometry.ids).toHaveLength(2200);
    expect(new Set(geometry.ids).size).toBe(2200);
    expect(geometry.slots).toEqual([...geometry.slots].sort((left, right) => left - right));
    expect(new Set(geometry.slots).size).toBeLessThanOrEqual(32);
  } finally {
    await stressPage.close();
  }
});