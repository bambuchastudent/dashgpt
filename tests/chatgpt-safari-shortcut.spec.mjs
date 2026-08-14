import { expect, test } from "./playwright-fixture.mjs";

const IMPORT_ID = "dashgpt-chatgpt-history-import";

test.use({
  viewport: { width: 390, height: 844 },
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1"
});

test("iPhone Safari uses Shortcut setup instead of a JavaScript bookmark", async ({ page }) => {
  await page.addInitScript(() => {
    window.__dashgptCopied = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async text => {
          window.__dashgptCopied = String(text || "");
        }
      }
    });
  });

  await page.goto("/demo/?personal=1");
  const card = page.locator(`[data-result-id="${IMPORT_ID}"]`);
  await expect(card).toBeVisible();
  await card.locator(".open-button").click();
  await expect(page.locator("#chatgptExportImportDialog")).toBeVisible();
  await page.locator("#chatgptExportLiveButton").click();

  const dialog = page.locator("#chatgptImportLaunchDialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("data-launch-adapter", "safari-shortcut");
  await expect(dialog.locator("#chatgptImportCopyAction")).toContainText(/Safari Shortcut|Safari/);
  await expect(dialog.locator(".chatgpt-import-steps")).toContainText(/Run JavaScript on Web Page/);
  await expect(dialog.locator(".chatgpt-import-steps")).toContainText(/Share/);
  await expect(dialog.locator(".chatgpt-import-steps")).not.toContainText(/replace its address|Bookmarks → Edit/i);

  await dialog.locator("#chatgptImportCopyAction").click();
  const copied = await page.evaluate(() => window.__dashgptCopied);
  expect(copied.startsWith("javascript:")).toBe(false);
  expect(copied).toContain("completion");
  expect(copied).toContain("dashgpt-progressive-import-source");
  expect(copied).toContain("connect.click()");
  expect(copied).toContain(locationOriginForTest(page.url()));

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

function locationOriginForTest(url) {
  return new URL(url).origin;
}
