import { expect, test } from "./playwright-fixture.mjs";

const IMPORT_ID = "dashgpt-chatgpt-history-import";

test("clean chat-first onboarding uses one canonical My Dash context with the import card", async ({ page }) => {
  await page.goto("/demo/?personal=1");

  await expect(page.locator("#publicWelcome")).toBeVisible();
  await expect(page.locator("#unifiedDashContext")).toBeVisible();
  await expect(page.locator("#unifiedDashContext #dashContextTitle")).toHaveText("My Dash");
  await expect(page.locator("#unifiedDashContext #dashContextEyebrow")).toHaveText("All cards");
  await expect(page.locator("#emptyMyDashContext")).toHaveCount(0);

  await expect(page.getByRole("heading", { name: "Сохрани разговор через ChatGPT" })).toBeVisible();
  await expect(page.locator("#copyDashGptCommand")).toBeVisible();
  await expect(page.locator(".semantic-dashes")).toBeHidden();
  await expect(page.locator(".result-card")).toHaveCount(1);
  await expect(page.locator(`[data-result-id="${IMPORT_ID}"]`)).toBeVisible();
});
