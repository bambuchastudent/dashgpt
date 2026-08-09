import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { fetchChatGptShare } from "chatgpt-share-parser";
import { z } from "zod";

const ALLOWED_SHARE_HOSTS = new Set(["chatgpt.com", "chat.openai.com"]);
const MCP_VERSION = "0.3.0";
const INSTANCE_PROTOCOL_VERSION = 1;
const DURABLE_FIELDS = ["id", "title", "summary", "category", "tags", "decisions", "next", "source"];
const OPEN_READ_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true
};
const LOCAL_READ_ANNOTATIONS = {
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

function normalizeInstanceOrigin(siteUrl, request) {
  let target;
  try {
    target = siteUrl ? new URL(siteUrl) : new URL(request.url);
  } catch {
    throw new Error("Invalid DashGPT site URL.");
  }

  if (target.protocol !== "https:") throw new Error("DashGPT site URL must use HTTPS.");
  if (target.username || target.password) throw new Error("DashGPT site URL must not contain credentials.");

  target.pathname = "/";
  target.search = "";
  target.hash = "";
  return target;
}

function normalizeTargetSite(siteUrl, request) {
  const target = normalizeInstanceOrigin(siteUrl, request);
  target.pathname = "/demo/";
  return target;
}

function instanceFetch(env, input, init) {
  if (typeof env.DASHGPT_FETCH === "function") return env.DASHGPT_FETCH(input, init);
  return fetch(input, init);
}

function sameOrigin(instanceOrigin, request) {
  return instanceOrigin.origin === new URL(request.url).origin;
}

async function verifyRemoteInstance(instanceOrigin, env) {
  const response = await instanceFetch(env, new URL("/.well-known/dashgpt.json", instanceOrigin));
  if (!response.ok) throw new Error(`DashGPT instance discovery returned ${response.status}.`);
  const manifest = await response.json();
  if (manifest?.product !== "dashgpt" || manifest?.protocolVersion !== INSTANCE_PROTOCOL_VERSION) {
    throw new Error("The selected site is not a compatible DashGPT instance.");
  }
  return manifest;
}

async function fetchInstanceJson(instanceOrigin, path, request, env) {
  if (!sameOrigin(instanceOrigin, request)) await verifyRemoteInstance(instanceOrigin, env);
  const response = await instanceFetch(env, new URL(path, instanceOrigin));
  if (!response.ok) throw new Error(`DashGPT instance request returned ${response.status}.`);
  return response.json();
}

async function loadResultsForSite(siteUrl, request, env) {
  const instanceOrigin = normalizeInstanceOrigin(siteUrl, request);
  if (sameOrigin(instanceOrigin, request)) {
    return { instanceOrigin, results: await loadPublishedResults(env) };
  }
  const payload = await fetchInstanceJson(instanceOrigin, "/api/dashgpt/results", request, env);
  if (!Array.isArray(payload?.results)) throw new Error("Remote DashGPT Result catalog is invalid.");
  return { instanceOrigin, results: payload.results };
}

async function loadResultForSite(siteUrl, id, request, env) {
  const instanceOrigin = normalizeInstanceOrigin(siteUrl, request);
  if (sameOrigin(instanceOrigin, request)) {
    const results = await loadPublishedResults(env);
    return { instanceOrigin, result: results.find((item) => item.id === id) || null };
  }
  try {
    const payload = await fetchInstanceJson(
      instanceOrigin,
      `/api/dashgpt/results/${encodeURIComponent(id)}`,
      request,
      env
    );
    return { instanceOrigin, result: payload?.result || null };
  } catch (error) {
    if (String(error?.message || "").includes("returned 404")) return { instanceOrigin, result: null };
    throw error;
  }
}

function resultPageUrl(instanceOrigin, result) {
  return new URL(`/demo/result/${encodeURIComponent(result.id)}/`, instanceOrigin).toString();
}

function contextPack(instanceOrigin, result) {
  return [
    "# DashGPT Context Pack v0.4",
    "",
    `TITLE: ${result.title}`,
    `CATEGORY: ${result.category}`,
    `CONTENT IMMUTABLE: ${Boolean(result.immutable)}`,
    `CONTENT VERSION: ${result.contentVersion || 1}`,
    `CONTENT HASH: ${result.contentHash || "not available"}`,
    `RESULT PAGE: ${resultPageUrl(instanceOrigin, result)}`,
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

async function loadContextForSite(siteUrl, id, request, env) {
  const instanceOrigin = normalizeInstanceOrigin(siteUrl, request);
  if (sameOrigin(instanceOrigin, request)) {
    const results = await loadPublishedResults(env);
    const result = results.find((item) => item.id === id);
    return result ? { instanceOrigin, result, contextPack: contextPack(instanceOrigin, result) } : null;
  }
  try {
    const payload = await fetchInstanceJson(
      instanceOrigin,
      `/api/dashgpt/context/${encodeURIComponent(id)}`,
      request,
      env
    );
    if (!payload?.result || typeof payload?.contextPack !== "string") return null;
    return { instanceOrigin, result: payload.result, contextPack: payload.contextPack };
  } catch (error) {
    if (String(error?.message || "").includes("returned 404")) return null;
    throw error;
  }
}

function textResult(structuredContent, text) {
  return { structuredContent, content: [{ type: "text", text }] };
}

function createDashGptServer(request, env) {
  const server = new McpServer(
    { name: "dashgpt", version: MCP_VERSION },
    {
      instructions:
        "DashGPT keeps useful AI outcomes as durable Results. If the user gives a DashGPT site URL, pass that siteUrl consistently to list_results, get_result and get_context_pack so you read that person's instance rather than the default demo instance. If the user asks about their own DashGPT but has not identified the site, ask for its HTTPS URL. When the user asks to save the useful outcome of the current conversation, distill it and call prepare_result_import; the returned link lets the user explicitly import the immutable Result into the chosen DashGPT site. Never include secrets or personal document identifiers unless the user explicitly asks for them to be saved."
    }
  );

  server.registerTool(
    "list_results",
    {
      title: "List DashGPT Results",
      description: "List and search published Results from a DashGPT site. Pass siteUrl to use the user's own DashGPT instance instead of the default demo instance.",
      inputSchema: {
        siteUrl: z.string().url().max(2000).optional(),
        query: z.string().max(200).optional(),
        category: z.string().max(100).optional(),
        limit: z.number().int().min(1).max(50).default(20)
      },
      annotations: OPEN_READ_ANNOTATIONS
    },
    async ({ siteUrl, query = "", category = "", limit = 20 }) => {
      const { instanceOrigin, results } = await loadResultsForSite(siteUrl, request, env);
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
          pageUrl: resultPageUrl(instanceOrigin, result)
        }));

      return textResult(
        { siteUrl: instanceOrigin.origin, results: matches, total: matches.length },
        matches.length ? matches.map((item) => `${item.title} — ${item.pageUrl}`).join("\n") : "No matching DashGPT Results."
      );
    }
  );

  server.registerTool(
    "get_result",
    {
      title: "Get DashGPT Result",
      description: "Read one published DashGPT Result by stable id. Pass siteUrl to read from the user's own DashGPT instance.",
      inputSchema: {
        id: z.string().min(1).max(200),
        siteUrl: z.string().url().max(2000).optional()
      },
      annotations: OPEN_READ_ANNOTATIONS
    },
    async ({ id, siteUrl }) => {
      const { instanceOrigin, result } = await loadResultForSite(siteUrl, id, request, env);
      if (!result) return { content: [{ type: "text", text: `DashGPT Result not found: ${id}` }], isError: true };
      const value = { ...result, pageUrl: resultPageUrl(instanceOrigin, result) };
      return textResult({ siteUrl: instanceOrigin.origin, result: value }, JSON.stringify(value, null, 2));
    }
  );

  server.registerTool(
    "get_context_pack",
    {
      title: "Get DashGPT Context Pack",
      description: "Get portable continuation context for one published DashGPT Result. Pass siteUrl to use the user's own DashGPT instance.",
      inputSchema: {
        id: z.string().min(1).max(200),
        siteUrl: z.string().url().max(2000).optional()
      },
      annotations: OPEN_READ_ANNOTATIONS
    },
    async ({ id, siteUrl }) => {
      const loaded = await loadContextForSite(siteUrl, id, request, env);
      if (!loaded) return { content: [{ type: "text", text: `DashGPT Result not found: ${id}` }], isError: true };
      return textResult(
        {
          siteUrl: loaded.instanceOrigin.origin,
          id: loaded.result.id,
          title: loaded.result.title,
          contextPack: loaded.contextPack,
          pageUrl: resultPageUrl(loaded.instanceOrigin, loaded.result)
        },
        loaded.contextPack
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
      annotations: LOCAL_READ_ANNOTATIONS
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

function handleInstanceDiscovery(request) {
  const origin = new URL(request.url).origin;
  return json({
    product: "dashgpt",
    protocolVersion: INSTANCE_PROTOCOL_VERSION,
    siteUrl: `${origin}/demo/`,
    resultsEndpoint: `${origin}/api/dashgpt/results`,
    contextEndpointTemplate: `${origin}/api/dashgpt/context/{id}`
  });
}

async function handleInstanceResults(request, env) {
  const results = await loadPublishedResults(env);
  return json({ protocolVersion: INSTANCE_PROTOCOL_VERSION, results });
}

async function handleInstanceResult(request, env, id) {
  const results = await loadPublishedResults(env);
  const result = results.find((item) => item.id === id);
  if (!result) return json({ error: "Result not found." }, { status: 404 });
  const instanceOrigin = new URL(request.url);
  instanceOrigin.pathname = "/";
  instanceOrigin.search = "";
  instanceOrigin.hash = "";
  return json({ result: { ...result, pageUrl: resultPageUrl(instanceOrigin, result) } });
}

async function handleInstanceContext(request, env, id) {
  const results = await loadPublishedResults(env);
  const result = results.find((item) => item.id === id);
  if (!result) return json({ error: "Result not found." }, { status: 404 });
  const instanceOrigin = new URL(request.url);
  instanceOrigin.pathname = "/";
  instanceOrigin.search = "";
  instanceOrigin.hash = "";
  return json({ result, contextPack: contextPack(instanceOrigin, result) });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/") return Response.redirect(new URL("/demo/", url), 302);
    if (url.pathname === "/mcp") return handleMcp(request, env, ctx);
    if (url.pathname === "/.well-known/openai-apps-challenge") return handleOpenAiChallenge(env);
    if (url.pathname === "/.well-known/dashgpt.json") return handleInstanceDiscovery(request);
    if (url.pathname === "/api/shared-chat") return handleSharedChat(request);
    if (url.pathname === "/api/dashgpt/results") return handleInstanceResults(request, env);

    const resultMatch = url.pathname.match(/^\/api\/dashgpt\/results\/([^/]+)$/);
    if (resultMatch) return handleInstanceResult(request, env, decodeURIComponent(resultMatch[1]));

    const contextMatch = url.pathname.match(/^\/api\/dashgpt\/context\/([^/]+)$/);
    if (contextMatch) return handleInstanceContext(request, env, decodeURIComponent(contextMatch[1]));

    if (url.pathname === "/demo" || url.pathname.startsWith("/demo/")) {
      return env.ASSETS.fetch(demoAssetRequest(request));
    }

    return new Response("Not found", { status: 404 });
  }
};
