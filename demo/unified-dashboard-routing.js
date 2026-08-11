import { latestDashRevisions } from "./semantic-dashes.js";
import { loadBrowserVault } from "./vault.js";
import { resolveUnifiedDashLocale, unifiedDashText } from "./unified-dashboard.js";

const ORIGIN_DASH_PARAM = "fromDash";
const SEARCH_SCOPE_PARAM = "scope";
const ROUTE_SYNC_DELAYS = [0, 40, 160];

function locale() {
  return resolveUnifiedDashLocale({
    documentLanguage: document.documentElement?.lang,
    browserLanguage: navigator.language
  });
}

function t(key, values = {}) {
  return unifiedDashText(key, values, { locale: locale() });
}

function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function dashRouteId() {
  const match = window.location.pathname.match(/^\/demo\/dashes\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isHomeRoute() {
  return /^\/demo\/?$/.test(window.location.pathname);
}

function params() {
  return new URLSearchParams(window.location.search);
}

function originDashId() {
  return params().get(ORIGIN_DASH_PARAM) || "";
}

function revisionById(dashId) {
  if (!dashId) return null;
  try {
    const vault = loadBrowserVault(globalThis.localStorage).vault;
    return latestDashRevisions(vault.dashRevisions || [], vault.events || [])
      .find(revision => revision.dashId === dashId) || null;
  } catch {
    return null;
  }
}

function savedDashUrl(dashId, query = "") {
  const url = new URL(`/demo/dashes/${encodeURIComponent(dashId)}/`, window.location.origin);
  if (String(query).trim()) url.searchParams.set("q", String(query).trim());
  return `${url.pathname}${url.search}`;
}

function allCardsUrl(dashId, query = "") {
  const url = new URL("/demo/", window.location.origin);
  url.searchParams.set(SEARCH_SCOPE_PARAM, "all");
  url.searchParams.set(ORIGIN_DASH_PARAM, dashId);
  if (String(query).trim()) url.searchParams.set("q", String(query).trim());
  return `${url.pathname}${url.search}`;
}

function activeCardCount() {
  return document.querySelectorAll("#resultsGrid .result-card[data-result-id]").length;
}

function ensureCanonicalHomeShell() {
  if (!isHomeRoute() || document.querySelector("#unifiedDashContext")) return false;
  const dashboard = document.querySelector("#dashboardView");
  if (!dashboard || dashboard.hidden) return false;
  window.location.replace(`${window.location.pathname}${window.location.search}${window.location.hash}`);
  return true;
}

function ensureOriginScopeControl() {
  if (dashRouteId()) return;
  const dashId = originDashId();
  if (!dashId || params().get(SEARCH_SCOPE_PARAM) !== "all") return;
  const revision = revisionById(dashId);
  if (!revision) return;
  const context = document.querySelector("#unifiedDashContext");
  const actions = document.querySelector("#unifiedContextActions");
  const input = document.querySelector("#searchInput");
  if (!context || !actions || !input) return;

  context.dataset.originDashId = dashId;
  const title = context.querySelector("#dashContextTitle");
  const eyebrow = context.querySelector("#dashContextEyebrow");
  const meta = context.querySelector("#dashContextMeta");
  const query = input.value.trim();
  setText(eyebrow, t("notSaved"));
  setText(title, `${t("selection")}: ${query || t("allCards")}`);
  setText(meta, `${t("selectionMeta", { count: activeCardCount() })} · Dash: ${revision.title}`);

  for (const item of context.querySelectorAll(".my-dash-item")) {
    item.classList.toggle("active", item.getAttribute("href") === `/demo/dashes/${encodeURIComponent(dashId)}/`);
  }

  let group = context.querySelector("#originDashScopeGroup");
  if (!group) {
    group = document.createElement("label");
    group.id = "originDashScopeGroup";
    group.className = "origin-dash-scope";
    const hidden = document.createElement("span");
    hidden.className = "visually-hidden";
    hidden.textContent = t("search");
    const select = document.createElement("select");
    select.id = "originDashSearchScope";
    select.setAttribute("aria-label", t("search"));
    const dashOption = document.createElement("option");
    dashOption.value = "dash";
    dashOption.textContent = `${t("inThisDash")}: ${revision.title}`;
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = t("allCardsScope");
    select.append(dashOption, allOption);
    select.value = "all";
    group.append(hidden, select);
    actions.prepend(group);
    select.addEventListener("change", () => {
      if (select.value === "dash") window.location.href = savedDashUrl(dashId, input.value);
    });
  }

  let back = context.querySelector("#originDashBackButton");
  if (!back) {
    back = document.createElement("a");
    back.id = "originDashBackButton";
    back.className = "button ghost";
    back.href = savedDashUrl(dashId);
    back.textContent = `← Dash: ${revision.title}`;
    actions.append(back);
  }
}

function restoreSavedDashQuery() {
  const dashId = dashRouteId();
  if (!dashId) return;
  const query = params().get("q") || "";
  if (!query) return;
  const input = document.querySelector("#savedDashSearch");
  if (!input || input.dataset.restoredQuery === query) return;
  input.dataset.restoredQuery = query;
  input.value = query;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function syncRouteEnhancements() {
  if (dashRouteId()) {
    restoreSavedDashQuery();
    return;
  }
  if (ensureCanonicalHomeShell()) return;
  ensureOriginScopeControl();
}

function scheduleRouteSync() {
  queueMicrotask(syncRouteEnhancements);
  for (const delay of ROUTE_SYNC_DELAYS) setTimeout(syncRouteEnhancements, delay);
}

// The base unified controller owns the saved-Dash scope selector. Capture only the
// "All cards" transition so the query moves to the existing My Dash gallery while
// retaining the source Dash as reversible context instead of creating a second renderer.
document.addEventListener("change", event => {
  const select = event.target;
  if (!(select instanceof HTMLSelectElement) || select.id !== "savedDashSearchScope" || select.value !== "all") return;
  const dashId = dashRouteId();
  if (!dashId) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const query = document.querySelector("#savedDashSearch")?.value || "";
  window.location.href = allCardsUrl(dashId, query);
}, true);

document.addEventListener("input", event => {
  if (!(event.target instanceof HTMLInputElement) || event.target.id !== "searchInput") return;
  const dashId = originDashId();
  if (!dashId || params().get(SEARCH_SCOPE_PARAM) !== "all") return;
  if (!event.target.value.trim()) {
    window.location.href = savedDashUrl(dashId);
    return;
  }
  scheduleRouteSync();
});

window.addEventListener("popstate", scheduleRouteSync);
window.addEventListener("load", scheduleRouteSync, { once: true });

const routeSurface = document.querySelector("#resultPage");
if (routeSurface) {
  new MutationObserver(scheduleRouteSync)
    .observe(routeSurface, { childList: true, subtree: false, attributes: true, attributeFilter: ["hidden"] });
}

const dashboardSurface = document.querySelector("#dashboardView");
if (dashboardSurface) {
  new MutationObserver(scheduleRouteSync)
    .observe(dashboardSurface, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
}

scheduleRouteSync();
