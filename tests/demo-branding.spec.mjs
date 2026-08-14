import { test, expect } from "./playwright-fixture.mjs";

const TITLE = "DashGPT — Save, find and continue useful AI work";
const DESCRIPTION = "DashGPT is your personal AI memory for ChatGPT and other assistants: save useful outcomes as cards, find them later, and continue with the context preserved.";
const ORIGIN = "https://dashgpt.dimkashir.workers.dev";
const CANONICAL = `${ORIGIN}/demo/`;
const SOCIAL_IMAGE = `${ORIGIN}/demo/og-card.png`;

test("public demo exposes production-grade browser, search and social metadata", async ({ page, request }) => {
  const response = await page.goto("/demo/");
  expect(response?.headers()["x-robots-tag"]).toBeUndefined();

  await expect(page).toHaveTitle(TITLE);
  await expect(page.locator(".topbar .subtitle")).toContainText(/Полезное из твоих разговоров с ИИ|personal AI memory/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", DESCRIPTION);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/demo/favicon.svg");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/demo/site.webmanifest");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", CANONICAL);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", TITLE);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", DESCRIPTION);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", CANONICAL);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", SOCIAL_IMAGE);
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", SOCIAL_IMAGE);

  const structured = JSON.parse(await page.locator("#dashgptStructuredData").textContent());
  expect(structured["@type"]).toBe("WebApplication");
  expect(structured.name).toBe("DashGPT");
  expect(structured.url).toBe(CANONICAL);
  expect(structured.description).toBe(DESCRIPTION);
  expect(structured.operatingSystem).toBe("Web");

  const faviconResponse = await request.get("/demo/favicon.svg");
  expect(faviconResponse.ok()).toBeTruthy();
  expect(faviconResponse.headers()["content-type"]).toContain("image/svg+xml");

  const imageResponse = await request.get("/demo/og-card.png");
  expect(imageResponse.ok()).toBeTruthy();
  expect(imageResponse.headers()["content-type"]).toContain("image/png");

  const manifestResponse = await request.get("/demo/site.webmanifest");
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe("DashGPT");
  expect(manifest.description).toBe(DESCRIPTION);
  expect(manifest.start_url).toBe("/demo/");

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  const robotsText = await robots.text();
  expect(robotsText).toContain("Allow: /demo/");
  expect(robotsText).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  expect(sitemap.headers()["content-type"]).toContain("application/xml");
  expect(await sitemap.text()).toContain(`<loc>${CANONICAL}</loc>`);
});

test("personal and deep application views are response-level noindex", async ({ request }) => {
  const personal = await request.get("/demo/?personal=1");
  expect(personal.headers()["x-robots-tag"]).toBe("noindex, nofollow");

  const deep = await request.get("/demo/result/example/");
  expect(deep.ok()).toBeTruthy();
  expect(deep.headers()["x-robots-tag"]).toBe("noindex, nofollow");
});
