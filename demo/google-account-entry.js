function isPersonalHome() {
  const params = new URLSearchParams(window.location.search);
  return /^\/demo\/?$/.test(window.location.pathname) && params.get("showcase") !== "1";
}

function russian() {
  return String(navigator.language || "").toLowerCase().startsWith("ru");
}

function visible(node) {
  return Boolean(node && !node.hidden);
}

function setButtonState(button, { hidden, disabled, text, title = "" }) {
  if (button.hidden !== hidden) button.hidden = hidden;
  if (button.disabled !== disabled) button.disabled = disabled;
  if (text !== undefined && button.textContent !== text) button.textContent = text;
  if (button.title !== title) button.title = title;
}

function ensureAccountButton() {
  if (!isPersonalHome()) return null;
  const existing = document.querySelector("#googleAccountButton");
  if (existing) return existing;
  const actions = document.querySelector(".topbar-actions");
  const storage = document.querySelector("#storageButton");
  if (!actions || !storage) return null;
  const button = document.createElement("button");
  button.id = "googleAccountButton";
  button.className = "button ghost google-account-button";
  button.type = "button";
  button.hidden = true;
  actions.insertBefore(button, storage);
  button.addEventListener("click", () => {
    const canonical = document.querySelector("#connectGoogleDriveButton");
    if (visible(canonical) && !canonical.disabled) {
      // Keep the canonical Google token request inside this original user click.
      // Safari loses popup/user activation if an awaited task is inserted here.
      canonical.click();
      queueMicrotask(refreshAccountButton);
      return;
    }
    storage.click();
  });
  return button;
}

function refreshAccountButton() {
  const button = ensureAccountButton();
  if (!button) return;
  const canonical = document.querySelector("#connectGoogleDriveButton");
  const disconnect = document.querySelector("#disconnectGoogleDriveButton");
  const status = document.querySelector("#googleDriveStatus")?.textContent || "";

  const unavailable = /not available on this deployment/i.test(status);
  const preparing = /checking google|preparing google/i.test(status);
  if (unavailable || preparing || (!canonical && !disconnect)) {
    setButtonState(button, { hidden: true, disabled: true, text: "", title: "" });
    return;
  }

  const connected = visible(disconnect);
  const reconnect = visible(canonical) && /reconnect/i.test(canonical.textContent || "");

  if (connected && !reconnect) {
    setButtonState(button, {
      hidden: false,
      disabled: false,
      text: "Google ✓",
      title: russian() ? "Google Vault подключён" : "Google Vault connected"
    });
    return;
  }

  if (canonical?.disabled) {
    setButtonState(button, { hidden: false, disabled: true, text: "Google…", title: status });
    return;
  }

  setButtonState(button, {
    hidden: false,
    disabled: false,
    text: reconnect
      ? (russian() ? "Переподключить Google" : "Reconnect Google")
      : (russian() ? "Войти через Google" : "Continue with Google"),
    title: status
  });
}

export function initializeGoogleAccountEntry() {
  if (typeof document === "undefined" || !isPersonalHome()) return;
  ensureAccountButton();
  refreshAccountButton();
  const provider = document.querySelector("#googleDriveStorageProvider");
  if (provider) {
    new MutationObserver(() => queueMicrotask(refreshAccountButton))
      .observe(provider, { childList: true, subtree: true, attributes: true, characterData: true });
  }
}

if (typeof document !== "undefined") initializeGoogleAccountEntry();
