import { loadBrowserVault, portableVault, saveBrowserVault } from "./vault.js";

const storageButton = document.querySelector("#storageButton");
const githubStatus = document.querySelector("#githubStatus");
const githubConnectControls = document.querySelector("#githubConnectControls");
const githubPairedControls = document.querySelector("#githubPairedControls");
const githubStorageUrl = document.querySelector("#githubStorageUrl");
const connectGithubButton = document.querySelector("#connectGithubButton");
const syncGithubButton = document.querySelector("#syncGithubButton");
const disconnectGithubButton = document.querySelector("#disconnectGithubButton");
const githubLocation = document.querySelector("#githubLocation");

let state = { configured: false, paired: false, locator: null };
let syncing = false;
let syncTimer = null;

async function api(path, init = {}) {
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(path, { ...init, headers, credentials: "same-origin" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `GitHub storage request failed (${response.status}).`);
    error.code = payload.code;
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function locatorText(locator) {
  if (!locator) return "";
  return `${locator.owner}/${locator.repo} · ${locator.ref || "default"} · /${locator.path}`;
}

function renderState(message = "") {
  if (!githubStatus) return;
  githubConnectControls.hidden = state.paired;
  githubPairedControls.hidden = !state.paired;
  connectGithubButton.disabled = !state.configured;

  if (!state.configured) {
    githubStatus.textContent = "GitHub sync is supported, but the GitHub App is not configured on this deployment yet.";
    if (storageButton?.textContent.includes("GITHUB")) storageButton.textContent = "LOCAL · NOT SYNCED";
    return;
  }

  if (state.paired) {
    githubLocation.textContent = locatorText(state.locator);
    githubStatus.textContent = message || "Paired through a repository-scoped GitHub App. Local changes sync without exposing a GitHub token to the browser.";
  } else {
    githubStatus.textContent = message || "Paste a GitHub repository or folder link. You will choose exactly which repository the DashGPT GitHub App may access.";
  }
}

function markSynced(sync) {
  if (storageButton) {
    storageButton.textContent = "LOCAL + GITHUB · SYNCED";
    storageButton.dataset.state = "synced";
  }
  const detail = sync?.commitSha
    ? `${sync.changedObjects ? `Synced ${sync.changedObjects} Vault objects` : "Already up to date"} · ${sync.branch} · ${sync.commitSha.slice(0, 8)}`
    : "GitHub Vault is synchronized.";
  renderState(detail);
}

function markUnsynced(message) {
  if (storageButton && state.paired) {
    storageButton.textContent = "LOCAL + GITHUB · UNSYNCED";
    storageButton.dataset.state = "unsynced";
  }
  renderState(message || "Local Vault is safe; GitHub sync can be retried.");
}

async function syncGithub({ quiet = false } = {}) {
  if (!state.paired || syncing) return;
  syncing = true;
  syncGithubButton.disabled = true;
  try {
    const { vault } = loadBrowserVault(localStorage);
    const before = JSON.stringify(portableVault(vault));
    const payload = await api("/api/storage/github/sync", {
      method: "POST",
      body: JSON.stringify({ vault })
    });
    const merged = portableVault(payload.vault);
    const after = JSON.stringify(merged);
    saveBrowserVault(localStorage, merged);
    markSynced(payload.sync);

    if (before !== after) {
      location.reload();
      return;
    }
  } catch (error) {
    console.warn("DashGPT GitHub sync failed; local Vault remains authoritative until retry.", error);
    if (!quiet) markUnsynced(error.message);
    else markUnsynced("GitHub is temporarily unavailable. Local changes remain safe and unsynced.");
  } finally {
    syncing = false;
    syncGithubButton.disabled = false;
  }
}

function scheduleSync() {
  if (!state.paired || syncing) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncGithub({ quiet: true }), 700);
}

async function refreshStatus({ autoSync = false } = {}) {
  try {
    state = await api("/api/storage/github/status");
    renderState();
    if (state.paired && autoSync) await syncGithub({ quiet: true });
  } catch (error) {
    state = { configured: false, paired: false, locator: null };
    renderState(error.message);
  }
}

connectGithubButton?.addEventListener("click", async () => {
  const url = githubStorageUrl.value.trim();
  if (!url) {
    renderState("Paste a GitHub repository or folder URL first.");
    githubStorageUrl.focus();
    return;
  }
  connectGithubButton.disabled = true;
  try {
    const payload = await api("/api/storage/github/pair", {
      method: "POST",
      body: JSON.stringify({ url })
    });
    location.assign(payload.installUrl);
  } catch (error) {
    renderState(error.message);
    connectGithubButton.disabled = false;
  }
});

syncGithubButton?.addEventListener("click", () => syncGithub());

disconnectGithubButton?.addEventListener("click", async () => {
  disconnectGithubButton.disabled = true;
  try {
    await api("/api/storage/github/disconnect", { method: "POST" });
    state = { ...state, paired: false, locator: null };
    renderState("GitHub disconnected. Your local Vault was not deleted.");
    if (storageButton) storageButton.textContent = "LOCAL · NOT SYNCED";
  } catch (error) {
    renderState(error.message);
  } finally {
    disconnectGithubButton.disabled = false;
  }
});

if (storageButton) {
  new MutationObserver(() => {
    if (state.paired && storageButton.textContent.includes("NOT SYNCED")) {
      storageButton.textContent = "LOCAL + GITHUB · UNSYNCED";
      scheduleSync();
    }
  }).observe(storageButton, { childList: true, subtree: true, characterData: true });
}

const params = new URLSearchParams(location.search);
const returnedFromPairing = params.get("storage") === "github-paired";
const pairingError = params.get("storage") === "github-error" ? params.get("message") : null;
if (params.has("storage")) {
  params.delete("storage");
  params.delete("message");
  const clean = `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`;
  history.replaceState(null, "", clean);
}

await refreshStatus({ autoSync: true });
if (returnedFromPairing && state.paired) renderState("GitHub connected. Synchronizing your local Vault now.");
if (pairingError) renderState(pairingError);
