import { expect, test } from "./playwright-fixture.mjs";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const IMPORT_ID = "dashgpt-chatgpt-history-import";
const SABOTAGE_KEY = "dashgpt.test.drop-first-import-seed";

test("clean My Dash repairs a pre-app import seed lost during startup without duplicates", async ({ page }) => {
  await page.addInitScript(({ vaultKey, importId, sabotageKey }) => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function patchedSetItem(key, value) {
      if (
        this === localStorage
        && key === vaultKey
        && sessionStorage.getItem(sabotageKey) !== "1"
      ) {
        try {
          const parsed = JSON.parse(String(value));
          if (Array.isArray(parsed?.results) && parsed.results.some(result => result.id === importId)) {
            parsed.results = parsed.results.filter(result => result.id !== importId);
            sessionStorage.setItem(sabotageKey, "1");
            return originalSetItem.call(this, key, JSON.stringify(parsed));
          }
        } catch {
          // Preserve the real Storage behavior for unrelated/non-JSON writes.
        }
      }
      return originalSetItem.call(this, key, value);
    };
  }, { vaultKey: VAULT_KEY, importId: IMPORT_ID, sabotageKey: SABOTAGE_KEY });

  await page.goto("/demo/?personal=1");

  const card = page.locator(`[data-result-id="${IMPORT_ID}"]`);
  await expect(card).toHaveCount(1);
  await expect(card).toBeVisible();
  await expect(page.locator("#publicWelcome")).toBeVisible();

  const storedCount = await page.evaluate(({ vaultKey, importId, sabotageKey }) => {
    const vault = JSON.parse(localStorage.getItem(vaultKey) || "null");
    return {
      count: (vault?.results || []).filter(result => result.id === importId).length,
      sabotaged: sessionStorage.getItem(sabotageKey)
    };
  }, { vaultKey: VAULT_KEY, importId: IMPORT_ID, sabotageKey: SABOTAGE_KEY });

  expect(storedCount.sabotaged).toBe("1");
  expect(storedCount.count).toBe(1);

  await page.reload();
  await expect(page.locator(`[data-result-id="${IMPORT_ID}"]`)).toHaveCount(1);
});
