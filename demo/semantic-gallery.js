export * from "./semantic-gallery-base.js";

import {
  GALLERY_DENSITIES,
  clampGalleryScale,
  densityAt,
  galleryFontScale,
  nearestDensityIndex,
  pinchGalleryScale,
  trackpadGalleryScale
} from "./semantic-gallery-base.js";

export const GALLERY_REFLOW_ANIMATION_CARD_LIMIT = 120;

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
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

export function shouldAnimateGalleryReflow(cardCount, allowMotion = motionAllowed()) {
  return Boolean(allowMotion) && Math.max(0, finiteNumber(cardCount)) <= GALLERY_REFLOW_ANIMATION_CARD_LIMIT;
}

function cardAtPoint(point, root) {
  const fromPoint = point && globalThis.document?.elementFromPoint?.(point.x, point.y)?.closest?.(".result-card");
  if (fromPoint && root.contains(fromPoint)) return fromPoint;
  const focused = globalThis.document?.activeElement?.closest?.(".result-card");
  if (focused && root.contains(focused)) return focused;
  return root.querySelector?.(".result-card") || null;
}

function captureRects(cards) {
  return new Map(cards.map(card => [card, card.getBoundingClientRect()]));
}

function animateReflow(cards, before) {
  for (const card of cards) {
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
    : 2;
  let visualScale = densityAt(densityIndex).scale;
  let pinch = null;
  let gestureStartScale = visualScale;
  let wheelTimer = null;
  let resizeFrame = null;
  let transientFrame = null;
  let pendingTransient = null;
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
    const cards = [...root.querySelectorAll?.(".result-card") || []];
    const animatedCards = animate && shouldAnimateGalleryReflow(cards.length) ? cards : [];
    const before = animatedCards.length ? captureRects(animatedCards) : new Map();
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
      if (animatedCards.length) animateReflow(animatedCards, before);
    });
  }

  function cancelTransient() {
    if (transientFrame) globalThis.cancelAnimationFrame?.(transientFrame);
    transientFrame = null;
    pendingTransient = null;
  }

  function flushTransient() {
    transientFrame = null;
    const pending = pendingTransient;
    pendingTransient = null;
    if (!pending) return;
    writeScale(pending.scale, null, pending.point, false);
  }

  function commit(nextIndex, settings = {}) {
    cancelTransient();
    const clampedIndex = Math.min(
      GALLERY_DENSITIES.length - 1,
      Math.max(0, Math.round(finiteNumber(nextIndex, densityIndex)))
    );
    densityIndex = clampedIndex;
    const density = densityAt(densityIndex);
    writeScale(density.scale, density.detail, settings.anchorPoint, settings.animate !== false);
    updateControls();
    options.onCommit?.(densityIndex, density);
  }

  function applyTransient(scale, point) {
    const nextScale = clampGalleryScale(scale);
    visualScale = nextScale;
    pendingTransient = { scale: nextScale, point };
    if (transientFrame) return;
    if (globalThis.requestAnimationFrame) transientFrame = globalThis.requestAnimationFrame(flushTransient);
    else flushTransient();
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
    if (!pinch || !pinch.ids.every(id => pointers.has(id))) return;
    const [left, right] = pinch.ids.map(id => pointers.get(id));
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
    applyTransient(
      clampGalleryScale(gestureStartScale * finiteNumber(event.scale, 1)),
      { x: event.clientX, y: event.clientY }
    );
  }

  function onGestureEnd(event) {
    event.preventDefault?.();
    commit(nearestDensityIndex(visualScale), { anchorPoint: { x: event.clientX, y: event.clientY } });
  }

  function onResize() {
    if (resizeFrame) globalThis.cancelAnimationFrame?.(resizeFrame);
    resizeFrame = globalThis.requestAnimationFrame?.(() => {
      resizeFrame = null;
      writeScale(densityAt(densityIndex).scale, densityAt(densityIndex).detail, null, false);
    });
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
    setDensityIndex: index => commit(index),
    destroy() {
      clearTimeout(wheelTimer);
      cancelTransient();
      if (resizeFrame) globalThis.cancelAnimationFrame?.(resizeFrame);
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
