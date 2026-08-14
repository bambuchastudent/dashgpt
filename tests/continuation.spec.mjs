import { expect, test } from "./playwright-fixture.mjs";

const RESULT_ID = "camping-fishing-el-regajo-fuente-munoz";
const RESULT_PATH = `/demo/result/${RESULT_ID}/`;
const SHOWCASE_PATH = "/demo/?showcase=1";
const VAULT_KEY = "dashgpt.demo.vault.v1";

async function installSuccessfulBrowserTransport(page) {
  await page.addInitScript(() => {
    window.__dashgptTransport = { copied: null, opened: [] };
    Object.defineProperty(window, "open", {
      configurable: true,
      value: () => {
        const state = { navigated: null, closed: false, openerCleared: false };
        window.__dashgptTransport.opened.push(state);
        return {
          set opener(value) { state.openerCleared = value === null; },
          get opener() { return state.openerCleared ? null : window; },
          location: { assign(url) { state.navigated = url; } },
          close() { state.closed = true; }
        };
      }
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async text => { window.__dashgptTransport.copied = text; } }
    });
  });
}

async function continuationEvents(page) {
  return page.evaluate(key => {
    const vault = JSON.parse(localStorage.getItem(key));
    return vault.events.filter(event => event.type === "result.activity" && event.value === "continue.new-chat");
  }, VAULT_KEY);
}

test("dashboard detail and standalone page use the same current-Result continuation controller", async ({ page }) => {
  await installSuccessfulBrowserTransport(page);
  await page.goto(SHOWCASE_PATH);
  const card = page.locator(".result-card", { hasText: "Ночёвка с палаткой для рыбалки" });
  await card.getByRole("button", { name: "Open" }).click();
  await expect(page.locator("#resultDialog")).toBeVisible();
  await page.locator("#resultDialog").getByText("More ···").click();
  await page.locator("#resultDialog").getByRole("button", { name: "Preview context" }).click();
  const dashboardBrief = await page.locator("#continuationOutput").inputValue();
  expect(dashboardBrief).toContain("## Принятые решения");
  await page.getByRole("button", { name: "Закрыть" }).click();

  await page.goto(RESULT_PATH);
  await page.getByRole("button", { name: "Preview context" }).click();
  await expect(page.locator("#continuationOutput")).toHaveValue(dashboardBrief);
  expect(await continuationEvents(page)).toHaveLength(0);
});

test("expanded Gallery card Continue sends a structured brief and records only confirmed transport", async ({ page }) => {
  await installSuccessfulBrowserTransport(page);
  await page.goto(SHOWCASE_PATH);
  await page.locator("#galleryZoomIn").click();
  await page.locator("#galleryZoomIn").click();
  const card = page.locator(".result-card", { hasText: "Ночёвка с палаткой для рыбалки" });
  await card.getByRole("button", { name: "Continue ↗" }).click();
  await expect(page.locator("#continuationLiveStatus")).toContainText("ChatGPT открыт");
  const transport = await page.evaluate(() => window.__dashgptTransport);
  expect(transport.opened).toHaveLength(1);
  const prompt = new URL(transport.opened[0].navigated).searchParams.get("q");
  expect(prompt).toContain("## Текущее состояние");
  expect(prompt).toContain("## Инструкции для ассистента");
  expect(await continuationEvents(page)).toHaveLength(1);
});

test("preview is structured and the direct action sends exactly the prepared current brief", async ({ page }) => {
  await installSuccessfulBrowserTransport(page);
  await page.goto(RESULT_PATH);
  await page.getByRole("button", { name: "Preview context" }).click();

  const dialog = page.locator("#continuationDialog");
  await expect(dialog).toBeVisible();
  const preview = page.locator("#continuationOutput");
  const exactText = await preview.inputValue();
  expect(exactText).toContain("# Продолжение из DashGPT");
  expect(exactText).toContain("## Краткое содержание");
  expect(exactText).toContain("## Текущее состояние");
  expect(exactText).toContain("## Принятые решения");
  expect(exactText).not.toContain("## Ограничения");
  expect(exactText).not.toContain("## Открытые вопросы");
  expect(exactText).toContain("## Предлагаемый следующий шаг");
  expect(exactText).toContain("## Инструкции для ассистента");
  expect(exactText.trim()).not.toBe("Ночёвка с палаткой для рыбалки: El Regajo и Fuente Muñoz");

  await page.getByRole("button", { name: "Закрыть" }).click();
  await page.getByRole("button", { name: "Continue in new chat" }).click();
  await expect(page.locator("#continuationLiveStatus")).toContainText("ChatGPT открыт");

  const transport = await page.evaluate(() => window.__dashgptTransport);
  expect(transport.opened).toHaveLength(1);
  expect(transport.opened[0].openerCleared).toBe(true);
  expect(new URL(transport.opened[0].navigated).searchParams.get("q")).toBe(exactText);
  const events = await continuationEvents(page);
  expect(events).toHaveLength(1);
  expect(Object.keys(events[0]).sort()).toEqual(["createdAt", "eventId", "resultId", "schemaVersion", "type", "value"]);
  expect(JSON.stringify(events[0])).not.toContain("Ночёвка");
});

test("preview editing and copying are exact and transient", async ({ page }) => {
  await installSuccessfulBrowserTransport(page);
  await page.goto(RESULT_PATH);
  await page.getByRole("button", { name: "Preview context" }).click();
  const preview = page.locator("#continuationOutput");
  const original = await preview.inputValue();
  const edited = `${original}\nРучная правка только для этого продолжения 🧭\n`;
  await preview.fill(edited);
  await page.locator("#copyContinuationButton").click();
  await expect(page.locator("#continuationPreviewStatus")).toContainText("скопирован");
  expect(await page.evaluate(() => window.__dashgptTransport.copied)).toBe(edited);
  await page.getByRole("button", { name: "Закрыть" }).click();

  await page.getByRole("button", { name: "Preview context" }).click();
  await expect(preview).toHaveValue(original);
  expect(await preview.inputValue()).not.toContain("Ручная правка");
  const storedHasEdit = await page.evaluate(key => localStorage.getItem(key).includes("Ручная правка"), VAULT_KEY);
  expect(storedHasEdit).toBe(false);
  expect(await continuationEvents(page)).toHaveLength(0);
});

test("popup blocking preserves context but does not record successful continuation", async ({ page }) => {
  await page.addInitScript(() => {
    window.__dashgptTransport = { copied: null };
    Object.defineProperty(window, "open", { configurable: true, value: () => null });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async text => { window.__dashgptTransport.copied = text; } }
    });
  });
  await page.goto(RESULT_PATH);
  await page.getByRole("button", { name: "Continue in new chat" }).click();
  await expect(page.locator("#continuationDialog")).toBeVisible();
  await expect(page.locator("#continuationPreviewStatus")).toContainText("окно заблокировано");
  await expect(page.locator("#continuationManualTarget")).toBeVisible();
  const copied = await page.evaluate(() => window.__dashgptTransport.copied);
  expect(copied).toContain("## Инструкции для ассистента");
  expect(await continuationEvents(page)).toHaveLength(0);
});

test("clipboard denial keeps an oversized edited payload selectable and records no success", async ({ page }) => {
  await page.addInitScript(() => {
    window.__dashgptTransport = { opened: [] };
    Object.defineProperty(window, "open", {
      configurable: true,
      value: () => {
        const state = { navigated: null, closed: false };
        window.__dashgptTransport.opened.push(state);
        return {
          opener: window,
          location: { assign(url) { state.navigated = url; } },
          close() { state.closed = true; }
        };
      }
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => { throw new DOMException("Denied", "NotAllowedError"); } }
    });
    document.execCommand = () => false;
  });
  await page.goto(RESULT_PATH);
  await page.getByRole("button", { name: "Preview context" }).click();
  const oversized = `# Продолжение из DashGPT\n\n${"Очень длинный точный текст 🧩 ".repeat(3_000)}`;
  await page.locator("#continuationOutput").fill(oversized);
  await page.locator("#continueFromPreviewButton").click();
  await expect(page.locator("#continuationPreviewStatus")).toContainText("Буфер обмена недоступен");
  await expect(page.locator("#continuationOutput")).toHaveValue(oversized);
  const state = await page.evaluate(() => window.__dashgptTransport.opened[0]);
  expect(state.closed).toBe(true);
  expect(state.navigated).toBeNull();
  expect(await continuationEvents(page)).toHaveLength(0);
});

test("preview and controls fit a narrow viewport without horizontal page overflow", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "mobile-specific layout assertion");
  await installSuccessfulBrowserTransport(page);
  await page.goto(RESULT_PATH);
  await page.getByRole("button", { name: "Preview context" }).click();
  const metrics = await page.evaluate(() => {
    const dialog = document.querySelector("#continuationDialog").getBoundingClientRect();
    const output = document.querySelector("#continuationOutput").getBoundingClientRect();
    const buttons = [...document.querySelectorAll(".continuation-dialog-actions .button:not([hidden])")]
      .map(node => node.getBoundingClientRect());
    return {
      viewport: window.innerWidth,
      bodyScrollWidth: document.documentElement.scrollWidth,
      dialog: { left: dialog.left, right: dialog.right, width: dialog.width },
      output: { left: output.left, right: output.right },
      buttons: buttons.map(box => ({ left: box.left, right: box.right, width: box.width }))
    };
  });
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.dialog.left).toBeGreaterThanOrEqual(0);
  expect(metrics.dialog.right).toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.output.left).toBeGreaterThanOrEqual(metrics.dialog.left);
  expect(metrics.output.right).toBeLessThanOrEqual(metrics.dialog.right);
  for (const button of metrics.buttons) {
    expect(button.left).toBeGreaterThanOrEqual(metrics.dialog.left);
    expect(button.right).toBeLessThanOrEqual(metrics.dialog.right);
    expect(button.width).toBeGreaterThan(0);
  }
});
