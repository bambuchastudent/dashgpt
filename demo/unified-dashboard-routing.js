import { latestDashRevisions } from "./semantic-dashes.js";
import { loadBrowserVault } from "./vault.js";
import {
  initializeUnifiedDashboard,
  resolveUnifiedDashLocale,
  unifiedDashText
} from "./unified-dashboard.js";

const ORIGIN_DASH_PARAM = "fromDash";
const SEARCH_SCOPE_PARAM = "scope";
const ORIGIN_SESSION_KEY = "dashgpt.unified.search-origin.v1";
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

function readOriginSession() {
  try {
    const parsed = JSON.parse(globalThis.sessionStorage?.getItem?.(ORIGIN_SESSION_KEY) || "null");
    if (!parsed || parsed.scope !== "all" || !parsed.dashId) return null;
    return {
      dashId: String(parsed.dashId),
      scope: "all",
      query: String(parsed.query || "")
    };
  } catch {
    return null;
  }
}

function writeOriginSession({ dashId, query = "" }) {
  try {
    globalThis.sessionStorage?.setItem?.(ORIGIN_SESSION_KEY, JSON.stringify({
      dashId,
      scope: "all",
      query: String(query || "")
    }));
  } catch {
    // URL state remains the primary source when sessionStorage is unavailable.
  }
}

function clearOriginSession() {
  try {
    globalThis.sessionStorage?.removeItem?.(ORIGIN_SESSION_KEY);
  } catch {
    // Best-effort cleanup only.
  }
}

function originState() {
  const search = params();
  const dashId = search.get(ORIGIN_DASH_PARAM);
  const scope = search.get(SEARCH_SCOPE_PARAM);
  if (dashId && scope === "all") {
    return { dashId, scope: "all", query: search.get("q") || "" };
  }
  if (isHomeRoute()) return readOriginSession();
  return null;
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

function renderedDashTitle(dashId) {
  const href = `/demo/dashes/${encodeURIComponent(dashId)}/`;
  return [...document.querySelectorAll(".my-dash-item")]
    .find(item => item.getAttribute("href") === href)
    ?.querySelector("strong")?.textContent?.trim() || "";
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

function ensurePopulatedHomeControlsVisible() {
  if (!isHomeRoute() || activeCardCount() === 0) return;
  const dashboard = document.querySelector("#dashboardView");
  const controls = dashboard?.querySelector(":scope > .controls");
  if (dashboard?.hidden) dashboard.hidden = false;
  if (controls?.hidden) controls.hidden = false;
}

function ensureCanonicalHomeShell() {
  if (!isHomeRoute() || document.querySelector("#unifiedDashContext")) return;
  const dashboard = document.querySelector("#dashboardView");
  if (!dashboard) return;
  // A route/app startup race can expose the dashboard before the additive
  // unified adapter has mounted its context. Re-run the idempotent adapter
  // instead of replacing the page with the same URL, which could race user
  // input and prevent origin-Dash scope controls from ever settling.
  initializeUnifiedDashboard();
}

function ensureOriginScopeControl() {
  if (dashRouteId()) return;
  const origin = originState();
  if (!origin?.dashId || origin.scope !== "all") return;
  const { dashId } = origin;
  const context = document.querySelector("#unifiedDashContext");
  const actions = document.querySelector("#unifiedContextActions");
  const input = document.querySelector("#searchInput");
  if (!context || !actions || !input) return;

  const revision = revisionById(dashId);
  const dashTitle = revision?.title || renderedDashTitle(dashId) || dashId;

  context.dataset.originDashId = dashId;
  const title = context.querySelector("#dashContextTitle");
  const eyebrow = context.querySelector("#dashContextEyebrow");
  const meta = context.querySelector("#dashContextMeta");
  const query = input.value.trim() || origin.query;
  setText(eyebrow, t("notSaved"));
  setText(title, `${t("selection")}: ${query || t("allCards")}`);
  setText(meta, `${t("selectionMeta", { count: activeCardCount() })} · Dash: ${dashTitle}`);

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
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = t("allCardsScope");
    select.append(dashOption, allOption);
    select.value = "all";
    group.append(hidden, select);
    actions.prepend(group);
    select.addEventListener("change", () => {
      if (select.value !== "dash") return;
      clearOriginSession();
      window.location.href = savedDashUrl(dashId, input.value || origin.query);
    });
  }
  const select = group.querySelector("#originDashSearchScope");
  const dashOption = select?.querySelector('option[value="dash"]');
  setText(dashOption, `${t("inThisDash")}: ${dashTitle}`);

  let back = context.querySelector("#originDashBackButton");
  if (!back) {
    back = document.createElement("a");
    back.id = "originDashBackButton";
    back.className = "button ghost";
    back.href = savedDashUrl(dashId);
    back.addEventListener("click", () => clearOriginSession());
    actions.append(back);
  }
  setText(back, `← Dash: ${dashTitle}`);
}

function restoreSavedDashQuery() {
  const dashId = dashRouteId();
  if (!dashId) return;
  const query = params().get("q") || "";
  if (!query) return;
  const input = document.querySelector("#savedDashSearch");
  if (!input || input.dataset.restoredQuery === query) return;
  clearOriginSession();
  input.dataset.restoredQuery = query;
  input.value = query;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function syncRouteEnhancements() {
  if (dashRouteId()) {
    restoreSavedDashQuery();
    return;
  }
  ensurePopulatedHomeControlsVisible();
  ensureCanonicalHomeShell();
  ensureOriginScopeControl();
}

function scheduleRouteSync() {
  queueMicrotask(syncRouteEnhancements);
  for (const delay of ROUTE_SYNC_DELAYS) setTimeout(syncRouteEnhancements, delay);
}

document.addEventListener("change", event => {
  const select = event.target;
  if (!(select instanceof HTMLSelectElement) || select.id !== "savedDashSearchScope" || select.value !== "all") return;
  const dashId = dashRouteId();
  if (!dashId) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const query = document.querySelector("#savedDashSearch")?.value || "";
  writeOriginSession({ dashId, query });
  window.location.href = allCardsUrl(dashId, query);
}, true);

document.addEventListener("input", event => {
  if (!(event.target instanceof HTMLInputElement) || event.target.id !== "searchInput") return;
  const origin = originState();
  if (!origin?.dashId || origin.scope !== "all") return;
  if (!event.target.value.trim()) {
    clearOriginSession();
    window.location.href = savedDashUrl(origin.dashId);
    return;
  }
  writeOriginSession({ dashId: origin.dashId, query: event.target.value.trim() });
  scheduleRouteSync();
});

document.addEventListener("toggle", event => {
  if (event.target instanceof HTMLDetailsElement && event.target.classList.contains("my-dashes-menu")) scheduleRouteSync();
}, true);

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
