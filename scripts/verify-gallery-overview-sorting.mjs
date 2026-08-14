import assert from "node:assert/strict";
import {
  GALLERY_SORT_MODES,
  GALLERY_SORT_STATE_KEY,
  GALLERY_SORT_STATE_VERSION,
  SEMANTIC_PALETTE_SIZE,
  meaningfulCardTimestamp,
  orderGalleryCards,
  planWholeBoardOverview,
  primaryTag,
  readGallerySortMode,
  semanticPalette,
  semanticPaletteIndex,
  writeGallerySortMode
} from "../demo/gallery-overview-sorting.js";

function card(id, publishedAt, tags = [], category = "Test", title = id) {
  return { id, title, summary: `${id} summary`, publishedAt, tags, category };
}

const oldCard = card("old", "2026-08-10T10:00:00.000Z", ["beta"], "Food", "Old food");
const middleCard = card("middle", "2026-08-11T10:00:00.000Z", ["alpha"], "Travel", "Middle travel");
const newCard = card("new", "2026-08-12T10:00:00.000Z", ["alpha", "extra"], "Software", "New software");
const untagged = card("untagged", "2026-08-09T10:00:00.000Z", [], "Home", "Untagged home");
const items = [oldCard, newCard, untagged, middleCard];

assert.deepEqual(GALLERY_SORT_MODES, ["color", "tag", "time"], "visible priority must be Color → Tag → Time");
assert.equal(SEMANTIC_PALETTE_SIZE, 32);
const palette = semanticPalette();
assert.equal(palette.length, 32, "palette must contain exactly 32 semantic slots");
assert.equal(new Set(palette.map(entry => entry.index)).size, 32);
assert.equal(new Set(palette.map(entry => entry.hue)).size, 32, "all 32 base palette hues must be distinct");
assert.ok(items.every(item => semanticPaletteIndex(item) >= 0 && semanticPaletteIndex(item) < 32));

const colorOrder = orderGalleryCards(items);
assert.deepEqual(new Set(colorOrder.map(item => item.id)), new Set(items.map(item => item.id)), "Color default must preserve membership");
const paletteOrder = colorOrder.map(semanticPaletteIndex);
assert.deepEqual(paletteOrder, [...paletteOrder].sort((left, right) => left - right), "default Color order must follow palette slots");

const tagOrder = orderGalleryCards(items, "tag");
assert.deepEqual(tagOrder.map(item => primaryTag(item)), ["alpha", "alpha", "beta", "~untagged"], "Tag must group by primary canonical tag and keep untagged last");
assert.equal(tagOrder.filter(item => item.id === "new").length, 1, "multi-tag cards appear once");

assert.deepEqual(orderGalleryCards(items, "time").map(item => item.id), ["new", "middle", "old", "untagged"], "Time remains newest first");
const viewEvents = [
  { type: "result.activity", resultId: "old", value: "opened", createdAt: "2026-08-14T10:00:00.000Z" },
  { type: "result.activity", resultId: "old", value: "continue.new-chat", createdAt: "2026-08-14T10:01:00.000Z" }
];
assert.equal(meaningfulCardTimestamp(oldCard, viewEvents), Date.parse(oldCard.publishedAt), "open/continue must not make an old card new");
assert.deepEqual(orderGalleryCards(items, "time", viewEvents).map(item => item.id), ["new", "middle", "old", "untagged"]);
const updateEvents = [{ type: "result.activity", resultId: "old", value: "updated", createdAt: "2026-08-13T10:00:00.000Z" }];
assert.equal(orderGalleryCards(items, "time", updateEvents)[0].id, "old", "meaningful update may move a card forward");

const memory = new Map();
const storage = {
  getItem: key => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, value)
};
assert.equal(readGallerySortMode(storage), "color", "fresh presentation state must default to Color");
memory.set("dashgpt.demo.gallery-sort.v1", JSON.stringify({ version: 1, sortMode: "time" }));
assert.equal(readGallerySortMode(storage), "color", "superseded v1 Time default must not leak into F32 v2");
writeGallerySortMode("tag", storage);
assert.deepEqual(JSON.parse(memory.get(GALLERY_SORT_STATE_KEY)), { version: GALLERY_SORT_STATE_VERSION, sortMode: "tag" });
assert.equal(readGallerySortMode(storage), "tag");
memory.set(GALLERY_SORT_STATE_KEY, JSON.stringify({ version: 999, sortMode: "time" }));
assert.equal(readGallerySortMode(storage), "color", "unsupported state versions return to Color");

for (const count of [20, 50, 100]) {
  const plan = planWholeBoardOverview({ width: 1100, height: 650, count });
  assert.equal(plan.fits, true, `${count} desktop cards should fit when compact geometry permits`);
  assert.equal(plan.representation, "compact");
  assert.ok(plan.columns * plan.rows >= count);
  assert.ok(plan.tileWidth >= 56);
  assert.ok(plan.tileHeight >= 42);
}

const desktopHistory = planWholeBoardOverview({ width: 1100, height: 650, count: 2200 });
assert.equal(desktopHistory.fits, true, "representative 2200-card desktop history must fit on one screen");
assert.equal(desktopHistory.representation, "heatmap");
assert.ok(desktopHistory.columns * desktopHistory.rows >= 2200);
assert.ok(desktopHistory.tileWidth >= 5 && desktopHistory.tileHeight >= 5);
assert.ok(desktopHistory.rows * desktopHistory.tileHeight + Math.max(0, desktopHistory.rows - 1) * desktopHistory.gap <= 650 + 0.001);

for (const width of [360, 390]) {
  const plan = planWholeBoardOverview({
    width,
    height: 590,
    count: 2200,
    gap: 3,
    minWidth: 44,
    minHeight: 36,
    mapGap: 1,
    mapMinWidth: 3,
    mapMinHeight: 3
  });
  assert.equal(plan.fits, true, `${width}px mobile must fit representative history as a one-screen heat map`);
  assert.equal(plan.representation, "heatmap");
  assert.ok(plan.columns * plan.rows >= 2200);
  assert.ok(plan.columns * plan.tileWidth + Math.max(0, plan.columns - 1) * plan.gap <= width + 0.001, "mobile plan must not overflow horizontally");
  assert.ok(plan.rows * plan.tileHeight + Math.max(0, plan.rows - 1) * plan.gap <= 590 + 0.001, "mobile plan must not overflow vertically");
}

const extreme = planWholeBoardOverview({ width: 1100, height: 650, count: 100000 });
assert.equal(extreme.fits, false, "extreme collections use truthful overflow only beyond useful heat-map capacity");
assert.equal(extreme.representation, "overflow");
assert.ok(extreme.columns * extreme.rows >= 100000, "overflow fallback never drops cards");

console.log("F32 Color-first 32-color whole-board verification passed.");
