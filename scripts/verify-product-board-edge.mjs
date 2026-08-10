import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PRODUCT_BOARD_ID,
  PRODUCT_BOARD_PATH,
  boardMemberResults,
  buildProductBoardContinuation
} from "../demo/product-board.js";

const [dashes, productA, productB, dashSource, bootstrapSource, discoverySource, wranglerSource] = await Promise.all([
  readFile(new URL("../demo/data/dashes.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../demo/data/product-results-a.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../demo/data/product-results-b.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../demo/dash.js", import.meta.url), "utf8"),
  readFile(new URL("../demo/catalog-bootstrap.js", import.meta.url), "utf8"),
  readFile(new URL("../demo/product-board-discovery.js", import.meta.url), "utf8"),
  readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8")
]);

const dash = dashes.find((item) => item.dashId === PRODUCT_BOARD_ID);
assert.ok(dash, "Product Board Dash must exist");
const published = [...productA, ...productB];

const missingDash = structuredClone(dash);
missingDash.automaticResultIds = [...missingDash.automaticResultIds, "private-result-not-published"];
const members = boardMemberResults(missingDash, published);
assert.equal(members.length, published.length, "missing member references must not create synthetic Result content");
assert.ok(!members.some((result) => result.id === "private-result-not-published"));

const continuation = buildProductBoardContinuation(missingDash, members, {
  boardUrl: `https://dashgpt.example${PRODUCT_BOARD_PATH}`
});
assert.doesNotMatch(continuation, /private-result-not-published/, "missing Result identity/content must not leak into generated continuation context");

assert.doesNotMatch(dashSource, /localStorage/, "public Product Board renderer must not require browser localStorage");
assert.match(dashSource, /This referenced Result is not available in the current public catalog/,
  "missing members must render an unavailable state rather than retained content");
assert.match(bootstrapSource, /product-board-discovery\.js/, "dashboard bootstrap must activate Product Board Result-card discovery");
assert.match(discoverySource, /dashgpt-living-product-board/);
assert.match(discoverySource, /Product Board/);
assert.match(discoverySource, /PRODUCT_BOARD_PATH/);

const wrangler = JSON.parse(wranglerSource);
assert.equal(wrangler.assets?.not_found_handling, "single-page-application", "deep board route requires SPA asset fallback");
assert.ok(wrangler.assets?.run_worker_first?.includes("/demo/*"), "Worker/static routing must cover deep /demo routes");

console.log("Verified Product Board privacy, missing-member, no-localStorage, discovery and deep-route contracts.");

