import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";

Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: { lang: "en" } } });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { language: "en-US" } });
Object.defineProperty(globalThis, "window", { configurable: true, value: new EventTarget() });

const {
  projectChatGptExportConversation,
  selectedChatGptExportMessages,
  isChatGptConversationJsonPath
} = await import("../demo/chatgpt-export-normalizer.js");
const { readChatGptExportFiles } = await import("../demo/chatgpt-export-parser.js");
const { importChatGptExportFiles } = await import("../demo/chatgpt-export-import.js");
const { createVault, materializeResults, putResult, saveBrowserVault } = await import("../demo/vault.js");
const { sanitizeChatGptCardCandidate } = await import("../demo/chatgpt-history-import.js");

class MemoryStorage {
  constructor() { this.values = new Map(); this.writes = 0; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.writes += 1; this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function conversation(id, { title = `Conversation ${id}`, update = 1_720_000_000, suffix = "" } = {}) {
  return {
    id,
    title,
    create_time: update - 100,
    update_time: update,
    current_node: `assistant-${id}`,
    mapping: {
      [`user-${id}`]: {
        id: `user-${id}`,
        parent: null,
        children: [`assistant-${id}`],
        message: { author: { role: "user" }, content: { parts: [`Please save the useful state for ${id}${suffix}.`] }, create_time: update - 50 }
      },
      [`assistant-${id}`]: {
        id: `assistant-${id}`,
        parent: `user-${id}`,
        children: [],
        message: { author: { role: "assistant" }, content: { parts: [`Useful assistant outcome for ${id}${suffix}, with enough detail to become a bounded DashGPT card.`] }, create_time: update }
      }
    }
  };
}

function jsonFile(name, payload) {
  return new File([JSON.stringify(payload)], name, { type: "application/json" });
}

function zipEntry(name, text, localOffset) {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(name);
  const raw = encoder.encode(text);
  const compressed = deflateRawSync(raw);
  const local = new Uint8Array(30 + nameBytes.length + compressed.length);
  const localView = new DataView(local.buffer);
  localView.setUint32(0, 0x04034b50, true);
  localView.setUint16(4, 20, true);
  localView.setUint16(8, 8, true);
  localView.setUint32(18, compressed.length, true);
  localView.setUint32(22, raw.length, true);
  localView.setUint16(26, nameBytes.length, true);
  local.set(nameBytes, 30);
  local.set(compressed, 30 + nameBytes.length);
  const central = new Uint8Array(46 + nameBytes.length);
  const centralView = new DataView(central.buffer);
  centralView.setUint32(0, 0x02014b50, true);
  centralView.setUint16(4, 20, true);
  centralView.setUint16(6, 20, true);
  centralView.setUint16(10, 8, true);
  centralView.setUint32(20, compressed.length, true);
  centralView.setUint32(24, raw.length, true);
  centralView.setUint16(28, nameBytes.length, true);
  centralView.setUint32(42, localOffset, true);
  central.set(nameBytes, 46);
  return { local, central };
}

function zipFile(entries) {
  const locals = [];
  const centrals = [];
  let localOffset = 0;
  for (const [name, payload] of entries) {
    const built = zipEntry(name, payload, localOffset);
    locals.push(built.local);
    centrals.push(built.central);
    localOffset += built.local.length;
  }
  const centralSize = centrals.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, entries.length, true);
  view.setUint16(10, entries.length, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, localOffset, true);
  return new File([...locals, ...centrals, end], "chatgpt-export.zip", { type: "application/zip" });
}

assert.equal(isChatGptConversationJsonPath("conversations.json"), true);
assert.equal(isChatGptConversationJsonPath("nested/conversations-002.json"), true);
assert.equal(isChatGptConversationJsonPath("user.json"), false);

{
  const projected = projectChatGptExportConversation(conversation("alpha"));
  assert.equal(projected.sourceId, "alpha");
  assert.match(projected.summary, /Useful assistant outcome/);
  assert.equal(selectedChatGptExportMessages(conversation("alpha")).length, 2);
}

{
  const parsed = await readChatGptExportFiles([jsonFile("conversations.json", [conversation("a"), conversation("b")])]);
  assert.equal(parsed.discovered, 2);
  assert.equal(parsed.malformed, 0);
}

{
  const older = conversation("same", { update: 1_720_000_000, suffix: " older" });
  const newer = conversation("same", { update: 1_720_000_100, suffix: " newer" });
  const parsed = await readChatGptExportFiles([
    jsonFile("conversations-1.json", [older]),
    jsonFile("conversations-2.json", [newer])
  ]);
  assert.equal(parsed.discovered, 1);
  assert.equal(parsed.duplicateSourceRecords, 1);
  assert.match(parsed.candidates[0].summary, /newer/);
}

{
  const zip = zipFile([
    ["account/user.json", JSON.stringify({ name: "ignored" })],
    ["account/conversations.json", JSON.stringify([conversation("zip-one")])]
  ]);
  const parsed = await readChatGptExportFiles([zip]);
  assert.equal(parsed.discovered, 1);
  assert.equal(parsed.candidates[0].sourceId, "zip-one");
}

{
  const parsed = await readChatGptExportFiles([jsonFile("conversations.json", [conversation("good"), {}])]);
  assert.equal(parsed.discovered, 1);
  assert.equal(parsed.malformed, 1);
}

{
  const storage = new MemoryStorage();
  const first = await importChatGptExportFiles([jsonFile("conversations.json", [conversation("one"), conversation("two")])], { storage, yieldFn: async () => {} });
  assert.equal(first.imported, 2);
  assert.equal(first.skipped, 0);
  const firstVault = JSON.parse(storage.getItem("dashgpt.demo.vault.v1"));
  assert.equal(materializeResults(firstVault).filter(result => result.source?.provider === "chatgpt").length, 2);
  const replay = await importChatGptExportFiles([jsonFile("conversations.json", [conversation("one"), conversation("two")])], { storage, yieldFn: async () => {} });
  assert.equal(replay.imported, 0);
  assert.equal(replay.skipped, 2);
  const replayVault = JSON.parse(storage.getItem("dashgpt.demo.vault.v1"));
  assert.equal(materializeResults(replayVault).filter(result => result.source?.provider === "chatgpt").length, 2);
}

{
  const storage = new MemoryStorage();
  const vault = createVault({ vaultId: "vault-live-dedup", createdAt: "2026-08-13T00:00:00.000Z" });
  putResult(vault, sanitizeChatGptCardCandidate({
    sourceId: "live-first",
    title: "Live first",
    summary: "Already imported through the live browser path.",
    currentState: "Existing",
    tags: ["chatgpt"],
    facts: ["2 visible messages"],
    updatedAt: new Date(1_720_000_000 * 1000).toISOString()
  }));
  saveBrowserVault(storage, vault);
  const result = await importChatGptExportFiles([jsonFile("conversations.json", [conversation("live-first", { update: 1_720_000_000 })])], { storage, yieldFn: async () => {} });
  assert.equal(result.imported, 0);
  assert.equal(result.skipped, 1);
  const finalVault = JSON.parse(storage.getItem("dashgpt.demo.vault.v1"));
  assert.equal(materializeResults(finalVault).filter(item => item.source?.sourceId === "live-first").length, 1);
}

{
  const storage = new MemoryStorage();
  const many = Array.from({ length: 70 }, (_, index) => conversation(`batch-${index}`));
  const progress = [];
  await importChatGptExportFiles([jsonFile("conversations.json", many)], {
    storage,
    onProgress: state => progress.push(state),
    yieldFn: async () => {}
  });
  assert.ok(storage.writes >= 4, `Expected bounded progressive saves, got ${storage.writes}`);
  assert.ok(progress.filter(item => item.phase === "importing").length >= 3);
}

console.log("ChatGPT export import verification passed.");
