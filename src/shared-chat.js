import { CHATGPT_SHARE_HEADERS, parseChatGptShareHtml } from "chatgpt-share-parser";

const ALLOWED_SHARE_HOSTS = new Set(["chatgpt.com", "chat.openai.com"]);
const VISIBLE_MESSAGE_SELECTOR = "[data-message-author-role]";

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

  if (url.protocol !== "https:" || !ALLOWED_SHARE_HOSTS.has(url.hostname)) {
    throw new Error("Only public ChatGPT share URLs are allowed.");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const shareId = segments[0] === "share" && segments[1] === "e"
    ? segments[2]
    : segments[0] === "share"
      ? segments[1]
      : null;

  if (!shareId) throw new Error("Expected a public https://chatgpt.com/share/... URL.");
  return new URL(`/share/${shareId}`, "https://chatgpt.com");
}

function upstreamFetch(env, input, init) {
  if (typeof env?.DASHGPT_SHARE_FETCH === "function") return env.DASHGPT_SHARE_FETCH(input, init);
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

function browserBinding(env) {
  if (!env?.BROWSER || typeof env.BROWSER.quickAction !== "function") {
    throw new Error("Browser fallback is not configured.");
  }
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
  const heading = cleanVisibleText(headingGroup?.results?.find(item => cleanVisibleText(item?.text))?.text);
  const shareId = sourceUrl.pathname.split("/").filter(Boolean).at(-1) || "";

  return {
    shareId,
    aiModel: "unknown",
    title: heading && !/^chatgpt$/i.test(heading) ? heading : fallbackTitle(replies),
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

function parseReadableChat(html) {
  const chat = parseChatGptShareHtml(html);
  if (!chat?.title && !chat?.replies?.length) {
    throw new Error("Shared ChatGPT page did not contain a readable conversation.");
  }
  return chat;
}

export async function readSharedChat(sourceUrl, env = {}) {
  let directError;
  try {
    return {
      chat: parseReadableChat(await directHtml(sourceUrl, env)),
      retrieval: "direct"
    };
  } catch (error) {
    directError = error;
  }

  let domError;
  try {
    return {
      chat: await browserVisibleChat(sourceUrl, env),
      retrieval: "browser-dom"
    };
  } catch (error) {
    domError = error;
  }

  try {
    return {
      chat: parseReadableChat(await browserHtml(sourceUrl, env)),
      retrieval: "browser-payload"
    };
  } catch {
    const directMessage = directError instanceof Error ? directError.message : "Direct retrieval failed.";
    const domMessage = domError instanceof Error ? domError.message : "Rendered DOM retrieval failed.";
    throw new Error(`Unable to read the public ChatGPT share. ${directMessage} ${domMessage}`);
  }
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
    const message = error instanceof Error ? error.message : "Failed to read shared chat.";
    return json({ error: message }, { status: 502 });
  }
}
