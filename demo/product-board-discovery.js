import { PRODUCT_BOARD_PATH } from "./product-board.js";

const RESULT_ID = "dashgpt-living-product-board";

function addBoardLink() {
  const card = document.querySelector(`.result-card[data-result-id="${RESULT_ID}"]`);
  if (!card || card.querySelector(".product-board-card-link")) return Boolean(card);
  const actions = card.querySelector(".card-actions");
  if (!actions) return false;
  const link = document.createElement("a");
  link.className = "button small product-board-card-link";
  link.href = PRODUCT_BOARD_PATH;
  link.textContent = "Product Board";
  link.setAttribute("aria-label", "Open DashGPT Product Board");
  actions.prepend(link);
  return true;
}

addBoardLink();
const grid = document.querySelector("#resultsGrid");
if (grid) {
  const observer = new MutationObserver(() => addBoardLink());
  observer.observe(grid, { childList: true, subtree: true });
}

