import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  DELIVERY_STATUSES,
  PRODUCT_BOARD_ID,
  PRODUCT_BOARD_PATH,
  boardMemberResults,
  buildProductBoardContinuation,
  isProductBoardPath,
  reconcileProductBoard,
  summarizeProductBoard
} from "../demo/product-board.js";
import { loadPublishedResultCatalog } from "../demo/result-catalog.js";

const DURABLE_FIELDS = [
  "id", "title", "goal", "summary", "currentState", "category", "tags", "decisions", "facts",
  "constraints", "userPreferences", "openQuestions", "next", "suggestedNextStep", "links",
  "relatedMaterials", "language", "continuationContext", "source"
];
const REQUIRED_RESULT_FIELDS = [
  "id", "schemaVersion", "title", "summary", "category", "tags", "favorite", "decisions", "next",
  "publishedAt", "immutable", "contentVersion", "contentHash", "productBoard", "continuationContext"
];
const REQUIRED_PRODUCT_FIELDS = [
  "area", "primaryTag", "deliveryStatus", "lastMeaningfulUpdate", "currentState", "nextAction", "updatedAt", "updateSource"
];

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashResult(result) {
  const payload = {};
  for (const field of DURABLE_FIELDS) if (result[field] !== undefined) payload[field] = result[field];
  return `sha256:${createHash("sha256").update(canonicalize(payload), "utf8").digest("hex")}`;
}

const [dashes, productA, productB, dashSource, indexSource] = await Promise.all([
  readFile(new URL("../demo/data/dashes.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../demo/data/product-results-a.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../demo/data/product-results-b.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../demo/dash.js", import.meta.url), "utf8"),
  readFile(new URL("../demo/index.html", import.meta.url), "utf8")
]);

const productResults = [...productA, ...productB];
assert.equal(productResults.length, 14, "initial Product Board must track all agreed product/storage topics");
assert.equal(new Set(productResults.map((result) => result.id)).size, productResults.length, "product Result IDs must be unique");

for (const result of productResults) {
  for (const field of REQUIRED_RESULT_FIELDS) assert.ok(field in result, `${result.id}: missing ${field}`);
  assert.equal(result.schemaVersion, 1, `${result.id}: schemaVersion`);
  assert.equal(result.immutable, true, `${result.id}: published Result must be immutable`);
  assert.equal(hashResult(result), result.contentHash, `${result.id}: immutable content hash mismatch`);
  for (const field of REQUIRED_PRODUCT_FIELDS) {
    assert.ok(result.productBoard[field] !== undefined && result.productBoard[field] !== "", `${result.id}: missing productBoard.${field}`);
  }
  assert.ok(DELIVERY_STATUSES.includes(result.productBoard.deliveryStatus), `${result.id}: unsupported delivery status`);
  assert.equal(result.status, result.productBoard.deliveryStatus, `${result.id}: card status must mirror primary delivery status`);
  assert.equal(result.productBoard.primaryTag, "DashGPT", `${result.id}: primary tag`);
  assert.equal(typeof result.continuationContext.role, "string", `${result.id}: continuation role`);
  assert.equal(typeof result.continuationContext.goal, "string", `${result.id}: continuation goal`);
}

const dash = dashes.find((item) => item.dashId === PRODUCT_BOARD_ID);
assert.ok(dash, "dashgpt-product saved Semantic Dash must exist");
assert.equal(dash.title, "DashGPT Product Board");
assert.equal(dash.updateMode, "review");
assert.equal(dash.productBoard?.slug, "dashgpt-product");
assert.equal(dash.productBoard?.canonicalPath, PRODUCT_BOARD_PATH);
assert.equal(dash.productBoard?.automaticMode, false, "Automatic mode must remain disabled");
assert.deepEqual(new Set(dash.automaticResultIds), new Set(productResults.map((result) => result.id)), "saved Dash membership must reference product Result IDs only");
assert.equal(dash.suggestedResultIds.length, 0, "initial saved revision must have no hidden proposals");

const members = boardMemberResults(dash, productResults);
assert.equal(members.length, productResults.length, "all initial board Results must materialize from stable references");
const summary = summarizeProductBoard(members);
assert.deepEqual({
  total: summary.total,
  idea: summary.idea,
  specified: summary.specified,
  in_development: summary.in_development,
  merged: summary.merged,
  deployed: summary.deployed,
  product_verified: summary.product_verified,
  blocked: summary.blocked,
  archived: summary.archived
}, {
  total: 14,
  idea: 7,
  specified: 0,
  in_development: 1,
  merged: 5,
  deployed: 0,
  product_verified: 0,
  blocked: 1,
  archived: 0
});
assert.deepEqual(summarizeProductBoard(members), summary, "board summary must be deterministic");

const byId = new Map(productResults.map((result) => [result.id, result]));
const semanticDashes = byId.get("dashgpt-semantic-dashes");
assert.equal(semanticDashes.productBoard.deliveryStatus, "merged");
assert.equal(semanticDashes.productBoard.openSpecChangeId, "f7-semantic-dashes");
assert.equal(semanticDashes.productBoard.prNumber, 18);
assert.equal(semanticDashes.productBoard.mergeCommit, "956e0151d1203b794881333b1ae2d1e91c53d85f");

const gallery = byId.get("dashgpt-semantic-gallery-ux");
assert.equal(gallery.productBoard.deliveryStatus, "merged", "Gallery must not overclaim deployed/product-verified");
assert.equal(gallery.productBoard.openSpecChangeId, "f8-semantic-gallery-ux");
assert.equal(gallery.productBoard.prNumber, 19);
assert.match(gallery.productBoard.nextAction, /production deployment/i);

const continuation = byId.get("dashgpt-structured-chat-continuation");
assert.equal(continuation.productBoard.deliveryStatus, "merged");
assert.equal(continuation.productBoard.openSpecChangeId, "structured-chat-continuation");
assert.equal(continuation.productBoard.prNumber, 20);
assert.equal(continuation.productBoard.evidence.prState, "merged");
assert.equal(continuation.productBoard.mergeCommit, "4d6d120fd51263bef541312cef973b16ff8d1f15");

const livingBoard = byId.get("dashgpt-living-product-board");
assert.equal(livingBoard.productBoard.deliveryStatus, "in_development");
assert.equal(livingBoard.productBoard.openSpecChangeId, "f9-living-product-board");
assert.equal(livingBoard.productBoard.prNumber, 21);

const activation = byId.get("dashgpt-storage-production-activation");
assert.equal(activation.productBoard.deliveryStatus, "blocked");
assert.match(activation.productBoard.blocker, /private-repository/i);

const reconciliation = reconcileProductBoard(members, { refreshedAt: "2026-08-10T16:00:00Z" });
assert.deepEqual(reconciliation.proposals, [], "saved initial state already matches persisted evidence");
assert.deepEqual(
  reconcileProductBoard(members, { refreshedAt: "2026-08-10T16:00:00Z" }),
  reconciliation,
  "refresh against identical evidence must be idempotent"
);

const ideaFixture = structuredClone(byId.get("dashgpt-semantic-navigator"));
ideaFixture.productBoard.evidence = { prState: "open" };
assert.deepEqual(reconcileProductBoard([ideaFixture]).proposals.map((item) => [item.from, item.to]), [["idea", "in_development"]]);
ideaFixture.productBoard.evidence = { prState: "merged", mergeCommit: "abc" };
assert.deepEqual(reconcileProductBoard([ideaFixture]).proposals.map((item) => item.to), ["merged"]);
ideaFixture.productBoard.evidence = { productionDeployment: "success" };
assert.deepEqual(reconcileProductBoard([ideaFixture]).proposals.map((item) => item.to), ["deployed"]);

const deployedFixture = structuredClone(ideaFixture);
deployedFixture.productBoard.deliveryStatus = "deployed";
deployedFixture.status = "deployed";
assert.deepEqual(reconcileProductBoard([deployedFixture]).proposals, [], "deployment evidence alone must never grant product verification");
deployedFixture.productBoard.productAcceptance = { accepted: true, source: "manual" };
assert.deepEqual(reconcileProductBoard([deployedFixture]).proposals.map((item) => item.to), ["product_verified"]);

const blockedFixture = structuredClone(activation);
blockedFixture.productBoard.evidence = { productionDeployment: "success" };
assert.deepEqual(reconcileProductBoard([blockedFixture]).proposals, [], "blocked state requires explicit review to leave");

const continuationMarkdown = buildProductBoardContinuation(dash, members, { boardUrl: `https://dashgpt.example${PRODUCT_BOARD_PATH}` });
for (const heading of [
  "# Role", "# Product definition", "# Current objective", "# Current product state", "# Completed",
  "# Active work", "# Decisions already made", "# Constraints", "# Open questions", "# Next actions", "# Sources"
]) assert.ok(continuationMarkdown.includes(heading), `continuation must include ${heading}`);
assert.match(continuationMarkdown, /PR #20|pull\/20/);
assert.match(continuationMarkdown, /PR #21|pull\/21/);
assert.doesNotMatch(continuationMarkdown, /raw private conversation history/i, "continuation must not claim raw chat transfer");

assert.equal(isProductBoardPath("/demo/dash/"), true);
assert.equal(isProductBoardPath("/demo/dash"), true);
assert.equal(isProductBoardPath(PRODUCT_BOARD_PATH), true);
assert.equal(isProductBoardPath("/demo/dash/other/"), false);
assert.ok(!dashSource.includes("/demo/data/dash.json"), "product board UI must not read the manual status snapshot");
assert.ok(dashSource.includes("/demo/data/dashes.json"));
assert.ok(dashSource.includes("/demo/data/results.json"));
assert.ok(indexSource.includes(`href=\"${PRODUCT_BOARD_PATH}\"`), "normal demo must expose the stable board link");
assert.ok(indexSource.includes("/demo/catalog-bootstrap.js"), "dashboard must load the unified public Result catalog");

const fakePayloads = new Map([
  ["/demo/data/results.json", [{ id: "base" }]],
  ["/demo/data/product-results-a.json", [{ id: "product-a" }]],
  ["/demo/data/product-results-b.json", [{ id: "product-b" }]]
]);
const fakeFetcher = async (path) => fakePayloads.has(path)
  ? new Response(JSON.stringify(fakePayloads.get(path)), { status: 200, headers: { "content-type": "application/json" } })
  : new Response("", { status: 404 });
assert.deepEqual((await loadPublishedResultCatalog(fakeFetcher)).map((item) => item.id), ["base", "product-a", "product-b"]);

console.log(`Verified DashGPT Product Board: ${productResults.length} immutable product Results, stable Dash membership, status reconciliation and continuation context.`);
