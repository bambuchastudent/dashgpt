import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../src/index.js";

const catalog = readFileSync(new URL("../demo/data/results.json", import.meta.url), "utf8");
const dashCatalog = readFileSync(new URL("../demo/data/dashes.json", import.meta.url), "utf8");
const indexHtml = readFileSync(new URL("../demo/index.html", import.meta.url), "utf8");
const supportHtml = readFileSync(new URL("../demo/support.html", import.meta.url), "utf8");
const privacyHtml = readFileSync(new URL("../demo/privacy.html", import.meta.url), "utf8");
const termsHtml = readFileSync(new URL("../demo/terms.html", import.meta.url), "utf8");
const plugin = JSON.parse(
  readFileSync(new URL("../plugins/dashgpt/.codex-plugin/plugin.json", import.meta.url), "utf8")
);
const marketplace = JSON.parse(
  readFileSync(new URL("../.agents/plugins/marketplace.json", import.meta.url), "utf8")
);

const remoteResult = {
  id: "friend-result",
  schemaVersion: 1,
  title: "Friend's DashGPT Result",
  summary: "A Result served by a second DashGPT instance.",
  category: "Demo",
  tags: ["friend", "instance"],
  favorite: false,
  decisions: ["Use the friend's site as the source of truth."],
  next: "Continue from the friend's own DashGPT context.",
  immutable: true,
  contentVersion: 1,
  contentHash: "sha256:friendfixture"
};

function inputUrl(input) {
  if (input instanceof URL) return input;
  return new URL(typeof input === "string" ? input : input.url);
}

const env = {
  ASSETS: {
    async fetch(input) {
      const url = inputUrl(input);
      if (url.pathname === "/data/results.json") {
        return new Response(catalog, { headers: { "content-type": "application/json" } });
      }
      if (url.pathname === "/data/dashes.json") {
        return new Response(dashCatalog, { headers: { "content-type": "application/json" } });
      }
      return new Response(indexHtml, { headers: { "content-type": "text/html" } });
    }
  },
  async DASHGPT_FETCH(input) {
    const url = inputUrl(input);
    if (url.origin !== "https://friend.example") return new Response("Not found", { status: 404 });
    if (url.pathname === "/.well-known/dashgpt.json") {
      return Response.json({ product: "dashgpt", protocolVersion: 1, siteUrl: "https://friend.example/demo/" });
    }
    if (url.pathname === "/api/dashgpt/results") {
      return Response.json({ protocolVersion: 1, results: [remoteResult] });
    }
    if (url.pathname === "/api/dashgpt/results/friend-result") {
      return Response.json({ result: remoteResult });
    }
    if (url.pathname === "/api/dashgpt/context/friend-result") {
      return Response.json({
        result: remoteResult,
        contextPack: "# DashGPT Context Pack v0.4\n\nTITLE: Friend's DashGPT Result\nRESULT PAGE: https://friend.example/demo/result/friend-result/"
      });
    }
    return new Response("Not found", { status: 404 });
  }
};

const ctx = {
  waitUntil() {},
  passThroughOnException() {}
};

function request(url, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("host", new URL(url).host);
  return new Request(url, { ...init, headers });
}

async function parseMcpResponse(response) {
  const text = await response.text();
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) return JSON.parse(text);

  const dataLines = text
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter(Boolean);
  if (!dataLines.length) throw new Error(`MCP response was neither JSON nor SSE data: ${text}`);
  return JSON.parse(dataLines.at(-1));
}

async function rpc(id, method, params = {}) {
  const response = await worker.fetch(
    request("https://dashgpt.example/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream"
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params })
    }),
    env,
    ctx
  );
  assert.equal(response.status, 200, `${method} should return 200; got ${await response.clone().text()}`);
  return parseMcpResponse(response);
}

function decodeImportUrl(importUrl) {
  const url = new URL(importUrl);
  assert.equal(url.pathname, "/demo/");
  assert.ok(url.hash.startsWith("#import="));
  const encoded = url.hash.slice("#import=".length);
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return { url, result: JSON.parse(Buffer.from(padded, "base64").toString("utf8")) };
}

function decodeDashImportUrl(importUrl) {
  const url = new URL(importUrl);
  assert.equal(url.pathname, "/demo/");
  assert.ok(url.hash.startsWith("#dash-import="));
  const encoded = url.hash.slice("#dash-import=".length);
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return { url, dash: JSON.parse(Buffer.from(padded, "base64").toString("utf8")) };
}

assert.equal(plugin.name, "dashgpt");
assert.equal(plugin.interface?.displayName, "DashGPT");
assert.equal(plugin.version, "0.4.0");
assert.equal(plugin.interface?.privacyPolicyURL.endsWith("/demo/privacy.html"), true);
assert.equal(plugin.interface?.termsOfServiceURL.endsWith("/demo/terms.html"), true);
assert.match(supportHtml, /DashGPT support/);
assert.match(privacyHtml, /Remote DashGPT instances/);
assert.match(termsHtml, /Terms of use/);
assert.equal(marketplace.plugins[0].name, "dashgpt");
assert.equal(marketplace.plugins[0].source.path, "./plugins/dashgpt");

const discoveryResponse = await worker.fetch(request("https://dashgpt.example/.well-known/dashgpt.json"), env, ctx);
assert.equal(discoveryResponse.status, 200);
const discovery = await discoveryResponse.json();
assert.equal(discovery.product, "dashgpt");
assert.equal(discovery.protocolVersion, 1);
assert.equal(discovery.dashesEndpoint, "https://dashgpt.example/api/dashgpt/dashes");

const publicResultsResponse = await worker.fetch(request("https://dashgpt.example/api/dashgpt/results"), env, ctx);
assert.equal(publicResultsResponse.status, 200);
const publicResults = await publicResultsResponse.json();
assert.ok(publicResults.results.length >= 4);
const publicDashesResponse = await worker.fetch(request("https://dashgpt.example/api/dashgpt/dashes"), env, ctx);
assert.equal(publicDashesResponse.status, 200);
const publicDashes = await publicDashesResponse.json();
assert.ok(publicDashes.dashes.some((dash) => dash.dashId === "dashgpt-product"));
assert.equal(publicDashes.dashes[0].summary, undefined, "public Dash definitions must remain reference-only");

const initialize = await rpc(1, "initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "dashgpt-smoke", version: "1" }
});
assert.equal(initialize.result.serverInfo.name, "dashgpt");
assert.equal(initialize.result.serverInfo.version, "0.4.0");
assert.ok(initialize.result.capabilities.tools);

const tools = await rpc(2, "tools/list");
assert.deepEqual(
  tools.result.tools.map((tool) => tool.name),
  ["list_results", "open_semantic_dash", "get_result", "get_context_pack", "prepare_result_import"]
);
assert.ok(tools.result.tools.slice(0, 4).every((tool) => tool.annotations?.readOnlyHint === true));
assert.ok(tools.result.tools.slice(0, 4).every((tool) => tool.annotations?.openWorldHint === true));
assert.equal(tools.result.tools[4].annotations?.readOnlyHint, true);
assert.equal(tools.result.tools[4].annotations?.openWorldHint, false);

const list = await rpc(3, "tools/call", { name: "list_results", arguments: { limit: 10 } });
assert.ok(list.result.structuredContent.results.length >= 4);
const semanticList = await rpc(31, "tools/call", { name: "list_results", arguments: { query: "еда", limit: 10 } });
assert.ok(semanticList.result.structuredContent.results.every((result) => result.category === "Еда"));

const savedDash = await rpc(32, "tools/call", {
  name: "open_semantic_dash",
  arguments: { query: "Открой мой даш про DashGPT", limit: 4 }
});
assert.equal(savedDash.result.structuredContent.status, "saved");
assert.equal(savedDash.result.structuredContent.dash.dashId, "dashgpt-product");
assert.match(savedDash.result.content[0].text, /DashGPT/);

const temporaryDash = await rpc(33, "tools/call", {
  name: "open_semantic_dash",
  arguments: { query: "Даш про еду", limit: 1 }
});
assert.equal(temporaryDash.result.structuredContent.status, "temporary");
assert.equal(temporaryDash.result.structuredContent.dash.members.length, 1, "structured chat output must honor the bounded Result limit");
assert.ok(temporaryDash.result.structuredContent.dash.memberCount >= 2);
assert.match(temporaryDash.result.content[0].text, /…and \d+ more Results/);
const importedDash = decodeDashImportUrl(temporaryDash.result.structuredContent.importUrl);
assert.equal(importedDash.url.origin, "https://dashgpt.example");
assert.equal(importedDash.dash.updateMode, "review");
assert.ok(importedDash.dash.automaticResultIds.length >= 2);

const emptyTemporaryDash = await rpc(34, "tools/call", {
  name: "open_semantic_dash",
  arguments: { query: "zyxwvu-no-known-topic", limit: 4 }
});
assert.equal(emptyTemporaryDash.result.structuredContent.status, "temporary");
assert.equal(emptyTemporaryDash.result.structuredContent.importUrl, null, "an empty temporary Dash must not offer a save/import link");

const immutable = list.result.structuredContent.results.find(
  (result) => result.id === "camping-fishing-el-regajo-fuente-munoz"
);
assert.equal(immutable.immutable, true);
assert.equal(immutable.contentHash.startsWith("sha256:"), true);
assert.equal(
  immutable.pageUrl,
  "https://dashgpt.example/demo/result/camping-fishing-el-regajo-fuente-munoz/"
);

const context = await rpc(4, "tools/call", {
  name: "get_context_pack",
  arguments: { id: "camping-fishing-el-regajo-fuente-munoz" }
});
assert.match(context.result.structuredContent.contextPack, /CONTENT IMMUTABLE: true/);
assert.match(context.result.structuredContent.contextPack, /CONTENT HASH: sha256:/);

const remoteList = await rpc(5, "tools/call", {
  name: "list_results",
  arguments: { siteUrl: "https://friend.example/demo/", limit: 10 }
});
assert.equal(remoteList.result.structuredContent.siteUrl, "https://friend.example");
assert.deepEqual(remoteList.result.structuredContent.results.map((item) => item.id), ["friend-result"]);
assert.equal(
  remoteList.result.structuredContent.results[0].pageUrl,
  "https://friend.example/demo/result/friend-result/"
);

const remoteTemporaryDash = await rpc(51, "tools/call", {
  name: "open_semantic_dash",
  arguments: { siteUrl: "https://friend.example", query: "friend", limit: 4 }
});
assert.equal(remoteTemporaryDash.result.structuredContent.status, "temporary", "older remote instances without a Dash endpoint must fall back to a temporary Dash");
assert.equal(decodeDashImportUrl(remoteTemporaryDash.result.structuredContent.importUrl).url.origin, "https://friend.example");

const remoteGet = await rpc(6, "tools/call", {
  name: "get_result",
  arguments: { siteUrl: "https://friend.example", id: "friend-result" }
});
assert.equal(remoteGet.result.structuredContent.result.title, "Friend's DashGPT Result");
assert.equal(remoteGet.result.structuredContent.result.pageUrl, "https://friend.example/demo/result/friend-result/");

const remoteContext = await rpc(7, "tools/call", {
  name: "get_context_pack",
  arguments: { siteUrl: "https://friend.example", id: "friend-result" }
});
assert.match(remoteContext.result.structuredContent.contextPack, /Friend's DashGPT Result/);
assert.match(remoteContext.result.structuredContent.contextPack, /https:\/\/friend\.example\/demo\/result\/friend-result\//);

const prepared = await rpc(8, "tools/call", {
  name: "prepare_result_import",
  arguments: {
    siteUrl: "https://friend.example",
    title: "Smoke Result",
    summary: "A distilled outcome prepared by the DashGPT plugin.",
    category: "Test",
    tags: ["smoke"],
    decisions: ["Keep the import explicit."],
    next: "Open the generated DashGPT import link."
  }
});
const imported = decodeImportUrl(prepared.result.structuredContent.importUrl);
assert.equal(imported.url.origin, "https://friend.example");
assert.equal(imported.result.immutable, true);
assert.equal(imported.result.schemaVersion, 1);
assert.match(imported.result.contentHash, /^sha256:[0-9a-f]{64}$/);
assert.equal(imported.result.title, "Smoke Result");

const resultPageResponse = await worker.fetch(
  request("https://dashgpt.example/demo/result/camping-fishing-el-regajo-fuente-munoz/"),
  env,
  ctx
);
assert.equal(resultPageResponse.status, 200);
assert.match(await resultPageResponse.text(), /DashGPT Demo/);

const challengeMissing = await worker.fetch(
  request("https://dashgpt.example/.well-known/openai-apps-challenge"),
  env,
  ctx
);
assert.equal(challengeMissing.status, 404);

const challenge = await worker.fetch(
  request("https://dashgpt.example/.well-known/openai-apps-challenge"),
  { ...env, OPENAI_APPS_CHALLENGE: "verify-dashgpt" },
  ctx
);
assert.equal(challenge.status, 200);
assert.equal(await challenge.text(), "verify-dashgpt");

const mcpGet = await worker.fetch(request("https://dashgpt.example/mcp"), env, ctx);
assert.equal(mcpGet.status, 405);

console.log("DashGPT smoke checks passed.");
