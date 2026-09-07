import { expect, test } from "./playwright-fixture.mjs";

const DEMO_URL = "http://127.0.0.1:4173/demo/?showcase=1";
const READY = 'html[data-dashgpt-ready="true"]';
const LOCAL_KEY = "dashgpt.test.isolation.local";
const SESSION_KEY = "dashgpt.test.isolation.session";

test("browser contexts isolate DashGPT storage", async ({ browser }) => {
  const first = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const second = await browser.newContext({ storageState: { cookies: [], origins: [] } });

  try {
    const firstPage = await first.newPage();
    await firstPage.goto(DEMO_URL);
    await firstPage.locator(READY).waitFor({ state: "attached", timeout: 5_000 });
    await firstPage.evaluate(({ localKey, sessionKey }) => {
      localStorage.setItem(localKey, "first-context");
      sessionStorage.setItem(sessionKey, "first-context");
    }, { localKey: LOCAL_KEY, sessionKey: SESSION_KEY });
    await first.addCookies([{
      name: "dashgpt-test-isolation",
      value: "first-context",
      url: "http://127.0.0.1:4173"
    }]);

    const secondPage = await second.newPage();
    await secondPage.goto(DEMO_URL);
    await secondPage.locator(READY).waitFor({ state: "attached", timeout: 5_000 });

    const secondStorage = await secondPage.evaluate(({ localKey, sessionKey }) => ({
      local: localStorage.getItem(localKey),
      session: sessionStorage.getItem(sessionKey)
    }), { localKey: LOCAL_KEY, sessionKey: SESSION_KEY });
    const secondCookies = await second.cookies("http://127.0.0.1:4173");

    expect(secondStorage.local).toBeNull();
    expect(secondStorage.session).toBeNull();
    expect(secondCookies.some(cookie => cookie.name === "dashgpt-test-isolation")).toBe(false);
  } finally {
    await Promise.all([first.close(), second.close()]);
  }
});
