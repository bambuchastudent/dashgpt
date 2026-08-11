import { expect, test } from "@playwright/test";

test("Product Board keeps its stable route inside the unified Dash context", async ({ page }) => {
  await page.goto("/demo/dash/dashgpt-product/");

  const board = page.locator("#dashgptProductBoard");
  await expect(board).toBeVisible();
  await expect(board.locator(".product-board-head")).toHaveClass(/unified-dash-context/);
  await expect(board.locator(".product-board-intro .eyebrow")).toHaveText("Saved Dash");
  await expect(board.locator(".product-board-intro h2")).toHaveText("Dash: DashGPT Product Board");
  await expect(board.getByRole("link", { name: "Back to My Dash" })).toHaveAttribute("href", "/demo/");
  await expect(board.locator(".product-board-topics h2")).toHaveText("Cards");
});
