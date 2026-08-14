import { expect, test } from "@playwright/test";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const SHARE_URL = "https://chatgpt.com/share/rich-card-123";

function vault(results = []) {
  return {
    schemaVersion: 1,
    vaultId: "vault-rich-card-detail",
    createdAt: "2026-08-14T10:00:00.000Z",
    updatedAt: "2026-08-14T10:00:00.000Z",
    results,
    events: [],
    profileRevisions: [],
    dashRevisions: []
  };
}

async function seed(page, results = [{
  id: "existing-card",
  schemaVersion: 1,
  title: "Existing card",
  summary: "Existing summary",
  category: "Test",
  tags: [],
  decisions: [],
  next: "",
  immutable: false,
  contentVersion: 1
}]) {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: VAULT_KEY,
    value: vault(results)
  });
}

async function routeStorage(page) {
  await page.route("**/api/storage/google/config", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ configured: false, clientId: null, scope: "https://www.googleapis.com/auth/drive.file" })
  }));
  await page.route("**/api/storage/github/status", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ configured: false, paired: false, locator: null })
  }));
}

const richReply = `Готово, **сразу в \`develop\`**. [PR #87](https://github.com/bambuchastudent/dashgpt/pull/87) merged.

- Первый пункт
- Второй пункт

## Decisions
- Link-first остаётся основным UX
- Исходная ссылка остаётся source of truth

## Next
Проверить UX в develop.

memcite`;

test("link-first capture preserves rich card structure and renders it safely on modal and standalone mobile", async ({ page }) => {
  await seed(page);
  await routeStorage(page);
  await page.route("**/api/shared-chat?*", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      sourceUrl: SHARE_URL,
      title: "Rich Share card",
      replies: [
        { type: "user", statement: "Сохрани чат" },
        { type: "assistant", statement: richReply }
      ]
    })
  }));

  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/demo/?personal=1");
  await page.locator("#addResultButton").click();
  await page.locator("#saveChatLink").fill(SHARE_URL);
  await page.locator("#saveChatLinkForm").getByRole("button", { name: "Добавить карточку" }).click();

  await expect(page.locator("#saveChatReview")).toBeVisible();
  await expect(page.locator("#saveChatReviewSummary")).toHaveValue(
    "Готово, **сразу в `develop`**. [PR #87](https://github.com/bambuchastudent/dashgpt/pull/87) merged.\n\n- Первый пункт\n- Второй пункт"
  );
  await page.locator("#saveChatCommit").click();
  await page.waitForURL(/\/demo\/$/);

  const saved = await page.evaluate(key => {
    const stored = JSON.parse(localStorage.getItem(key) || "null");
    return stored.results.find(item => item.source?.url === "https://chatgpt.com/share/rich-card-123");
  }, VAULT_KEY);
  expect(saved).toBeTruthy();
  expect(saved.summary).toContain("\n\n- Первый пункт\n- Второй пункт");
  expect(saved.summary).not.toContain("memcite");
  expect(saved.decisions).toEqual([
    "Link-first остаётся основным UX",
    "Исходная ссылка остаётся source of truth"
  ]);
  expect(saved.next).toBe("Проверить UX в develop.");

  const card = page.locator(".result-card").filter({ hasText: "Rich Share card" });
  await card.locator(".open-button").click();
  const dialog = page.locator("#resultDialog");
  await expect(dialog).toBeVisible();
  const summary = dialog.locator(".result-detail-summary");
  await expect(summary.locator("strong")).toContainText("сразу в develop");
  await expect(summary.locator("code")).toHaveText("develop");
  await expect(summary.getByRole("link", { name: "PR #87" })).toHaveAttribute("href", "https://github.com/bambuchastudent/dashgpt/pull/87");
  await expect(summary.locator("ul li")).toHaveCount(2);
  await expect(dialog).not.toContainText("memcite");
  await expect(dialog).not.toContainText("No decisions captured yet.");
  await expect(dialog).not.toContainText("No next step captured yet.");
  const decisions = dialog.locator(".detail-block").filter({ hasText: "Decisions" });
  await expect(decisions.locator("li")).toHaveCount(2);
  await expect(dialog.locator(".detail-block").filter({ hasText: "Next" })).toContainText("Проверить UX в develop.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

  await page.goto(`/demo/result/${encodeURIComponent(saved.id)}/`);
  const lead = page.locator(".result-lead");
  await expect(lead.locator("code")).toHaveText("develop");
  await expect(lead.getByRole("link", { name: "PR #87" })).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.locator(".published-result")).not.toContainText("memcite");
  await expect(page.locator(".published-result")).not.toContainText("No decisions captured yet.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await expect(page.getByRole("button", { name: /Continue in new chat/ })).toBeVisible();
});

test("rich detail leaves captured HTML inert, rejects unsafe links, and omits empty structured blocks", async ({ page }) => {
  await seed(page, [{
    id: "unsafe-rich-card",
    schemaVersion: 1,
    title: "Unsafe rich card",
    summary: "<script>alert('x')</script> [bad](javascript:alert(1)) [good](https://example.com/path) memcite",
    category: "Test",
    tags: [],
    decisions: [],
    next: "",
    immutable: false,
    contentVersion: 1
  }]);
  await routeStorage(page);
  await page.goto("/demo/result/unsafe-rich-card/");

  const lead = page.locator(".result-lead");
  await expect(lead).toContainText("<script>alert('x')</script>");
  await expect(lead.locator("script")).toHaveCount(0);
  await expect(lead.getByRole("link", { name: "good" })).toHaveAttribute("href", "https://example.com/path");
  await expect(lead.getByRole("link", { name: "bad" })).toHaveCount(0);
  await expect(lead).not.toContainText("memcite");
  await expect(page.locator(".published-result .detail-block")).toHaveCount(0);
});
