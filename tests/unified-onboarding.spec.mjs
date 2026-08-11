import { expect, test } from "@playwright/test";

test("clean chat-first onboarding is visibly framed as empty My Dash", async ({ page }) => {
  await page.goto("/demo/?personal=1");

  await expect(page.locator("#publicWelcome")).toBeVisible();
  await expect(page.locator("#emptyMyDashContext")).toBeVisible();
  await expect(page.locator("#emptyMyDashContext h2")).toHaveText("My Dash");
  await expect(page.locator("#emptyMyDashContext .eyebrow")).toHaveText("All cards");
  await expect(page.locator("#emptyMyDashContext .muted")).toContainText("0");

  await expect(page.getByRole("heading", { name: "Сохрани разговор через ChatGPT" })).toBeVisible();
  await expect(page.locator("#copyDashGptCommand")).toBeVisible();
  await expect(page.locator(".semantic-dashes")).toBeHidden();
  await expect(page.locator(".result-card")).toHaveCount(0);
});
