import assert from "node:assert/strict";
import {
  SEMANTIC_THRESHOLDS,
  createDashRevision,
  createSemanticDefinition,
  createTemporaryDash,
  dashImportData,
  formatDashForChat,
  latestDashRevisions,
  matchSavedDashes,
  materializeDash,
  rankResults,
  refreshDash,
  saveTemporaryDash,
  semanticScore
} from "../demo/semantic-dashes.js";

const NOW = "2026-08-10T12:00:00.000Z";
const LATER = "2026-08-10T13:00:00.000Z";

const results = [
  {
    id: "food-kvass",
    title: "Домашний квас и окрошка",
    summary: "Сохранён рабочий рецепт кваса и окрошки.",
    category: "Еда",
    tags: ["kvass", "recipe", "food"],
    decisions: ["Использовать белый хлеб"],
    source: { type: "chatgpt-share", provider: "browser", sourceId: "chat-food-a", url: "https://chatgpt.com/share/food-a" }
  },
  {
    id: "food-soup",
    title: "Чогетхан и холодные супы",
    summary: "Корейский холодный суп на курином бульоне.",
    category: "Еда",
    tags: ["chogyetang", "soup", "recipe"],
    decisions: [],
    source: { type: "chatgpt-share", provider: "github", sourceId: "chat-food-b", url: "https://chatgpt.com/share/food-b" }
  },
  {
    id: "dash-product-a",
    title: "DashGPT capability map",
    summary: "Product discussion about DashGPT capabilities.",
    category: "DashGPT",
    tags: ["DashGPT", "Product", "openspec"],
    decisions: [],
    source: { type: "chatgpt-share", sourceId: "chat-product-a" }
  },
  {
    id: "dash-product-b",
    title: "DashGPT privacy and portable Vault",
    summary: "A separate product discussion about private portable storage.",
    category: "DashGPT",
    tags: ["DashGPT", "Product", "privacy", "vault"],
    decisions: [],
    source: { type: "chatgpt-share", sourceId: "chat-product-b" }
  },
  {
    id: "travel-morocco",
    title: "Поездка в Марокко",
    summary: "Маршрут через Марракеш, Касабланку и Танжер.",
    category: "Поездки",
    tags: ["travel", "morocco"],
    decisions: []
  },
  {
    id: "phone-pixel",
    title: "Ремонт телефона Pixel 8",
    summary: "Замена экрана, корпуса и аккумулятора.",
    category: "Техника",
    tags: ["phone-repair", "screen", "pixel"],
    decisions: []
  }
];

const foodRanking = rankResults(results, "Даш про еду");
assert.deepEqual(foodRanking.slice(0, 2).map((item) => item.result.id).sort(), ["food-kvass", "food-soup"]);
assert.ok(foodRanking[0].score >= SEMANTIC_THRESHOLDS.resultAccepted);
assert.equal(rankResults(results, "ремонт телефона")[0].result.id, "phone-pixel");
assert.equal(rankResults(results, "ремонт телефна")[0].result.id, "phone-pixel", "fuzzy wording must still rank the phone Result first");
assert.equal(rankResults(results, "Касабланку")[0].result.id, "travel-morocco", "ordinary exact Result search must remain strong");
assert.ok(semanticScore("Product discussions", "DashGPT продукт OpenSpec") >= SEMANTIC_THRESHOLDS.resultProposal);
const bodyOnlyResult = {
  id: "body-only",
  title: "Saved cooking note",
  summary: "The useful detail is stored in the full Result body.",
  category: "Notes",
  tags: [],
  decisions: [],
  body: "Use saffron and arborio rice for the risotto.",
  source: { type: "chatgpt-share", sourceId: "chat-body-only" }
};
assert.equal(rankResults([...results, bodyOnlyResult], "saffron risotto")[0].result.id, "body-only", "semantic retrieval must reuse existing full Result fields, not only card preview text");
assert.ok(createSemanticDefinition("Открой даш про DashGPT Product").query.includes("dashgpt"), "the DashGPT topic name must not be stripped as generic Dash intent");
assert.deepEqual(
  rankResults(results, "ремонт телефона").map((item) => item.result.id),
  rankResults([...results].reverse(), "ремонт телефона").map((item) => item.result.id),
  "query ranking ties must not depend on provider array order"
);

const temporary = createTemporaryDash("Даш про еду", results, { now: NOW, title: "Еда" });
assert.equal(temporary.temporary, true);
assert.deepEqual(temporary.members.map((item) => item.result.id).sort(), ["food-kvass", "food-soup"]);
assert.equal(new Set(temporary.members.map((item) => item.result.source.sourceId)).size, 2, "members must span source chats");
assert.equal(new Set(temporary.members.map((item) => item.result.source.provider)).size, 2, "default scope must allow accessible Results from multiple storage providers");

const savedFood = saveTemporaryDash(temporary, {
  now: NOW,
  dashId: "dash-food",
  dashRevisionId: "dashrev-food-1",
  title: "Еда и рецепты"
});
const travelDash = createDashRevision({
  dashId: "dash-travel",
  dashRevisionId: "dashrev-travel-1",
  title: "Поездки",
  description: "Маршруты и путешествия",
  query: "путешествия",
  automaticResultIds: ["travel-morocco"]
}, { now: NOW, dashId: "dash-travel", dashRevisionId: "dashrev-travel-1" });

const confident = matchSavedDashes("Продолжим про квас", [savedFood, travelDash]);
assert.equal(confident.status, "confident");
assert.equal(confident.dash.dashId, "dash-food");

const restaurantDash = createDashRevision({
  dashId: "dash-restaurants",
  dashRevisionId: "dashrev-restaurants-1",
  title: "Рестораны Валенсии",
  description: "Еда вне дома",
  query: "еда"
}, { now: NOW, dashId: "dash-restaurants", dashRevisionId: "dashrev-restaurants-1" });
const ambiguous = matchSavedDashes("Покажи всё про еду", [savedFood, restaurantDash]);
assert.equal(ambiguous.status, "ambiguous");
assert.deepEqual(new Set(ambiguous.candidates.map((item) => item.dash.dashId)), new Set(["dash-food", "dash-restaurants"]));

const initialOneCard = createDashRevision({
  ...savedFood,
  dashRevisionId: "dashrev-food-single",
  automaticResultIds: ["food-kvass"],
  suggestedResultIds: []
}, { now: NOW, dashId: "dash-food", dashRevisionId: "dashrev-food-single" });
const refreshed = refreshDash(initialOneCard, [], results, {
  now: LATER,
  dashRevisionId: "dashrev-food-2",
  allDashRevisions: [initialOneCard, travelDash]
});
assert.deepEqual(refreshed.view.members.map((item) => item.result.id), ["food-kvass"]);
assert.ok(refreshed.view.proposals.some((item) => item.result.id === "food-soup"), "new matching Result must be proposed in Review mode");

const acceptEvents = [{
  schemaVersion: 1,
  eventId: "evt-accept-soup",
  type: "dash.accept",
  dashId: "dash-food",
  resultId: "food-soup",
  value: true,
  createdAt: "2026-08-10T13:00:30.000Z"
}];
const acceptedView = materializeDash(refreshed.revision, acceptEvents, results);
assert.ok(acceptedView.members.some((item) => item.result.id === "food-soup"));
assert.ok(acceptedView.summary.includes("Чогетхан"), "accepted membership must update the aggregate summary");
assert.equal(acceptedView.lastUpdatedAt, "2026-08-10T13:00:30.000Z", "materialized update time must include Dash override events");

const overrideEvents = [
  ...acceptEvents,
  { schemaVersion: 1, eventId: "evt-pin-travel", type: "dash.pin", dashId: "dash-food", resultId: "travel-morocco", value: true, createdAt: "2026-08-10T13:01:00.000Z" },
  { schemaVersion: 1, eventId: "evt-manual-phone", type: "dash.manual", dashId: "dash-food", resultId: "phone-pixel", value: true, createdAt: "2026-08-10T13:02:00.000Z" },
  { schemaVersion: 1, eventId: "evt-exclude-soup", type: "dash.exclude", dashId: "dash-food", resultId: "food-soup", value: true, createdAt: "2026-08-10T13:03:00.000Z" },
  { schemaVersion: 1, eventId: "evt-pin-soup", type: "dash.pin", dashId: "dash-food", resultId: "food-soup", value: true, createdAt: "2026-08-10T13:04:00.000Z" }
];
const overrideView = materializeDash(refreshed.revision, overrideEvents, results);
assert.equal(overrideView.members.find((item) => item.result.id === "travel-morocco")?.membership, "pinned");
assert.equal(overrideView.members.find((item) => item.result.id === "phone-pixel")?.membership, "manual");
assert.ok(!overrideView.members.some((item) => item.result.id === "food-soup"), "exclusion must win over pin and accept");
const overrideRefresh = refreshDash(refreshed.revision, overrideEvents, results, {
  now: "2026-08-10T14:00:00.000Z",
  dashRevisionId: "dashrev-food-overrides"
});
assert.equal(overrideRefresh.view.members.find((item) => item.result.id === "travel-morocco")?.membership, "pinned", "pin must survive refresh below the topic threshold");
assert.equal(overrideRefresh.view.members.find((item) => item.result.id === "phone-pixel")?.membership, "manual", "manual membership must survive refresh");
assert.ok(!overrideRefresh.view.members.some((item) => item.result.id === "food-soup"));
assert.ok(!overrideRefresh.view.proposals.some((item) => item.result.id === "food-soup"), "a rejected proposal must not return on refresh");
const reversedExclusionEvents = [
  ...overrideEvents,
  { schemaVersion: 1, eventId: "evt-restore-soup", type: "dash.exclude", dashId: "dash-food", resultId: "food-soup", value: false, createdAt: "2026-08-10T14:01:00.000Z" }
];
assert.ok(materializeDash(overrideRefresh.revision, reversedExclusionEvents, results).members.some((item) => item.result.id === "food-soup"), "explicitly reversing exclusion must restore the prior accepted member");

const productDash = createDashRevision({
  dashId: "dash-product",
  dashRevisionId: "dashrev-product-1",
  title: "DashGPT",
  description: "DashGPT Product discussions",
  query: "DashGPT Product",
  automaticResultIds: ["dash-product-a", "dash-product-b", "food-kvass"]
}, { now: NOW, dashId: "dash-product", dashRevisionId: "dashrev-product-1" });
const productView = materializeDash(productDash, [], results, { allDashRevisions: [productDash, savedFood] });
assert.deepEqual(productView.members.map((item) => item.result.id).sort(), ["dash-product-a", "dash-product-b", "food-kvass"]);
for (const resultId of ["dash-product-a", "dash-product-b"]) {
  const signals = results.find((item) => item.id === resultId).tags.map((tag) => tag.toLowerCase());
  assert.ok(signals.includes("dashgpt") && signals.includes("product"), "the general DashGPT Product scenario must be driven by ordinary Result signals");
}
const productInitial = createDashRevision({
  dashId: "dash-product-review",
  dashRevisionId: "dashrev-product-review-1",
  title: "DashGPT",
  description: "DashGPT Product discussions",
  query: "DashGPT Product",
  automaticResultIds: ["dash-product-a"]
}, { now: NOW, dashId: "dash-product-review", dashRevisionId: "dashrev-product-review-1" });
const productRefresh = refreshDash(productInitial, [], results, {
  now: LATER,
  dashRevisionId: "dashrev-product-review-2"
});
assert.ok(productRefresh.view.proposals.some((item) => item.result.id === "dash-product-b"), "a new Product discussion from another chat must be proposed");
const productOverrides = [
  { schemaVersion: 1, eventId: "evt-product-pin", type: "dash.pin", dashId: "dash-product-review", resultId: "dash-product-a", value: true, createdAt: "2026-08-10T13:10:00.000Z" },
  { schemaVersion: 1, eventId: "evt-product-exclude", type: "dash.exclude", dashId: "dash-product-review", resultId: "dash-product-b", value: true, createdAt: "2026-08-10T13:11:00.000Z" }
];
const reopenedProduct = matchSavedDashes("Открой даш про DashGPT", [productRefresh.revision]);
assert.equal(reopenedProduct.status, "confident");
const reopenedProductView = refreshDash(reopenedProduct.dash, productOverrides, results, {
  now: "2026-08-10T14:10:00.000Z",
  dashRevisionId: "dashrev-product-review-3"
}).view;
assert.equal(reopenedProductView.members.find((item) => item.result.id === "dash-product-a")?.membership, "pinned");
assert.ok(!reopenedProductView.members.some((item) => item.result.id === "dash-product-b"));
assert.ok(!reopenedProductView.proposals.some((item) => item.result.id === "dash-product-b"));
const relatedFoodView = materializeDash(savedFood, [], results, { allDashRevisions: [savedFood, restaurantDash] });
assert.ok(relatedFoodView.relatedDashes.some((item) => item.dashId === "dash-restaurants"), "related Dash discovery must use semantic definitions rather than the word Dash itself");
assert.ok(!productView.relatedDashes.some((item) => item.dashId === "dash-food"), "meta wording must not make unrelated Dashes semantically related");

const sharedResultInTwoDashes = [
  materializeDash(savedFood, [], results).members.some((item) => item.result.id === "food-kvass"),
  productView.members.some((item) => item.result.id === "food-kvass")
];
assert.deepEqual(sharedResultInTwoDashes, [true, true], "one Result reference may belong to multiple Dashes");
const otherFoodDash = createDashRevision({
  dashId: "dash-other-food",
  dashRevisionId: "dashrev-other-food",
  title: "Other food",
  query: "food",
  automaticResultIds: ["food-soup"]
}, { now: NOW, dashId: "dash-other-food", dashRevisionId: "dashrev-other-food" });
assert.ok(materializeDash(otherFoodDash, overrideEvents, results).members.some((item) => item.result.id === "food-soup"), "excluding a Result from one Dash must not affect another Dash");

const deleteEvent = [{ schemaVersion: 1, eventId: "evt-delete-food", type: "dash.delete", dashId: "dash-food", value: true, createdAt: LATER }];
assert.ok(!latestDashRevisions([savedFood, travelDash], deleteEvent).some((dash) => dash.dashId === "dash-food"));
assert.equal(results.find((item) => item.id === "food-kvass").title, "Домашний квас и окрошка", "Dash deletion must not alter Results");

const secretResult = {
  id: "secret-denied",
  title: "SECRET DENIED TITLE",
  summary: "SECRET DENIED SUMMARY",
  category: "Еда",
  tags: ["food"],
  access: "denied",
  storageProvider: "browser",
  source: { url: "https://secret.invalid/chat" }
};
const archivedSecret = { ...secretResult, id: "secret-archived", title: "SECRET ARCHIVED TITLE", summary: "SECRET ARCHIVED SUMMARY", access: "allowed", archived: true };
const deletedSecret = { ...secretResult, id: "secret-deleted", title: "SECRET DELETED TITLE", summary: "SECRET DELETED SUMMARY", access: "allowed", deleted: true };
const providerSecret = { ...secretResult, id: "secret-provider", title: "SECRET PROVIDER TITLE", summary: "SECRET PROVIDER SUMMARY", access: "allowed", storageProvider: "forbidden" };
const sourceSecret = {
  ...secretResult,
  id: "secret-source",
  title: "SECRET SOURCE TITLE",
  summary: "SECRET SOURCE SUMMARY",
  access: "allowed",
  source: { sourceId: "blocked-source", url: "https://secret.invalid/source" }
};
const secretResults = [secretResult, archivedSecret, deletedSecret, providerSecret, sourceSecret];
const privacyRevision = createDashRevision({
  dashId: "dash-private-test",
  dashRevisionId: "dashrev-private-test",
  title: "Еда",
  query: "еда",
  scope: { providers: ["browser"], excludedSourceIds: ["blocked-source"] },
  automaticResultIds: ["food-kvass", ...secretResults.map((item) => item.id)]
}, { now: NOW, dashId: "dash-private-test", dashRevisionId: "dashrev-private-test" });
assert.ok(!rankResults([...results, ...secretResults], "еда", { scope: privacyRevision.scope }).some((item) => item.result.id.startsWith("secret-")));
const privacyView = materializeDash(privacyRevision, [], [...results, ...secretResults]);
assert.equal(privacyView.unavailable.length, secretResults.length);
assert.ok(!JSON.stringify(privacyView).includes("SECRET "));
assert.ok(!privacyView.summary.includes("SECRET"));
assert.ok(!formatDashForChat(privacyView).includes("secret.invalid"));

const formerlyAccessible = { ...secretResult, id: "formerly-accessible", title: "FORMER SECRET TITLE", summary: "FORMER SECRET SUMMARY", access: "allowed", source: undefined };
const accessLossRevision = createDashRevision({
  dashId: "dash-access-loss",
  dashRevisionId: "dashrev-access-loss-1",
  title: "Еда",
  query: "еда",
  automaticResultIds: ["food-kvass", "formerly-accessible"]
}, { now: NOW, dashId: "dash-access-loss", dashRevisionId: "dashrev-access-loss-1" });
assert.ok(materializeDash(accessLossRevision, [], [...results, formerlyAccessible]).summary.includes("FORMER SECRET"));
const afterAccessLoss = refreshDash(accessLossRevision, [], [...results, { ...formerlyAccessible, access: "denied" }], {
  now: LATER,
  dashRevisionId: "dashrev-access-loss-2"
});
assert.ok(afterAccessLoss.revision.automaticResultIds.includes("formerly-accessible"), "refresh must retain an opaque reference when access is lost");
assert.equal(afterAccessLoss.view.unavailable.length, 1);
assert.ok(!JSON.stringify(afterAccessLoss.view).includes("FORMER SECRET"), "access loss must invalidate all rendered and aggregated content");

const bounded = formatDashForChat(productView, { limit: 1 });
assert.ok(bounded.includes("…and 2 more Results"));
assert.ok(bounded.includes("asking to expand this Dash"));
assert.deepEqual(dashImportData(temporary).automaticResultIds.sort(), ["food-kvass", "food-soup"]);
assert.throws(() => createDashRevision({ title: "Auto", query: "food", updateMode: "automatic" }), /not available/);

console.log("Semantic Dash ranking, review, override, privacy and chat-format tests passed.");
