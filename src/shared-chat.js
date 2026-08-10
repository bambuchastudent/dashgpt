import { CHATGPT_SHARE_HEADERS, parseChatGptShareHtml } from "chatgpt-share-parser";

const ALLOWED_SHARE_HOSTS = new Set(["chatgpt.com", "chat.openai.com"]);

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

async function browserHtml(sourceUrl, env) {
  if (!env?.BROWSER || typeof env.BROWSER.quickAction !== "function") {
    throw new Error("Browser fallback is not configured.");
  }

  const response = await env.BROWSER.quickAction("content", {
    url: sourceUrl.toString(),
    gotoOptions: { waitUntil: "networkidle2" }
  });
  if (!response.ok) {
    const error = new Error(`Browser fallback returned ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return response.text();
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

  try {
    return {
      chat: parseReadableChat(await browserHtml(sourceUrl, env)),
      retrieval: "browser"
    };
  } catch (browserError) {
    const directMessage = directError instanceof Error ? directError.message : "Direct retrieval failed.";
    const browserMessage = browserError instanceof Error ? browserError.message : "Browser retrieval failed.";
    throw new Error(`Unable to read the public ChatGPT share. ${directMessage} ${browserMessage}`);
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
