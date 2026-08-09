import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../src/index.js";

const catalog = readFileSync(new URL("../demo/data/results.json", import.meta.url), "utf8");
const indexHtml = readFileSync(new URL("../demo/index.html", import.meta.url), "utf8");
const plugin = JSON.parse(
  readFileSync(new URL("../plugins/dashgpt/.codex-plugin/plugin.json", import.meta.url), "utf8")
);
const marketplace = JSON.parse(
  readFileSync(new URL("../.agents/plugins/marketplace.json", import.meta.url), "utf8")
);

const env = {
  ASSETS: {
    async fetch(input) {
      const url = new URL(typeof input === "string" ? input : input.url);
      if (url.pathname === "/data/results.json") {
        return new Response(catalog, { headers: { "content-type": "application/json" } });
      }
      return new Response(indexHtml, { headers: { "content-type": "text/html" } });
    }
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
  return response.json();
}

function decodeImportUrl(importUrl) {
  const url = new URL(importUrl);
  assert.equal(url.pathname, "/demo/");
  assert.ok(url.hash.startsWith("#import="));
  const encoded = url.hash.slice("#import=".length);
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}

assert.equal(plugin.name, "dashgpt");
assert.equal(plugin.interface?.displayName, "DashGPT");
assert.equal(plugin.version, "0.2.0");
assert.equal(marketplace.plugins[0].name, "dashgpt");
assert.equal(marketplace.plugins[0].source.path, "./plugins/dashgpt");

const initialize = await rpc(1, "initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "dashgpt-smoke", version: "1" }
});
assert.equal(initialize.result.serverInfo.name, "dashgpt");
assert.ok(initialize.result.capabilities.tools);

const tools = await rpc(2, "tools/list");
assert.deepEqual(
  tools.result.tools.map((tool) => tool.name),
  ["list_results", "get_result", "get_context_pack", "prepare_result_import"]
);
assert.ok(tools.result.tools.slice(0, 3).every((tool) => tool.annotations?.readOnlyHint === true));

const list = await rpc(3, "tools/call", { name: "list_results", arguments: { limit: 10 } });
assert.ok(list.result.structuredContent.results.length >= 4);

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

const prepared = await rpc(5, "tools/call", {
  name: "prepare_result_import",
  arguments: {
    title: "Smoke Result",
    summary: "A distilled outcome prepared by the DashGPT plugin.",
    category: "Test",
    tags: ["smoke"],
    decisions: ["Keep the import explicit."],
    next: "Open the generated DashGPT import link."
  }
});
const imported = decodeImportUrl(prepared.result.structuredContent.importUrl);
assert.equal(imported.immutable, true);
assert.equal(imported.schemaVersion, 1);
assert.match(imported.contentHash, /^sha256:[0-9a-f]{64}$/);
assert.equal(imported.title, "Smoke Result");

const resultPage = await worker.fetch(
  request("https://dashgpt.example/demo/result/camping-fishing-el-regajo-fuente-munoz/"),
  env,
  ctx
);
assert.equal(resultPage.status, 200);
assert.match(await resultPage.text(), /DashGPT Demo/);

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
