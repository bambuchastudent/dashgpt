import { expect, test } from "@playwright/test";

const VAULT_KEY = "dashgpt.demo.vault.v1";

const RESULT_ENVELOPE = `\`\`\`json
{
  "title": "Мой план на выходные",
  "summary": "Собрали спокойный план: утром рынок, днём парк, вечером ужин рядом с домом. Без лишних переездов.",
  "category": "Выходные",
  "tags": ["план", "валенсия"],
  "decisions": ["Без лишних переездов"],
  "facts": ["План рассчитан на один спокойный день"],
  "constraints": [],
  "userPreferences": ["Спокойный темп"],
  "openQuestions": [],
  "next": "Сходить на рынок утром."
}
\`\`\``;

function watchSharedChatRequests(page) {
  let calls = 0;
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/shared-chat") calls += 1;
  });
  return () => calls;
}

test("clean personal entry is chat-first and does not scrape ChatGPT", async ({ page }) => {
  const sharedChatCalls = watchSharedChatRequests(page);
  await page.goto("/demo/?personal=1");

  await expect(page.locator("#publicWelcome")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Сохрани разговор через ChatGPT" })).toBeVisible();
  await expect(page.locator("#copyDashGptCommand")).toBeVisible();
  await expect(page.locator("#publicHandoffPayload")).toBeVisible();
  await expect(page.locator("#publicShareUrl")).toHaveCount(0);
  await expect(page.locator(".result-card")).toHaveCount(0);
  await expect(page.getByText("Ночёвка с палаткой для рыбалки", { exact: false })).toHaveCount(0);
  await expect(page.locator("#storageButton")).toBeHidden();

  const storedResults = await page.evaluate(key => {
    const vault = JSON.parse(localStorage.getItem(key));
    return vault?.results || [];
  }, VAULT_KEY);
  expect(storedResults).toHaveLength(0);
  expect(sharedChatCalls()).toBe(0);
});

test("pasted ChatGPT Result envelope creates only the visitor's first card", async ({ page }) => {
  const sharedChatCalls = watchSharedChatRequests(page);
  await page.goto("/demo/?personal=1");

  await page.locator("#publicHandoffPayload").fill(RESULT_ENVELOPE);
  await page.getByRole("button", { name: "Проверить карточку" }).click();

  await expect(page.locator("#publicShareReview")).toBeVisible();
  await expect(page.locator("#publicReviewTitle")).toHaveValue("Мой план на выходные");
  await expect(page.locator("#publicReviewSummary")).toHaveValue(/утром рынок/);
  expect(sharedChatCalls()).toBe(0);

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
  expect(stored[0].category).toBe("Выходные");
  expect(stored[0].decisions).toEqual(["Без лишних переездов"]);
  expect(stored[0].userPreferences).toEqual(["Спокойный темп"]);
  expect(stored[0].next).toBe("Сходить на рынок утром.");
  expect(stored[0].source).toEqual({ type: "chatgpt-handoff", title: "ChatGPT conversation" });
  expect(stored[0].source.url).toBeUndefined();
  expect(sharedChatCalls()).toBe(0);
});

test("invalid handoff stays usable and does not create a card", async ({ page }) => {
  const sharedChatCalls = watchSharedChatRequests(page);
  await page.goto("/demo/?personal=1");

  await page.locator("#publicHandoffPayload").fill("not a DashGPT result");
  await page.getByRole("button", { name: "Проверить карточку" }).click();

  await expect(page.locator("#publicHandoffStatus")).toContainText("Скопируй ответ ChatGPT целиком");
  await expect(page.locator("#publicShareReview")).toBeHidden();
  await expect(page.locator(".result-card")).toHaveCount(0);

  const storedResults = await page.evaluate(key => {
    const vault = JSON.parse(localStorage.getItem(key));
    return vault?.results || [];
  }, VAULT_KEY);
  expect(storedResults).toHaveLength(0);
  expect(sharedChatCalls()).toBe(0);
});
