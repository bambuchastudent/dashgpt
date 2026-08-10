import assert from "node:assert/strict";
import {
  GALLERY_DENSITIES,
  activitySnapshot,
  createGalleryZoomController,
  defaultGalleryState,
  galleryColumnCount,
  galleryFontScale,
  gallerySelectionKey,
  loadGalleryState,
  nearestDensityIndex,
  orderGalleryResults,
  pinchGalleryScale,
  rememberGalleryOrder,
  rememberedOrder,
  saveGalleryState,
  semanticHue,
  semanticSignature,
  trackpadGalleryScale
} from "../demo/semantic-gallery.js";
import {
  createVault,
  portableVault,
  putResult,
  recordResultActivity
} from "../demo/vault.js";

function result(id, title, category, tags, publishedAt = "2026-01-01T00:00:00.000Z") {
  return {
    id,
    schemaVersion: 1,
    title,
    summary: `${title} summary`,
    category,
    tags,
    decisions: [],
    next: `Continue ${title}`,
    publishedAt,
    immutable: false,
    contentVersion: 1
  };
}

const foodContinued = result("food-continued", "Chicken Kiev recipe", "Food", ["recipe", "chicken"]);
const foodOpened = result("food-opened", "Cold Korean soup", "Food", ["soup", "korean"]);
const foodUpdated = result("food-updated", "Pasta notes", "Food", ["recipe"]);
const foodCreated = result("food-created", "Fresh bread", "Food", ["food"], "2026-08-10T09:00:00.000Z");
const travelA = result("travel-a", "Camping in Valencia", "Trips", ["camping", "gva"]);
const travelB = result("travel-b", "Fishing permit", "Trips", ["fishing", "permit"]);
const dashA = result("dash-a", "DashGPT Product decisions", "DashGPT", ["product", "openspec"]);
const dashB = result("dash-b", "DashGPT context workflow", "DashGPT", ["context", "ai"]);
const shuffled = [travelB, foodCreated, dashB, foodUpdated, travelA, foodContinued, dashA, foodOpened];
const events = [
  { schemaVersion: 1, eventId: "evt-cont", type: "result.activity", resultId: foodContinued.id, value: "continue.new-chat", createdAt: "2026-08-01T10:00:00.000Z" },
  { schemaVersion: 1, eventId: "evt-open", type: "result.activity", resultId: foodOpened.id, value: "opened", createdAt: "2026-08-09T10:00:00.000Z" },
  { schemaVersion: 1, eventId: "evt-update", type: "result.activity", resultId: foodUpdated.id, value: "updated", createdAt: "2026-08-10T10:00:00.000Z" }
];

const ordered = orderGalleryResults(shuffled, { events });
const orderedIds = ordered.map((item) => item.id);
const foodIds = ordered.filter((item) => semanticSignature(item).groupKey === "anchor:food").map((item) => item.id);
assert.deepEqual(foodIds, ["food-continued", "food-opened", "food-updated", "food-created"], "activity tiers must be lexicographic inside food");

const groupSequence = ordered.map((item) => semanticSignature(item).groupKey);
const closedGroups = new Set();
let activeGroup = null;
for (const group of groupSequence) {
  if (group === activeGroup) continue;
  if (activeGroup) closedGroups.add(activeGroup);
  assert.equal(closedGroups.has(group), false, `semantic group ${group} must remain contiguous`);
  activeGroup = group;
}
assert.deepEqual(orderGalleryResults(shuffled, { events }).map((item) => item.id), orderedIds, "same inputs must reload identically");
assert.deepEqual(orderGalleryResults([...shuffled].reverse(), { events }).map((item) => item.id), orderedIds, "storage order must not affect deterministic gallery order");

const travelBefore = ordered.filter((item) => semanticSignature(item).groupKey === "anchor:travel").map((item) => item.id);
const foodActivity = [...events, {
  schemaVersion: 1,
  eventId: "evt-food-new",
  type: "result.activity",
  resultId: foodCreated.id,
  value: "source.open",
  createdAt: "2026-08-10T11:00:00.000Z"
}];
const afterFoodActivity = orderGalleryResults(shuffled, { events: foodActivity });
assert.equal(afterFoodActivity.filter((item) => semanticSignature(item).groupKey === "anchor:food")[0].id, foodCreated.id);
assert.deepEqual(
  afterFoodActivity.filter((item) => semanticSignature(item).groupKey === "anchor:travel").map((item) => item.id),
  travelBefore,
  "activity in one topic must not reshuffle another topic"
);

const semanticPerturbation = { ...foodOpened, title: `${foodOpened.title} v2`, tags: [...foodOpened.tags, "notes"] };
assert.equal(semanticSignature(semanticPerturbation).groupKey, semanticSignature(foodOpened).groupKey, "small visual perturbation must retain dominant group");
assert.equal(semanticHue(foodContinued), 37, "Feature 5 semantic hue behavior must remain stable");
const healthA = result("health-a", "Thyroid follow-up", "Health", ["tsh"]);
const healthB = result("health-b", "Blood test notes", "Health", ["laboratory"]);
assert.equal(semanticSignature(healthA).groupKey, semanticSignature(healthB).groupKey, "unknown concepts must retain an existing category neighborhood without changing color");

const tiedA = result("tie-a", "Food A", "Food", ["food"]);
const tiedB = result("tie-b", "Food B", "Food", ["food"]);
const remembered = orderGalleryResults([tiedA, tiedB], { previousOrder: [tiedB.id, tiedA.id] });
assert.deepEqual(remembered.map((item) => item.id), [tiedB.id, tiedA.id], "remembered order must settle exact ties inside a group");
const rememberedWithOpen = orderGalleryResults([tiedA, tiedB], {
  previousOrder: [tiedB.id, tiedA.id],
  events: [{ schemaVersion: 1, eventId: "evt-tie-open", type: "result.activity", resultId: tiedA.id, value: "opened", createdAt: "2026-08-10T12:00:00.000Z" }]
});
assert.deepEqual(rememberedWithOpen.map((item) => item.id), [tiedA.id, tiedB.id], "new explicit activity must outrank a remembered tie");

assert.deepEqual(GALLERY_DENSITIES.map(({ scale }) => galleryFontScale(scale)), [0.62, 0.78, 1, 1, 1], "font scale must cap at 100 percent");
assert.equal(nearestDensityIndex(0.7), 0);
assert.equal(nearestDensityIndex(1.3), 4);
assert.equal(pinchGalleryScale(1, 200, 100), 0.62, "touch pinch must clamp to overview");
assert.equal(pinchGalleryScale(1, 100, 200), 1.36, "touch pinch must clamp to focus");
assert.ok(trackpadGalleryScale(1, -100) > 1, "trackpad pinch-out must increase internal scale");
assert.ok(trackpadGalleryScale(1, 100) < 1, "trackpad pinch-in must decrease internal scale");

class FakeStyle {
  values = new Map();

  setProperty(name, value) {
    this.values.set(name, value);
  }
}

class FakeElement extends EventTarget {
  constructor() {
    super();
    this.style = new FakeStyle();
    this.dataset = {};
    this.attributes = new Map();
    this.value = "";
    this.textContent = "";
    this.disabled = false;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  querySelectorAll() {
    return [];
  }

  querySelector() {
    return null;
  }

  contains(value) {
    return value === this;
  }

  setPointerCapture() {}
}

function eventWith(type, fields = {}) {
  const event = new Event(type, { cancelable: true });
  for (const [name, value] of Object.entries(fields)) Object.defineProperty(event, name, { value, configurable: true });
  return event;
}

globalThis.innerWidth = 1080;
globalThis.matchMedia = () => ({ matches: false });
globalThis.requestAnimationFrame = (callback) => {
  callback();
  return 1;
};
globalThis.cancelAnimationFrame = () => {};
const fakeRoot = new FakeElement();
const fakeRange = new FakeElement();
const fakeDecrease = new FakeElement();
const fakeIncrease = new FakeElement();
const fakeOutput = new FakeElement();
const committedDensities = [];
const controller = createGalleryZoomController({
  root: fakeRoot,
  range: fakeRange,
  decrease: fakeDecrease,
  increase: fakeIncrease,
  output: fakeOutput,
  initialDensityIndex: 2,
  onCommit: (index) => committedDensities.push(index)
});
assert.equal(controller.getDensityIndex(), 2);
assert.equal(fakeOutput.textContent, "Standard · 100%");
fakeIncrease.dispatchEvent(eventWith("click"));
assert.equal(controller.getDensityIndex(), 3, "plus button must operate without touch");
fakeDecrease.dispatchEvent(eventWith("click"));
assert.equal(controller.getDensityIndex(), 2, "minus button must operate without touch");
fakeRange.value = "0";
fakeRange.dispatchEvent(eventWith("input"));
assert.equal(controller.getDensityIndex(), 0, "native range must operate with keyboard/mouse input");

controller.setDensityIndex(2);
fakeRoot.dispatchEvent(eventWith("pointerdown", { pointerType: "touch", pointerId: 1, clientX: 0, clientY: 100 }));
fakeRoot.dispatchEvent(eventWith("pointerdown", { pointerType: "touch", pointerId: 2, clientX: 100, clientY: 100 }));
const pointerMove = eventWith("pointermove", { pointerType: "touch", pointerId: 2, clientX: 200, clientY: 100 });
fakeRoot.dispatchEvent(pointerMove);
assert.equal(pointerMove.defaultPrevented, true, "active two-pointer pinch must own internal gallery zoom");
fakeRoot.dispatchEvent(eventWith("pointerup", { pointerType: "touch", pointerId: 2, clientX: 200, clientY: 100 }));
assert.equal(controller.getDensityIndex(), 4, "two-pointer pinch must snap to focus density");

controller.setDensityIndex(2);
const ordinaryWheel = eventWith("wheel", { ctrlKey: false, deltaY: 100, clientX: 50, clientY: 50 });
fakeRoot.dispatchEvent(ordinaryWheel);
assert.equal(ordinaryWheel.defaultPrevented, false, "ordinary wheel scrolling must not be captured");
assert.equal(controller.getDensityIndex(), 2);
const pinchWheel = eventWith("wheel", { ctrlKey: true, deltaY: 100, clientX: 50, clientY: 50 });
fakeRoot.dispatchEvent(pinchWheel);
assert.equal(pinchWheel.defaultPrevented, true, "control-modified trackpad pinch must prevent browser zoom inside gallery");
await new Promise((resolve) => setTimeout(resolve, 170));
assert.equal(controller.getDensityIndex(), 1, "trackpad pinch must snap to dense internal state");
assert.ok(committedDensities.length >= 6, "all input methods must share the density commit path");
controller.destroy();

const desktopColumns = GALLERY_DENSITIES.map((_, index) => galleryColumnCount(1080, index));
assert.deepEqual(desktopColumns, [...desktopColumns].sort((left, right) => right - left), "zooming in must never increase desktop columns");
assert.ok(desktopColumns[0] > desktopColumns.at(-1), "overview must have more columns than focus");
assert.ok(galleryColumnCount(360, 0) >= 2, "narrow mobile overview must allow a mosaic");
assert.equal(galleryColumnCount(360, 4), 1, "narrow mobile focus must remain a readable column");

const allIds = new Set(shuffled.map((item) => item.id));
for (const _density of GALLERY_DENSITIES) {
  assert.deepEqual(new Set(orderGalleryResults(shuffled, { events }).map((item) => item.id)), allIds, "density must not remove All-mode Results");
}
const searchSelection = shuffled.filter((item) => item.title.includes("DashGPT"));
const dashSelection = [foodContinued, foodOpened, foodUpdated];
assert.deepEqual(new Set(orderGalleryResults(searchSelection, { events }).map((item) => item.id)), new Set(searchSelection.map((item) => item.id)), "search selection must survive ordering/zoom");
assert.deepEqual(new Set(orderGalleryResults(dashSelection, { events }).map((item) => item.id)), new Set(dashSelection.map((item) => item.id)), "Semantic Dash selection must survive ordering/zoom");
assert.match(gallerySelectionKey({ scope: "dash:food", category: "All", query: "soup" }), /^dash:food\|/, "Dash identity must participate in presentation-state scope");

const longTitle = "Very long Result identity ".repeat(30);
const longResult = result("long-title", longTitle, "Food", ["recipe"]);
assert.equal(orderGalleryResults([longResult])[0].title, longTitle, "compact ordering must never remove Result identity");

const memory = new Map();
const storage = {
  getItem: (key) => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, value)
};
let state = defaultGalleryState();
state.densityIndex = 0;
state.activeCategory = "Food";
state.favoritesOnly = true;
state.query = "soup";
state.focusedResultId = foodOpened.id;
state = rememberGalleryOrder(state, "search:soup", [foodOpened.id, foodContinued.id]);
saveGalleryState(storage, state);
const restored = loadGalleryState(storage);
assert.equal(restored.densityIndex, 0);
assert.equal(restored.activeCategory, "Food");
assert.equal(restored.favoritesOnly, true);
assert.equal(restored.query, "soup");
assert.equal(restored.focusedResultId, foodOpened.id);
assert.deepEqual(rememberedOrder(restored, "search:soup"), [foodOpened.id, foodContinued.id]);
memory.set("dashgpt.demo.gallery-state.v1", JSON.stringify({ version: 1, densityIndex: 99, orders: [{ key: "x", ids: [null, "valid", "valid"] }] }));
assert.equal(loadGalleryState(storage).densityIndex, 2, "invalid saved density must use the safe standard default");
assert.deepEqual(rememberedOrder(loadGalleryState(storage), "x"), ["valid"], "stale/malformed order entries must be sanitized");

const vault = createVault({ vaultId: "vault-gallery", createdAt: "2026-08-10T10:00:00.000Z" });
putResult(vault, foodOpened, { updatedAt: "2026-08-10T10:00:00.000Z" });
const originalPortableResult = JSON.stringify(portableVault(vault).results[0]);
recordResultActivity(vault, foodOpened.id, "opened", { eventId: "evt-open-1", createdAt: "2026-08-10T10:00:00.000Z" });
recordResultActivity(vault, foodOpened.id, "opened", { eventId: "evt-open-duplicate", createdAt: "2026-08-10T10:00:10.000Z" });
assert.equal(vault.events.length, 1, "same explicit action inside 30 seconds must be debounced");
recordResultActivity(vault, foodOpened.id, "opened", { eventId: "evt-open-2", createdAt: "2026-08-10T10:00:31.000Z" });
recordResultActivity(vault, foodOpened.id, "dash.add", { eventId: "evt-dash-add", createdAt: "2026-08-10T10:01:00.000Z" });
assert.equal(vault.events.length, 3);
assert.equal(activitySnapshot(foodOpened, vault.events).updatedAt, Date.parse("2026-08-10T10:01:00.000Z"));
assert.equal(JSON.stringify(portableVault(vault).results[0]), originalPortableResult, "activity must leave Result knowledge byte-for-byte unchanged");
assert.throws(() => recordResultActivity(vault, foodOpened.id, "viewport.visible"), /Unsupported Result activity/);
const eventCountBeforeRead = vault.events.length;
orderGalleryResults([foodOpened], { events: vault.events });
assert.equal(vault.events.length, eventCountBeforeRead, "render/order reads must not create activity");

console.log("Semantic Gallery ordering, zoom, state and activity tests passed.");
