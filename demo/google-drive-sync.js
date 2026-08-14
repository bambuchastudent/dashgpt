import {
  GOOGLE_DRIVE_SCOPE,
  clearGoogleDriveBinding,
  loadGoogleDriveBinding,
  saveGoogleDriveBinding,
  syncGoogleDriveVault
} from "./google-drive-storage.js";
import { formatGoogleAccountIdentity, loadGoogleDriveAccountIdentity } from "./google-account-identity.js";
import { loadBrowserVault, saveBrowserVault } from "./vault.js";

const GIS_SRC = "https://accounts.google.com/gsi/client";
const AUTO_SYNC_DELAY_MS = 1400;

let config = null;
let tokenState = null;
let googleAccountIdentity = null;
let googleAccountIdentityUnavailable = false;
let githubPaired = false;
let syncing = false;
let syncTimer = null;
let pendingMigration = null;
let gisPromise = null;
let gisLoadError = null;

function $(selector) { return document.querySelector(selector); }
function googleSignInReady() { return Boolean(globalThis.google?.accounts?.oauth2); }

function ensureProviderUi() {
  if ($("#googleDriveStorageProvider")) return;
  const github = $(".github-storage-provider");
  if (!github) return;
  const section = document.createElement("section");
  section.id = "googleDriveStorageProvider";
  section.className = "storage-provider google-drive-storage-provider";
  section.setAttribute("aria-labelledby", "google-drive-storage-title");
  section.innerHTML = `
    <span class="provider-dot" aria-hidden="true"></span>
    <div class="provider-content">
      <strong id="google-drive-storage-title">Google account</strong>
      <p id="googleDriveStatus">Checking Google account…</p>
      <p id="googleDriveIdentity" class="storage-provider-identity" hidden></p>
      <div class="dialog-actions compact-actions google-drive-actions">
        <button id="connectGoogleDriveButton" class="button primary" type="button">Continue with Google</button>
        <button id="syncGoogleDriveButton" class="button primary" type="button" hidden>Sync now</button>
        <button id="disconnectGoogleDriveButton" class="button ghost" type="button" hidden>Disconnect Google</button>
      </div>
      <div id="googleDriveMigration" class="google-drive-migration" hidden>
        <p id="googleDriveMigrationText"></p>
        <div class="dialog-actions compact-actions">
          <button id="mergeGoogleDriveButton" class="button primary" type="button">Merge this device into my Google Vault</button>
          <button id="cancelGoogleDriveMergeButton" class="button ghost" type="button">Keep separate</button>
        </div>
      </div>
    </div>`;
  github.insertAdjacentElement("afterend", section);

  $("#connectGoogleDriveButton")?.addEventListener("click", connectGoogleDrive);
  $("#syncGoogleDriveButton")?.addEventListener("click", () => syncNow({ allowMigration: false }));
  $("#disconnectGoogleDriveButton")?.addEventListener("click", disconnectGoogleDrive);
  $("#mergeGoogleDriveButton")?.addEventListener("click", () => syncNow({ allowMigration: true }));
  $("#cancelGoogleDriveMergeButton")?.addEventListener("click", () => {
    pendingMigration = null;
    $("#googleDriveMigration").hidden = true;
    render("Your local memory and Google Vault stay separate. Nothing was changed.");
  });
}

async function loadConfig() {
  try {
    const response = await fetch("/api/storage/google/config", { cache: "no-store" });
    if (!response.ok) throw new Error(`config ${response.status}`);
    const payload = await response.json();
    config = payload?.scope === GOOGLE_DRIVE_SCOPE ? payload : { configured: false, clientId: null, scope: GOOGLE_DRIVE_SCOPE };
  } catch {
    config = { configured: false, clientId: null, scope: GOOGLE_DRIVE_SCOPE };
  }
  return config;
}

async function refreshGithubStatus() {
  try {
    const response = await fetch("/api/storage/github/status", { cache: "no-store" });
    const payload = response.ok ? await response.json() : null;
    githubPaired = Boolean(payload?.paired);
  } catch {
    githubPaired = false;
  }
  applyProviderExclusivity();
  return githubPaired;
}

function binding() {
  return loadGoogleDriveBinding(globalThis.localStorage);
}

function tokenValid() {
  return Boolean(tokenState?.accessToken && tokenState.expiresAt > Date.now() + 30_000);
}

function clearGoogleAccountIdentity() {
  googleAccountIdentity = null;
  googleAccountIdentityUnavailable = false;
}

function renderGoogleAccountIdentity() {
  const node = $("#googleDriveIdentity");
  if (!node) return;
  if (!tokenValid()) {
    node.hidden = true;
    node.textContent = "";
    return;
  }
  const label = formatGoogleAccountIdentity(googleAccountIdentity);
  if (label) {
    node.hidden = false;
    node.textContent = `Authorized as ${label}`;
    return;
  }
  if (googleAccountIdentityUnavailable) {
    node.hidden = false;
    node.textContent = "Google account details are unavailable for this session.";
    return;
  }
  node.hidden = true;
  node.textContent = "";
}

async function refreshGoogleAccountIdentity() {
  if (!tokenValid()) {
    clearGoogleAccountIdentity();
    renderGoogleAccountIdentity();
    return null;
  }
  try {
    googleAccountIdentity = await loadGoogleDriveAccountIdentity({ token: tokenState.accessToken });
    googleAccountIdentityUnavailable = !googleAccountIdentity;
  } catch (error) {
    if (String(error?.code || "") === "google_reconnect_required") throw error;
    googleAccountIdentity = null;
    googleAccountIdentityUnavailable = true;
  }
  renderGoogleAccountIdentity();
  return googleAccountIdentity;
}

function setStorageBadge(label, state = "unsynced") {
  const button = $("#storageButton");
  if (!button) return;
  button.textContent = label;
  button.dataset.state = state;
}

function applyProviderExclusivity() {
  const googleBinding = binding();
  const githubConnect = $("#connectGithubButton");
  if (githubConnect) {
    if (googleBinding) {
      githubConnect.disabled = true;
      githubConnect.title = "Disconnect Google before switching remote storage provider.";
    } else if (!githubPaired) {
      githubConnect.removeAttribute("title");
    }
  }
}

function render(message = "") {
  ensureProviderUi();
  const status = $("#googleDriveStatus");
  const connect = $("#connectGoogleDriveButton");
  const sync = $("#syncGoogleDriveButton");
  const disconnect = $("#disconnectGoogleDriveButton");
  const migration = $("#googleDriveMigration");
  if (!status || !connect || !sync || !disconnect || !migration) return;

  const googleBinding = binding();
  applyProviderExclusivity();
  renderGoogleAccountIdentity();

  if (!config?.configured) {
    status.textContent = message || "Google sign-in is not available on this deployment yet. DashGPT keeps working locally on this device.";
    connect.hidden = true;
    connect.disabled = true;
    sync.hidden = true;
    disconnect.hidden = true;
    migration.hidden = true;
    return;
  }

  if (githubPaired && !googleBinding) {
    status.textContent = message || "GitHub sync is active. Disconnect GitHub before using Google-backed DashGPT memory on this browser.";
    connect.hidden = false;
    connect.disabled = true;
    connect.textContent = "Continue with Google";
    sync.hidden = true;
    disconnect.hidden = true;
    migration.hidden = true;
    return;
  }

  if (googleBinding && githubPaired) {
    status.textContent = message || "Both remote bindings were detected. Disconnect one provider before syncing again.";
    connect.hidden = true;
    sync.hidden = false;
    sync.disabled = true;
    disconnect.hidden = false;
    setStorageBadge("LOCAL + GOOGLE DRIVE · UNSYNCED", "unsynced");
    return;
  }

  if ((!googleBinding || !tokenValid()) && !googleSignInReady()) {
    status.textContent = message || (gisLoadError
      ? "Google sign-in could not be prepared. Retry loading it; your local memory is unchanged."
      : "Preparing Google sign-in…");
    connect.hidden = false;
    connect.disabled = !gisLoadError;
    connect.textContent = gisLoadError ? "Retry Google sign-in" : "Preparing Google sign-in…";
    sync.hidden = true;
    disconnect.hidden = !googleBinding;
    migration.hidden = true;
    if (googleBinding) setStorageBadge("LOCAL + GOOGLE DRIVE · RECONNECT", "unsynced");
    return;
  }

  if (!googleBinding) {
    status.textContent = message || "Continue with Google to keep this DashGPT memory in your Google Drive and open the same cards on your other devices.";
    connect.hidden = false;
    connect.disabled = false;
    connect.textContent = "Continue with Google";
    sync.hidden = true;
    disconnect.hidden = true;
    migration.hidden = true;
    return;
  }

  disconnect.hidden = false;
  if (syncing) {
    status.textContent = message || "Syncing this device with your Google-backed DashGPT memory…";
    connect.hidden = true;
    sync.hidden = false;
    sync.disabled = true;
    setStorageBadge("LOCAL + GOOGLE DRIVE · SYNCING", "unsynced");
    return;
  }

  if (!tokenValid()) {
    tokenState = null;
    clearGoogleAccountIdentity();
    renderGoogleAccountIdentity();
    status.textContent = message || "Your Google Vault is linked to this browser. Reconnect Google when you want to sync again; cards already on this device remain available offline.";
    connect.hidden = false;
    connect.disabled = false;
    connect.textContent = "Reconnect Google";
    sync.hidden = true;
    setStorageBadge("LOCAL + GOOGLE DRIVE · RECONNECT", "unsynced");
    return;
  }

  status.textContent = message || "This browser is using your Google-backed DashGPT Vault. Local cards stay available offline and sync to the same Vault.";
  connect.hidden = true;
  sync.hidden = false;
  sync.disabled = false;
}

function loadGisScript() {
  if (googleSignInReady()) {
    gisLoadError = null;
    return Promise.resolve();
  }
  if (gisPromise) return gisPromise;
  gisLoadError = null;
  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("Google sign-in could not be loaded.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", () => {
      script.remove();
      reject(new Error("Google sign-in could not be loaded."));
    }, { once: true });
    document.head.append(script);
  }).then(() => {
    gisLoadError = null;
  }).catch(error => {
    gisLoadError = error;
    gisPromise = null;
    throw error;
  });
  return gisPromise;
}

function prepareGoogleSignIn() {
  if (!config?.configured || (githubPaired && !binding()) || googleSignInReady()) {
    render();
    return;
  }
  render("Preparing Google sign-in…");
  loadGisScript()
    .then(() => render())
    .catch(() => render("Google sign-in could not be prepared. Press Retry Google sign-in to try loading it again."));
}

function requestAccessToken() {
  return new Promise((resolve, reject) => {
    const oauth2 = globalThis.google?.accounts?.oauth2;
    if (!oauth2) return reject(new Error("Google sign-in is not ready yet."));
    const client = oauth2.initTokenClient({
      client_id: config.clientId,
      scope: GOOGLE_DRIVE_SCOPE,
      callback(response) {
        if (!response || response.error || !response.access_token) {
          const error = new Error("Google authorization was not completed.");
          error.code = "google_authorization_not_completed";
          reject(error);
          return;
        }
        resolve({
          accessToken: response.access_token,
          expiresAt: Date.now() + Math.max(60, Number(response.expires_in || 3600)) * 1000
        });
      },
      error_callback() {
        const error = new Error("Google authorization popup was closed or unavailable.");
        error.code = "google_authorization_not_completed";
        reject(error);
      }
    });
    client.requestAccessToken({ prompt: "consent" });
  });
}

function connectGoogleDrive() {
  if (!config?.configured) return render();
  const googleBinding = binding();
  if (githubPaired && !googleBinding) return render();

  if (!googleSignInReady()) {
    gisLoadError = null;
    render("Preparing Google sign-in…");
    loadGisScript()
      .then(() => render("Google sign-in is ready. Press Continue with Google again."))
      .catch(() => render("Google sign-in could not be prepared. Press Retry Google sign-in to try loading it again."));
    return;
  }

  let accessRequest;
  try {
    // Safari is strict about popup/user-activation lifetime. Keep this call in
    // the original click task: do not await provider status, timers, or script
    // loading before requestAccessToken().
    accessRequest = requestAccessToken();
  } catch (error) {
    renderHumanError(error);
    return;
  }

  accessRequest
    .then(async nextToken => {
      tokenState = nextToken;
      clearGoogleAccountIdentity();
      await refreshGithubStatus();
      if (githubPaired && !binding()) {
        tokenState = null;
        clearGoogleAccountIdentity();
        render("GitHub sync became active before Google could bootstrap your Vault. Disconnect GitHub, then continue with Google again.");
        return;
      }
      try {
        await refreshGoogleAccountIdentity();
      } catch (error) {
        renderHumanError(error);
        return;
      }
      await syncNow({ allowMigration: false });
    })
    .catch(renderHumanError);
}

function migrationMessage(result) {
  const local = result.local || {};
  const remote = result.remote || {};
  return `This device has ${local.cards || 0} local cards in Vault ${local.vaultId || "unknown"}, while your Google account has ${remote.cards || 0} cards in Vault ${remote.vaultId || "unknown"}. Merge this device into your Google Vault? Neither side changes until you confirm.`;
}

async function syncNow({ allowMigration = false } = {}) {
  if (!tokenValid()) return render("Reconnect Google before syncing. Local changes are safe.");
  await refreshGithubStatus();
  if (githubPaired) return render("GitHub sync is active. Disconnect GitHub before using Google-backed DashGPT memory on this browser.");
  if (syncing) return;
  syncing = true;
  render();
  try {
    const { vault: localVault } = loadBrowserVault(globalThis.localStorage);
    const localBefore = JSON.stringify(localVault);
    const result = await syncGoogleDriveVault({
      token: tokenState.accessToken,
      localVault,
      allowMigration
    });
    if (result.action === "migration_required") {
      pendingMigration = result;
      const migration = $("#googleDriveMigration");
      const text = $("#googleDriveMigrationText");
      if (text) text.textContent = migrationMessage(result);
      if (migration) migration.hidden = false;
      render("This device and your Google account contain different DashGPT Vaults. Choose whether to merge them; nothing has been written yet.");
      return;
    }

    pendingMigration = null;
    $("#googleDriveMigration")?.setAttribute("hidden", "");
    saveBrowserVault(globalThis.localStorage, result.vault);
    saveGoogleDriveBinding(globalThis.localStorage, result.binding);
    const localChanged = localBefore !== JSON.stringify(result.vault);
    const copy = {
      created: "Your Google Vault was created from this device and is synced.",
      adopted: "Your existing Google Vault was loaded on this device.",
      migrated: "This device was merged into your Google Vault.",
      sync: result.remoteChanged ? "Local and Google Vault memory merged and synced." : "This device and your Google Vault are already in sync."
    }[result.action] || "Google Vault sync complete.";
    setStorageBadge("LOCAL + GOOGLE DRIVE · SYNCED", "synced");
    render(copy);
    if (localChanged) setTimeout(() => window.location.reload(), 120);
  } catch (error) {
    renderHumanError(error);
  } finally {
    syncing = false;
    if (binding() && tokenValid()) render($("#googleDriveStatus")?.textContent || "");
  }
}

function renderHumanError(error) {
  syncing = false;
  const code = String(error?.code || "");
  if (code === "google_reconnect_required") {
    tokenState = null;
    clearGoogleAccountIdentity();
    render("Google authorization expired. Reconnect to sync; local changes are safe on this device.");
    return;
  }
  if (code === "google_drive_rate_limited") return render("Google Drive is busy right now. Local changes are safe; try Sync now again later.");
  if (code === "google_drive_unavailable") return render("Google Drive is temporarily unavailable. Local changes are safe and remain unsynced.");
  if (code === "google_drive_invalid_vault") return render("The Google Vault file is not valid DashGPT Vault data. Local data was not changed.");
  if (code === "google_authorization_not_completed") return render("Google authorization was not completed. Nothing was changed.");
  render("Google Vault sync could not complete. Local data remains available on this device; retry before assuming the remote copy is current.");
}

function disconnectGoogleDrive() {
  clearTimeout(syncTimer);
  syncTimer = null;
  tokenState = null;
  clearGoogleAccountIdentity();
  pendingMigration = null;
  clearGoogleDriveBinding(globalThis.localStorage);
  $("#googleDriveMigration")?.setAttribute("hidden", "");
  renderGoogleAccountIdentity();
  const githubConnect = $("#connectGithubButton");
  if (githubConnect && !githubPaired) {
    githubConnect.disabled = false;
    githubConnect.removeAttribute("title");
  }
  setStorageBadge("LOCAL · NOT SYNCED", "unpaired");
  render("Google was disconnected from this browser. Your local memory and Google Vault were both left intact.");
}

function scheduleSync() {
  if (!binding() || syncing || githubPaired) return;
  if (!tokenValid()) {
    clearGoogleAccountIdentity();
    renderGoogleAccountIdentity();
    setStorageBadge("LOCAL + GOOGLE DRIVE · RECONNECT", "unsynced");
    return;
  }
  clearTimeout(syncTimer);
  setStorageBadge("LOCAL + GOOGLE DRIVE · UNSYNCED", "unsynced");
  syncTimer = setTimeout(() => syncNow({ allowMigration: false }), AUTO_SYNC_DELAY_MS);
}

function installLocalChangeWatch() {
  const button = $("#storageButton");
  if (!button) return;
  const observer = new MutationObserver(() => {
    if (button.textContent.includes("LOCAL · NOT SYNCED") && binding()) scheduleSync();
  });
  observer.observe(button, { childList: true, characterData: true, subtree: true });
}

async function initialize() {
  ensureProviderUi();
  clearGoogleAccountIdentity();
  await loadConfig();
  await refreshGithubStatus();
  render();
  if (config?.configured && (!githubPaired || binding())) prepareGoogleSignIn();
  installLocalChangeWatch();
  $("#storageButton")?.addEventListener("click", async () => {
    await refreshGithubStatus();
    render();
    if (config?.configured && (!githubPaired || binding()) && !googleSignInReady()) prepareGoogleSignIn();
  }, true);
}

initialize();