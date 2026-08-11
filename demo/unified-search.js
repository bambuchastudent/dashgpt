function isPersonalHome() {
  return /^\/demo\/?$/.test(window.location.pathname);
}

function mountUnifiedSearch() {
  if (!isPersonalHome()) return;
  const context = document.querySelector("#unifiedDashContext");
  const input = document.querySelector("#searchInput");
  const label = input?.closest("label");
  if (!context || !input || !label || context.parentElement?.querySelector("#unifiedPrimarySearch")) return;

  const row = document.createElement("section");
  row.id = "unifiedPrimarySearch";
  row.className = "unified-primary-search";
  row.setAttribute("aria-label", label.querySelector("span")?.textContent?.trim() || "Search");

  // Move—not clone—the existing search label/input so all current app listeners,
  // semantic ranking, keyboard behavior, and saved UI state remain authoritative.
  row.append(label);
  context.insertAdjacentElement("afterend", row);
}

function scheduleMount() {
  queueMicrotask(mountUnifiedSearch);
  setTimeout(mountUnifiedSearch, 40);
  setTimeout(mountUnifiedSearch, 160);
}

if (isPersonalHome()) {
  const dashboard = document.querySelector("#dashboardView");
  if (dashboard) {
    new MutationObserver(scheduleMount).observe(dashboard, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  }
  window.addEventListener("popstate", scheduleMount);
  window.addEventListener("load", scheduleMount, { once: true });
  scheduleMount();
}
