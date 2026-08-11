import { expect, test } from "@playwright/test";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const IMPORT_ID = "dashgpt-chatgpt-history-import";
const SHARE_URL = "https://chatgpt.com/share/6a7a445b-a420-83ea-9c36-3c10fd1ce85f";

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

function userStoredResults(results) {
  return results.filter(result => result.id !== IMPORT_ID);
}

test("clean personal entry is chat-first and offers anonymous Share fallback without scraping automatically", async ({ page }) => {
  const sharedChatCalls = watchSharedChatRequests(page);
  await page.goto("/demo/?personal=1");

  await expect(page.locator("#publicWelcome")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Сохрани разговор через ChatGPT" })).toBeVisible();
  await expect(page.locator("#copyDashGptCommand")).toBeVisible();
  await expect(page.locator("#publicHandoffPayload")).toBeVisible();
  await expect(page.locator("#anonymousShareUrl")).toBeVisible();
  await expect(page.getByRole("button", { name: "Понять этот чат" })).toBeVisible();
  await expect(page.locator("#publicShareUrl")).toHaveCount(0);
  await expect(page.locator(".result-card")).toHaveCount(1);
  await expect(page.locator(`[data-result-id="${IMPORT_ID}"]`)).toBeVisible();
  await expect(page.getByText("Ночёвка с палаткой для рыбалки", { exact: false })).toHaveCount(0);

  const storedResults = await page.evaluate(key => {
    const vault = JSON.parse(localStorage.getItem(key));
    return vault?.results || [];
  }, VAULT_KEY);
  expect(storedResults.filter(result => result.id === IMPORT_ID)).toHaveLength(1);
  expect(userStoredResults(storedResults)).toHaveLength(0);
  expect(sharedChatCalls()).toBe(0);
});

test("pasted ChatGPT Result envelope creates only the visitor's first user card", async ({ page }) => {
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
  await expect(page.locator(".result-card")).toHaveCount(2);
  await expect(page.locator(".result-card")).toContainText("Мой план на выходные");
  await expect(page.getByText("Ночёвка с палаткой для рыбалки", { exact: false })).toHaveCount(0);

  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).results, VAULT_KEY);
  expect(stored.filter(result => result.id === IMPORT_ID)).toHaveLength(1);
  const [userCard] = userStoredResults(stored);
  expect(userCard.title).toBe("Мой план на выходные");
  expect(userCard.category).toBe("Выходные");
  expect(userCard.decisions).toEqual(["Без лишних переездов"]);
  expect(userCard.userPreferences).toEqual(["Спокойный темп"]);
  expect(userCard.next).toBe("Сходить на рынок утром.");
  expect(userCard.source).toEqual({ type: "chatgpt-handoff", title: "ChatGPT conversation" });
  expect(userCard.source.url).toBeUndefined();
  expect(sharedChatCalls()).toBe(0);
});

test("anonymous ?share mobile handoff resolves, previews, and saves the visitor chat", async ({ page }) => {
  let requestedUrl = "";
  await page.route("**/api/shared-chat?**", async route => {
    requestedUrl = new URL(route.request().url()).searchParams.get("url") || "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sourceUrl: SHARE_URL,
        retrieval: "reader-backend",
        title: "Картошка в аэрогриле",
        replies: [
          { type: "user", statement: "Как приготовить картошку в аэрогриле?" },
          { type: "assistant", statement: "Нарежь картошку, добавь масло и специи и готовь до румяности." }
        ]
      })
    });
  });

  await page.goto(`/demo/?personal=1&share=${encodeURIComponent(SHARE_URL)}`);

  await expect(page.locator("#anonymousShareReview")).toBeVisible();
  expect(requestedUrl).toBe(SHARE_URL);
  await expect(page.locator("#anonymousShareTitle")).toHaveValue("Картошка в аэрогриле");
  await expect(page.locator("#anonymousShareSummary")).toHaveValue(/Нарежь картошку/);
  await expect(page.locator(".result-card")).toHaveCount(1);

  await page.locator("#anonymousShareSave").click();
  await page.waitForURL(/\/demo\/$/);
  await expect(page.locator("#publicWelcome")).toHaveCount(0);
  await expect(page.locator(".result-card")).toHaveCount(2);
  await expect(page.locator(".result-card")).toContainText("Картошка в аэрогриле");
  await expect(page.getByText("Ночёвка с палаткой для рыбалки", { exact: false })).toHaveCount(0);

  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).results, VAULT_KEY);
  expect(stored.filter(result => result.id === IMPORT_ID)).toHaveLength(1);
  const [userCard] = userStoredResults(stored);
  expect(userCard.source).toEqual({ type: "chatgpt-share", url: SHARE_URL, title: "Картошка в аэрогриле" });
});

test("manual Share fallback normalizes mobile links, survives one transient resolver failure, and can retry", async ({ page }) => {
  const mobileShare = "https://chatgpt.com/s/t_regression-fixture";
  const normalizedShare = "https://chatgpt.com/share/t_regression-fixture";
  const requestedUrls = [];
  let attempts = 0;

  await page.route("**/api/shared-chat?**", async route => {
    attempts += 1;
    requestedUrls.push(new URL(route.request().url()).searchParams.get("url") || "");
    if (attempts === 1) {
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({
          code: "SHARED_CHAT_UNREADABLE",
          error: "Unable to read this public ChatGPT conversation. Try again."
        })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sourceUrl: normalizedShare,
        retrieval: "reader-backend",
        title: "Свежий мобильный чат",
        replies: [
          { type: "user", statement: "Сохрани это" },
          { type: "assistant", statement: "Вот полезный итог свежего разговора." }
        ]
      })
    });
  });

  await page.goto("/demo/?personal=1");
  await page.locator("#anonymousShareUrl").fill(mobileShare);
  await page.getByRole("button", { name: "Понять этот чат" }).click();

  await expect(page.locator("#anonymousShareStatus")).toContainText("Unable to read this public ChatGPT conversation");
  await expect(page.locator("#anonymousShareReview")).toBeHidden();
  await expect(page.locator(".result-card")).toHaveCount(1);

  await page.getByRole("button", { name: "Понять этот чат" }).click();
  await expect(page.locator("#anonymousShareReview")).toBeVisible();
  await expect(page.locator("#anonymousShareTitle")).toHaveValue("Свежий мобильный чат");
  await expect(page.locator("#anonymousShareSummary")).toHaveValue("Вот полезный итог свежего разговора.");
  expect(requestedUrls).toEqual([normalizedShare, normalizedShare]);

  await page.locator("#anonymousShareSave").click();
  await page.waitForURL(/\/demo\/$/);

  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).results, VAULT_KEY);
  expect(stored.filter(result => result.id === IMPORT_ID)).toHaveLength(1);
  const [userCard] = userStoredResults(stored);
  expect(userCard.source).toEqual({
    type: "chatgpt-share",
    url: normalizedShare,
    title: "Свежий мобильный чат"
  });
});

test("anonymous Share failure never creates or exposes a publisher card", async ({ page }) => {
  await page.route("**/api/shared-chat?**", route => route.fulfill({
    status: 502,
    contentType: "application/json",
    body: JSON.stringify({
      code: "SHARED_CHAT_UNREADABLE",
      error: "Unable to read this public ChatGPT conversation. Try again."
    })
  }));

  await page.goto(`/demo/?personal=1&share=${encodeURIComponent(SHARE_URL)}`);
  await expect(page.locator("#anonymousShareStatus")).toContainText("Unable to read this public ChatGPT conversation");
  await expect(page.locator("#anonymousShareReview")).toBeHidden();
  await expect(page.locator(".result-card")).toHaveCount(1);
  await expect(page.getByText("Ночёвка с палаткой для рыбалки", { exact: false })).toHaveCount(0);

  const storedResults = await page.evaluate(key => JSON.parse(localStorage.getItem(key))?.results || [], VAULT_KEY);
  expect(storedResults.filter(result => result.id === IMPORT_ID)).toHaveLength(1);
  expect(userStoredResults(storedResults)).toHaveLength(0);
});

test("invalid handoff stays usable and does not create a user card", async ({ page }) => {
  const sharedChatCalls = watchSharedChatRequests(page);
  await page.goto("/demo/?personal=1");

  await page.locator("#publicHandoffPayload").fill("not a DashGPT result");
  await page.getByRole("button", { name: "Проверить карточку" }).click();

  await expect(page.locator("#publicHandoffStatus")).toContainText("Скопируй ответ ChatGPT целиком");
  await expect(page.locator("#publicShareReview")).toBeHidden();
  await expect(page.locator(".result-card")).toHaveCount(1);

  const storedResults = await page.evaluate(key => JSON.parse(localStorage.getItem(key))?.results || [], VAULT_KEY);
  expect(storedResults.filter(result => result.id === IMPORT_ID)).toHaveLength(1);
  expect(userStoredResults(storedResults)).toHaveLength(0);
  expect(sharedChatCalls()).toBe(0);
});
