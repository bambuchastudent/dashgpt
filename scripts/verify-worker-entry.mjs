import assert from "node:assert/strict";
import worker from "../src/worker.js";

const ctx = { waitUntil() {}, passThroughOnException() {} };
const assets = {
  async fetch() {
    return new Response("<!doctype html><title>DashGPT Demo</title>", {
      headers: { "content-type": "text/html" }
    });
  }
};

const status = await worker.fetch(
  new Request("https://dashgpt.example/api/storage/github/status"),
  { ASSETS: assets },
  ctx
);
assert.equal(status.status, 200);
const payload = await status.json();
assert.equal(payload.configured, false);
assert.equal(payload.paired, false);

const demo = await worker.fetch(
  new Request("https://dashgpt.example/demo/"),
  { ASSETS: assets },
  ctx
);
assert.equal(demo.status, 200);
assert.match(await demo.text(), /DashGPT Demo/);

console.log("Storage-aware production worker entrypoint checks passed.");
