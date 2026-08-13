const arrows = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

function center(rect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function sameGridCards(card) {
  const grid = card.closest(".results-grid");
  const root = grid || document;
  return [...root.querySelectorAll(".result-card")].filter(item => {
    const rect = item.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

function candidateScore(key, fromRect, toRect) {
  const from = center(fromRect);
  const to = center(toRect);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (key === "ArrowLeft" && dx >= -1) return Infinity;
  if (key === "ArrowRight" && dx <= 1) return Infinity;
  if (key === "ArrowUp" && dy >= -1) return Infinity;
  if (key === "ArrowDown" && dy <= 1) return Infinity;
  const horizontal = key === "ArrowLeft" || key === "ArrowRight";
  const primary = Math.abs(horizontal ? dx : dy);
  const secondary = Math.abs(horizontal ? dy : dx);
  return primary + secondary * 2;
}

function move(card, key) {
  const fromRect = card.getBoundingClientRect();
  let best = null;
  let bestScore = Infinity;
  for (const candidate of sameGridCards(card)) {
    if (candidate === card) continue;
    const score = candidateScore(key, fromRect, candidate.getBoundingClientRect());
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  if (!best) return false;
  card.removeAttribute("data-gallery-focus");
  best.dataset.galleryFocus = "true";
  best.focus({ preventScroll: true });
  best.scrollIntoView({ block: "nearest", inline: "nearest" });
  return true;
}

export function initializeCardKeyboardNavigation() {
  document.addEventListener("keydown", event => {
    if (!arrows.has(event.key) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const card = event.target instanceof Element ? event.target.closest(".result-card") : null;
    if (!card || event.target !== card) return;
    if (!move(card, event.key)) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
}
