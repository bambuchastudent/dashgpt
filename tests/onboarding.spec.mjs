import { expect, test } from "@playwright/test";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const MOBILE_SHARE_URL = "https://chatgpt.com/s/t_onboarding-test";
const CANONICAL_SHARE_URL = "https://chatgpt.com/share/t_onboarding-test";

test("clean personal entry shows welcome and no publisher cards", async ({ page }) => {
  await page.goto("/demo/?personal=1");

  await expect(page.locator("#publicWelcome")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Сохрани полезное из первого разговора" })).toBeVisible();
  await expect(page.locator(".result-card")).toHaveCount(0);
  await expect(page.getByText("Ночёвка с палаткой для рыбалки", { exact: false })).toHaveCount(0);
  await expect(page.locator("#storageButton")).toBeHidden();

  const storedResults = await page.evaluate(key => {
    const vault = JSON.parse(localStorage.getItem(key));
    return vault?.results || [];
  }, VAULT_KEY);
  expect(storedResults).toHaveLength(0);
});

test("sharing a visitor chat creates only the visitor's first card", async ({ page }) => {
  let requestedShareUrl = "";
  await page.route("**/api/shared-chat?**", async route => {
    requestedShareUrl = new URL(route.request().url()).searchParams.get("url") || "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        title: "Мой план на выходные",
        messages: [
          { author: "user", content: { parts: ["Хочу придумать спокойный план на выходные."] } },
          { author: "assistant", content: { parts: ["Собрали простой план: утром рынок, днём парк, вечером ужин рядом с домом. Без лишних переездов."] } }
        ]
      })
    });
  });

  await page.goto("/demo/?personal=1");
  await page.locator("#publicShareUrl").fill(MOBILE_SHARE_URL);
  await page.getByRole("button", { name: "Добавить мой чат" }).click();

  await expect(page.locator("#publicShareReview")).toBeVisible();
  expect(requestedShareUrl).toBe(CANONICAL_SHARE_URL);
  await expect(page.locator("#publicReviewTitle")).toHaveValue("Мой план на выходные");
  await expect(page.locator("#publicReviewSummary")).toHaveValue(/утром рынок/);

  await page.getByRole("button", { name: "Сохранить первую карточку" }).click();
  await page.waitForURL(/\/demo\/$/);

  await expect(page.locator("#publicWelcome")).toHaveCount(0);
  await expect(page.locator(".result-card")).toHaveCount(1);
  await expect(page.locator(".result-card")).toContainText("Мой план на выходные");
  await expect(page.getByText("Ночёвка с палаткой для рыбалки", { exact: false })).toHaveCount(0);

  const stored = await page.evaluate(key => {
    const vault = JSON.parse(localStorage.getItem(key));
    return vault.results;
  }, VAULT_KEY);
  expect(stored).toHaveLength(1);
  expect(stored[0].title).toBe("Мой план на выходные");
  expect(stored[0].source).toEqual({ type: "chatgpt-share", url: CANONICAL_SHARE_URL, title: "Мой план на выходные" });
});
