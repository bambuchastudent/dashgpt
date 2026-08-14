import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: { lang: "en" } } });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { language: "en-US" } });

const {
  CHATGPT_SEMANTIC_ENRICHMENT_VERSION,
  deriveChatGptSemanticMetadata
} = await import("../demo/chatgpt-semantic-enrichment.js");
const { semanticHue, semanticSignature } = await import("../demo/semantic-gallery.js");
const { projectChatGptExportConversation } = await import("../demo/chatgpt-export-normalizer.js");
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
assert.ok(food.tags.length >= 2 && food.tags.length <= 5);

const travel = deriveChatGptSemanticMetadata({
  title: "Morocco trip",
  messages: [{ role: "user", text: "Plan a flight and hotel route through Marrakech and Tangier." }]
});
assert.equal(travel.category, "Travel");
assert.ok(travel.tags.includes("travel"));
assert.ok(travel.tags.includes("flight") || travel.tags.includes("hotel"));

const mixed = deriveChatGptSemanticMetadata({
  title: "DashGPT import Safari",
  messages: [{ role: "user", text: "Сделай GitHub PR, OpenSpec и JavaScript browser import без дублей карточек." }]
});
assert.equal(mixed.category, "Software");
assert.equal(mixed.tags.includes("chatgpt"), false);
assert.ok(mixed.tags.includes("safari"));
assert.ok(mixed.tags.includes("github"));
assert.ok(mixed.tags.length >= 2 && mixed.tags.length <= 5);

const softwareCard = { title: "GitHub import", category: "Software", tags: ["software", "github", "openspec"] };
const foodCard = { title: "Salmon recipe", category: "Food", tags: ["food", "salmon", "recipe"] };
assert.notEqual(semanticHue(softwareCard), semanticHue(foodCard));
assert.equal(semanticSignature(softwareCard).groupKey, "anchor:technology");
assert.equal(semanticSignature(foodCard).groupKey, "anchor:food");

assert.equal(CHATGPT_SEMANTIC_ENRICHMENT_VERSION, 1);
assert.equal(CHATGPT_HISTORY_SOURCE_VERSION, 6);
const runner = buildChatGptHistorySourceRunner({
  receiverOrigin: "https://dashgpt.example",
  receiverPath: "/demo/",
  sessionId: "semantic-session",
  nonce: "semantic-nonce"
});
assert.match(runner, /"sourceVersion":6/);
assert.match(runner, /semanticEnrichmentVersion: 1/);
assert.match(runner, /category: semantic\.category/);
assert.match(runner, /semantic-enrichment aware/);
assert.match(runner, /rateLimitStreak/);
assert.match(runner, /savedCurrent/);
const action = buildChatGptHistoryImportAction({ receiverOrigin: "https://dashgpt.example", receiverPath: "/demo/" });
assert.ok(action.length <= MAX_CHATGPT_IMPORT_ACTION_CHARS, `Semantic import action is ${action.length} chars`);

const exportConversation = {
  id: "semantic-export",
  title: "GitHub Safari import",
  update_time: 1_720_000_000,
  current_node: "a",
  mapping: {
    u: { parent: null, children: ["a"], message: { author: { role: "user" }, content: { parts: ["Use OpenSpec and GitHub for a Safari browser import."] } } },
    a: { parent: "u", children: [], message: { author: { role: "assistant" }, content: { parts: ["Implemented the JavaScript import and repository checks."] } } }
  }
};
const exported = projectChatGptExportConversation(exportConversation);
assert.equal(exported.semanticEnrichmentVersion, 1);
assert.equal(exported.category, "Software");
assert.equal(exported.tags.includes("chatgpt"), false);
assert.ok(exported.tags.includes("github"));

const skill = await readFile(new URL("../plugins/dashgpt/skills/use-dashgpt/SKILL.md", import.meta.url), "utf8");
assert.match(skill, /2–5 compact meaning-oriented tags/);
assert.match(skill, /Do not depend on another `summarize` skill/);
assert.match(skill, /Do not use provider\/client\/process words such as `chatgpt`, `conversation`, or `result`/);

console.log("ChatGPT semantic classifier verification passed.");
