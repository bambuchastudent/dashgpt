import { resolveUnifiedDashLocale, unifiedDashText } from "./unified-dashboard.js";

const PRODUCT_BOARD_PATH = "/demo/dash/dashgpt-product/";

function isProductBoardRoute() {
  return window.location.pathname === PRODUCT_BOARD_PATH;
}

function t(key) {
  const locale = resolveUnifiedDashLocale({
    documentLanguage: document.documentElement?.lang,
    browserLanguage: navigator.language
  });
  return unifiedDashText(key, {}, { locale });
}

function applyUnifiedProductBoardShell() {
  if (!isProductBoardRoute()) return;
  const page = document.querySelector("#dashgptProductBoard");
  if (!page) return;
  document.body.classList.add("unified-card-dashboard");

  const header = page.querySelector(".product-board-head");
  const intro = header?.querySelector(".product-board-intro");
  const title = intro?.querySelector("h2");
  const eyebrow = intro?.querySelector(".eyebrow");
  if (header) header.classList.add("unified-dash-context", "product-board-unified-context");
  if (eyebrow) eyebrow.textContent = t("savedDash");
  if (title && !title.textContent.startsWith("Dash: ")) title.textContent = `Dash: ${title.textContent}`;

  const backLinks = [...page.querySelectorAll('a[href="/demo/"]')];
  for (const link of backLinks) link.textContent = `← ${t("backToMyDash")}`;

  const topicsHeading = [...page.querySelectorAll(".product-board-topics h2")]
    .find(node => node.textContent.trim() === "Tracked Results");
  if (topicsHeading) topicsHeading.textContent = t("cards");

  const unavailable = page.querySelector(".dash-status-card");
  if (unavailable) {
    const fallbackBack = unavailable.querySelector('a[href="/demo/"]');
    if (fallbackBack) fallbackBack.textContent = t("backToMyDash");
  }
}

if (isProductBoardRoute()) {
  const shell = document.querySelector(".shell");
  if (shell) {
    new MutationObserver(() => queueMicrotask(applyUnifiedProductBoardShell))
      .observe(shell, { childList: true, subtree: true });
  }
  queueMicrotask(applyUnifiedProductBoardShell);
}
