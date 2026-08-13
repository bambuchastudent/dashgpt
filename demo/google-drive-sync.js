import {
  GOOGLE_DRIVE_SCOPE,
  clearGoogleDriveBinding,
  loadGoogleDriveBinding,
  saveGoogleDriveBinding,
  syncGoogleDriveVault
} from "./google-drive-storage.js";
import { loadBrowserVault, saveBrowserVault } from "./vault.js";

const GIS_SRC = "https://accounts.google.com/gsi/client";
const AUTO_SYNC_DELAY_MS = 1400;

let config = null;
let tokenState = null;
let githubPaired = false;
let syncing = false;
let syncTimer = null;
let pendingMigration = null;
let gisPromise = null;

function $(selector) { return document.querySelector(selector); }

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
      <strong id="google-drive-storage-title">Google Drive sync</strong>
      <p id="googleDriveStatus">Checking Google Drive sync…</p>
      <div class="dialog-actions compact-actions google-drive-actions">
        <button id="connectGoogleDriveButton" class="button primary" type="button">Connect Google Drive</button>
        <button id="syncGoogleDriveButton" class="button primary" type="button" hidden>Sync now</button>
        <button id="disconnectGoogleDriveButton" class="button ghost" type="button" hidden>Disconnect</button>
      </div>
      <div id="googleDriveMigration" class="google-drive-migration" hidden>
        <p id="googleDriveMigrationText"></p>
        <div class="dialog-actions compact-actions">
          <button id="mergeGoogleDriveButton" class="button primary" type="button">Merge this device into Google Drive</button>
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
    render("Local and Google Drive Vaults remain separate. Nothing was changed.");
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
      githubConnect.title = "Disconnect Google Drive before switching remote storage provider.";
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

  if (!config?.configured) {
    status.textContent = message || "Google Drive sync is not configured on this deployment yet. Local Vault stays available.";
    connect.hidden = false;
    connect.disabled = true;
    connect.textContent = "Connect Google Drive";
    sync.hidden = true;
    disconnect.hidden = true;
    migration.hidden = true;
    return;
  }

  if (githubPaired && !googleBinding) {
    status.textContent = message || "GitHub sync is active. Disconnect GitHub before switching this browser Vault to Google Drive.";
    connect.hidden = false;
    connect.disabled = true;
    connect.textContent = "Connect Google Drive";
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

  if (!googleBinding) {
    status.textContent = message || "Connect Google Drive to carry this Vault to your other devices. Local data stays here until you connect.";
    connect.hidden = false;
    connect.disabled = false;
    connect.textContent = "Connect Google Drive";
    sync.hidden = true;
    disconnect.hidden = true;
    migration.hidden = true;
    return;
  }

  disconnect.hidden = false;
  if (syncing) {
    status.textContent = message || "Syncing the local Vault with Google Drive…";
    connect.hidden = true;
    sync.hidden = false;
    sync.disabled = true;
    setStorageBadge("LOCAL + GOOGLE DRIVE · SYNCING", "unsynced");
    return;
  }

  if (!tokenValid()) {
    tokenState = null;
    status.textContent = message || "Google Drive is linked to this Vault. Reconnect when you want to sync again; the cards already on this device stay available offline.";
    connect.hidden = false;
    connect.disabled = false;
    connect.textContent = "Reconnect Google Drive";
    sync.hidden = true;
    setStorageBadge("LOCAL + GOOGLE DRIVE · RECONNECT", "unsynced");
    return;
  }

  status.textContent = message || "Local Vault and Google Drive are connected for this browser session.";
  connect.hidden = true;
  sync.hidden = false;
  sync.disabled = false;
}

function loadGisScript() {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", () => reject(new Error("Google sign-in could not be loaded.")), { once: true });
    document.head.append(script);
  });
  return gisPromise;
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

async function connectGoogleDrive() {
  if (!config?.configured) return render();
  await refreshGithubStatus();
  if (githubPaired && !binding()) return render();
  try {
    if (!globalThis.google?.accounts?.oauth2) {
      render("Preparing Google sign-in…");
      await loadGisScript();
    }
    tokenState = await requestAccessToken();
    await syncNow({ allowMigration: false });
  } catch (error) {
    renderHumanError(error);
  }
}

function migrationMessage(result) {
  const local = result.local || {};
  const remote = result.remote || {};
  return `This device has ${local.cards || 0} local cards in Vault ${local.vaultId || "unknown"}, while Google Drive has ${remote.cards || 0} cards in Vault ${remote.vaultId || "unknown"}. Merge this device into the Google Drive Vault? Neither side changes until you confirm.`;
}

async function syncNow({ allowMigration = false } = {}) {
  if (!tokenValid()) return render("Reconnect Google Drive before syncing. Local changes are safe.");
  await refreshGithubStatus();
  if (githubPaired) return render("GitHub sync is active. Disconnect GitHub before using Google Drive sync on this browser.");
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
      render("This device and Google Drive contain different Vaults. Choose whether to merge them; nothing has been written yet.");
      return;
    }

    pendingMigration = null;
    $("#googleDriveMigration")?.setAttribute("hidden", "");
    saveGoogleDriveBinding(globalThis.localStorage, result.binding);
    saveBrowserVault(globalThis.localStorage, result.vault);
    const localChanged = localBefore !== JSON.stringify(result.vault);
    const copy = {
      created: "Google Drive Vault created and synced.",
      adopted: "Google Drive Vault loaded on this device.",
      migrated: "This device was merged into the Google Drive Vault.",
      sync: result.remoteChanged ? "Local and Google Drive Vaults merged and synced." : "Local and Google Drive Vaults are already in sync."
    }[result.action] || "Google Drive sync complete.";
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
    render("Google authorization expired. Reconnect to sync; local changes are safe on this device.");
    return;
  }
  if (code === "google_drive_rate_limited") return render("Google Drive is busy right now. Local changes are safe; try Sync now again later.");
  if (code === "google_drive_unavailable") return render("Google Drive is temporarily unavailable. Local changes are safe and remain unsynced.");
  if (code === "google_drive_invalid_vault") return render("The Drive file is not a valid DashGPT Vault. Local data was not changed.");
  if (code === "google_authorization_not_completed") return render("Google authorization was not completed. Nothing was changed.");
  render("Google Drive sync could not complete. Local data was not changed.");
}

function disconnectGoogleDrive() {
  clearTimeout(syncTimer);
  syncTimer = null;
  tokenState = null;
  pendingMigration = null;
  clearGoogleDriveBinding(globalThis.localStorage);
  $("#googleDriveMigration")?.setAttribute("hidden", "");
  const githubConnect = $("#connectGithubButton");
  if (githubConnect && !githubPaired) {
    githubConnect.disabled = false;
    githubConnect.removeAttribute("title");
  }
  setStorageBadge("LOCAL · NOT SYNCED", "unpaired");
  render("Google Drive disconnected from this browser. Local and Drive data were left intact.");
}

function scheduleSync() {
  if (!binding() || !tokenValid() || syncing || githubPaired) return;
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
  await loadConfig();
  await refreshGithubStatus();
  render();
  installLocalChangeWatch();
  $("#storageButton")?.addEventListener("click", async () => {
    await refreshGithubStatus();
    render();
    if (config?.configured && !globalThis.google?.accounts?.oauth2) loadGisScript().catch(() => {});
  }, true);
}

initialize();
