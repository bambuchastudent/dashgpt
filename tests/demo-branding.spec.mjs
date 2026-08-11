import { test, expect } from "@playwright/test";

const TITLE = "DashGPT — Save, find and continue useful AI work";
const DESCRIPTION = "DashGPT keeps useful outcomes from AI conversations as cards so you can find them and continue your work later.";

test("public demo exposes stable browser and SEO metadata", async ({ page, request }) => {
  await page.goto("/demo/");

  await expect(page).toHaveTitle(TITLE);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", DESCRIPTION);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/demo/favicon.svg");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/demo/site.webmanifest");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "/demo/");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", TITLE);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", DESCRIPTION);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary");

  const faviconResponse = await request.get("/demo/favicon.svg");
  expect(faviconResponse.ok()).toBeTruthy();
  expect(faviconResponse.headers()["content-type"]).toContain("image/svg+xml");

  const manifestResponse = await request.get("/demo/site.webmanifest");
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe("DashGPT");
  expect(manifest.start_url).toBe("/demo/");
  expect(manifest.icons.some((icon) => icon.src === "/demo/favicon.svg")).toBeTruthy();
});
