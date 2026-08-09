import { fetchChatGptShare } from "chatgpt-share-parser";

const ALLOWED_SHARE_HOSTS = new Set(["chatgpt.com", "chat.openai.com"]);
const MCP_VERSION = "0.1.0";
const DEFAULT_PROTOCOL_VERSION = "2025-06-18";

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

  if (url.protocol !== "https:" || !ALLOWED_SHARE_HOSTS.has(url.hostname)) {
    throw new Error("Only public ChatGPT share URLs are allowed.");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const shareId = segments[0] === "share" && segments[1] === "e"
    ? segments[2]
    : segments[0] === "share"
      ? segments[1]
      : null;

  if (!shareId) {
    throw new Error("Expected a public https://chatgpt.com/share/... URL.");
  }

  return new URL(`/share/${shareId}`, "https://chatgpt.com");
}

async function handleSharedChat(request) {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed." }, { status: 405, headers: { allow: "GET" } });
  }

  const requestUrl = new URL(request.url);
  const input = requestUrl.searchParams.get("url");
  if (!input) {
    return json({ error: "Missing ?url= public ChatGPT shared link." }, { status: 400 });
  }

  try {
    const sourceUrl = canonicalSharedChatUrl(input);
    const chat = await fetchChatGptShare(sourceUrl);
    return json({
      sourceUrl: sourceUrl.toString(),
      fetchedAt: new Date().toISOString(),
      ...chat
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read shared chat.";
    return json({ error: message }, { status: 502 });
  }
}

function demoAssetRequest(request) {
  const url = new URL(request.url);
  const stripped = url.pathname === "/demo" || url.pathname === "/demo/"
    ? "/"
    : url.pathname.replace(/^\/demo/, "");
  url.pathname = stripped || "/";
  return new Request(url, request);
}

async function loadPublishedResults(env) {
  const response = await env.ASSETS.fetch(new Request("https://dashgpt-assets.local/data/results.json"));
  if (!response.ok) throw new Error(`Result catalog returned ${response.status}`);
  const results = await response.json();
  if (!Array.isArray(results)) throw new Error("Result catalog is not an array.");
  return results;
}

function resultPageUrl(request, result) {
  const origin = new URL(request.url).origin;
  return `${origin}/demo/result/${encodeURIComponent(result.id)}/`;
}

function contextPack(request, result) {
  return [
    "# DashGPT Context Pack v0.3",
    "",
    `TITLE: ${result.title}`,
    `CATEGORY: ${result.category}`,
    `CONTENT IMMUTABLE: ${Boolean(result.immutable)}`,
    `CONTENT VERSION: ${result.contentVersion || 1}`,
    `RESULT PAGE: ${resultPageUrl(request, result)}`,
    "",
    "SUMMARY:",
    result.summary,
    "",
    "DECISIONS:",
    ...(result.decisions || []).map((item) => `- ${item}`),
    "",
    "TAGS:",
    (result.tags || []).map((tag) => `#${tag}`).join(" ") || "none",
    "",
    "SOURCE:",
    result.source?.url || "Not captured.",
    "",
    "NEXT INTENDED ACTION:",
    result.next || "Not captured.",
    "",
    "CONTINUATION INSTRUCTION:",
    "Continue from this state. Preserve immutable content; create a new revision rather than silently rewriting it."
  ].join("\n");
}

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
};

const MCP_TOOLS = [
  {
    name: "list_results",
    title: "List DashGPT Results",
    description: "List and search the useful published Results stored in this DashGPT site.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Optional text search across title, summary, tags and decisions." },
        category: { type: "string", description: "Optional exact category filter." },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 20 }
      },
      additionalProperties: false
    },
    annotations: READ_ONLY_ANNOTATIONS
  },
  {
    name: "get_result",
    title: "Get DashGPT Result",
    description: "Read one published DashGPT Result by its stable id, including provenance and permanent page URL.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false
    },
    annotations: READ_ONLY_ANNOTATIONS
  },
  {
    name: "get_context_pack",
    title: "Get DashGPT Context Pack",
    description: "Generate portable continuation context for one published DashGPT Result.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false
    },
    annotations: READ_ONLY_ANNOTATIONS
  }
];

function mcpSuccess(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function mcpError(id, code, message, data) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message, ...(data === undefined ? {} : { data }) }
  };
}

function toolPayload(structuredContent, text) {
  return {
    content: [{ type: "text", text }],
    structuredContent
  };
}

async function callTool(request, env, name, args = {}) {
  const results = await loadPublishedResults(env);

  if (name === "list_results") {
    const query = typeof args.query === "string" ? args.query.trim().toLowerCase() : "";
    const category = typeof args.category === "string" ? args.category.trim() : "";
    const limit = Number.isInteger(args.limit) ? Math.min(Math.max(args.limit, 1), 50) : 20;

    const matches = results
      .filter((result) => !category || result.category === category)
      .filter((result) => {
        if (!query) return true;
        return [
          result.title,
          result.summary,
          result.category,
          ...(result.tags || []),
          ...(result.decisions || [])
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .slice(0, limit)
      .map((result) => ({
        id: result.id,
        title: result.title,
        summary: result.summary,
        category: result.category,
        tags: result.tags || [],
        immutable: Boolean(result.immutable),
        contentVersion: result.contentVersion || 1,
        pageUrl: resultPageUrl(request, result)
      }));

    return toolPayload(
      { results: matches, total: matches.length },
      matches.length
        ? matches.map((item) => `${item.title} — ${item.pageUrl}`).join("\n")
        : "No matching DashGPT Results."
    );
  }

  const id = typeof args.id === "string" ? args.id : "";
  const result = results.find((item) => item.id === id);
  if (!result) {
    return {
      content: [{ type: "text", text: `DashGPT Result not found: ${id || "<missing id>"}` }],
      isError: true
    };
  }

  if (name === "get_result") {
    const value = { ...result, pageUrl: resultPageUrl(request, result) };
    return toolPayload({ result: value }, JSON.stringify(value, null, 2));
  }

  if (name === "get_context_pack") {
    const pack = contextPack(request, result);
    return toolPayload(
      { id: result.id, title: result.title, contextPack: pack, pageUrl: resultPageUrl(request, result) },
      pack
    );
  }

  throw new Error(`Unknown tool: ${name}`);
}

function validMcpOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const requestHost = new URL(request.url).hostname;
    return (
      originUrl.protocol === "https:" &&
      (originUrl.hostname === requestHost ||
        originUrl.hostname === "chatgpt.com" ||
        originUrl.hostname === "chat.openai.com" ||
        originUrl.hostname.endsWith(".openai.com"))
    );
  } catch {
    return false;
  }
}

async function handleMcpMessage(request, env, message) {
  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return mcpError(message?.id, -32600, "Invalid Request");
  }

  if (message.id === undefined) {
    return null;
  }

  if (message.method === "initialize") {
    return mcpSuccess(message.id, {
      protocolVersion: message.params?.protocolVersion || DEFAULT_PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "dashgpt", version: MCP_VERSION },
      instructions: "Read-only access to this DashGPT instance. Use list_results to discover Results, get_result for durable content, and get_context_pack when the user wants to continue work in ChatGPT."
    });
  }

  if (message.method === "ping") {
    return mcpSuccess(message.id, {});
  }

  if (message.method === "tools/list") {
    return mcpSuccess(message.id, { tools: MCP_TOOLS });
  }

  if (message.method === "tools/call") {
    const name = message.params?.name;
    if (typeof name !== "string") return mcpError(message.id, -32602, "Missing tool name.");
    try {
      const result = await callTool(request, env, name, message.params?.arguments || {});
      return mcpSuccess(message.id, result);
    } catch (error) {
      return mcpError(
        message.id,
        -32603,
        error instanceof Error ? error.message : "DashGPT tool failed."
      );
    }
  }

  return mcpError(message.id, -32601, `Method not found: ${message.method}`);
}

async function handleMcp(request, env) {
  if (!validMcpOrigin(request)) {
    return json(mcpError(null, -32000, "Forbidden Origin"), { status: 403 });
  }

  if (request.method === "GET" || request.method === "DELETE") {
    return new Response(null, { status: 405, headers: { allow: "POST" } });
  }

  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { allow: "POST" } });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(mcpError(null, -32700, "Parse error"), { status: 400 });
  }

  const messages = Array.isArray(payload) ? payload : [payload];
  const responses = (await Promise.all(messages.map((message) => handleMcpMessage(request, env, message)))).filter(Boolean);

  if (!responses.length) {
    return new Response(null, { status: 202 });
  }

  const body = Array.isArray(payload) ? responses : responses[0];
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  headers.set(
    "MCP-Protocol-Version",
    request.headers.get("MCP-Protocol-Version") || payload?.params?.protocolVersion || DEFAULT_PROTOCOL_VERSION
  );
  return new Response(JSON.stringify(body), { status: 200, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return Response.redirect(new URL("/demo/", url), 302);
    }

    if (url.pathname === "/mcp") {
      return handleMcp(request, env);
    }

    if (url.pathname === "/api/shared-chat") {
      return handleSharedChat(request);
    }

    if (url.pathname === "/demo" || url.pathname.startsWith("/demo/")) {
      return env.ASSETS.fetch(demoAssetRequest(request));
    }

    return new Response("Not found", { status: 404 });
  }
};
