import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { fetchChatGptShare } from "chatgpt-share-parser";
import { z } from "zod";

const ALLOWED_SHARE_HOSTS = new Set(["chatgpt.com", "chat.openai.com"]);
const MCP_VERSION = "0.2.0";
const DURABLE_FIELDS = ["id", "title", "summary", "category", "tags", "decisions", "next", "source"];
const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
};

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data, null, 2), { ...init, headers });
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function durablePayload(result) {
  const payload = {};
  for (const field of DURABLE_FIELDS) {
    if (result[field] !== undefined) payload[field] = result[field];
  }
  return payload;
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function contentHash(result) {
  return `sha256:${await sha256(canonicalize(durablePayload(result)))}`;
}

function base64UrlEncode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
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

  if (!shareId) throw new Error("Expected a public https://chatgpt.com/share/... URL.");
  return new URL(`/share/${shareId}`, "https://chatgpt.com");
}

async function handleSharedChat(request) {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed." }, { status: 405, headers: { allow: "GET" } });
  }

  const input = new URL(request.url).searchParams.get("url");
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
  url.pathname = url.pathname === "/demo" || url.pathname === "/demo/"
    ? "/"
    : url.pathname.replace(/^\/demo/, "") || "/";
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
  return `${new URL(request.url).origin}/demo/result/${encodeURIComponent(result.id)}/`;
}

function contextPack(request, result) {
  return [
    "# DashGPT Context Pack v0.4",
    "",
    `TITLE: ${result.title}`,
    `CATEGORY: ${result.category}`,
    `CONTENT IMMUTABLE: ${Boolean(result.immutable)}`,
    `CONTENT VERSION: ${result.contentVersion || 1}`,
    `CONTENT HASH: ${result.contentHash || "not available"}`,
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

function textResult(structuredContent, text) {
  return { structuredContent, content: [{ type: "text", text }] };
}

function normalizeTargetSite(siteUrl, request) {
  if (!siteUrl) return new URL("/demo/", request.url);
  const target = new URL(siteUrl);
  if (target.protocol !== "https:" && target.hostname !== "localhost") {
    throw new Error("DashGPT site URL must use HTTPS.");
  }
  if (!target.pathname || target.pathname === "/") target.pathname = "/demo/";
  return target;
}

function createDashGptServer(request, env) {
  const server = new McpServer(
    { name: "dashgpt", version: MCP_VERSION },
    {
      instructions:
        "DashGPT keeps useful AI outcomes as durable Results. Read existing Results with list_results/get_result/get_context_pack. When the user asks to save the useful outcome of the current conversation, distill it and call prepare_result_import; the returned link lets the user explicitly import the immutable Result into a DashGPT site. Never include secrets or personal document identifiers unless the user explicitly asks for them to be saved."
    }
  );

  server.registerTool(
    "list_results",
    {
      title: "List DashGPT Results",
      description: "List and search published Results available from this DashGPT instance.",
      inputSchema: {
        query: z.string().max(200).optional(),
        category: z.string().max(100).optional(),
        limit: z.number().int().min(1).max(50).default(20)
      },
      annotations: READ_ONLY_ANNOTATIONS
    },
    async ({ query = "", category = "", limit = 20 }) => {
      const results = await loadPublishedResults(env);
      const needle = query.trim().toLowerCase();
      const matches = results
        .filter((result) => !category || result.category === category)
        .filter((result) => {
          if (!needle) return true;
          return [result.title, result.summary, result.category, ...(result.tags || []), ...(result.decisions || [])]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(needle);
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
          contentHash: result.contentHash || null,
          pageUrl: resultPageUrl(request, result)
        }));

      return textResult(
        { results: matches, total: matches.length },
        matches.length ? matches.map((item) => `${item.title} — ${item.pageUrl}`).join("\n") : "No matching DashGPT Results."
      );
    }
  );

  server.registerTool(
    "get_result",
    {
      title: "Get DashGPT Result",
      description: "Read one published DashGPT Result by stable id, including provenance and permanent page URL.",
      inputSchema: { id: z.string().min(1).max(200) },
      annotations: READ_ONLY_ANNOTATIONS
    },
    async ({ id }) => {
      const results = await loadPublishedResults(env);
      const result = results.find((item) => item.id === id);
      if (!result) return { content: [{ type: "text", text: `DashGPT Result not found: ${id}` }], isError: true };
      const value = { ...result, pageUrl: resultPageUrl(request, result) };
      return textResult({ result: value }, JSON.stringify(value, null, 2));
    }
  );

  server.registerTool(
    "get_context_pack",
    {
      title: "Get DashGPT Context Pack",
      description: "Generate portable continuation context for one published DashGPT Result.",
      inputSchema: { id: z.string().min(1).max(200) },
      annotations: READ_ONLY_ANNOTATIONS
    },
    async ({ id }) => {
      const results = await loadPublishedResults(env);
      const result = results.find((item) => item.id === id);
      if (!result) return { content: [{ type: "text", text: `DashGPT Result not found: ${id}` }], isError: true };
      const pack = contextPack(request, result);
      return textResult(
        { id: result.id, title: result.title, contextPack: pack, pageUrl: resultPageUrl(request, result) },
        pack
      );
    }
  );

  server.registerTool(
    "prepare_result_import",
    {
      title: "Prepare DashGPT Result import",
      description:
        "Use when the user asks to save the useful outcome of the current conversation to DashGPT. Creates an immutable Result and a user-opened import link; calling this tool does not silently write to their site.",
      inputSchema: {
        title: z.string().min(1).max(160),
        summary: z.string().min(1).max(1800),
        category: z.string().min(1).max(80),
        tags: z.array(z.string().min(1).max(60)).max(12).default([]),
        decisions: z.array(z.string().min(1).max(500)).max(10).default([]),
        next: z.string().max(800).default(""),
        sourceUrl: z.string().url().max(2000).optional(),
        sourceTitle: z.string().max(200).optional(),
        siteUrl: z.string().url().max(2000).optional()
      },
      annotations: READ_ONLY_ANNOTATIONS
    },
    async ({ title, summary, category, tags = [], decisions = [], next = "", sourceUrl, sourceTitle, siteUrl }) => {
      const source = sourceUrl || sourceTitle
        ? { type: "chatgpt-plugin", ...(sourceUrl ? { url: sourceUrl } : {}), ...(sourceTitle ? { title: sourceTitle } : {}) }
        : undefined;
      const result = {
        id: `result-${crypto.randomUUID()}`,
        schemaVersion: 1,
        title,
        summary,
        category,
        tags,
        favorite: false,
        decisions,
        next,
        ...(source ? { source } : {}),
        publishedAt: new Date().toISOString(),
        immutable: true,
        contentVersion: 1
      };
      result.contentHash = await contentHash(result);

      const target = normalizeTargetSite(siteUrl, request);
      target.hash = `import=${base64UrlEncode(JSON.stringify(result))}`;
      const importUrl = target.toString();

      return textResult(
        { result, importUrl },
        `DashGPT Result prepared. Ask the user to open this link to import it explicitly into DashGPT:\n${importUrl}`
      );
    }
  );

  return server;
}

function handleMcp(request, env, ctx) {
  const hostname = new URL(request.url).hostname;
  return createMcpHandler(() => createDashGptServer(request, env), {
    route: "/mcp",
    responseMode: "json",
    legacy: "stateless",
    allowedHostnames: [hostname]
  })(request, env, ctx);
}

function handleOpenAiChallenge(env) {
  const token = typeof env.OPENAI_APPS_CHALLENGE === "string" ? env.OPENAI_APPS_CHALLENGE.trim() : "";
  if (!token) return new Response("Not configured", { status: 404 });
  return new Response(token, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/") return Response.redirect(new URL("/demo/", url), 302);
    if (url.pathname === "/mcp") return handleMcp(request, env, ctx);
    if (url.pathname === "/.well-known/openai-apps-challenge") return handleOpenAiChallenge(env);
    if (url.pathname === "/api/shared-chat") return handleSharedChat(request);

    if (url.pathname === "/demo" || url.pathname.startsWith("/demo/")) {
      return env.ASSETS.fetch(demoAssetRequest(request));
    }

    return new Response("Not found", { status: 404 });
  }
};
