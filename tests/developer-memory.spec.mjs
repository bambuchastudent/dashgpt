import { expect, test } from "@playwright/test";

function viewTab(page, view) {
  return page.locator(`.view-tab[data-view="${view}"]`);
}

test("developer memory opens on legible DashGPT project state", async ({ page }) => {
  await page.goto("/demo/developer/");

  await expect(page.getByRole("heading", { name: "DashGPT", level: 1 })).toBeVisible();
  await expect(page.getByTestId("memory-path")).toHaveText(".dashgpt/");
  await expect(viewTab(page, "state")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Project State", level: 2 })).toBeVisible();

  await expect(page.getByTestId("product-spine")).toContainText("Capture");
  await expect(page.getByTestId("product-spine")).toContainText("Cards");
  await expect(page.getByTestId("product-spine")).toContainText("Find & organize");
  await expect(page.getByTestId("product-spine")).toContainText("Continue");
  await expect(page.getByTestId("product-spine")).toContainText("Developer memory");

  const now = page.getByTestId("now-section");
  await expect(now).toContainText("Project-local Developer Memory");
  await expect(now).toContainText("PR #34 · ready");
  await expect(now).toContainText("Unified Card Dashboard — My Dash");
  await expect(now).toContainText("PR #33 · draft");
  await expect(now).toContainText("A repository can carry AI-readable engineering memory");
  await expect(now).toContainText("one coherent card surface");
  await expect(now).toContainText("OpenSpec ✓");
  await expect(page.getByText("automatic IDE capture is not active", { exact: false })).toBeVisible();
});

test("project state distinguishes shipped active and next work", async ({ page }) => {
  await page.goto("/demo/developer/");

  await expect(page.getByTestId("state-summary")).toContainText("Active / prototype");
  await expect(page.getByTestId("state-summary")).toContainText("In develop");
  await expect(page.getByTestId("state-summary")).toContainText("Next / planned");

  const workstreams = page.getByTestId("workstreams");
  for (const name of ["Developer Tools", "Experience", "Reliability", "Capture", "Memory"]) {
    await expect(workstreams.getByRole("heading", { name, exact: true })).toBeVisible();
  }

  await expect(workstreams).toContainText("PR #32 merged");
  await expect(page.getByTestId("next-callout")).toContainText("Coding-agent capture adapter");
  await expect(page.getByTestId("next-callout")).toContainText("planned only");
  await expect(page.getByTestId("next-callout")).toContainText("not implemented");
});

test("card detail preserves problem decision outcome evidence and project progress", async ({ page }) => {
  await page.goto("/demo/developer/");

  await page.locator('[data-card-id="project-local-memory"]').first().click();
  const dialog = page.locator("#card-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Project-local Developer Memory" })).toBeVisible();
  await expect(dialog).toContainText("PR #34 · ready");
  await expect(dialog).toContainText("Browser tests ✓");
  await expect(page.getByTestId("detail-flow")).toContainText("Problem");
  await expect(page.getByTestId("detail-flow")).toContainText("Decision");
  await expect(page.getByTestId("detail-flow")).toContainText("Outcome");
  await expect(page.getByTestId("detail-evidence")).toContainText("PR #34 · open / ready");
  await expect(dialog).toContainText("ChatGPT · GPT-5.6 Sol");
  await expect(dialog).toContainText("OpenCode · Provider-neutral agent");
});

test("timeline results and sessions reuse canonical card identities", async ({ page }) => {
  await page.goto("/demo/developer/");

  await viewTab(page, "timeline").click();
  await expect(page.getByTestId("timeline")).toBeVisible();
  await expect(page.getByTestId("timeline")).toContainText("Project-local Developer Memory");
  await expect(page.getByTestId("timeline")).toContainText("Coding-agent capture adapter");

  await viewTab(page, "results").click();
  await expect(page.getByTestId("results-metrics")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Active / prototype", level: 3 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "In develop", level: 3 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Next / planned", level: 3 })).toBeVisible();

  await viewTab(page, "sessions").click();
  await expect(page.getByTestId("sessions-view")).toBeVisible();
  await expect(page.getByTestId("sessions-view")).toContainText("GitHub Copilot");
  await expect(page.getByTestId("sessions-view")).toContainText("Cline");
  await expect(page.getByTestId("sessions-view")).toContainText("Local agent");

  await page.getByTestId("sessions-view").getByRole("button", { name: "Project-local Developer Memory" }).first().click();
  await expect(page.locator("#card-dialog")).toBeVisible();
  await expect(page.locator("#dialog-title")).toHaveText("Project-local Developer Memory");
});

test("developer project-state views stay within the viewport", async ({ page }) => {
  await page.goto("/demo/developer/");

  for (const view of ["state", "timeline", "results", "sessions"]) {
    await viewTab(page, view).click();
    const sizes = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth + 1);
  }
});
