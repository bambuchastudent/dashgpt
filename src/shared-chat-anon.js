import { CHATGPT_SHARE_HEADERS } from "chatgpt-share-parser";
import { canonicalSharedChatUrl, parseBackendShareJsonText } from "./shared-chat.js";

function json(data) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function shareIdFromUrl(sourceUrl) {
  return sourceUrl.pathname.split("/").filter(Boolean).at(-1) || "";
}

function anonymousBackendShareUrl(sourceUrl) {
  return new URL(`/backend-anon/share/${shareIdFromUrl(sourceUrl)}`, "https://chatgpt.com");
}

function upstreamFetch(env, input, init) {
  if (typeof env?.DASHGPT_SHARE_FETCH === "function") return env.DASHGPT_SHARE_FETCH(input, init);
  return fetch(input, init);
}

function anonymousHeaders() {
  const headers = new Headers(CHATGPT_SHARE_HEADERS);
  headers.set("accept", "application/json");
  headers.set("cache-control", "no-cache");
  return headers;
}

export async function tryAnonymousSharedChat(request, env = {}) {
  if (request.method !== "GET") return null;

  const input = new URL(request.url).searchParams.get("url");
  if (!input) return null;

  let sourceUrl;
  try {
    sourceUrl = canonicalSharedChatUrl(input);
  } catch {
    return null;
  }

  // The logged-out JSON route is defined for ordinary /share/<id> links.
  // Project-specific shared/c URLs keep using the established resolver chain.
  if (!/^\/share\/[^/]+$/.test(sourceUrl.pathname)) return null;

  try {
    const response = await upstreamFetch(env, anonymousBackendShareUrl(sourceUrl), {
      method: "GET",
      headers: anonymousHeaders(),
      redirect: "follow"
    });
    if (!response.ok) return null;

    const chat = parseBackendShareJsonText(await response.text(), sourceUrl);
    return json({
      sourceUrl: sourceUrl.toString(),
      fetchedAt: new Date().toISOString(),
      retrieval: "chatgpt-anon",
      ...chat
    });
  } catch {
    return null;
  }
}
