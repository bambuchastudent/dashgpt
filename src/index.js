import { fetchChatGptShare } from "chatgpt-share-parser";

const ALLOWED_HOSTS = new Set(["chatgpt.com", "chat.openai.com"]);

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data, null, 2), { ...init, headers });
}

function canonicalSharedChatUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
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

async function handleSharedChat(request) {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed." }, { status: 405, headers: { allow: "GET" } });
  }

  const requestUrl = new URL(request.url);
  const input = requestUrl.searchParams.get("url");
  if (!input) return json({ error: "Missing ?url= public ChatGPT shared link." }, { status: 400 });

  try {
    const sourceUrl = canonicalSharedChatUrl(input);
    const chat = await fetchChatGptShare(sourceUrl);
    return json({ sourceUrl: sourceUrl.toString(), fetchedAt: new Date().toISOString(), ...chat });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read shared chat.";
    return json({ error: message }, { status: 502 });
  }
}

function demoAssetRequest(request) {
  const url = new URL(request.url);
  if (/^\/demo\/result\/[^/]+\/?$/.test(url.pathname)) {
    url.pathname = "/index.html";
  } else {
    const stripped = url.pathname === "/demo" || url.pathname === "/demo/"
      ? "/"
      : url.pathname.replace(/^\/demo/, "");
    url.pathname = stripped || "/";
  }
  return new Request(url, request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") return Response.redirect(new URL("/demo/", url), 302);
    if (url.pathname === "/api/shared-chat") return handleSharedChat(request);

    if (url.pathname === "/demo" || url.pathname.startsWith("/demo/")) {
      return env.ASSETS.fetch(demoAssetRequest(request));
    }

    return new Response("Not found", { status: 404 });
  }
};
