import { expect, test } from "./playwright-fixture.mjs";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const IMPORT_ID = "dashgpt-chatgpt-history-import";

async function rewriteAsPopulatedVault(page, { dismissed = false, imported = true } = {}) {
  await page.evaluate(({ key, importId, dismissedState, includeImported }) => {
    const vault = JSON.parse(localStorage.getItem(key) || "null");
    if (!vault) throw new Error("Expected seeded local Vault");

    vault.results = (vault.results || []).filter(result => result.id !== importId);
    vault.events = (vault.events || []).filter(event =>
      !(event.type === "system.card.dismissed" && event.resultId === importId)
    );

    vault.results.push({
      id: "existing-user-card",
      schemaVersion: 1,
      title: "Existing user card",
      summary: "This proves the Vault was already populated before import entry was restored.",
      category: "Notes",
      tags: ["existing"],
      decisions: [],
      immutable: false,
      contentVersion: 1
    });

    if (includeImported) {
      vault.results.push({
        id: "chatgpt-conversation-existing-source",
        schemaVersion: 1,
        title: "Already imported ChatGPT conversation",
        summary: "Existing canonical imported card",
        category: "ChatGPT",
        tags: ["chatgpt"],
        decisions: [],
        source: {
          type: "conversation",
          provider: "chatgpt",
          sourceId: "existing-source",
          title: "ChatGPT conversation",
          url: "https://chatgpt.com/c/existing-source"
        },
        publishedAt: "2026-08-11T10:00:00.000Z",
        immutable: false,
        contentVersion: 1
      });
    }

    if (dismissedState) {
      vault.events.push({
        schemaVersion: 1,
        eventId: "evt_browser_import_dismissed",
        type: "system.card.dismissed",
        resultId: importId,
        value: true,
        createdAt: "2026-08-12T12:00:00.000Z"
      });
    }

    localStorage.setItem(key, JSON.stringify(vault));
  }, { key: VAULT_KEY, importId: IMPORT_ID, dismissedState: dismissed, includeImported: imported });
}

test("populated existing Vault restores one promoted import card with existing imported count", async ({ page }) => {
  await page.goto("/demo/?personal=1");
  await rewriteAsPopulatedVault(page, { dismissed: false, imported: true });
  await page.reload();

  const card = page.locator(`[data-result-id="${IMPORT_ID}"]`);
  await expect(card).toHaveCount(1);
  await expect(card).toBeVisible();
  await expect(card.locator(".title")).toContainText(/Import ChatGPT history|Импортировать историю ChatGPT/);
  await expect(page.locator("#chatgptImportRestoreButton")).toHaveCount(0);

  const firstId = await page.locator("#resultsGrid > [data-result-id]").first().getAttribute("data-result-id");
  expect(firstId).toBe(IMPORT_ID);

  const progress = await page.evaluate(({ key, importId }) => {
    const vault = JSON.parse(localStorage.getItem(key));
    return vault.results.find(result => result.id === importId)?.result;
  }, { key: VAULT_KEY, importId: IMPORT_ID });
  expect(progress?.state).toBe("ready");
  expect(progress?.imported).toBe(1);
});

test("explicitly dismissed import card stays hidden until the user restores it", async ({ page }) => {
  await page.goto("/demo/?personal=1");
  await rewriteAsPopulatedVault(page, { dismissed: true, imported: true });
  await page.reload();

  await expect(page.locator(`[data-result-id="${IMPORT_ID}"]`)).toHaveCount(0);
  const restore = page.locator("#chatgptImportRestoreButton");
  await expect(restore).toBeVisible();

  await restore.click();
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator(`[data-result-id="${IMPORT_ID}"]`)).toBeVisible();
  await expect(page.locator("#chatgptImportRestoreButton")).toHaveCount(0);
});
