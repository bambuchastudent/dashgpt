import { createVault, mergeVaults, portableVault, putDashRevision, putResult } from "../demo/vault.js";

const RESULT_HASH = /^sha256:([0-9a-f]{64})$/;

function prettyJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function segment(value) {
  return encodeURIComponent(String(value));
}

function joinRoot(root, path) {
  const prefix = String(root || "").replace(/^\/+|\/+$/g, "");
  return prefix ? `${prefix}/${path}` : path;
}

function resultPath(result) {
  if (!result.immutable) return `results/${segment(result.id)}/draft.json`;
  const match = String(result.contentHash || "").match(RESULT_HASH);
  const suffix = match ? match[1] : `unverified-${segment(result.contentHash || "no-hash")}`;
  return `results/${segment(result.id)}/${Number(result.contentVersion || 1)}-${suffix}.json`;
}

function eventPath(event) {
  const month = /^\d{4}-\d{2}/.exec(String(event.createdAt || ""))?.[0] || "unknown";
  return `events/${month}/${segment(event.eventId)}.json`;
}

function profilePath(revision, index) {
  const id = revision?.profileRevisionId || `revision-${index + 1}`;
  return `profile/${segment(id)}.json`;
}

function dashPath(revision) {
  return `dashes/${segment(revision.dashId)}/${segment(revision.dashRevisionId)}.json`;
}

export function vaultToObjects(vault, root = "") {
  const clean = portableVault(vault);
  const objects = [{
    path: joinRoot(root, "dashgpt-vault.json"),
    content: prettyJson({
      schemaVersion: clean.schemaVersion,
      vaultId: clean.vaultId,
      createdAt: clean.createdAt,
      updatedAt: clean.updatedAt
    })
  }];

  for (const result of clean.results) {
    objects.push({ path: joinRoot(root, resultPath(result)), content: prettyJson(result) });
  }
  for (const event of clean.events) {
    objects.push({ path: joinRoot(root, eventPath(event)), content: prettyJson(event) });
  }
  clean.profileRevisions.forEach((revision, index) => {
    objects.push({ path: joinRoot(root, profilePath(revision, index)), content: prettyJson(revision) });
  });
  for (const revision of clean.dashRevisions) {
    objects.push({ path: joinRoot(root, dashPath(revision)), content: prettyJson(revision) });
  }

  return objects.sort((a, b) => a.path.localeCompare(b.path));
}

function relativePath(root, path) {
  const prefix = String(root || "").replace(/^\/+|\/+$/g, "");
  if (!prefix) return path;
  return path.startsWith(`${prefix}/`) ? path.slice(prefix.length + 1) : null;
}

export function vaultFromObjects(objects, root = "") {
  const entries = new Map(objects.map((object) => [relativePath(root, object.path), object.content]));
  const manifestText = entries.get("dashgpt-vault.json");
  if (!manifestText) return null;
  const manifest = JSON.parse(manifestText);
  const vault = createVault({ vaultId: manifest.vaultId, createdAt: manifest.createdAt });
  vault.updatedAt = manifest.updatedAt || manifest.createdAt;

  for (const [path, content] of entries) {
    if (!path || path === "dashgpt-vault.json") continue;
    if (path.startsWith("results/") && path.endsWith(".json")) {
      putResult(vault, JSON.parse(content), { updatedAt: vault.updatedAt });
    } else if (path.startsWith("events/") && path.endsWith(".json")) {
      vault.events.push(JSON.parse(content));
    } else if (path.startsWith("profile/") && path.endsWith(".json")) {
      vault.profileRevisions.push(JSON.parse(content));
    } else if (path.startsWith("dashes/") && path.endsWith(".json")) {
      putDashRevision(vault, JSON.parse(content), { updatedAt: vault.updatedAt });
    }
  }

  return portableVault(vault);
}

export function mergeVaultObjectSets(localVault, remoteObjects, root = "") {
  const local = portableVault(localVault);
  const remoteVault = vaultFromObjects(remoteObjects, root);
  if (!remoteVault) return local;
  if (remoteVault.vaultId !== local.vaultId) {
    const error = new Error("The selected GitHub folder already contains a different DashGPT Vault.");
    error.code = "vault_id_mismatch";
    error.remoteVaultId = remoteVault.vaultId;
    throw error;
  }
  const updatedAt = [remoteVault.updatedAt, local.updatedAt].filter(Boolean).sort().at(-1) || local.updatedAt;
  return mergeVaults(remoteVault, local, { updatedAt });
}
