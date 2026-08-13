import { mergeVaults, portableVault } from "./vault.js";

export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const GOOGLE_DRIVE_BINDING_KEY = "dashgpt.google-drive.binding.v1";
export const GOOGLE_DRIVE_FOLDER_NAME = "DashGPT";
export const GOOGLE_DRIVE_VAULT_NAME = "dashgpt-vault.json";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const JSON_MIME = "application/json";
const APP_KIND_KEY = "dashgptKind";
const FOLDER_KIND = "folder-v1";
const VAULT_KIND = "vault-v1";
const MAX_REMOTE_REMERGES = 2;

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function requireToken(token) {
  const value = String(token || "").trim();
  if (!value) {
    const error = new Error("Google Drive authorization is required.");
    error.code = "google_reconnect_required";
    throw error;
  }
  return value;
}

function driveError(status, payload = null) {
  const reason = payload?.error?.message || payload?.error_description || "Google Drive request failed.";
  const error = new Error(reason);
  error.status = Number(status || 0);
  if (error.status === 401) error.code = "google_reconnect_required";
  else if (error.status === 403) error.code = "google_drive_forbidden";
  else if (error.status === 429) error.code = "google_drive_rate_limited";
  else if (error.status >= 500) error.code = "google_drive_unavailable";
  else error.code = "google_drive_request_failed";
  return error;
}

function authHeaders(token, initHeaders = {}) {
  const headers = new Headers(initHeaders);
  headers.set("authorization", `Bearer ${requireToken(token)}`);
  headers.set("accept", "application/json");
  return headers;
}

async function jsonRequest(fetchFn, token, input, init = {}) {
  const response = await fetchFn(input, { ...init, headers: authHeaders(token, init.headers) });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = null; }
  }
  if (!response.ok) throw driveError(response.status, payload);
  return payload || {};
}

function escapedQueryValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function listUrl(query) {
  const url = new URL(`${DRIVE_API}/files`);
  url.searchParams.set("q", query);
  url.searchParams.set("spaces", "drive");
  url.searchParams.set("pageSize", "20");
  url.searchParams.set("orderBy", "createdTime asc");
  url.searchParams.set("fields", "files(id,name,mimeType,parents,appProperties,createdTime,modifiedTime,version)");
  return url.toString();
}

function stableFirst(files = []) {
  return files.slice().sort((left, right) =>
    String(left.createdTime || "").localeCompare(String(right.createdTime || ""))
    || String(left.id || "").localeCompare(String(right.id || ""))
  )[0] || null;
}

export function sanitizeGoogleDriveBinding(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const binding = {
    version: 1,
    provider: "google-drive",
    folderId: String(input.folderId || ""),
    fileId: String(input.fileId || ""),
    vaultId: String(input.vaultId || ""),
    modifiedTime: String(input.modifiedTime || ""),
    remoteVersion: String(input.remoteVersion || "")
  };
  if (!binding.folderId || !binding.fileId || !binding.vaultId) return null;
  return binding;
}

export function loadGoogleDriveBinding(storage = globalThis.localStorage) {
  try {
    return sanitizeGoogleDriveBinding(JSON.parse(storage.getItem(GOOGLE_DRIVE_BINDING_KEY) || "null"));
  } catch {
    return null;
  }
}

export function saveGoogleDriveBinding(storage, binding) {
  const clean = sanitizeGoogleDriveBinding(binding);
  if (!clean) throw new Error("Invalid Google Drive binding.");
  storage.setItem(GOOGLE_DRIVE_BINDING_KEY, JSON.stringify(clean));
  return clean;
}

export function clearGoogleDriveBinding(storage = globalThis.localStorage) {
  storage.removeItem(GOOGLE_DRIVE_BINDING_KEY);
}

export function isEffectivelyEmptyVault(vault) {
  const clean = portableVault(vault);
  if ((clean.dashRevisions || []).length || (clean.profileRevisions || []).length) return false;

  const systemResultIds = new Set();
  for (const result of clean.results) {
    if (result.source?.type === "system-operation") systemResultIds.add(result.id);
    else return false;
  }

  for (const event of clean.events) {
    const systemDismissal = event.type === "system.card.dismissed" && systemResultIds.has(event.resultId);
    if (!systemDismissal) return false;
  }
  return true;
}

export function reconcileGoogleDriveVaults(localVault, remoteVault, { allowMigration = false } = {}) {
  const local = portableVault(localVault);
  const remote = portableVault(remoteVault);
  if (local.vaultId === remote.vaultId) {
    return { action: "sync", vault: mergeVaults(remote, local) };
  }
  if (isEffectivelyEmptyVault(local)) {
    return { action: "adopted", vault: remote };
  }
  if (!allowMigration) {
    return {
      action: "migration_required",
      vault: null,
      local: { vaultId: local.vaultId, cards: local.results.filter(result => result.source?.type !== "system-operation").length },
      remote: { vaultId: remote.vaultId, cards: remote.results.filter(result => result.source?.type !== "system-operation").length }
    };
  }
  return { action: "migrated", vault: mergeVaults(remote, local) };
}

export async function discoverGoogleDriveFolder({ token, fetchFn = fetch } = {}) {
  const q = [
    "trashed = false",
    `mimeType = '${FOLDER_MIME}'`,
    `appProperties has { key='${APP_KIND_KEY}' and value='${FOLDER_KIND}' }`
  ].join(" and ");
  const payload = await jsonRequest(fetchFn, token, listUrl(q));
  return stableFirst(payload.files || []);
}

export async function createGoogleDriveFolder({ token, fetchFn = fetch } = {}) {
  return jsonRequest(fetchFn, token, `${DRIVE_API}/files?fields=id,name,mimeType,parents,appProperties,createdTime,modifiedTime,version`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: GOOGLE_DRIVE_FOLDER_NAME,
      mimeType: FOLDER_MIME,
      appProperties: { [APP_KIND_KEY]: FOLDER_KIND }
    })
  });
}

export async function discoverGoogleDriveVaultFile({ token, folderId, fetchFn = fetch } = {}) {
  const q = [
    "trashed = false",
    `'${escapedQueryValue(folderId)}' in parents`,
    `appProperties has { key='${APP_KIND_KEY}' and value='${VAULT_KIND}' }`
  ].join(" and ");
  const payload = await jsonRequest(fetchFn, token, listUrl(q));
  return stableFirst(payload.files || []);
}

function multipartBody(metadata, content) {
  const boundary = `dashgpt_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${JSON_MIME}`,
    "",
    content,
    `--${boundary}--`,
    ""
  ].join("\r\n");
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}

export async function createGoogleDriveVaultFile({ token, folderId, vault, fetchFn = fetch } = {}) {
  const portable = portableVault(vault);
  const metadata = {
    name: GOOGLE_DRIVE_VAULT_NAME,
    mimeType: JSON_MIME,
    parents: [folderId],
    appProperties: { [APP_KIND_KEY]: VAULT_KIND, dashgptVaultId: portable.vaultId }
  };
  const multipart = multipartBody(metadata, `${JSON.stringify(portable, null, 2)}\n`);
  return jsonRequest(
    fetchFn,
    token,
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,parents,appProperties,createdTime,modifiedTime,version`,
    { method: "POST", headers: { "content-type": multipart.contentType }, body: multipart.body }
  );
}

export async function getGoogleDriveFileMetadata({ token, fileId, fetchFn = fetch } = {}) {
  const url = new URL(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("fields", "id,name,mimeType,parents,appProperties,createdTime,modifiedTime,version");
  return jsonRequest(fetchFn, token, url.toString());
}

export async function downloadGoogleDriveVault({ token, fileId, fetchFn = fetch } = {}) {
  const url = new URL(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("alt", "media");
  const response = await fetchFn(url.toString(), { headers: authHeaders(token) });
  if (!response.ok) {
    let payload = null;
    try { payload = await response.json(); } catch {}
    throw driveError(response.status, payload);
  }
  try {
    return portableVault(JSON.parse(await response.text()));
  } catch {
    const error = new Error("The Google Drive DashGPT Vault is not valid Vault v1 JSON.");
    error.code = "google_drive_invalid_vault";
    throw error;
  }
}

export async function updateGoogleDriveVaultFile({ token, fileId, vault, fetchFn = fetch } = {}) {
  const portable = portableVault(vault);
  const url = new URL(`${DRIVE_UPLOAD_API}/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("uploadType", "media");
  url.searchParams.set("fields", "id,name,mimeType,parents,appProperties,createdTime,modifiedTime,version");
  return jsonRequest(fetchFn, token, url.toString(), {
    method: "PATCH",
    headers: { "content-type": JSON_MIME },
    body: `${JSON.stringify(portable, null, 2)}\n`
  });
}

function bindingFrom(folder, file, vault) {
  return sanitizeGoogleDriveBinding({
    folderId: folder.id,
    fileId: file.id,
    vaultId: vault.vaultId,
    modifiedTime: file.modifiedTime || "",
    remoteVersion: String(file.version || "")
  });
}

function samePortable(left, right) {
  return JSON.stringify(portableVault(left)) === JSON.stringify(portableVault(right));
}

export async function syncGoogleDriveVault({
  token,
  localVault,
  allowMigration = false,
  fetchFn = fetch,
  maxRemoteRemerges = MAX_REMOTE_REMERGES
} = {}) {
  requireToken(token);
  const local = portableVault(localVault);
  let folder = await discoverGoogleDriveFolder({ token, fetchFn });
  if (!folder) folder = await createGoogleDriveFolder({ token, fetchFn });

  let file = await discoverGoogleDriveVaultFile({ token, folderId: folder.id, fetchFn });
  if (!file) {
    file = await createGoogleDriveVaultFile({ token, folderId: folder.id, vault: local, fetchFn });
    return { action: "created", vault: local, binding: bindingFrom(folder, file, local), remoteChanged: true };
  }

  let remote = await downloadGoogleDriveVault({ token, fileId: file.id, fetchFn });
  let reconciliation = reconcileGoogleDriveVaults(local, remote, { allowMigration });
  if (reconciliation.action === "migration_required") {
    return { ...reconciliation, binding: bindingFrom(folder, file, remote), remoteChanged: false };
  }
  if (reconciliation.action === "adopted") {
    return { ...reconciliation, binding: bindingFrom(folder, file, reconciliation.vault), remoteChanged: false };
  }

  let merged = reconciliation.vault;
  let expectedVersion = String(file.version || "");
  let attempts = 0;
  while (attempts <= Math.max(0, Number(maxRemoteRemerges || 0))) {
    const latestMeta = await getGoogleDriveFileMetadata({ token, fileId: file.id, fetchFn });
    const latestVersion = String(latestMeta.version || "");
    if (!expectedVersion || !latestVersion || latestVersion === expectedVersion) {
      if (samePortable(remote, merged)) {
        return { action: reconciliation.action, vault: merged, binding: bindingFrom(folder, latestMeta, merged), remoteChanged: false };
      }
      const updated = await updateGoogleDriveVaultFile({ token, fileId: file.id, vault: merged, fetchFn });
      return { action: reconciliation.action, vault: merged, binding: bindingFrom(folder, updated, merged), remoteChanged: true };
    }

    if (attempts >= maxRemoteRemerges) {
      const error = new Error("Google Drive Vault changed during sync. Retry to merge the latest state.");
      error.code = "google_drive_sync_race";
      throw error;
    }

    remote = await downloadGoogleDriveVault({ token, fileId: file.id, fetchFn });
    reconciliation = reconcileGoogleDriveVaults(local, remote, { allowMigration });
    if (reconciliation.action === "migration_required") {
      return { ...reconciliation, binding: bindingFrom(folder, latestMeta, remote), remoteChanged: false };
    }
    if (reconciliation.action === "adopted") {
      return { ...reconciliation, binding: bindingFrom(folder, latestMeta, reconciliation.vault), remoteChanged: false };
    }
    merged = reconciliation.vault;
    expectedVersion = latestVersion;
    file = latestMeta;
    attempts += 1;
  }

  throw new Error("Google Drive synchronization did not converge.");
}
