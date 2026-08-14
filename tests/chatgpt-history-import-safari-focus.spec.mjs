import { expect, test } from "./playwright-fixture.mjs";

test("Safari fallback receiver yields focus back to its ChatGPT opener and stays alive", async ({ page }) => {
  await page.goto("/demo/?personal=1");
  await page.evaluate(() => {
    window.__dashgptFocusCalls = 0;
    const nativeFocus = window.focus.bind(window);
    window.focus = () => {
      window.__dashgptFocusCalls += 1;
      nativeFocus();
    };
  });

  const popupPromise = page.waitForEvent("popup");
  await page.evaluate(() => {
    window.open(
      "/demo/?personal=1&chatgptImportReceiver=1&session=safari-focus-session&nonce=safari-focus-nonce",
      "dashgpt-safari-focus-receiver"
    );
  });
  const receiver = await popupPromise;
  await receiver.waitForLoadState("domcontentloaded");

  await expect.poll(() => page.evaluate(() => window.__dashgptFocusCalls)).toBeGreaterThan(0);
  expect(receiver.isClosed()).toBe(false);
  await expect.poll(() => receiver.url()).not.toContain("chatgptImportReceiver");

  await receiver.close();
});
