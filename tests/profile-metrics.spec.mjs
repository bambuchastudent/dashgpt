import { expect, test } from "@playwright/test";
import { createVault, materializeResults } from "../demo/vault.js";
import { applyChatGptImportBatchFast } from "../demo/chatgpt-history-import-batch.js";
import { estimateVisibleTextTokens } from "../demo/chatgpt-history-source-runner.js";
import { appendProjectMetricsRevision, currentProjectMetrics, projectTokenMetrics } from "../demo/profile-metrics.js";

const NOW = "2026-08-13T12:00:00.000Z";

test("token estimate is deterministic and re-import does not double count", () => {
  expect(estimateVisibleTextTokens("Привет")).toBe(3);
  expect(estimateVisibleTextTokens("你好")).toBe(2);
  const vault = createVault({ vaultId: "vault_f27", createdAt: NOW });
  const card = { sourceId: "conv_f27", title: "F27", summary: "one", currentState: "go", updatedAt: NOW, usage: { tokenCount: 100, tokenCountKind: "estimated", estimator: "visible-text-v1" } };
  applyChatGptImportBatchFast(vault, [card], { state: "running", discovered: 1, imported: 1 });
  applyChatGptImportBatchFast(vault, [{ ...card, summary: "two", updatedAt: "2026-08-13T12:01:00.000Z", usage: { ...card.usage, tokenCount: 175 } }], { state: "running", discovered: 1, imported: 1 });
  const cards = materializeResults(vault).filter(item => item.source?.sourceId === "conv_f27");
  expect(cards).toHaveLength(1);
  expect(projectTokenMetrics(cards)).toEqual({ tokenCount: 175, countedCards: 1, estimated: true });
});

test("money is revisioned in minor units", () => {
  const vault = createVault({ vaultId: "vault_f27_money", createdAt: NOW });
  appendProjectMetricsRevision(vault, { currency: "EUR", spentMinor: 1234, donatedMinor: 500 }, { profileRevisionId: "profile_f27", updatedAt: NOW });
  expect(currentProjectMetrics(vault)).toMatchObject({ currency: "EUR", spentMinor: 1234, donatedMinor: 500 });
});

test("Russian profile is collapsible and mobile-safe", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "language", { configurable: true, get: () => "ru-RU" }));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/demo/?personal=1");
  await page.locator(".profile-metrics-trigger").click();
  await expect(page.locator(".profile-metrics-panel")).toContainText("Проебано токенов");
  await expect(page.locator(".profile-metrics-panel")).toContainText("Потрачено");
  await expect(page.locator(".profile-metrics-panel")).toContainText("Задоначено");
  await page.locator(".profile-metrics-collapse").click();
  await expect(page.locator(".profile-metrics-grid")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
