import { CHATGPT_SHARE_HEADERS, parseChatGptShareHtml } from "chatgpt-share-parser";

const ALLOWED_SHARE_HOSTS = new Set(["chatgpt.com", "chat.openai.com"]);
const VISIBLE_MESSAGE_SELECTOR = "[data-message-author-role]";
const UNREADABLE_SHARE_MESSAGE = "Unable to read this public ChatGPT conversation. Try again or use DashGPT from inside the original chat.";
const JINA_READER_PREFIX = "https://r.jina.ai/";
const ALL_ORIGINS_PREFIX = "https://api.allorigins.win/raw?url=";
const REACT_ROUTER_ENQUEUE = /window\.__reactRouterContext\.streamController\.enqueue\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g;

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data, null, 2), { ...init, headers });
}

export function canonicalSharedChatUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (
    url.protocol !== "https:"
    || !ALLOWED_SHARE_HOSTS.has(url.hostname)
    || url.username
    || url.password
  ) {
    throw new Error("Only public ChatGPT share URLs are allowed.");
  }

  const segments = url.pathname.split("/").filter(Boolean);

  if (segments.length === 2 && segments[0] === "s" && segments[1]) {
    return new URL(`/share/${segments[1]}`, "https://chatgpt.com");
  }

  if (segments.length === 2 && segments[0] === "share" && segments[1]) {
    return new URL(`/share/${segments[1]}`, "https://chatgpt.com");
  }

  if (segments.length === 3 && segments[0] === "share" && segments[1] === "e" && segments[2]) {
    return new URL(`/share/${segments[2]}`, "https://chatgpt.com");
  }

  if (
    segments.length === 5
    && segments[0] === "g"
    && segments[1]
    && segments[2] === "shared"
    && segments[3] === "c"
    && segments[4]
  ) {
    const canonical = new URL(`/g/${segments[1]}/shared/c/${segments[4]}`, "https://chatgpt.com");
    const ownerUserId = url.searchParams.get("owner_user_id");
    if (ownerUserId) canonical.searchParams.set("owner_user_id", ownerUserId);
    return canonical;
  }

  throw new Error("Expected a supported public ChatGPT share URL.");
}

function shareIdFromUrl(sourceUrl) {
  return sourceUrl.pathname.split("/").filter(Boolean).at(-1) || "";
}

function backendShareUrl(sourceUrl) {
  return new URL(`/backend-api/share/${shareIdFromUrl(sourceUrl)}`, "https://chatgpt.com");
}

function upstreamFetch(env, input, init) {
  if (typeof env?.DASHGPT_SHARE_FETCH === "function") return env.DASHGPT_SHARE_FETCH(input, init);
  return fetch(input, init);
}

function resolverFetch(env, input, init) {
  if (typeof env?.DASHGPT_RESOLVER_FETCH === "function") return env.DASHGPT_RESOLVER_FETCH(input, init);
  return fetch(input, init);
}

async function directHtml(sourceUrl, env) {
  const response = await upstreamFetch(env, sourceUrl, {
    headers: CHATGPT_SHARE_HEADERS,
    redirect: "follow"
  });
  if (!response.ok) {
    const error = new Error(`Direct ChatGPT share fetch returned ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return response.text();
}

async function readerResolvedText(targetUrl, env) {
  const resolverUrl = `${JINA_READER_PREFIX}${targetUrl.toString()}`;
  const response = await resolverFetch(env, resolverUrl, {
    method: "GET",
    headers: {
      accept: "text/plain, text/markdown;q=0.9, application/json;q=0.8, */*;q=0.1",
      "x-timeout": "12"
    },
    redirect: "follow"
  });
  if (!response.ok) {
    const error = new Error(`Reader resolver returned ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return response.text();
}

async function readerText(sourceUrl, env) {
  return readerResolvedText(sourceUrl, env);
}

async function readerBackendText(sourceUrl, env) {
  return readerResolvedText(backendShareUrl(sourceUrl), env);
}

async function allOriginsHtml(sourceUrl, env) {
  const resolverUrl = `${ALL_ORIGINS_PREFIX}${encodeURIComponent(sourceUrl.toString())}`;
  const response = await resolverFetch(env, resolverUrl, {
    method: "GET",
    headers: { accept: "text/html, */*;q=0.1" },
    redirect: "follow"
  });
  if (!response.ok) {
    const error = new Error(`Raw proxy resolver returned ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return response.text();
}

function hasBrowserBinding(env) {
  return Boolean(env?.BROWSER && typeof env.BROWSER.quickAction === "function");
}

function browserBinding(env) {
  if (!hasBrowserBinding(env)) throw new Error("Browser fallback is not configured.");
  return env.BROWSER;
}

async function browserHtml(sourceUrl, env) {
  const response = await browserBinding(env).quickAction("content", {
    url: sourceUrl.toString(),
    gotoOptions: { waitUntil: "networkidle2" }
  });
  if (!response.ok) {
    const error = new Error(`Browser HTML fallback returned ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return response.text();
}

function attributeValue(attributes, name) {
  if (!Array.isArray(attributes)) return null;
  return attributes.find(attribute => attribute?.name === name)?.value ?? null;
}

function cleanVisibleText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fallbackTitle(replies) {
  const firstUser = replies.find(reply => reply.type === "user")?.statement || replies[0]?.statement || "Shared ChatGPT conversation";
  const firstLine = cleanVisibleText(firstUser).split("\n").find(Boolean) || "Shared ChatGPT conversation";
  return firstLine.length > 96 ? `${firstLine.slice(0, 93)}…` : firstLine;
}

function usefulTitle(value) {
  const title = cleanVisibleText(value);
  if (!title) return "";
  if (/^(?:chatgpt|new chat|check out this chat|shared chatgpt conversation)$/i.test(title)) return "";
  return title;
}

function makeReply(role, statement, createdAt = null) {
  return {
    authorName: role === "user" ? "You" : "ChatGPT",
    type: role,
    statement: cleanVisibleText(statement),
    createdAt,
    assets: []
  };
}

function readerRoleLabel(value) {
  const label = String(value || "").trim().toLowerCase();
  if (/^(?:you(?: said)?|user(?: \d+)?(?: said)?)$/.test(label)) return "user";
  if (/^(?:chatgpt(?: said)?|assistant(?: \d+)?(?: said)?)$/.test(label)) return "assistant";
  return null;
}

function jsonCandidate(raw) {
  const text = String(raw || "").trim();
  if (!text) throw new Error("Resolver returned no content.");
  if (text.startsWith("{") && text.endsWith("}")) return text;

  const marker = text.search(/Markdown Content:\s*/i);
  const searchFrom = marker >= 0 ? text.slice(marker).search(/\{/) + marker : text.search(/\{/);
  const start = searchFrom >= marker && searchFrom >= 0 ? searchFrom : text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Resolver did not contain a JSON object.");
  return text.slice(start, end + 1);
}

function textFromPart(part) {
  if (typeof part === "string") return part;
  if (Array.isArray(part)) return part.map(textFromPart).filter(Boolean).join("\n");
  if (!part || typeof part !== "object") return "";
  if (typeof part.text === "string") return part.text;
  if (typeof part.content === "string") return part.content;
  if (typeof part.value === "string") return part.value;
  if (Array.isArray(part.parts)) return part.parts.map(textFromPart).filter(Boolean).join("\n");
  return "";
}

function messageStatement(message) {
  const content = message?.content;
  if (!content || typeof content !== "object") return "";
  if (Array.isArray(content.parts)) return cleanVisibleText(content.parts.map(textFromPart).filter(Boolean).join("\n"));
  if (typeof content.text === "string") return cleanVisibleText(content.text);
  if (typeof content.result === "string") return cleanVisibleText(content.result);
  return "";
}

function nodeTimestamp(node) {
  const value = Number(node?.message?.create_time ?? node?.message?.update_time ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function parentPath(mapping, leafId) {
  const path = [];
  const seen = new Set();
  let currentId = leafId;

  while (currentId && mapping[currentId] && !seen.has(currentId)) {
    seen.add(currentId);
    path.unshift(currentId);
    currentId = mapping[currentId]?.parent || null;
  }
  return path;
}

function fallbackTreePath(mapping) {
  const ids = Object.keys(mapping);
  const leaves = ids.filter(id => !Array.isArray(mapping[id]?.children) || mapping[id].children.length === 0);
  const candidates = leaves.length ? leaves : ids;
  let best = [];
  let bestTime = -Infinity;

  for (const id of candidates) {
    const path = parentPath(mapping, id);
    const time = Math.max(...path.map(pathId => nodeTimestamp(mapping[pathId])), 0);
    if (path.length > best.length || (path.length === best.length && time > bestTime)) {
      best = path;
      bestTime = time;
    }
  }
  return best;
}

function visibleMessageReply(message) {
  const role = message?.author?.role;
  if (!message || !["user", "assistant"].includes(role)) return null;
  if (message?.metadata?.is_visually_hidden_from_conversation === true) return null;
  if (message?.metadata?.is_visually_hidden_from_conversation === "true") return null;

  const statement = messageStatement(message);
  if (!statement) return null;
  const createTime = Number(message.create_time);
  return makeReply(role, statement, Number.isFinite(createTime) && createTime > 0 ? new Date(createTime * 1000).toISOString() : null);
}

function appendVisibleReply(replies, message) {
  const reply = visibleMessageReply(message);
  if (!reply) return;
  const previous = replies.at(-1);
  if (previous?.type === reply.type && previous.statement === reply.statement) return;
  replies.push(reply);
}

function visibleBackendReplies(payload) {
  const mapping = payload?.mapping && typeof payload.mapping === "object" ? payload.mapping : {};
  let path = payload?.current_node && mapping[payload.current_node]
    ? parentPath(mapping, payload.current_node)
    : [];
  if (!path.length) path = fallbackTreePath(mapping);

  const replies = [];
  for (const id of path) appendVisibleReply(replies, mapping[id]?.message);
  return replies;
}

function linearConversationMessage(item) {
  if (!item || typeof item !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(item, "message")) return item.message || null;
  return item;
}

function visibleLinearReplies(payload) {
  const replies = [];
  for (const item of Array.isArray(payload?.linear_conversation) ? payload.linear_conversation : []) {
    appendVisibleReply(replies, linearConversationMessage(item));
  }
  return replies;
}

function visibleConversationReplies(payload) {
  if (Array.isArray(payload?.linear_conversation) && payload.linear_conversation.length) {
    const replies = visibleLinearReplies(payload);
    if (replies.length) return replies;
  }
  return visibleBackendReplies(payload);
}

function conversationChat(payload, sourceUrl) {
  const replies = visibleConversationReplies(payload);
  if (!replies.length) throw new Error("Public share payload contained no readable conversation turns.");

  const shareId = payload?.conversation_id || shareIdFromUrl(sourceUrl);
  return {
    shareId,
    aiModel: cleanVisibleText(payload?.default_model_slug || payload?.model?.slug || "unknown") || "unknown",
    title: usefulTitle(payload?.title) || fallbackTitle(replies),
    updatedAt: null,
    replies
  };
}

function hasConversationShape(value) {
  return Boolean(
    value
    && typeof value === "object"
    && (
      (value.mapping && typeof value.mapping === "object" && !Array.isArray(value.mapping))
      || Array.isArray(value.linear_conversation)
    )
  );
}

function findReadableConversationPayload(root) {
  const stack = [root];
  const seen = new WeakSet();
  while (stack.length) {
    const value = stack.pop();
    if (!value || typeof value !== "object") continue;
    if (seen.has(value)) continue;
    seen.add(value);

    if (hasConversationShape(value) && visibleConversationReplies(value).length) return value;
    for (const child of Object.values(value)) {
      if (child && typeof child === "object") stack.push(child);
    }
  }
  return null;
}

function resolveReactRouterGraph(slots) {
  if (!Array.isArray(slots) || !slots.length) return null;
  const cache = new Map();
  const length = slots.length;

  const resolveSlot = index => {
    if (typeof index !== "number" || !Number.isFinite(index)) return index;
    if (index < 0) return null;
    if (!Number.isInteger(index) || index >= length) return index;
    if (cache.has(index)) return cache.get(index);

    const raw = slots[index];
    if (raw === null || typeof raw === "string" || typeof raw === "boolean") {
      cache.set(index, raw);
      return raw;
    }
    if (typeof raw === "number") {
      cache.set(index, raw);
      return raw;
    }
    if (Array.isArray(raw)) {
      const output = [];
      cache.set(index, output);
      for (const value of raw) output.push(resolveSlot(value));
      return output;
    }
    if (raw && typeof raw === "object") {
      const output = {};
      cache.set(index, output);
      for (const [encodedKey, value] of Object.entries(raw)) {
        if (encodedKey.startsWith("_")) {
          const keyIndex = Number(encodedKey.slice(1));
          if (Number.isInteger(keyIndex) && keyIndex >= 0 && keyIndex < length) {
            const resolvedKey = resolveSlot(keyIndex);
            if (typeof resolvedKey === "string") output[resolvedKey] = resolveSlot(value);
          }
        } else {
          output[encodedKey] = resolveSlot(value);
        }
      }
      return output;
    }

    cache.set(index, raw);
    return raw;
  };

  return resolveSlot(0);
}

export function parseReactRouterShareHtml(html, sourceUrl) {
  const text = String(html || "");
  REACT_ROUTER_ENQUEUE.lastIndex = 0;
  let match;

  while ((match = REACT_ROUTER_ENQUEUE.exec(text))) {
    let slots;
    try {
      const jsonText = JSON.parse(`"${match[1]}"`);
      slots = JSON.parse(jsonText);
    } catch {
      continue;
    }
    if (!Array.isArray(slots)) continue;

    const root = resolveReactRouterGraph(slots);
    const payload = findReadableConversationPayload(root);
    if (!payload) continue;
    return conversationChat(payload, sourceUrl);
  }

  throw new Error("React Router Share payload contained no readable conversation turns.");
}

export function parseBackendShareJsonText(raw, sourceUrl) {
  let payload;
  try {
    payload = JSON.parse(jsonCandidate(raw));
  } catch (error) {
    throw new Error(`Public share JSON was unreadable: ${error instanceof Error ? error.message : "invalid JSON"}`);
  }

  return conversationChat(payload, sourceUrl);
}

export function parseReaderShareText(raw, sourceUrl) {
  const text = cleanVisibleText(raw);
  if (!text) throw new Error("Reader resolver returned no content.");

  const lines = text.split("\n");
  const replies = [];
  let title = "";
  let currentRole = null;
  let currentLines = [];

  const flush = () => {
    if (!currentRole) return;
    const statement = cleanVisibleText(currentLines.join("\n"));
    if (statement) {
      const previous = replies.at(-1);
      if (!(previous?.type === currentRole && previous.statement === statement)) {
        replies.push(makeReply(currentRole, statement));
      }
    }
    currentLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!title) {
      const metadataTitle = line.match(/^Title:\s*(.+)$/i)?.[1]?.trim();
      const candidate = usefulTitle(metadataTitle);
      if (candidate) title = candidate;
    }

    const withoutHeading = line.replace(/^#{1,6}\s+/, "").trim();
    if (!title && /^#\s+/.test(line)) {
      const heading = usefulTitle(line.replace(/^#\s+/, "").trim());
      if (heading && !/^markdown content$/i.test(heading)) title = heading;
    }

    const roleMatch = withoutHeading.match(/^(You(?: said)?|User(?: \d+)?(?: said)?|ChatGPT(?: said)?|Assistant(?: \d+)?(?: said)?):?\s*(.*)$/i);
    const role = roleMatch ? readerRoleLabel(roleMatch[1]) : null;
    if (role) {
      flush();
      currentRole = role;
      currentLines = roleMatch[2] ? [roleMatch[2]] : [];
      continue;
    }

    if (currentRole) currentLines.push(line);
  }
  flush();

  if (!replies.length) throw new Error("Reader resolver contained no recognizable conversation turns.");
  const shareId = shareIdFromUrl(sourceUrl);

  return {
    shareId,
    aiModel: "unknown",
    title: title || fallbackTitle(replies),
    updatedAt: null,
    replies
  };
}

export function parseRenderedShareScrape(payload, sourceUrl) {
  const groups = Array.isArray(payload?.result)
    ? payload.result
    : Array.isArray(payload)
      ? payload
      : [];
  const messageGroup = groups.find(group => group?.selector === VISIBLE_MESSAGE_SELECTOR);
  const elements = Array.isArray(messageGroup?.results) ? messageGroup.results : [];
  const replies = [];

  for (const element of elements) {
    const role = attributeValue(element?.attributes, "data-message-author-role");
    if (!role || !["user", "assistant", "tool"].includes(role)) continue;
    const statement = cleanVisibleText(element?.text);
    if (!statement) continue;

    const previous = replies.at(-1);
    if (previous?.type === role && previous.statement === statement) continue;

    replies.push({
      authorName: role === "user" ? "You" : role === "assistant" ? "ChatGPT" : "Tool",
      type: role,
      statement,
      createdAt: null,
      assets: []
    });
  }

  if (!replies.length) {
    throw new Error("Rendered ChatGPT page contained no readable conversation turns.");
  }

  const headingGroup = groups.find(group => group?.selector === "h1");
  const heading = usefulTitle(headingGroup?.results?.find(item => cleanVisibleText(item?.text))?.text);
  const shareId = shareIdFromUrl(sourceUrl);

  return {
    shareId,
    aiModel: "unknown",
    title: heading || fallbackTitle(replies),
    updatedAt: null,
    replies
  };
}

async function browserVisibleChat(sourceUrl, env) {
  const response = await browserBinding(env).quickAction("scrape", {
    url: sourceUrl.toString(),
    elements: [
      { selector: VISIBLE_MESSAGE_SELECTOR },
      { selector: "h1" }
    ],
    gotoOptions: { waitUntil: "networkidle2" }
  });
  if (!response.ok) {
    const error = new Error(`Browser DOM fallback returned ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return parseRenderedShareScrape(await response.json(), sourceUrl);
}

function parseReadableChat(html, sourceUrl) {
  let legacyError;
  try {
    const chat = parseChatGptShareHtml(html);
    if (chat?.title || chat?.replies?.length) return chat;
    legacyError = new Error("Legacy Share parser returned no readable conversation.");
  } catch (error) {
    legacyError = error;
  }

  try {
    return parseReactRouterShareHtml(html, sourceUrl);
  } catch (reactRouterError) {
    const error = new Error("Shared ChatGPT page did not contain a readable conversation.");
    error.cause = { legacyError, reactRouterError };
    throw error;
  }
}

function unreadableShareError(details) {
  const error = new Error(UNREADABLE_SHARE_MESSAGE);
  error.code = "SHARED_CHAT_UNREADABLE";
  error.cause = details;
  return error;
}

export async function readSharedChat(sourceUrl, env = {}) {
  let backendReaderError;
  try {
    return {
      chat: parseBackendShareJsonText(await readerBackendText(sourceUrl, env), sourceUrl),
      retrieval: "reader-backend"
    };
  } catch (error) {
    backendReaderError = error;
  }

  let readerError;
  try {
    return {
      chat: parseReaderShareText(await readerText(sourceUrl, env), sourceUrl),
      retrieval: "reader"
    };
  } catch (error) {
    readerError = error;
  }

  let proxyError;
  try {
    return {
      chat: parseReadableChat(await allOriginsHtml(sourceUrl, env), sourceUrl),
      retrieval: "raw-proxy"
    };
  } catch (error) {
    proxyError = error;
  }

  let domError;
  if (hasBrowserBinding(env)) {
    try {
      return {
        chat: await browserVisibleChat(sourceUrl, env),
        retrieval: "browser-dom"
      };
    } catch (error) {
      domError = error;
    }
  }

  let directError;
  try {
    return {
      chat: parseReadableChat(await directHtml(sourceUrl, env), sourceUrl),
      retrieval: "direct"
    };
  } catch (error) {
    directError = error;
  }

  let payloadError;
  if (hasBrowserBinding(env)) {
    try {
      return {
        chat: parseReadableChat(await browserHtml(sourceUrl, env), sourceUrl),
        retrieval: "browser-payload"
      };
    } catch (error) {
      payloadError = error;
    }
  }

  throw unreadableShareError({ backendReaderError, readerError, proxyError, domError, directError, payloadError });
}

export async function handleSharedChat(request, env = {}) {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed." }, { status: 405, headers: { allow: "GET" } });
  }

  const input = new URL(request.url).searchParams.get("url");
  if (!input) return json({ error: "Missing ?url= public ChatGPT shared link." }, { status: 400 });

  try {
    const sourceUrl = canonicalSharedChatUrl(input);
    const { chat, retrieval } = await readSharedChat(sourceUrl, env);
    return json({
      sourceUrl: sourceUrl.toString(),
      fetchedAt: new Date().toISOString(),
      retrieval,
      ...chat
    });
  } catch (error) {
    const code = error?.code === "SHARED_CHAT_UNREADABLE" ? error.code : undefined;
    const message = error instanceof Error ? error.message : "Failed to read shared chat.";
    return json({ ...(code ? { code } : {}), error: message }, { status: 502 });
  }
}
