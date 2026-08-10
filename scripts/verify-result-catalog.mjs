import assert from "node:assert/strict";
import {
  loadPublishedResultCatalog,
  mergePublishedResultCatalogs
} from "../demo/result-catalog.js";

const shared = { id: "dashgpt-semantic-dashes", title: "Semantic Dashes", immutable: true };
const base = { id: "base-result", title: "Base" };

assert.deepEqual(
  mergePublishedResultCatalogs([[base, shared], [structuredClone(shared)]]).map((result) => result.id),
  ["base-result", "dashgpt-semantic-dashes"],
  "an identical Result already present in the primary Worker catalog must not be appended twice by the browser shard loader"
);

assert.throws(
  () => mergePublishedResultCatalogs([[shared], [{ ...shared, title: "Conflicting title" }]]),
  /conflicting duplicate id dashgpt-semantic-dashes/,
  "same-id conflicting knowledge must fail instead of being silently overwritten"
);

const payloads = new Map([
  ["/demo/data/results.json", [base, shared]],
  ["/demo/data/product-results-a.json", [structuredClone(shared)]],
  ["/demo/data/product-results-b.json", [{ id: "product-b", title: "Product B" }]]
]);
const fetcher = async (path) => payloads.has(path)
  ? new Response(JSON.stringify(payloads.get(path)), { status: 200, headers: { "content-type": "application/json" } })
  : new Response("", { status: 404 });

assert.deepEqual(
  (await loadPublishedResultCatalog(fetcher)).map((result) => result.id),
  ["base-result", "dashgpt-semantic-dashes", "product-b"],
  "logical catalog loading must be idempotent when the server has already merged a product shard"
);

console.log("Verified idempotent published Result catalog merging and conflicting-duplicate rejection.");

