import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createVault, putDashRevision } from "../demo/vault.js";
import {
  createSelectionDash,
  findEquivalentSavedDash,
  isTemporaryHomeSelection,
  resolveUnifiedDashLocale,
  sameResultIds,
  suggestSelectionDashTitle,
  unifiedDashText
} from "../demo/unified-dashboard.js";

const now = "2026-08-11T08:00:00.000Z";
const results = [
  { id: "food-1", title: "Лосось", summary: "Малосольный лосось", category: "Еда", tags: ["salmon"] },
  { id: "travel-1", title: "Fuente Muñoz", summary: "Ночёвка и рыбалка", category: "Поездки", tags: ["camping"] },
  { id: "phone-1", title: "Pixel 8", summary: "Ремонт корпуса", category: "Техника", tags: ["pixel"] }
];

assert.equal(resolveUnifiedDashLocale({ documentLanguage: "ru-RU", browserLanguage: "en-US" }), "ru");
assert.equal(resolveUnifiedDashLocale({ documentLanguage: "en", browserLanguage: "ru-RU" }), "ru");
assert.equal(resolveUnifiedDashLocale({ documentLanguage: "es", browserLanguage: "es-ES" }), "en");
assert.equal(unifiedDashText("myDash", {}, { locale: "ru" }), "Мой Dash");
assert.equal(unifiedDashText("backToMyDash", {}, { locale: "en" }), "Back to My Dash");

assert.equal(isTemporaryHomeSelection(), false);
assert.equal(isTemporaryHomeSelection({ query: "лосось" }), true);
assert.equal(isTemporaryHomeSelection({ category: "Еда" }), true);
assert.equal(isTemporaryHomeSelection({ favoritesOnly: true }), true);
assert.equal(suggestSelectionDashTitle({ query: "еда в Валенсии", locale: "ru" }), "Еда в Валенсии");
assert.equal(suggestSelectionDashTitle({ favoritesOnly: true, locale: "ru" }), "Избранное");

assert.equal(sameResultIds(["a", "b", "a"], ["b", "a"]), true);
assert.equal(sameResultIds(["a"], ["a", "b"]), false);

const saved = createSelectionDash({
  title: "Еда",
  query: "еда",
  resultIds: ["food-1"],
  now
});
assert.equal(saved.title, "Еда");
assert.equal(saved.updateMode, "review");
assert.deepEqual(saved.automaticResultIds, ["food-1"]);
assert.deepEqual(saved.suggestedResultIds, []);
assert.equal(Object.hasOwn(saved, "results"), false);
assert.equal(Object.hasOwn(saved, "cards"), false);

const vault = createVault({ vaultId: "vault_unified_test", createdAt: now });
putDashRevision(vault, saved, { updatedAt: now });
const equivalent = findEquivalentSavedDash(vault, results, ["food-1"]);
assert.equal(equivalent?.revision?.dashId, saved.dashId);
assert.deepEqual(equivalent?.view?.members?.map(member => member.result.id), ["food-1"]);
assert.equal(findEquivalentSavedDash(vault, results, ["travel-1"]), null);

const before = JSON.stringify(results);
createSelectionDash({ title: "Поездки", query: "camping", resultIds: ["travel-1"], now });
assert.equal(JSON.stringify(results), before, "saving a Dash definition must not mutate/copy source cards");

const dashboardHtml = readFileSync(new URL("../demo/index.html", import.meta.url), "utf8");
assert.doesNotMatch(
  dashboardHtml,
  /<header class="topbar">[\s\S]*?href="\/demo\/dash\/dashgpt-product\/"[\s\S]*?<\/header>/i,
  "personal dashboard header must not expose DashGPT Product Board"
);
assert.doesNotMatch(
  dashboardHtml,
  /<header class="topbar">[\s\S]*?>\s*PRODUCT BOARD\s*<\/a>[\s\S]*?<\/header>/i,
  "Product Board must remain project tooling rather than global user navigation"
);

console.log("Unified Card Dashboard contracts verified.");
