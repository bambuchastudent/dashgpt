import assert from "node:assert/strict";
import { createVault, putResult } from "../demo/vault.js";
import {
  GOOGLE_DRIVE_SCOPE,
  isEffectivelyEmptyVault,
  reconcileGoogleDriveVaults,
  sanitizeGoogleDriveBinding,
  syncGoogleDriveVault
} from "../demo/google-drive-storage.js";
import { handleGoogleDriveConfig } from "../src/google-drive-config.js";

function card(vault, id, summary = id, source = undefined) {
  putResult(vault, {
    id,
    schemaVersion: 1,
    title: id,
    summary,
    tags: [],
    decisions: [],
    immutable: false,
    contentVersion: 1,
    ...(source ? { source } : {})
  }, { updatedAt: "2026-08-13T10:00:00.000Z" });
  return vault;
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

function createFakeDrive(initialVault = null) {
  let folder = initialVault ? {
    id: "folder-1", name: "DashGPT", mimeType: "application/vnd.google-apps.folder",
    appProperties: { dashgptKind: "folder-v1" }, createdTime: "2026-08-13T09:00:00.000Z", modifiedTime: "2026-08-13T09:00:00.000Z", version: "1"
  } : null;
  let remoteVault = initialVault ? structuredClone(initialVault) : null;
  let version = initialVault ? 2 : 0;
  let file = initialVault ? fileMeta() : null;
  let updates = 0;
  let raceVault = null;
  const requests = [];

  function fileMeta() {
    return {
      id: "file-1", name: "dashgpt-vault.json", mimeType: "application/json", parents: ["folder-1"],
      appProperties: { dashgptKind: "vault-v1", dashgptVaultId: remoteVault?.vaultId || "" },
      createdTime: "2026-08-13T09:00:01.000Z", modifiedTime: `2026-08-13T09:00:${String(version).padStart(2, "0")}.000Z`, version: String(version)
    };
  }

  function parseMultipart(init) {
    const type = new Headers(init.headers).get("content-type") || "";
    const boundary = type.match(/boundary=([^;]+)/)?.[1];
    assert.ok(boundary, "multipart boundary is required");
    const parts = String(init.body).split(`--${boundary}`).filter(part => part.trim() && part.trim() !== "--");
    assert.equal(parts.length, 2);
    const metadata = JSON.parse(parts[0].split("\r\n\r\n")[1].trim());
    const content = parts[1].split("\r\n\r\n")[1].replace(/\r\n$/, "").trim();
    return { metadata, vault: JSON.parse(content) };
  }

  async function fetchFn(input, init = {}) {
    const url = new URL(String(input));
    const headers = new Headers(init.headers || {});
    requests.push({ url: url.toString(), method: init.method || "GET", authorization: headers.get("authorization"), body: init.body || "" });
    assert.equal(headers.get("authorization"), "Bearer TEST_ACCESS_TOKEN");
    assert.equal(url.searchParams.has("access_token"), false, "token must never be placed in URL");

    if (url.hostname === "www.googleapis.com" && url.pathname === "/drive/v3/files" && !init.method) {
      const q = url.searchParams.get("q") || "";
      if (q.includes("folder-v1")) return jsonResponse({ files: folder ? [folder] : [] });
      if (q.includes("vault-v1")) return jsonResponse({ files: file ? [fileMeta()] : [] });
    }

    if (url.hostname === "www.googleapis.com" && url.pathname === "/drive/v3/files" && init.method === "POST") {
      const body = JSON.parse(init.body);
      assert.equal(body.appProperties.dashgptKind, "folder-v1");
      folder = {
        id: "folder-1", name: body.name, mimeType: body.mimeType, appProperties: body.appProperties,
        createdTime: "2026-08-13T09:00:00.000Z", modifiedTime: "2026-08-13T09:00:00.000Z", version: "1"
      };
      return jsonResponse(folder);
    }

    if (url.hostname === "www.googleapis.com" && url.pathname === "/upload/drive/v3/files" && init.method === "POST") {
      const parsed = parseMultipart(init);
      remoteVault = parsed.vault;
      version = 2;
      file = fileMeta();
      assert.equal(parsed.metadata.appProperties.dashgptKind, "vault-v1");
      assert.equal(parsed.metadata.appProperties.dashgptVaultId, remoteVault.vaultId);
      return jsonResponse(file);
    }

    if (url.hostname === "www.googleapis.com" && url.pathname === "/drive/v3/files/file-1" && url.searchParams.get("alt") === "media") {
      return new Response(JSON.stringify(remoteVault), { status: 200, headers: { "content-type": "application/json" } });
    }

    if (url.hostname === "www.googleapis.com" && url.pathname === "/drive/v3/files/file-1" && url.searchParams.has("fields")) {
      if (raceVault) {
        remoteVault = structuredClone(raceVault);
        raceVault = null;
        version += 1;
      }
      file = fileMeta();
      return jsonResponse(file);
    }

    if (url.hostname === "www.googleapis.com" && url.pathname === "/upload/drive/v3/files/file-1" && init.method === "PATCH") {
      remoteVault = JSON.parse(init.body);
      version += 1;
      updates += 1;
      file = fileMeta();
      return jsonResponse(file);
    }

    return jsonResponse({ error: { message: `Unhandled fake Drive request ${init.method || "GET"} ${url}` } }, 500);
  }

  return {
    fetchFn,
    requests,
    remoteVault: () => structuredClone(remoteVault),
    updates: () => updates,
    injectRace(vault) { raceVault = structuredClone(vault); }
  };
}

assert.equal(GOOGLE_DRIVE_SCOPE, "https://www.googleapis.com/auth/drive.file");
assert.equal(sanitizeGoogleDriveBinding({ folderId: "f", fileId: "x", vaultId: "v", accessToken: "SECRET" }).accessToken, undefined);
assert.equal(JSON.stringify(sanitizeGoogleDriveBinding({ folderId: "f", fileId: "x", vaultId: "v", token: "SECRET" })).includes("SECRET"), false);

{
  const empty = createVault({ vaultId: "empty", createdAt: "2026-08-13T00:00:00.000Z" });
  card(empty, "dashgpt-chatgpt-history-import", "operation", { type: "system-operation", provider: "dashgpt" });
  assert.equal(isEffectivelyEmptyVault(empty), true);
  card(empty, "real-card");
  assert.equal(isEffectivelyEmptyVault(empty), false);
}

{
  const local = card(createVault({ vaultId: "vault-first", createdAt: "2026-08-13T00:00:00.000Z" }), "first-card");
  const fake = createFakeDrive();
  const result = await syncGoogleDriveVault({ token: "TEST_ACCESS_TOKEN", localVault: local, fetchFn: fake.fetchFn });
  assert.equal(result.action, "created");
  assert.equal(result.vault.vaultId, "vault-first");
  assert.equal(fake.remoteVault().results.some(item => item.id === "first-card"), true);
  assert.equal(JSON.stringify(result.binding).includes("TEST_ACCESS_TOKEN"), false);
}

{
  const remote = card(createVault({ vaultId: "vault-remote", createdAt: "2026-08-13T00:00:00.000Z" }), "remote-card");
  const local = createVault({ vaultId: "synthetic-local", createdAt: "2026-08-13T01:00:00.000Z" });
  card(local, "dashgpt-chatgpt-history-import", "operation", { type: "system-operation", provider: "dashgpt" });
  const fake = createFakeDrive(remote);
  const result = await syncGoogleDriveVault({ token: "TEST_ACCESS_TOKEN", localVault: local, fetchFn: fake.fetchFn });
  assert.equal(result.action, "adopted");
  assert.equal(result.vault.vaultId, "vault-remote");
  assert.equal(result.vault.results.some(item => item.id === "remote-card"), true);
  assert.equal(fake.updates(), 0);
}

{
  const remote = card(createVault({ vaultId: "vault-remote", createdAt: "2026-08-13T00:00:00.000Z" }), "remote-card");
  const local = card(createVault({ vaultId: "vault-local", createdAt: "2026-08-13T01:00:00.000Z" }), "local-card");
  const preview = reconcileGoogleDriveVaults(local, remote);
  assert.equal(preview.action, "migration_required");
  const fake = createFakeDrive(remote);
  const blocked = await syncGoogleDriveVault({ token: "TEST_ACCESS_TOKEN", localVault: local, fetchFn: fake.fetchFn });
  assert.equal(blocked.action, "migration_required");
  assert.equal(fake.updates(), 0);
  const migrated = await syncGoogleDriveVault({ token: "TEST_ACCESS_TOKEN", localVault: local, fetchFn: fake.fetchFn, allowMigration: true });
  assert.equal(migrated.action, "migrated");
  assert.equal(migrated.vault.vaultId, "vault-remote");
  assert.equal(migrated.vault.results.some(item => item.id === "remote-card"), true);
  assert.equal(migrated.vault.results.some(item => item.id === "local-card"), true);
  assert.equal(fake.updates(), 1);
}

{
  const remote = card(createVault({ vaultId: "vault-shared", createdAt: "2026-08-13T00:00:00.000Z" }), "remote-card");
  const local = card(createVault({ vaultId: "vault-shared", createdAt: "2026-08-13T00:00:00.000Z" }), "local-card");
  const fake = createFakeDrive(remote);
  const result = await syncGoogleDriveVault({ token: "TEST_ACCESS_TOKEN", localVault: local, fetchFn: fake.fetchFn });
  assert.equal(result.action, "sync");
  assert.deepEqual(new Set(result.vault.results.map(item => item.id)), new Set(["remote-card", "local-card"]));
  assert.equal(fake.updates(), 1);
}

{
  const remote = card(createVault({ vaultId: "vault-race", createdAt: "2026-08-13T00:00:00.000Z" }), "remote-card");
  const local = card(createVault({ vaultId: "vault-race", createdAt: "2026-08-13T00:00:00.000Z" }), "local-card");
  const raced = card(structuredClone(remote), "raced-card");
  const fake = createFakeDrive(remote);
  fake.injectRace(raced);
  const result = await syncGoogleDriveVault({ token: "TEST_ACCESS_TOKEN", localVault: local, fetchFn: fake.fetchFn });
  assert.equal(result.vault.results.some(item => item.id === "raced-card"), true);
  assert.equal(result.vault.results.some(item => item.id === "local-card"), true);
  assert.equal(fake.updates(), 1);
}

{
  const unconfigured = await handleGoogleDriveConfig(new Request("https://dashgpt.example/api/storage/google/config"), {});
  assert.equal(unconfigured.status, 200);
  assert.deepEqual(await unconfigured.json(), { configured: false, clientId: null, scope: GOOGLE_DRIVE_SCOPE });
  const configured = await handleGoogleDriveConfig(new Request("https://dashgpt.example/api/storage/google/config"), { GOOGLE_CLIENT_ID: "client.apps.googleusercontent.com" });
  assert.equal(configured.status, 200);
  const body = await configured.json();
  assert.equal(body.configured, true);
  assert.equal(body.clientId, "client.apps.googleusercontent.com");
  assert.equal(body.scope, GOOGLE_DRIVE_SCOPE);
  assert.equal(configured.headers.get("cache-control"), "no-store");
}

console.log("Google Drive Vault adapter: scope/privacy, create, adoption, explicit migration, same-vault merge, remote-race remerge and config tests passed.");
