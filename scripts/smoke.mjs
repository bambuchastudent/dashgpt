import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../src/index.js";

const catalog = readFileSync(new URL("../demo/data/results.json", import.meta.url), "utf8");
const indexHtml = readFileSync(new URL("../demo/index.html", import.meta.url), "utf8");
const plugin = JSON.parse(
  readFileSync(new URL("../plugins/dashgpt/.codex-plugin/plugin.json", import.meta.url), "utf8")
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

async function rpc(id, method, params = {}) {
  const response = await worker.fetch(
    new Request("https://dashgpt.example/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream"
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params })
    }),
    env
  );
  assert.equal(response.status, 200, `${method} should return 200`);
  return response.json();
}

assert.equal(plugin.name, "dashgpt");
assert.equal(plugin.interface?.displayName, "DashGPT");

const initialize = await rpc(1, "initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "dashgpt-smoke", version: "1" }
});
assert.equal(initialize.result.serverInfo.name, "dashgpt");
assert.equal(initialize.result.capabilities.tools.listChanged, false);

const tools = await rpc(2, "tools/list");
assert.deepEqual(
  tools.result.tools.map((tool) => tool.name),
  ["list_results", "get_result", "get_context_pack"]
);
assert.ok(tools.result.tools.every((tool) => tool.annotations?.readOnlyHint === true));

const list = await rpc(3, "tools/call", { name: "list_results", arguments: { limit: 10 } });
assert.ok(list.result.structuredContent.results.length >= 4);

const immutable = list.result.structuredContent.results.find(
  (result) => result.id === "camping-fishing-el-regajo-fuente-munoz"
);
assert.equal(immutable.immutable, true);
assert.equal(
  immutable.pageUrl,
  "https://dashgpt.example/demo/result/camping-fishing-el-regajo-fuente-munoz/"
);

const context = await rpc(4, "tools/call", {
  name: "get_context_pack",
  arguments: { id: "camping-fishing-el-regajo-fuente-munoz" }
});
assert.match(context.result.structuredContent.contextPack, /CONTENT IMMUTABLE: true/);

const resultPage = await worker.fetch(
  new Request("https://dashgpt.example/demo/result/camping-fishing-el-regajo-fuente-munoz/"),
  env
);
assert.equal(resultPage.status, 200);
assert.match(await resultPage.text(), /DashGPT Demo/);

const mcpGet = await worker.fetch(new Request("https://dashgpt.example/mcp"), env);
assert.equal(mcpGet.status, 405);

console.log("DashGPT smoke checks passed.");
