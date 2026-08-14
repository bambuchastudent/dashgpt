import {
  CHATGPT_SEMANTIC_ENRICHMENT_VERSION,
  deriveChatGptSemanticMetadata
} from "./chatgpt-semantic-enrichment.js";

function asIso(value) {
  if (value == null || value === "") return null;
  const date = typeof value === "number" ? new Date(value > 10_000_000_000 ? value : value * 1000) : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function clip(text, max) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, Math.max(0, max - 1))}…` : value;
}

function textFromPart(part) {
  if (typeof part === "string") return part;
  if (!part || typeof part !== "object") return "";
  if (typeof part.text === "string") return part.text;
  if (typeof part.content === "string") return part.content;
  if (Array.isArray(part.content)) return part.content.map(textFromPart).filter(Boolean).join("\n");
  if (Array.isArray(part.parts)) return part.parts.map(textFromPart).filter(Boolean).join("\n");
  return "";
}

function messageText(message) {
  const content = message?.content;
  if (typeof content === "string") return content.trim();
  if (!content || typeof content !== "object") return "";
  const values = [];
  if (Array.isArray(content.parts)) values.push(...content.parts.map(textFromPart));
  if (typeof content.text === "string") values.push(content.text);
  if (typeof content.content === "string") values.push(content.content);
  if (Array.isArray(content.content)) values.push(...content.content.map(textFromPart));
  return values.map(value => String(value || "").trim()).filter(Boolean).join("\n\n");
}

function fallbackLeaf(mapping) {
  let bestId = null;
  let bestTime = -1;
  for (const [id, node] of Object.entries(mapping || {})) {
    if (!node?.message || (Array.isArray(node.children) && node.children.length)) continue;
    const time = Date.parse(asIso(node.message.create_time) || "") || 0;
    if (bestId == null || time > bestTime) {
      bestId = id;
      bestTime = time;
    }
  }
  return bestId;
}

export function selectedChatGptExportMessages(payload) {
  const conversation = payload?.conversation && typeof payload.conversation === "object" ? payload.conversation : payload;
  const mapping = conversation?.mapping && typeof conversation.mapping === "object" ? conversation.mapping : null;
  const messages = [];

  if (mapping && Object.keys(mapping).length) {
    let id = conversation?.current_node;
    if (!id || !mapping[id]) id = fallbackLeaf(mapping);
    const nodes = [];
    const seen = new Set();
    while (id && mapping[id] && !seen.has(id)) {
      seen.add(id);
      nodes.push(mapping[id]);
      id = mapping[id]?.parent;
    }
    nodes.reverse();
    for (const node of nodes) {
      const message = node?.message;
      const role = message?.author?.role;
      const hidden = Boolean(message?.metadata?.is_visually_hidden_from_conversation || message?.metadata?.is_hidden);
      const text = messageText(message).replace(/\s+/g, " ").trim();
      if (hidden || message?.status === "in_progress" || !text || !["user", "assistant"].includes(role)) continue;
      messages.push({ role, text });
    }
    return messages;
  }

  const flat = Array.isArray(conversation?.messages) ? conversation.messages.slice() : [];
  flat.sort((left, right) => (Date.parse(asIso(left?.create_time) || "") || 0) - (Date.parse(asIso(right?.create_time) || "") || 0));
  for (const message of flat) {
    const role = message?.author?.role || message?.role;
    const hidden = Boolean(message?.metadata?.is_visually_hidden_from_conversation || message?.metadata?.is_hidden);
    const text = messageText(message).replace(/\s+/g, " ").trim();
    if (hidden || message?.status === "in_progress" || !text || !["user", "assistant"].includes(role)) continue;
    messages.push({ role, text });
  }
  return messages;
}

export function projectChatGptExportConversation(payload) {
  const conversation = payload?.conversation && typeof payload.conversation === "object" ? payload.conversation : payload;
  if (!conversation || typeof conversation !== "object" || Array.isArray(conversation)) throw new Error("Invalid ChatGPT conversation");
  const sourceId = String(conversation?.id || conversation?.conversation_id || "").trim();
  if (!sourceId) throw new Error("Conversation has no id");
  const messages = selectedChatGptExportMessages(conversation);
  const assistants = messages.filter(item => item.role === "assistant" && item.text.length >= 20);
  const users = messages.filter(item => item.role === "user" && item.text.length >= 12);
  const assistant = assistants[assistants.length - 1]?.text || "";
  const user = users[users.length - 1]?.text || "";
  const title = clip(conversation?.title || "Untitled ChatGPT conversation", 140);
  const semantic = deriveChatGptSemanticMetadata({ title, messages });
  return {
    sourceId,
    title,
    summary: clip(assistant || user || title, 520),
    currentState: clip(user, 180),
    category: semantic.category,
    tags: semantic.tags,
    semanticEnrichmentVersion: CHATGPT_SEMANTIC_ENRICHMENT_VERSION,
    facts: [`${messages.length} visible messages`],
    updatedAt: asIso(conversation?.update_time ?? conversation?.create_time) || "1970-01-01T00:00:00.000Z"
  };
}

export function conversationsFromChatGptExportPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") throw new Error("ChatGPT export JSON is not an object or array");
  if (Array.isArray(payload.conversations)) return payload.conversations;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data?.conversations)) return payload.data.conversations;
  if (payload.mapping && (payload.id || payload.conversation_id)) return [payload];
  throw new Error("No ChatGPT conversations found in this JSON file");
}

function basename(path) {
  return String(path || "").replace(/\\/g, "/").split("/").filter(Boolean).at(-1) || "";
}

export function isChatGptConversationJsonPath(path) {
  const name = basename(path).toLocaleLowerCase();
  return name === "conversations.json" || /^conversations(?:[-_.]?\d+)+\.json$/.test(name);
}
