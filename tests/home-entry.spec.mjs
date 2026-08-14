import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/demo/?personal=1");
  await expect(page.locator("#dashgptHomeEntry")).toBeVisible();
});

test("home entry routes to canonical import, save-chat and card workflows", async ({ page }) => {
  const home = page.locator("#dashgptHomeEntry");
  await expect(home.locator("#dashgptHomeImport")).toBeVisible();
  await expect(home.locator("#dashgptHomeSaveChat")).toBeVisible();
  await expect(home.locator("#dashgptHomeCards")).toBeVisible();

  await home.locator("#dashgptHomeImport").click();
  await expect(page.locator("#chatgptImportGuideDialog")).toHaveJSProperty("open", true);
  await page.locator("#chatgptImportGuideDialog form[method=dialog] button").click();

  await home.locator("#dashgptHomeSaveChat").click();
  await expect(page.locator("#saveChatDialog")).toHaveJSProperty("open", true);
  await page.locator("#saveChatDialog form[method=dialog] button").click();

  await home.locator("#dashgptHomeCards").click();
  await expect(page.locator("#searchInput")).toBeFocused();
});

test("home entry stays inside a 390px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator("#dashgptHomeEntry")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
