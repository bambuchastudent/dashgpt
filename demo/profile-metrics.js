import {
  loadBrowserVault,
  materializeResults,
  saveBrowserVault
} from "./vault.js";

export const PROFILE_METRICS_KIND = "project-metrics";
export const PROFILE_METRICS_COLLAPSED_KEY = "dashgpt.profile.metrics.collapsed.v1";
const VAULT_UPDATED_EVENT = "dashgpt:chatgpt-import-vault-updated";

const COPY = {
  en: {
    profile: "Profile",
    title: "Project metrics",
    hide: "Hide stats",
    show: "Show stats",
    tokens: "Tokens burned",
    tokenHint: "Estimated from visible imported conversation text; not provider billing data.",
    spent: "Spent",
    donated: "Donated",
    edit: "Edit money",
    close: "Close",
    save: "Save",
    cancel: "Cancel",
    currency: "Currency",
    spentInput: "Money spent",
    donatedInput: "Money donated",
    invalidMoney: "Enter non-negative amounts and a three-letter currency code.",
    noTrackedTokens: "No tracked imports yet"
  },
  ru: {
    profile: "Профиль",
    title: "Проект",
    hide: "Скрыть статистику",
    show: "Показать статистику",
    tokens: "Проебано токенов",
    tokenHint: "Оценка по видимому тексту импортированных разговоров, не данные биллинга провайдера.",
    spent: "Потрачено",
    donated: "Задоначено",
    edit: "Изменить деньги",
    close: "Закрыть",
    save: "Сохранить",
    cancel: "Отмена",
    currency: "Валюта",
    spentInput: "Потрачено",
    donatedInput: "Задоначено",
    invalidMoney: "Введите неотрицательные суммы и трёхбуквенный код валюты.",
    noTrackedTokens: "Пока нет учтённых импортов"
  }
};

function localeKey() {
  return String(globalThis.navigator?.language || "en").toLowerCase().startsWith("ru") ? "ru" : "en";
}

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function randomId(prefix) {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${suffix}`;
}

export function sanitizeProjectMetricsRevision(revision) {
  if (!isObject(revision) || revision.kind !== PROFILE_METRICS_KIND) return null;
  const profileRevisionId = String(revision.profileRevisionId || "").trim();
  const currency = String(revision.currency || "").trim().toUpperCase();
  const spentMinor = Number(revision.spentMinor);
  const donatedMinor = Number(revision.donatedMinor);
  const updatedAt = String(revision.updatedAt || "");
  if (!profileRevisionId || !/^[A-Z]{3}$/.test(currency)) return null;
  if (!Number.isSafeInteger(spentMinor) || spentMinor < 0) return null;
  if (!Number.isSafeInteger(donatedMinor) || donatedMinor < 0) return null;
  if (!Number.isFinite(Date.parse(updatedAt))) return null;
  const baseRevisionId = revision.baseRevisionId ? String(revision.baseRevisionId) : null;
  return {
    schemaVersion: 1,
    profileRevisionId,
    kind: PROFILE_METRICS_KIND,
    baseRevisionId,
    currency,
    spentMinor,
    donatedMinor,
    updatedAt
  };
}

export function currentProjectMetrics(vault) {
  const revisions = Array.isArray(vault?.profileRevisions)
    ? vault.profileRevisions.map(sanitizeProjectMetricsRevision).filter(Boolean)
    : [];
  revisions.sort((left, right) => {
    const time = Date.parse(left.updatedAt) - Date.parse(right.updatedAt);
    return time || left.profileRevisionId.localeCompare(right.profileRevisionId);
  });
  return revisions.at(-1) || null;
}

export function appendProjectMetricsRevision(vault, input, options = {}) {
  if (!vault || !Array.isArray(vault.profileRevisions)) throw new Error("Vault profile revisions are unavailable");
  const previous = currentProjectMetrics(vault);
  const updatedAt = options.updatedAt || new Date().toISOString();
  const revision = sanitizeProjectMetricsRevision({
    schemaVersion: 1,
    profileRevisionId: options.profileRevisionId || randomId("profile_metrics"),
    kind: PROFILE_METRICS_KIND,
    baseRevisionId: previous?.profileRevisionId || null,
    currency: input.currency,
    spentMinor: input.spentMinor,
    donatedMinor: input.donatedMinor,
    updatedAt
  });
  if (!revision) throw new Error("Invalid project metrics revision");
  const sameId = vault.profileRevisions.find(item => item?.profileRevisionId === revision.profileRevisionId);
  if (sameId && JSON.stringify(sameId) !== JSON.stringify(revision)) throw new Error("Profile revision integrity conflict");
  if (!sameId) vault.profileRevisions.push(revision);
  vault.updatedAt = updatedAt;
  return revision;
}

function validUsage(value) {
  if (!isObject(value)) return null;
  const tokenCount = Number(value.tokenCount);
  const tokenCountKind = String(value.tokenCountKind || "");
  if (!Number.isSafeInteger(tokenCount) || tokenCount < 0) return null;
  if (!["estimated", "reported"].includes(tokenCountKind)) return null;
  return { tokenCount, tokenCountKind };
}

export function projectTokenMetrics(results) {
  let tokenCount = 0;
  let countedCards = 0;
  let estimated = false;
  for (const card of Array.isArray(results) ? results : []) {
    const usage = validUsage(card?.result?.usage);
    if (!usage) continue;
    if (tokenCount > Number.MAX_SAFE_INTEGER - usage.tokenCount) continue;
    tokenCount += usage.tokenCount;
    countedCards += 1;
    if (usage.tokenCountKind === "estimated") estimated = true;
  }
  return { tokenCount, countedCards, estimated };
}

export function currencyFractionDigits(currency) {
  try {
    const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
    return Math.max(0, Math.min(3, Number(digits)));
  } catch {
    return 2;
  }
}

export function parseMoneyToMinor(value, currency) {
  const code = String(currency || "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return null;
  const digits = currencyFractionDigits(code);
  const normalized = String(value ?? "").trim().replace(",", ".");
  const match = normalized.match(new RegExp(`^(\\d+)(?:\\.(\\d{1,${Math.max(1, digits)}}))?$`));
  if (!match) return null;
  if (digits === 0 && match[2]) return null;
  const fraction = digits ? String(match[2] || "").padEnd(digits, "0") : "";
  try {
    const multiplier = BigInt(10 ** digits);
    const minor = BigInt(match[1]) * multiplier + BigInt(fraction || "0");
    if (minor > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return Number(minor);
  } catch {
    return null;
  }
}

export function formatMinorAmount(minor, currency, locale = localeKey()) {
  const code = /^[A-Z]{3}$/.test(String(currency || "")) ? currency : "EUR";
  const digits = currencyFractionDigits(code);
  const divisor = 10 ** digits;
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    style: "currency",
    currency: code,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(Number(minor || 0) / divisor);
}

function editableAmount(minor, currency) {
  const digits = currencyFractionDigits(currency);
  const divisor = 10 ** digits;
  return (Number(minor || 0) / divisor).toFixed(digits);
}

function formatTokenCount(count, locale) {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 0 }).format(count);
}

function loadProjection() {
  const loaded = loadBrowserVault(globalThis.localStorage);
  return {
    loaded,
    cards: materializeResults(loaded.vault),
    money: currentProjectMetrics(loaded.vault) || {
      currency: "EUR",
      spentMinor: 0,
      donatedMinor: 0
    }
  };
}

function metricMarkup(label, value, extra = "") {
  return `<div class="profile-metric"><span>${label}</span><strong>${value}</strong>${extra}</div>`;
}

function mountProfileMetrics() {
  if (typeof document === "undefined" || document.querySelector("[data-profile-metrics]")) return;
  const topActions = document.querySelector(".topbar-actions, .top-actions");
  if (!topActions) return;
  const locale = localeKey();
  const copy = COPY[locale] || COPY.en;

  const shell = document.createElement("div");
  shell.className = "profile-metrics-shell";
  shell.dataset.profileMetrics = "true";
  shell.innerHTML = `
    <button class="profile-metrics-trigger" type="button" aria-expanded="false">${copy.profile}</button>
    <section class="profile-metrics-panel" hidden aria-label="${copy.title}">
      <div class="profile-metrics-heading">
        <strong>${copy.title}</strong>
        <div>
          <button class="profile-metrics-collapse" type="button" aria-expanded="true"></button>
          <button class="profile-metrics-close" type="button" aria-label="${copy.close}">×</button>
        </div>
      </div>
      <div class="profile-metrics-grid"></div>
      <button class="profile-metrics-edit" type="button">${copy.edit}</button>
      <form class="profile-metrics-form" hidden novalidate>
        <label>${copy.currency}<input name="currency" maxlength="3" autocomplete="off" inputmode="text"></label>
        <label>${copy.spentInput}<input name="spent" autocomplete="off" inputmode="decimal"></label>
        <label>${copy.donatedInput}<input name="donated" autocomplete="off" inputmode="decimal"></label>
        <p class="profile-metrics-error" role="alert" hidden>${copy.invalidMoney}</p>
        <div class="profile-metrics-form-actions">
          <button type="submit">${copy.save}</button>
          <button type="button" data-cancel>${copy.cancel}</button>
        </div>
      </form>
    </section>`;
  topActions.prepend(shell);

  const trigger = shell.querySelector(".profile-metrics-trigger");
  const panel = shell.querySelector(".profile-metrics-panel");
  const close = shell.querySelector(".profile-metrics-close");
  const collapse = shell.querySelector(".profile-metrics-collapse");
  const grid = shell.querySelector(".profile-metrics-grid");
  const edit = shell.querySelector(".profile-metrics-edit");
  const form = shell.querySelector(".profile-metrics-form");
  const error = shell.querySelector(".profile-metrics-error");
  let collapsed = globalThis.localStorage?.getItem?.(PROFILE_METRICS_COLLAPSED_KEY) === "1";

  function applyCollapseState() {
    grid.hidden = collapsed;
    edit.hidden = collapsed;
    if (collapsed) form.hidden = true;
    collapse.textContent = collapsed ? copy.show : copy.hide;
    collapse.setAttribute("aria-expanded", String(!collapsed));
    shell.classList.toggle("is-collapsed", collapsed);
  }

  function refresh() {
    const projection = loadProjection();
    const tokens = projectTokenMetrics(projection.cards);
    const tokenValue = tokens.countedCards
      ? `${tokens.estimated ? "≈ " : ""}${formatTokenCount(tokens.tokenCount, locale)}`
      : "0";
    grid.innerHTML = [
      metricMarkup(copy.tokens, tokenValue, `<small title="${copy.tokenHint}">${tokens.countedCards ? `${tokens.countedCards} cards` : copy.noTrackedTokens}</small>`),
      metricMarkup(copy.spent, formatMinorAmount(projection.money.spentMinor, projection.money.currency, locale)),
      metricMarkup(copy.donated, formatMinorAmount(projection.money.donatedMinor, projection.money.currency, locale))
    ].join("");
    form.elements.currency.value = projection.money.currency;
    form.elements.spent.value = editableAmount(projection.money.spentMinor, projection.money.currency);
    form.elements.donated.value = editableAmount(projection.money.donatedMinor, projection.money.currency);
  }

  function setOpen(open) {
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    if (open) refresh();
  }

  trigger.addEventListener("click", () => setOpen(panel.hidden));
  close.addEventListener("click", () => setOpen(false));
  collapse.addEventListener("click", () => {
    collapsed = !collapsed;
    globalThis.localStorage?.setItem?.(PROFILE_METRICS_COLLAPSED_KEY, collapsed ? "1" : "0");
    applyCollapseState();
  });
  edit.addEventListener("click", () => {
    form.hidden = false;
    error.hidden = true;
    form.elements.spent.focus();
  });
  form.querySelector("[data-cancel]").addEventListener("click", () => {
    form.hidden = true;
    error.hidden = true;
    refresh();
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    const currency = String(form.elements.currency.value || "").trim().toUpperCase();
    const spentMinor = parseMoneyToMinor(form.elements.spent.value, currency);
    const donatedMinor = parseMoneyToMinor(form.elements.donated.value, currency);
    if (spentMinor == null || donatedMinor == null || !/^[A-Z]{3}$/.test(currency)) {
      error.hidden = false;
      return;
    }
    const loaded = loadBrowserVault(globalThis.localStorage);
    appendProjectMetricsRevision(loaded.vault, { currency, spentMinor, donatedMinor });
    saveBrowserVault(globalThis.localStorage, loaded.vault);
    error.hidden = true;
    form.hidden = true;
    refresh();
  });

  globalThis.addEventListener?.("storage", event => {
    if (!event.key || event.key === "dashgpt.demo.vault.v1") refresh();
  });
  globalThis.addEventListener?.(VAULT_UPDATED_EVENT, refresh);
  document.addEventListener("click", event => {
    if (!panel.hidden && !shell.contains(event.target)) setOpen(false);
  });

  applyCollapseState();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountProfileMetrics, { once: true });
  else mountProfileMetrics();
}
