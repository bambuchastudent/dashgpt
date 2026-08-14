import { expect, test } from "./playwright-fixture.mjs";
import { GALLERY_REFLOW_ANIMATION_CARD_LIMIT, shouldAnimateGalleryReflow } from "../demo/semantic-gallery.js";
import { galleryCardCue } from "../demo/gallery-overview-sorting.js";

test("F44 card cue and large-board animation policy", () => {
  expect(galleryCardCue({ title: "Title", summary: "  useful   summary  " })).toBe("useful summary");
  expect(galleryCardCue({ title: "Fallback", summary: "   " })).toBe("Fallback");
  expect(galleryCardCue({ title: "x", summary: "a".repeat(200) }).length).toBeLessThanOrEqual(96);
  expect(GALLERY_REFLOW_ANIMATION_CARD_LIMIT).toBeGreaterThanOrEqual(100);
  expect(shouldAnimateGalleryReflow(100, true)).toBe(true);
  expect(shouldAnimateGalleryReflow(2200, true)).toBe(false);
  expect(shouldAnimateGalleryReflow(20, false)).toBe(false);
});

test("minimum density keeps visible cues and avoids a full data refresh", async ({ page }) => {
  await page.goto("/demo/?showcase=1");
  await expect(page.locator("#resultsGrid > .result-card").first()).toBeVisible();
  const before = await page.evaluate(() => window.__dashgptGalleryF44?.getRefreshStats());
  await page.locator("#galleryZoom").evaluate(element => {
    element.value = "0";
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#galleryRegion")).toHaveAttribute("data-f44-overview", /compact|heatmap|overflow/);
  const first = page.locator("#resultsGrid > .result-card").first();
  await expect(first).toHaveAttribute("data-f44-cue", /.+/);
  const visibleCue = await first.evaluate(card => {
    const mode = card.closest(".gallery-region")?.dataset.f44Overview;
    if (mode === "compact") return getComputedStyle(card.querySelector(".summary")).display !== "none";
    return getComputedStyle(card, "::after").content !== "none";
  });
  expect(visibleCue).toBe(true);
  const after = await page.evaluate(() => window.__dashgptGalleryF44?.getRefreshStats());
  expect(after.full).toBe(before.full);
  expect(after.overview).toBeGreaterThan(before.overview);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("390px minimum-density overview stays inside the mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo/?showcase=1");
  await page.locator("#galleryZoom").evaluate(element => {
    element.value = "0";
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#galleryRegion")).toHaveAttribute("data-f44-overview", /compact|heatmap|overflow/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator("#resultsGrid > .result-card").first()).toHaveAttribute("data-f44-cue", /.+/);
});
