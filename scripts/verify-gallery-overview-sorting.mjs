import assert from "node:assert/strict";
import {
  GALLERY_SORT_MODES,
  meaningfulCardTimestamp,
  orderGalleryCards,
  planWholeBoardOverview,
  primaryTag
} from "../demo/gallery-overview-sorting.js";
import { semanticHue } from "../demo/semantic-gallery.js";

function card(id, publishedAt, tags = [], category = "Test", title = id) {
  return { id, title, summary: `${id} summary`, publishedAt, tags, category };
}

const oldCard = card("old", "2026-08-10T10:00:00.000Z", ["beta"], "Food", "Old food");
const middleCard = card("middle", "2026-08-11T10:00:00.000Z", ["alpha"], "Travel", "Middle travel");
const newCard = card("new", "2026-08-12T10:00:00.000Z", ["alpha", "extra"], "Software", "New software");
const untagged = card("untagged", "2026-08-09T10:00:00.000Z", [], "Home", "Untagged home");
const items = [oldCard, newCard, untagged, middleCard];

assert.deepEqual(GALLERY_SORT_MODES, ["time", "color", "tag"]);
assert.deepEqual(orderGalleryCards(items, "time").map(item => item.id), ["new", "middle", "old", "untagged"], "Time must be newest first");

const viewEvents = [
  { type: "result.activity", resultId: "old", value: "opened", createdAt: "2026-08-14T10:00:00.000Z" },
  { type: "result.activity", resultId: "old", value: "continue.new-chat", createdAt: "2026-08-14T10:01:00.000Z" }
];
assert.equal(meaningfulCardTimestamp(oldCard, viewEvents), Date.parse(oldCard.publishedAt), "open/continue must not make an old card new");
assert.deepEqual(orderGalleryCards(items, "time", viewEvents).map(item => item.id), ["new", "middle", "old", "untagged"]);

const updateEvents = [{ type: "result.activity", resultId: "old", value: "updated", createdAt: "2026-08-13T10:00:00.000Z" }];
assert.equal(orderGalleryCards(items, "time", updateEvents)[0].id, "old", "meaningful update may move a card forward");

const colorOrder = orderGalleryCards(items, "color");
assert.deepEqual(new Set(colorOrder.map(item => item.id)), new Set(items.map(item => item.id)), "Color must preserve membership");
const hues = colorOrder.map(semanticHue);
assert.deepEqual(hues, [...hues].sort((left, right) => left - right), "Color must follow existing semantic hue");

const tagOrder = orderGalleryCards(items, "tag");
assert.deepEqual(tagOrder.map(item => primaryTag(item)), ["alpha", "alpha", "beta", "~untagged"], "Tag must group by primary canonical tag and keep untagged last");
assert.deepEqual(new Set(tagOrder.map(item => item.id)), new Set(items.map(item => item.id)), "Tag must preserve membership without duplication");
assert.equal(tagOrder.filter(item => item.id === "new").length, 1, "multi-tag cards appear once");

for (const count of [20, 50, 100]) {
  const plan = planWholeBoardOverview({ width: 1100, height: 650, count });
  assert.equal(plan.fits, true, `${count} desktop cards should fit when useful compact geometry permits`);
  assert.equal(plan.representation, "compact");
  assert.ok(plan.columns * plan.rows >= count);
  assert.ok(plan.tileWidth >= 56);
  assert.ok(plan.tileHeight >= 42);
}

const desktopHistory = planWholeBoardOverview({ width: 1100, height: 650, count: 2200 });
assert.equal(desktopHistory.fits, true, "representative 2200-card desktop history must fit at maximum zoom");
assert.equal(desktopHistory.representation, "heatmap");
assert.ok(desktopHistory.columns * desktopHistory.rows >= 2200);
assert.ok(desktopHistory.tileWidth >= 10 && desktopHistory.tileHeight >= 10);

for (const width of [360, 390]) {
  const plan = planWholeBoardOverview({
    width,
    height: 590,
    count: 2200,
    gap: 3,
    minWidth: 44,
    minHeight: 36,
    mapGap: 1,
    mapMinWidth: 6,
    mapMinHeight: 6
  });
  assert.equal(plan.fits, true, `${width}px mobile should fit representative history as heat map`);
  assert.equal(plan.representation, "heatmap");
  assert.ok(plan.columns * plan.rows >= 2200);
  assert.ok(plan.columns * plan.tileWidth + Math.max(0, plan.columns - 1) * plan.gap <= width + 0.001, "mobile plan must not overflow horizontally");
}

const extreme = planWholeBoardOverview({ width: 1100, height: 650, count: 10000 });
assert.equal(extreme.fits, false, "extreme collections use truthful overflow fallback only after heat-map capacity is exceeded");
assert.equal(extreme.representation, "overflow");
assert.ok(extreme.tileHeight >= 10);
assert.ok(extreme.columns * extreme.rows >= 10000, "fallback never drops cards");

console.log("Gallery overview sorting verification passed.");
