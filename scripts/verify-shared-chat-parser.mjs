import assert from "node:assert/strict";
import {
  canonicalSharedChatUrl,
  parseBackendShareJsonText
} from "../src/shared-chat.js";

const SHARE_ID = "6a7a59e3-c9d4-83ea-bb8d-88c57f00b491";
const SOURCE_URL = new URL(`https://chatgpt.com/share/${SHARE_ID}`);

function wrapped(payload) {
  return `Title:\nURL Source: https://chatgpt.com/backend-api/share/${SHARE_ID}\n\nMarkdown Content:\n${JSON.stringify(payload)}`;
}

function message(role, parts, createTime, metadata = {}) {
  return {
    author: { role },
    content: { content_type: "text", parts },
    create_time: createTime,
    metadata
  };
}

// Canonicalization accepts supported historical/mobile forms, strips query data, and rejects foreign hosts.
{
  assert.equal(
    canonicalSharedChatUrl(`https://chatgpt.com/share/${SHARE_ID}?utm_source=test#x`).toString(),
    `https://chatgpt.com/share/${SHARE_ID}`
  );
  assert.equal(
    canonicalSharedChatUrl(`https://chat.openai.com/share/e/${SHARE_ID}`).toString(),
    `https://chatgpt.com/share/${SHARE_ID}`
  );
  assert.throws(() => canonicalSharedChatUrl("https://example.com/share/abc"), /Only public ChatGPT share URLs/);
}

// current_node ancestry wins: regenerated siblings, tool/system nodes and visually hidden messages never leak into the conversation.
{
  const payload = {
    title: "New chat",
    conversation_id: SHARE_ID,
    current_node: "a2",
    default_model_slug: "auto",
    mapping: {
      root: { id: "root", parent: null, children: ["u1"], message: message("system", ["secret system"], 1) },
      u1: { id: "u1", parent: "root", children: ["old", "tool", "a1"], message: message("user", ["Составь план"], 2) },
      old: { id: "old", parent: "u1", children: [], message: message("assistant", ["Старый регенерированный ответ"], 3) },
      tool: { id: "tool", parent: "u1", children: [], message: message("tool", ["search(...)"], 3.5) },
      a1: { id: "a1", parent: "u1", children: ["hidden", "u2"], message: message("assistant", ["Первый полезный ответ"], 4) },
      hidden: { id: "hidden", parent: "a1", children: [], message: message("assistant", ["hidden"], 5, { is_visually_hidden_from_conversation: "true" }) },
      u2: {
        id: "u2",
        parent: "a1",
        children: ["a2"],
        message: {
          author: { role: "user" },
          content: { content_type: "multimodal_text", parts: ["строка", { text: "объект text" }, { parts: [{ value: "nested value" }] }] },
          create_time: 6
        }
      },
      a2: {
        id: "a2",
        parent: "u2",
        children: [],
        message: { author: { role: "assistant" }, content: { result: "Финальный ответ" }, create_time: 7 }
      }
    }
  };

  const parsed = parseBackendShareJsonText(wrapped(payload), SOURCE_URL);
  assert.equal(parsed.title, "Составь план");
  assert.equal(parsed.aiModel, "auto");
  assert.deepEqual(parsed.replies.map(item => item.type), ["user", "assistant", "user", "assistant"]);
  assert.deepEqual(parsed.replies.map(item => item.statement), [
    "Составь план",
    "Первый полезный ответ",
    "строка\nобъект text\nnested value",
    "Финальный ответ"
  ]);
  assert.equal(parsed.replies[0].createdAt, "1970-01-01T00:00:02.000Z");
  assert.doesNotMatch(JSON.stringify(parsed), /secret system|Старый регенерированный|search\(|hidden/);
}

// If current_node disappears or points to an unknown node, choose the deepest active-looking branch; for equal depth prefer the newest branch.
{
  const base = {
    title: "Check out this chat",
    conversation_id: SHARE_ID,
    current_node: "missing",
    mapping: {
      root: { id: "root", parent: null, children: ["u1"], message: message("system", ["internal"], 1) },
      u1: { id: "u1", parent: "root", children: ["oldA", "newA"], message: message("user", ["Выбери вариант"], 2) },
      oldA: { id: "oldA", parent: "u1", children: ["oldU"], message: message("assistant", ["Старый вариант"], 3) },
      oldU: { id: "oldU", parent: "oldA", children: [], message: message("user", ["Старое продолжение"], 4) },
      newA: { id: "newA", parent: "u1", children: ["newU"], message: message("assistant", ["Новый вариант"], 10) },
      newU: { id: "newU", parent: "newA", children: [], message: message("user", ["Новое продолжение"], 11) }
    }
  };

  const parsed = parseBackendShareJsonText(JSON.stringify(base), SOURCE_URL);
  assert.equal(parsed.title, "Выбери вариант");
  assert.deepEqual(parsed.replies.map(item => item.statement), ["Выбери вариант", "Новый вариант", "Новое продолжение"]);
}

// Duplicate consecutive nodes with the same role/text are collapsed rather than polluting summaries.
{
  const payload = {
    title: "Useful title",
    conversation_id: SHARE_ID,
    current_node: "a2",
    mapping: {
      u1: { id: "u1", parent: null, children: ["a1"], message: message("user", ["Вопрос"], 1) },
      a1: { id: "a1", parent: "u1", children: ["a2"], message: message("assistant", ["Ответ"], 2) },
      a2: { id: "a2", parent: "a1", children: [], message: message("assistant", ["Ответ"], 3) }
    }
  };
  const parsed = parseBackendShareJsonText(JSON.stringify(payload), SOURCE_URL);
  assert.deepEqual(parsed.replies.map(item => item.statement), ["Вопрос", "Ответ"]);
}

// Generic titles fall back to the first useful user turn, while explicit titles are preserved.
{
  const generic = {
    title: "New chat",
    conversation_id: SHARE_ID,
    current_node: "a1",
    mapping: {
      u1: { id: "u1", parent: null, children: ["a1"], message: message("user", ["Очень конкретный вопрос"], 1) },
      a1: { id: "a1", parent: "u1", children: [], message: message("assistant", ["Ответ"], 2) }
    }
  };
  assert.equal(parseBackendShareJsonText(JSON.stringify(generic), SOURCE_URL).title, "Очень конкретный вопрос");
  generic.title = "Нормальное название";
  assert.equal(parseBackendShareJsonText(JSON.stringify(generic), SOURCE_URL).title, "Нормальное название");
}

// Malformed and empty backend payloads must fail loudly so the resolver can continue to the next compatibility path.
{
  assert.throws(() => parseBackendShareJsonText("Markdown Content:\n{bad json}", SOURCE_URL), /Public share JSON was unreadable/);
  assert.throws(
    () => parseBackendShareJsonText(JSON.stringify({ conversation_id: SHARE_ID, mapping: {} }), SOURCE_URL),
    /no readable conversation turns/
  );
}

console.log("Shared ChatGPT parser regression matrix passed.");
