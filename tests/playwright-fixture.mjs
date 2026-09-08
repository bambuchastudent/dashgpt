import { expect, test as base } from "@playwright/test";

const READY_TIMEOUT_MS = process.env.CI ? 5_000 : 10_000;

const waitForDashGpt = async (page, pageErrors) => {
  const url = new URL(page.url());
  if (url.origin !== "http://127.0.0.1:4173" || !url.pathname.startsWith("/demo")) return;

  try {
    await page.locator('html[data-dashgpt-ready="true"]').waitFor({
      state: "attached",
      timeout: READY_TIMEOUT_MS
    });
  } catch (error) {
    const readyState = await page.locator("html").getAttribute("data-dashgpt-ready").catch(() => null);
    const diagnostics = pageErrors.length
      ? ` Page errors: ${pageErrors.slice(-3).join(" | ")}`
      : "";
    throw new Error(
      `DashGPT demo did not become ready within ${READY_TIMEOUT_MS}ms at ${page.url()} ` +
      `(data-dashgpt-ready=${readyState ?? "missing"}).${diagnostics}`,
      { cause: error }
    );
  }
};

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.clearCookies();
    await context.clearPermissions();
    await use(context);
  },
  page: async ({ page }, use) => {
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    for (const method of ["goto", "reload", "goBack", "goForward", "waitForURL"]) {
      const navigate = page[method].bind(page);
      page[method] = async (...args) => {
        const response = await navigate(...args);
        await waitForDashGpt(page, pageErrors);
        return response;
      };
    }

    await use(page);
  }
});

export { expect };
