import assert from "node:assert/strict";
import {
  canonicalSharedChatUrl,
  parseBackendShareJsonText,
  parseReactRouterShareHtml
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

function encodeTurboGraph(root) {
  const slots = [];
  const strings = new Map();

  const encode = value => {
    if (typeof value === "string") {
      if (strings.has(value)) return strings.get(value);
      const index = slots.length;
      slots.push(value);
      strings.set(value, index);
      return index;
    }
    if (value === null || typeof value === "boolean" || typeof value === "number") {
      const index = slots.length;
      slots.push(value);
      return index;
    }
    if (Array.isArray(value)) {
      const index = slots.length;
      slots.push(null);
      slots[index] = value.map(encode);
      return index;
    }
    if (value && typeof value === "object") {
      const index = slots.length;
      const encoded = {};
      slots.push(encoded);
      for (const [key, child] of Object.entries(value)) {
        const keyIndex = encode(key);
        encoded[`_${keyIndex}`] = encode(child);
      }
      return index;
    }
    const index = slots.length;
    slots.push(null);
    return index;
  };

  assert.equal(encode(root), 0);
  return slots;
}

function turboHtml(root, { malformedFirst = false } = {}) {
  const malformed = malformedFirst
    ? '<script>window.__reactRouterContext.streamController.enqueue("not-json")</script>'
    : "";
  const jsonText = JSON.stringify(encodeTurboGraph(root));
  const jsString = JSON.stringify(jsonText);
  return `${malformed}<script>window.__reactRouterContext.streamController.enqueue(${jsString})</script>`;
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

// Current React Router 7 turbo-stream payloads resolve indexed object keys and preserve linear conversation order.
{
  const current = {
    loaderData: {
      route: {
        serverResponse: {
          data: {
            title: "New chat",
            conversation_id: SHARE_ID,
            default_model_slug: "gpt-5",
            linear_conversation: [
              { message: message("system", ["internal system"], 19) },
              { message: message("user", ["Turbo вопрос"], 20) },
              { message: message("assistant", ["Turbo ответ"], 21) },
              { message: message("tool", ["tool scratchpad"], 21.5) },
              { message: message("assistant", ["hidden response"], 22, { is_visually_hidden_from_conversation: true }) },
              message("user", ["Второй вопрос"], 23),
              message("assistant", ["Финальный turbo ответ"], 24)
            ]
          }
        }
      }
    }
  };

  const parsed = parseReactRouterShareHtml(turboHtml(current, { malformedFirst: true }), SOURCE_URL);
  assert.equal(parsed.shareId, SHARE_ID);
  assert.equal(parsed.aiModel, "gpt-5");
  assert.equal(parsed.title, "Turbo вопрос");
  assert.deepEqual(parsed.replies.map(item => item.type), ["user", "assistant", "user", "assistant"]);
  assert.deepEqual(parsed.replies.map(item => item.statement), [
    "Turbo вопрос",
    "Turbo ответ",
    "Второй вопрос",
    "Финальный turbo ответ"
  ]);
  assert.doesNotMatch(JSON.stringify(parsed), /internal system|tool scratchpad|hidden response/);
}

// React Router mapping payloads reuse the existing current-node branch semantics instead of mixing regenerated siblings.
{
  const current = {
    routeData: {
      data: {
        title: "Turbo mapping",
        conversation_id: SHARE_ID,
        current_node: "a2",
        mapping: {
          u1: { id: "u1", parent: null, children: ["old", "a1"], message: message("user", ["Какой ответ?"], 30) },
          old: { id: "old", parent: "u1", children: [], message: message("assistant", ["Старый sibling"], 31) },
          a1: { id: "a1", parent: "u1", children: ["u2"], message: message("assistant", ["Актуальный ответ"], 32) },
          u2: { id: "u2", parent: "a1", children: ["a2"], message: message("user", ["Продолжай"], 33) },
          a2: { id: "a2", parent: "u2", children: [], message: message("assistant", ["Финал"], 34) }
        }
      }
    }
  };

  const parsed = parseReactRouterShareHtml(turboHtml(current), SOURCE_URL);
  assert.equal(parsed.title, "Turbo mapping");
  assert.deepEqual(parsed.replies.map(item => item.statement), ["Какой ответ?", "Актуальный ответ", "Продолжай", "Финал"]);
  assert.doesNotMatch(JSON.stringify(parsed), /Старый sibling/);
}

// Malformed/empty React Router chunks fail closed instead of executing or guessing page script.
{
  assert.throws(
    () => parseReactRouterShareHtml('<script>window.__reactRouterContext.streamController.enqueue("not-json")</script>', SOURCE_URL),
    /no readable conversation turns/
  );
  assert.throws(
    () => parseReactRouterShareHtml(turboHtml({ loaderData: { nothingUseful: true } }), SOURCE_URL),
    /no readable conversation turns/
  );
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
