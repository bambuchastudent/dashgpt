export const GALLERY_STATE_VERSION = 1;
export const GALLERY_STATE_KEY = "dashgpt.demo.gallery-state.v1";
export const RESULT_ACTIVITY_TYPE = "result.activity";

export const GALLERY_DENSITIES = Object.freeze([
  Object.freeze({ id: "overview", label: "Overview", scale: 0.62, detail: "compact" }),
  Object.freeze({ id: "dense", label: "Dense", scale: 0.78, detail: "medium" }),
  Object.freeze({ id: "standard", label: "Standard", scale: 1, detail: "medium" }),
  Object.freeze({ id: "comfortable", label: "Comfortable", scale: 1.18, detail: "expanded" }),
  Object.freeze({ id: "focus", label: "Focus", scale: 1.36, detail: "expanded" })
]);

const DEFAULT_DENSITY_INDEX = 2;
const MIN_SCALE = GALLERY_DENSITIES[0].scale;
const MAX_SCALE = GALLERY_DENSITIES.at(-1).scale;
const MAX_REMEMBERED_ORDERS = 12;
const MAX_REMEMBERED_IDS = 500;

const SEMANTIC_ANCHORS = Object.freeze([
  Object.freeze({ key: "food", words: ["еда", "food", "recipe", "soup", "chicken", "kiev", "korean", "pechuga"], hue: 28 }),
  Object.freeze({ key: "home", words: ["дом", "home", "air-conditioner", "cleaning", "drainage", "filter"], hue: 178 }),
  Object.freeze({ key: "travel", words: ["поезд", "trip", "travel", "camping", "fishing", "gva", "permit"], hue: 105 }),
  Object.freeze({ key: "dashgpt", words: ["dashgpt", "product", "context", "openspec", "ai"], hue: 266 }),
  Object.freeze({ key: "language", words: ["испан", "spanish", "language"], hue: 48 }),
  Object.freeze({ key: "technology", words: ["tech", "code", "dev", "github", "software"], hue: 220 })
]);

const CONTINUATION_KINDS = new Set(["continue.new-chat", "source.open"]);
const OPEN_KINDS = new Set(["opened"]);
const UPDATE_KINDS = new Set(["updated", "dash.add", "dash.remove"]);
const CREATE_KINDS = new Set(["created"]);

function stableHash(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function semanticText(result) {
  return `${result?.category || ""} ${result?.title || ""} ${(result?.tags || []).join(" ")}`.toLowerCase();
}

function anchorMatches(result) {
  const semantic = semanticText(result);
  return SEMANTIC_ANCHORS.map((anchor, index) => ({
    ...anchor,
    index,
    hits: anchor.words.reduce((count, word) => count + (semantic.includes(word) ? 1 : 0), 0)
  }));
}

function circularDistance(left, right) {
  const direct = Math.abs(left - right) % 360;
  return Math.min(direct, 360 - direct);
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function validTimestamp(value) {
  if (typeof value !== "string" || !value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function latestTimestamp(current, candidate) {
  return Math.max(current || 0, validTimestamp(candidate));
}

function cleanString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function compareText(left, right) {
  const leftText = String(left);
  const rightText = String(right);
  return leftText < rightText ? -1 : leftText > rightText ? 1 : 0;
}

function uniqueStrings(values, limit = MAX_REMEMBERED_IDS) {
  const output = [];
  const seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    if (typeof value !== "string" || !value || seen.has(value)) continue;
    output.push(value);
    seen.add(value);
    if (output.length >= limit) break;
  }
  return output;
}

export function semanticHue(result) {
  const semantic = semanticText(result);
  const matches = anchorMatches(result);
  let weighted = 0;
  let total = 0;
  for (const anchor of matches) {
    if (!anchor.hits) continue;
    weighted += anchor.hue * anchor.hits;
    total += anchor.hits;
  }
  const perturb = (stableHash(`${result?.title || ""}|${(result?.tags || []).join("|")}`) % 25) - 12;
  return Math.round(((total ? weighted / total : stableHash(semantic) % 360) + perturb + 360) % 360);
}

export function semanticSignature(result, adapter) {
  if (typeof adapter === "function") {
    const supplied = adapter(result);
    if (supplied && typeof supplied.groupKey === "string" && supplied.groupKey) {
      return {
        groupKey: supplied.groupKey,
        groupRank: finiteNumber(supplied.groupRank),
        position: finiteNumber(supplied.position),
        hue: finiteNumber(supplied.hue, semanticHue(result))
      };
    }
  }

  const hue = semanticHue(result);
  const matches = anchorMatches(result).filter((anchor) => anchor.hits > 0);
  if (matches.length) {
    matches.sort((left, right) => (
      right.hits - left.hits
      || circularDistance(left.hue, hue) - circularDistance(right.hue, hue)
      || left.index - right.index
    ));
    const dominant = matches[0];
    return {
      groupKey: `anchor:${dominant.key}`,
      groupRank: dominant.hue,
      position: hue,
      hue
    };
  }

  const categoryKey = cleanString(result?.category).trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/(^-|-$)/g, "");
  if (categoryKey) {
    return {
      groupKey: `category:${categoryKey}`,
      groupRank: stableHash(`category:${categoryKey}`) % 360,
      position: hue,
      hue
    };
  }

  const band = Math.floor(((hue + 22.5) % 360) / 45);
  return {
    groupKey: `hue:${band}`,
    groupRank: band * 45,
    position: hue,
    hue
  };
}

export function activitySnapshot(result, events = []) {
  const snapshot = {
    continuedAt: 0,
    openedAt: 0,
    updatedAt: 0,
    createdAt: 0
  };

  for (const event of Array.isArray(events) ? events : []) {
    if (event?.type !== RESULT_ACTIVITY_TYPE || event.resultId !== result?.id) continue;
    if (CONTINUATION_KINDS.has(event.value)) snapshot.continuedAt = latestTimestamp(snapshot.continuedAt, event.createdAt);
    else if (OPEN_KINDS.has(event.value)) snapshot.openedAt = latestTimestamp(snapshot.openedAt, event.createdAt);
    else if (UPDATE_KINDS.has(event.value)) snapshot.updatedAt = latestTimestamp(snapshot.updatedAt, event.createdAt);
    else if (CREATE_KINDS.has(event.value)) snapshot.createdAt = latestTimestamp(snapshot.createdAt, event.createdAt);
  }

  snapshot.updatedAt = latestTimestamp(snapshot.updatedAt, result?.updatedAt);
  if (Number(result?.contentVersion || 1) > 1) snapshot.updatedAt = latestTimestamp(snapshot.updatedAt, result?.publishedAt);
  snapshot.createdAt = latestTimestamp(snapshot.createdAt, result?.createdAt);
  snapshot.createdAt = latestTimestamp(snapshot.createdAt, result?.publishedAt);
  return snapshot;
}

function compareActivity(left, right) {
  for (const field of ["continuedAt", "openedAt", "updatedAt", "createdAt"]) {
    if (left[field] !== right[field]) return right[field] - left[field];
  }
  return 0;
}

export function orderGalleryResults(items, options = {}) {
  const previousIndex = new Map(uniqueStrings(options.previousOrder).map((id, index) => [id, index]));
  const events = Array.isArray(options.events) ? options.events : [];
  const decorated = (Array.isArray(items) ? items : []).map((result, inputIndex) => ({
    result,
    inputIndex,
    signature: semanticSignature(result, options.semanticSignature),
    activity: activitySnapshot(result, events)
  }));

  decorated.sort((left, right) => {
    const groupRank = left.signature.groupRank - right.signature.groupRank;
    if (groupRank) return groupRank;
    const groupKey = compareText(left.signature.groupKey, right.signature.groupKey);
    if (groupKey) return groupKey;
    const activity = compareActivity(left.activity, right.activity);
    if (activity) return activity;
    const leftPrevious = previousIndex.has(left.result.id) ? previousIndex.get(left.result.id) : Number.POSITIVE_INFINITY;
    const rightPrevious = previousIndex.has(right.result.id) ? previousIndex.get(right.result.id) : Number.POSITIVE_INFINITY;
    if (leftPrevious !== rightPrevious) return leftPrevious - rightPrevious;
    const position = left.signature.position - right.signature.position;
    if (position) return position;
    const stableId = compareText(left.result.id, right.result.id);
    return stableId || left.inputIndex - right.inputIndex;
  });

  return decorated.map(({ result }) => result);
}

export function defaultGalleryState() {
  return {
    version: GALLERY_STATE_VERSION,
    densityIndex: DEFAULT_DENSITY_INDEX,
    activeCategory: "All",
    favoritesOnly: false,
    query: "",
    selectionKey: "all",
    focusedResultId: null,
    orders: []
  };
}

export function sanitizeGalleryState(input) {
  const defaults = defaultGalleryState();
  if (!input || typeof input !== "object" || Number(input.version) !== GALLERY_STATE_VERSION) return defaults;
  const densityIndex = Number.isInteger(input.densityIndex)
    && input.densityIndex >= 0
    && input.densityIndex < GALLERY_DENSITIES.length
    ? input.densityIndex
    : defaults.densityIndex;
  const orders = [];
  const seenKeys = new Set();
  for (const entry of Array.isArray(input.orders) ? input.orders : []) {
    const key = cleanString(entry?.key).slice(0, 240);
    if (!key || seenKeys.has(key)) continue;
    orders.push({ key, ids: uniqueStrings(entry.ids) });
    seenKeys.add(key);
    if (orders.length >= MAX_REMEMBERED_ORDERS) break;
  }
  return {
    version: GALLERY_STATE_VERSION,
    densityIndex,
    activeCategory: cleanString(input.activeCategory, "All").slice(0, 160) || "All",
    favoritesOnly: Boolean(input.favoritesOnly),
    query: cleanString(input.query).slice(0, 500),
    selectionKey: cleanString(input.selectionKey, "all").slice(0, 240) || "all",
    focusedResultId: typeof input.focusedResultId === "string" && input.focusedResultId ? input.focusedResultId : null,
    orders
  };
}

export function loadGalleryState(storage) {
  try {
    const raw = storage?.getItem?.(GALLERY_STATE_KEY);
    return raw ? sanitizeGalleryState(JSON.parse(raw)) : defaultGalleryState();
  } catch {
    return defaultGalleryState();
  }
}

export function saveGalleryState(storage, state) {
  const clean = sanitizeGalleryState(state);
  storage?.setItem?.(GALLERY_STATE_KEY, JSON.stringify(clean));
  return clean;
}

export function gallerySelectionKey(options = {}) {
  const scope = cleanString(options.scope, "all").trim() || "all";
  const category = cleanString(options.category, "All").trim() || "All";
  const favorites = options.favoritesOnly ? "favorites" : "all-results";
  const query = cleanString(options.query).trim().toLowerCase();
  return `${scope}|category:${category}|${favorites}|query:${query}`.slice(0, 240);
}

export function rememberedOrder(state, selectionKey) {
  return sanitizeGalleryState(state).orders.find((entry) => entry.key === selectionKey)?.ids || [];
}

export function rememberGalleryOrder(state, selectionKey, ids) {
  const clean = sanitizeGalleryState(state);
  const key = cleanString(selectionKey, "all").slice(0, 240) || "all";
  clean.orders = [
    { key, ids: uniqueStrings(ids) },
    ...clean.orders.filter((entry) => entry.key !== key)
  ].slice(0, MAX_REMEMBERED_ORDERS);
  clean.selectionKey = key;
  return clean;
}

export function clampGalleryScale(value) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, finiteNumber(value, GALLERY_DENSITIES[DEFAULT_DENSITY_INDEX].scale)));
}

export function galleryFontScale(value) {
  return Math.min(clampGalleryScale(value), 1);
}

export function nearestDensityIndex(scale) {
  const current = clampGalleryScale(scale);
  let nearest = 0;
  for (let index = 1; index < GALLERY_DENSITIES.length; index += 1) {
    if (Math.abs(GALLERY_DENSITIES[index].scale - current) < Math.abs(GALLERY_DENSITIES[nearest].scale - current)) nearest = index;
  }
  return nearest;
}

export function densityAt(index) {
  const safe = Number.isInteger(index) && index >= 0 && index < GALLERY_DENSITIES.length ? index : DEFAULT_DENSITY_INDEX;
  return GALLERY_DENSITIES[safe];
}

export function pinchGalleryScale(startScale, startDistance, currentDistance) {
  const initialDistance = finiteNumber(startDistance);
  if (initialDistance <= 0) return clampGalleryScale(startScale);
  return clampGalleryScale(finiteNumber(startScale, 1) * finiteNumber(currentDistance, initialDistance) / initialDistance);
}

export function trackpadGalleryScale(currentScale, deltaY) {
  return clampGalleryScale(clampGalleryScale(currentScale) * Math.exp(-finiteNumber(deltaY) * 0.002));
}

export function galleryMinimumCardWidth(containerWidth, densityIndex) {
  const base = finiteNumber(containerWidth) <= 620 ? 220 : 280;
  return base * densityAt(densityIndex).scale;
}

export function galleryColumnCount(containerWidth, densityIndex, gap = 16) {
  const width = Math.max(0, finiteNumber(containerWidth));
  const safeGap = Math.max(0, finiteNumber(gap));
  const minimum = galleryMinimumCardWidth(width, densityIndex);
  return Math.max(1, Math.floor((width + safeGap) / (minimum + safeGap)));
}

function pointerDistance(left, right) {
  return Math.hypot(right.clientX - left.clientX, right.clientY - left.clientY);
}

function pointerMidpoint(left, right) {
  return { x: (left.clientX + right.clientX) / 2, y: (left.clientY + right.clientY) / 2 };
}

function motionAllowed() {
  return !globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

function cardAtPoint(point, root) {
  const fromPoint = point && globalThis.document?.elementFromPoint?.(point.x, point.y)?.closest?.(".result-card");
  if (fromPoint && root.contains(fromPoint)) return fromPoint;
  const focused = globalThis.document?.activeElement?.closest?.(".result-card");
  if (focused && root.contains(focused)) return focused;
  return root.querySelector?.(".result-card") || null;
}

function captureRects(root) {
  return new Map([...root.querySelectorAll?.(".result-card") || []].map((card) => [card, card.getBoundingClientRect()]));
}

function animateReflow(root, before) {
  if (!motionAllowed()) return;
  for (const card of root.querySelectorAll?.(".result-card") || []) {
    const previous = before.get(card);
    if (!previous || typeof card.animate !== "function") continue;
    const next = card.getBoundingClientRect();
    const x = previous.left - next.left;
    const y = previous.top - next.top;
    if (Math.abs(x) < 1 && Math.abs(y) < 1) continue;
    card.animate(
      [{ transform: `translate(${x}px, ${y}px)` }, { transform: "translate(0, 0)" }],
      { duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
  }
}

export function createGalleryZoomController(options) {
  const root = options?.root;
  if (!root) throw new Error("Gallery zoom controller requires a root element");
  const range = options.range || null;
  const decrease = options.decrease || null;
  const increase = options.increase || null;
  const output = options.output || null;
  const pointers = new Map();
  const requestedDensity = Number(options.initialDensityIndex);
  let densityIndex = Number.isInteger(requestedDensity)
    && requestedDensity >= 0
    && requestedDensity < GALLERY_DENSITIES.length
    ? requestedDensity
    : DEFAULT_DENSITY_INDEX;
  let visualScale = densityAt(densityIndex).scale;
  let pinch = null;
  let gestureStartScale = visualScale;
  let wheelTimer = null;
  let resizeFrame = null;
  let suppressClick = false;

  function updateControls() {
    const density = densityAt(densityIndex);
    if (range) {
      range.min = "0";
      range.max = String(GALLERY_DENSITIES.length - 1);
      range.step = "1";
      range.value = String(densityIndex);
      range.setAttribute("aria-valuetext", `${density.label}, ${Math.round(density.scale * 100)}%`);
    }
    if (decrease) decrease.disabled = densityIndex === 0;
    if (increase) increase.disabled = densityIndex === GALLERY_DENSITIES.length - 1;
    if (output) output.textContent = `${density.label} · ${Math.round(density.scale * 100)}%`;
  }

  function writeScale(scale, detail, anchorPoint, animate) {
    const before = animate ? captureRects(root) : new Map();
    const anchor = cardAtPoint(anchorPoint, root);
    const anchorBefore = anchor?.getBoundingClientRect?.();
    const fontScale = galleryFontScale(scale);
    const baseWidth = globalThis.innerWidth <= 620 ? 220 : 280;
    root.style.setProperty("--gallery-zoom-scale", String(scale));
    root.style.setProperty("--gallery-font-scale", String(fontScale));
    root.style.setProperty("--gallery-card-min", `${baseWidth * scale}px`);
    root.style.setProperty("--gallery-body-size", `${16 * fontScale}px`);
    root.style.setProperty("--gallery-title-size", `${18.72 * fontScale}px`);
    root.style.setProperty("--gallery-meta-size", `${12.48 * fontScale}px`);
    if (detail) root.dataset.galleryDetail = detail;
    visualScale = scale;

    globalThis.requestAnimationFrame?.(() => {
      if (anchor && anchorBefore) {
        const anchorAfter = anchor.getBoundingClientRect();
        globalThis.scrollBy?.({ left: anchorAfter.left - anchorBefore.left, top: anchorAfter.top - anchorBefore.top });
      }
      if (animate) animateReflow(root, before);
    });
  }

  function commit(nextIndex, settings = {}) {
    const clampedIndex = Math.min(GALLERY_DENSITIES.length - 1, Math.max(0, Math.round(finiteNumber(nextIndex, densityIndex))));
    densityIndex = clampedIndex;
    const density = densityAt(densityIndex);
    writeScale(density.scale, density.detail, settings.anchorPoint, settings.animate !== false);
    updateControls();
    options.onCommit?.(densityIndex, density);
  }

  function applyTransient(scale, point) {
    writeScale(clampGalleryScale(scale), null, point, false);
  }

  function onRange(event) {
    commit(Number(event.currentTarget.value));
  }

  function onDecrease() {
    commit(densityIndex - 1);
  }

  function onIncrease() {
    commit(densityIndex + 1);
  }

  function onPointerDown(event) {
    if (event.pointerType !== "touch") return;
    pointers.set(event.pointerId, event);
    if (pointers.size !== 2) return;
    const [left, right] = [...pointers.values()];
    pinch = {
      ids: [left.pointerId, right.pointerId],
      startDistance: pointerDistance(left, right),
      startScale: densityAt(densityIndex).scale,
      moved: false
    };
    root.setPointerCapture?.(left.pointerId);
    root.setPointerCapture?.(right.pointerId);
  }

  function onPointerMove(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, event);
    if (!pinch || !pinch.ids.every((id) => pointers.has(id))) return;
    const [left, right] = pinch.ids.map((id) => pointers.get(id));
    const nextScale = pinchGalleryScale(pinch.startScale, pinch.startDistance, pointerDistance(left, right));
    pinch.moved ||= Math.abs(nextScale - pinch.startScale) > 0.015;
    suppressClick ||= pinch.moved;
    event.preventDefault();
    applyTransient(nextScale, pointerMidpoint(left, right));
  }

  function onPointerEnd(event) {
    pointers.delete(event.pointerId);
    if (!pinch || pointers.size >= 2) return;
    const moved = pinch.moved;
    pinch = null;
    commit(nearestDensityIndex(visualScale), { animate: moved });
  }

  function onWheel(event) {
    if (!event.ctrlKey) return;
    event.preventDefault();
    const point = { x: event.clientX, y: event.clientY };
    applyTransient(trackpadGalleryScale(visualScale, event.deltaY), point);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => commit(nearestDensityIndex(visualScale), { anchorPoint: point }), 140);
  }

  function onGestureStart(event) {
    gestureStartScale = densityAt(densityIndex).scale;
    event.preventDefault?.();
  }

  function onGestureChange(event) {
    event.preventDefault?.();
    applyTransient(clampGalleryScale(gestureStartScale * finiteNumber(event.scale, 1)), { x: event.clientX, y: event.clientY });
  }

  function onGestureEnd(event) {
    event.preventDefault?.();
    commit(nearestDensityIndex(visualScale), { anchorPoint: { x: event.clientX, y: event.clientY } });
  }

  function onResize() {
    if (resizeFrame) globalThis.cancelAnimationFrame?.(resizeFrame);
    resizeFrame = globalThis.requestAnimationFrame?.(() => writeScale(densityAt(densityIndex).scale, densityAt(densityIndex).detail, null, false));
  }

  function onClickCapture(event) {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
  }

  range?.addEventListener("input", onRange);
  decrease?.addEventListener("click", onDecrease);
  increase?.addEventListener("click", onIncrease);
  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointermove", onPointerMove, { passive: false });
  root.addEventListener("pointerup", onPointerEnd);
  root.addEventListener("pointercancel", onPointerEnd);
  root.addEventListener("wheel", onWheel, { passive: false });
  root.addEventListener("gesturestart", onGestureStart, { passive: false });
  root.addEventListener("gesturechange", onGestureChange, { passive: false });
  root.addEventListener("gestureend", onGestureEnd, { passive: false });
  root.addEventListener("click", onClickCapture, true);
  globalThis.addEventListener?.("resize", onResize);
  commit(densityIndex, { animate: false });

  return {
    getDensityIndex: () => densityIndex,
    setDensityIndex: (index) => commit(index),
    destroy() {
      clearTimeout(wheelTimer);
      range?.removeEventListener("input", onRange);
      decrease?.removeEventListener("click", onDecrease);
      increase?.removeEventListener("click", onIncrease);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", onPointerEnd);
      root.removeEventListener("pointercancel", onPointerEnd);
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("gesturestart", onGestureStart);
      root.removeEventListener("gesturechange", onGestureChange);
      root.removeEventListener("gestureend", onGestureEnd);
      root.removeEventListener("click", onClickCapture, true);
      globalThis.removeEventListener?.("resize", onResize);
    }
  };
}
