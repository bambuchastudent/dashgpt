import { expect, test } from "@playwright/test";

function viewTab(page, view) {
  return page.locator(`.view-tab[data-view="${view}"]`);
}

test("developer memory opens as a provider-neutral project map", async ({ page }) => {
  await page.goto("/demo/developer/");

  await expect(page.getByRole("heading", { name: "DashGPT", level: 1 })).toBeVisible();
  await expect(page.getByTestId("memory-path")).toHaveText(".dashgpt/");
  await expect(viewTab(page, "map")).toHaveAttribute("aria-pressed", "true");
  await expect(viewTab(page, "timeline")).toBeVisible();
  await expect(viewTab(page, "results")).toBeVisible();
  await expect(viewTab(page, "sessions")).toBeVisible();
  await expect(page.getByTestId("project-map")).toBeVisible();
  await expect(page.getByText("Developer memory", { exact: true })).toBeVisible();
  await expect(page.getByText("automatic IDE capture is not active", { exact: false })).toBeVisible();
});

test("card detail preserves problem decision outcome and evidence", async ({ page }) => {
  await page.goto("/demo/developer/");

  await page.locator('[data-card-id="project-local-memory"]').first().click();
  const dialog = page.locator("#card-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Project-local developer memory" })).toBeVisible();
  await expect(page.getByTestId("detail-flow")).toContainText("Problem");
  await expect(page.getByTestId("detail-flow")).toContainText("Decision");
  await expect(page.getByTestId("detail-flow")).toContainText("Outcome");
  await expect(page.getByTestId("detail-evidence")).toContainText("F19 strict OpenSpec change");
  await expect(dialog).toContainText("ChatGPT · GPT-5.6 Sol");
  await expect(dialog).toContainText("OpenCode · Provider-neutral agent");
});

test("timeline results and sessions reuse canonical card identities", async ({ page }) => {
  await page.goto("/demo/developer/");

  await viewTab(page, "timeline").click();
  await expect(page.getByTestId("timeline")).toBeVisible();
  await expect(page.getByTestId("timeline")).toContainText("Project-local developer memory");

  await viewTab(page, "results").click();
  await expect(page.getByTestId("results-metrics")).toBeVisible();
  await expect(page.getByRole("heading", { name: "In progress", level: 3 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Shipped", level: 3 })).toBeVisible();

  await viewTab(page, "sessions").click();
  await expect(page.getByTestId("sessions-view")).toBeVisible();
  await expect(page.getByTestId("sessions-view")).toContainText("GitHub Copilot");
  await expect(page.getByTestId("sessions-view")).toContainText("Cline");
  await expect(page.getByTestId("sessions-view")).toContainText("Local agent");

  await page.getByTestId("sessions-view").getByRole("button", { name: "Project-local developer memory" }).first().click();
  await expect(page.locator("#card-dialog")).toBeVisible();
  await expect(page.locator("#dialog-title")).toHaveText("Project-local developer memory");
});

test("developer views stay within the viewport", async ({ page }) => {
  await page.goto("/demo/developer/");

  for (const view of ["map", "timeline", "results", "sessions"]) {
    await viewTab(page, view).click();
    const sizes = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth + 1);
  }
});
