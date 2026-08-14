import { expect, test as base } from "@playwright/test";

const waitForDashGpt = async page => {
  const url = new URL(page.url());
  if (url.origin === "http://127.0.0.1:4173" && url.pathname.startsWith("/demo")) {
    await page.locator('html[data-dashgpt-ready="true"]').waitFor();
  }
};

export const test = base.extend({
  page: async ({ page }, use) => {
    for (const method of ["goto", "reload", "goBack", "goForward", "waitForURL"]) {
      const navigate = page[method].bind(page);
      page[method] = async (...args) => {
        const response = await navigate(...args);
        await waitForDashGpt(page);
        return response;
      };
    }

    await use(page);
  }
});

export { expect };
