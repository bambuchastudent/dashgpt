import { resolveUnifiedDashLocale, unifiedDashText } from "./unified-dashboard.js";

function isPersonalHome() {
  return /^\/demo\/?$/.test(window.location.pathname) && new URLSearchParams(window.location.search).get("showcase") !== "1";
}

function locale() {
  return resolveUnifiedDashLocale({
    documentLanguage: document.documentElement?.lang,
    browserLanguage: navigator.language
  });
}

function t(key, values = {}) {
  return unifiedDashText(key, values, { locale: locale() });
}

function applyEmptyMyDashContext() {
  if (!isPersonalHome()) return;
  const welcome = document.querySelector("#publicWelcome");
  // Feature 20 makes the canonical dashboard visible for a clean user because
  // the default ChatGPT-import operation is itself a card. In that case the
  // unified dashboard already owns the My Dash context; do not render a second
  // empty-shell header inside onboarding.
  if (!welcome || document.querySelector("#unifiedDashContext") || document.querySelector("#emptyMyDashContext")) return;

  const context = document.createElement("section");
  context.id = "emptyMyDashContext";
  context.className = "unified-dash-context empty-my-dash-context";

  const copy = document.createElement("div");
  copy.className = "unified-context-copy";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = t("allCards");

  const title = document.createElement("h2");
  title.textContent = t("myDash");

  const meta = document.createElement("p");
  meta.className = "muted";
  meta.textContent = t("allMeta", { count: 0 });

  copy.append(eyebrow, title, meta);
  context.append(copy);
  welcome.prepend(context);
}

if (isPersonalHome()) {
  const shell = document.querySelector(".shell");
  if (shell) {
    new MutationObserver(() => queueMicrotask(applyEmptyMyDashContext))
      .observe(shell, { childList: true, subtree: true });
  }
  queueMicrotask(applyEmptyMyDashContext);
}
