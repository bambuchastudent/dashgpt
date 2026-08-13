import assert from "node:assert/strict";

Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: { lang: "en" } } });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { language: "en-US" } });

const { deriveChatGptSemanticMetadata } = await import("../demo/chatgpt-semantic-enrichment.js");
const { semanticHue, semanticSignature } = await import("../demo/semantic-gallery.js");
const {
  CHATGPT_HISTORY_SOURCE_VERSION,
  MAX_CHATGPT_IMPORT_ACTION_CHARS,
  buildChatGptHistoryImportAction,
  buildChatGptHistorySourceRunner
} = await import("../demo/chatgpt-history-source-runner.js");

const food = deriveChatGptSemanticMetadata({
  title: "Как засолить лосось",
  messages: [{ role: "user", text: "У меня филе лосося, сколько соли и сахара для засолки?" }]
});
assert.equal(food.category, "Food");
assert.equal(food.tags.includes("chatgpt"), false);
assert.ok(food.tags.includes("food"));

const travel = deriveChatGptSemanticMetadata({
  title: "Morocco trip",
  messages: [{ role: "user", text: "Plan a flight and hotel route through Marrakech and Tangier." }]
});
assert.equal(travel.category, "Travel");
assert.ok(travel.tags.includes("travel"));

const mixed = deriveChatGptSemanticMetadata({
  title: "DashGPT import Safari",
  messages: [{ role: "user", text: "Сделай GitHub PR, OpenSpec и JavaScript browser import без дублей карточек." }]
});
assert.ok(["Software", "DashGPT"].includes(mixed.category));
assert.equal(mixed.tags.includes("chatgpt"), false);
assert.ok(mixed.tags.length >= 2 && mixed.tags.length <= 5);

const softwareCard = { title: "GitHub import", category: "Software", tags: ["software", "github", "openspec"] };
const foodCard = { title: "Salmon recipe", category: "Food", tags: ["food", "salmon", "recipe"] };
assert.notEqual(semanticHue(softwareCard), semanticHue(foodCard));
assert.equal(semanticSignature(softwareCard).groupKey, "anchor:technology");
assert.equal(semanticSignature(foodCard).groupKey, "anchor:food");

assert.equal(CHATGPT_HISTORY_SOURCE_VERSION, 4);
const runner = buildChatGptHistorySourceRunner({ receiverOrigin: "https://dashgpt.example", receiverPath: "/demo/", sessionId: "semantic-session", nonce: "semantic-nonce" });
assert.match(runner, /"sourceVersion":4/);
assert.match(runner, /semanticEnrichmentVersion: 1/);
assert.match(runner, /category: semantic\.category/);
assert.match(runner, /semantic-enrichment aware/);
const action = buildChatGptHistoryImportAction({ receiverOrigin: "https://dashgpt.example", receiverPath: "/demo/" });
assert.ok(action.length <= MAX_CHATGPT_IMPORT_ACTION_CHARS, `Semantic import action is ${action.length} chars`);

console.log("ChatGPT semantic classifier verification passed.");
