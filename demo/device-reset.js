export const DASHGPT_STORAGE_PREFIX = "dashgpt.";
export const DEVICE_RESETTING_EVENT = "dashgpt:device-resetting";

function resetError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function storageKeys(storage) {
  if (!storage) return [];
  const keys = [];
  const seen = new Set();
  const length = Number(storage.length || 0);
  if (typeof storage.key === "function") {
    for (let index = 0; index < length; index += 1) {
      const key = storage.key(index);
      if (typeof key === "string" && !seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
  }
  if (!keys.length) {
    for (const key of Object.keys(storage)) {
      if (typeof key === "string" && !seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
  }
  return keys;
}

export function dashGptStorageKeys(storage, prefix = DASHGPT_STORAGE_PREFIX) {
  return storageKeys(storage).filter(key => key.startsWith(prefix));
}

export function clearDashGptStorage(storage, prefix = DASHGPT_STORAGE_PREFIX) {
  const keys = dashGptStorageKeys(storage, prefix);
  for (const key of keys) storage.removeItem(key);
  return keys;
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function ensureGithubDisconnected(fetchFn = globalThis.fetch?.bind(globalThis)) {
  if (typeof fetchFn !== "function") throw resetError("github_reset_status_unavailable", "GitHub storage status is unavailable.");

  let statusResponse;
  try {
    statusResponse = await fetchFn("/api/storage/github/status", { cache: "no-store", credentials: "same-origin" });
  } catch {
    throw resetError("github_reset_status_unavailable", "GitHub storage status is unavailable.");
  }
  if (!statusResponse?.ok) throw resetError("github_reset_status_unavailable", "GitHub storage status is unavailable.");
  const status = await readJsonResponse(statusResponse);
  if (!status?.paired) return { paired: false, disconnected: false };

  let disconnectResponse;
  try {
    disconnectResponse = await fetchFn("/api/storage/github/disconnect", { method: "POST", credentials: "same-origin" });
  } catch {
    throw resetError("github_reset_disconnect_failed", "GitHub storage could not be disconnected safely.");
  }
  if (!disconnectResponse?.ok) throw resetError("github_reset_disconnect_failed", "GitHub storage could not be disconnected safely.");
  return { paired: true, disconnected: true };
}

export function installDashGptStorageWriteBarrier(options = {}) {
  const StorageCtor = options.StorageCtor || globalThis.Storage;
  const prefix = options.prefix || DASHGPT_STORAGE_PREFIX;
  const prototype = StorageCtor?.prototype;
  const original = prototype?.setItem;
  if (!prototype || typeof original !== "function") {
    throw resetError("storage_barrier_unavailable", "DashGPT storage writes cannot be guarded safely.");
  }

  const guardedSetItem = function guardedDashGptSetItem(key, value) {
    if (String(key).startsWith(prefix)) return undefined;
    return original.call(this, key, value);
  };

  try {
    prototype.setItem = guardedSetItem;
  } catch {
    throw resetError("storage_barrier_unavailable", "DashGPT storage writes cannot be guarded safely.");
  }
  if (prototype.setItem !== guardedSetItem) {
    throw resetError("storage_barrier_unavailable", "DashGPT storage writes cannot be guarded safely.");
  }

  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    if (prototype.setItem === guardedSetItem) prototype.setItem = original;
  };
}

export async function performDeviceReset(options = {}) {
  const local = options.localStorage || globalThis.localStorage;
  const session = options.sessionStorage || globalThis.sessionStorage;
  const fetchFn = options.fetchFn || globalThis.fetch?.bind(globalThis);
  const dispatchReset = options.dispatchReset || (() => globalThis.dispatchEvent?.(new Event(DEVICE_RESETTING_EVENT)));
  const navigate = options.navigate || (path => globalThis.location?.replace?.(path));
  const installWriteBarrier = options.installWriteBarrier || (() => installDashGptStorageWriteBarrier());

  await ensureGithubDisconnected(fetchFn);

  let restoreWriteBarrier;
  try {
    restoreWriteBarrier = installWriteBarrier();
    if (typeof restoreWriteBarrier !== "function") {
      throw resetError("storage_barrier_unavailable", "DashGPT storage writes cannot be guarded safely.");
    }
    dispatchReset();
    const removedLocal = clearDashGptStorage(local);
    const removedSession = clearDashGptStorage(session);
    navigate("/demo/");
    return { removedLocal, removedSession };
  } catch (error) {
    restoreWriteBarrier?.();
    throw error;
  }
}

function locale() {
  const documentLanguage = String(globalThis.document?.documentElement?.lang || "").toLowerCase();
  const browserLanguage = String(globalThis.navigator?.language || "").toLowerCase();
  return documentLanguage.startsWith("ru") || browserLanguage.startsWith("ru") ? "ru" : "en";
}

const COPY = Object.freeze({
  en: Object.freeze({
    section: "Device data",
    summary: "Return this browser to DashGPT’s fresh-start state.",
    reset: "Reset this device",
    confirmEyebrow: "DEVICE RESET",
    confirmTitle: "Reset DashGPT on this device?",
    confirmCopy: "Cards, Dashes, the local Vault, search/gallery settings and import progress in this browser will be removed. Your Google Drive or GitHub Vault is not deleted. Reconnecting it later can restore that memory.",
    cancel: "Cancel",
    confirm: "Reset this device",
    working: "Resetting…",
    githubStatusError: "DashGPT could not verify whether GitHub storage is still connected. Nothing was deleted. Check the connection and try again.",
    githubDisconnectError: "GitHub storage could not be disconnected safely. Nothing was deleted. Try again after the connection is available.",
    barrierError: "DashGPT could not safely block in-flight local writes. Nothing was deleted. Reload this page and try again.",
    genericError: "DashGPT could not reset this device safely. Your local state was not reported as cleared. Try again."
  }),
  ru: Object.freeze({
    section: "Данные устройства",
    summary: "Вернуть этот браузер к начальному состоянию DashGPT.",
    reset: "Сбросить данные на этом устройстве",
    confirmEyebrow: "СБРОС УСТРОЙСТВА",
    confirmTitle: "Сбросить DashGPT на этом устройстве?",
    confirmCopy: "Карточки, Dash, локальный Vault, настройки поиска/галереи и прогресс импорта в этом браузере будут удалены. Vault в Google Drive или GitHub не удаляется. Если подключить его снова, старая память может восстановиться.",
    cancel: "Отмена",
    confirm: "Сбросить данные",
    working: "Сбрасываю…",
    githubStatusError: "DashGPT не смог проверить, подключено ли ещё хранилище GitHub. Ничего не удалено. Проверь подключение и попробуй ещё раз.",
    githubDisconnectError: "Не удалось безопасно отключить GitHub-хранилище. Ничего не удалено. Попробуй ещё раз, когда подключение будет доступно.",
    barrierError: "DashGPT не смог безопасно заблокировать фоновые записи. Ничего не удалено. Перезагрузи страницу и попробуй ещё раз.",
    genericError: "Не удалось безопасно сбросить DashGPT на этом устройстве. Состояние не считается очищенным. Попробуй ещё раз."
  })
});

function text(key) {
  const dictionary = COPY[locale()] || COPY.en;
  return dictionary[key] || COPY.en[key] || key;
}

function ensureResetStylesheet() {
  if (document.querySelector('link[data-dashgpt-device-reset]')) return;
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "/demo/device-reset.css";
  stylesheet.dataset.dashgptDeviceReset = "true";
  document.head.append(stylesheet);
}

function createResetDialog() {
  let dialog = document.querySelector("#deviceResetDialog");
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.id = "deviceResetDialog";
  dialog.className = "dialog device-reset-dialog";
  dialog.innerHTML = `
    <article>
      <p class="eyebrow">${text("confirmEyebrow")}</p>
      <h2>${text("confirmTitle")}</h2>
      <p class="muted device-reset-warning">${text("confirmCopy")}</p>
      <p id="deviceResetMessage" class="vault-note device-reset-message" aria-live="polite"></p>
      <div class="dialog-actions device-reset-confirm-actions">
        <button id="cancelDeviceResetButton" type="button" class="button ghost">${text("cancel")}</button>
        <button id="confirmDeviceResetButton" type="button" class="button device-reset-button">${text("confirm")}</button>
      </div>
    </article>`;
  document.body.append(dialog);
  return dialog;
}

function humanResetError(error) {
  if (error?.code === "github_reset_status_unavailable") return text("githubStatusError");
  if (error?.code === "github_reset_disconnect_failed") return text("githubDisconnectError");
  if (error?.code === "storage_barrier_unavailable") return text("barrierError");
  return text("genericError");
}

export function initializeDeviceReset() {
  ensureResetStylesheet();
  const storageArticle = document.querySelector("#storageDialog article");
  if (!storageArticle || document.querySelector("#deviceResetSection")) return;

  const section = document.createElement("section");
  section.id = "deviceResetSection";
  section.className = "device-reset-section";
  section.innerHTML = `
    <div class="device-reset-copy">
      <strong>${text("section")}</strong>
      <p>${text("summary")}</p>
    </div>
    <button id="resetDeviceButton" type="button" class="button ghost device-reset-button">${text("reset")}</button>`;
  const anchor = storageArticle.querySelector(".vault-next");
  if (anchor) anchor.insertAdjacentElement("afterend", section);
  else storageArticle.append(section);

  const dialog = createResetDialog();
  const openButton = section.querySelector("#resetDeviceButton");
  const cancelButton = dialog.querySelector("#cancelDeviceResetButton");
  const confirmButton = dialog.querySelector("#confirmDeviceResetButton");
  const message = dialog.querySelector("#deviceResetMessage");

  openButton?.addEventListener("click", () => {
    message.textContent = "";
    confirmButton.disabled = false;
    confirmButton.textContent = text("confirm");
    dialog.showModal();
  });
  cancelButton?.addEventListener("click", () => dialog.close());
  confirmButton?.addEventListener("click", async () => {
    if (confirmButton.disabled) return;
    confirmButton.disabled = true;
    cancelButton.disabled = true;
    confirmButton.textContent = text("working");
    message.textContent = "";
    try {
      await performDeviceReset();
    } catch (error) {
      message.textContent = humanResetError(error);
      confirmButton.disabled = false;
      cancelButton.disabled = false;
      confirmButton.textContent = text("confirm");
    }
  });
}

if (typeof document !== "undefined") initializeDeviceReset();
