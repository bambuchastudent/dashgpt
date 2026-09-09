import assert from "node:assert/strict";
import worker from "../src/worker.js";
import { handleMcpWithCardWrite, UPSERT_CARD_TOOL } from "../src/mcp-card-write-overlay.js";
import {
  CARD_WRITE_SCOPE,
  CHATGPT_CIMD_CLIENT_ID,
  CHATGPT_REDIRECT_URI,
  OAuthState,
  handleOAuthAuthorizationServer,
  handleOAuthProtectedResource,
  handleOAuthToken
} from "../src/plugin-oauth.js";
import { normalizePluginCardInput, upsertCardInGoogleDrive } from "../src/plugin-card-write.js";
import { createVault, putResult } from "../demo/vault.js";

class MemoryStorage {
  constructor() {
    this.map = new Map();
    this.alarm = null;
  }
  async put(key, value) { this.map.set(key, structuredClone(value)); }
  async get(key) { return this.map.has(key) ? structuredClone(this.map.get(key)) : undefined; }
  async delete(keyOrKeys) {
    if (Array.isArray(keyOrKeys)) keyOrKeys.forEach(key => this.map.delete(key));
    else this.map.delete(keyOrKeys);
  }
  async list() { return new Map([...this.map.entries()].map(([key, value]) => [key, structuredClone(value)])); }
  async getAlarm() { return this.alarm; }
  async setAlarm(value) { this.alarm = value; }
}

function makeStateBinding(storage) {
  const instance = new OAuthState({ storage });
  return {
    idFromName(name) { return name; },
    get() { return { fetch: (url, init) => instance.fetch(new Request(url, init)) }; }
  };
}

const origin = "https://dashgpt.example";
const request = (path, init = {}) => new Request(`${origin}${path}`, init);

const protectedResource = await handleOAuthProtectedResource(request("/.well-known/oauth-protected-resource"));
assert.equal(protectedResource.status, 200);
const protectedPayload = await protectedResource.json();
assert.equal(protectedPayload.resource, `${origin}/mcp`);
assert.deepEqual(protectedPayload.scopes_supported, [CARD_WRITE_SCOPE]);

const authServer = await handleOAuthAuthorizationServer(request("/.well-known/oauth-authorization-server"));
assert.equal(authServer.status, 200);
const authPayload = await authServer.json();
assert.equal(authPayload.issuer, origin);
assert.equal(authPayload.authorization_endpoint, `${origin}/oauth/authorize`);
assert.equal(authPayload.token_endpoint, `${origin}/oauth/token`);
assert.deepEqual(authPayload.code_challenge_methods_supported, ["S256"]);

assert.deepEqual(UPSERT_CARD_TOOL.securitySchemes, [{ type: "oauth2", scopes: [CARD_WRITE_SCOPE] }]);
assert.deepEqual(UPSERT_CARD_TOOL._meta?.securitySchemes, UPSERT_CARD_TOOL.securitySchemes);
assert.equal(UPSERT_CARD_TOOL.annotations.readOnlyHint, false);
assert.equal(UPSERT_CARD_TOOL.annotations.destructiveHint, false);
assert.equal(UPSERT_CARD_TOOL.annotations.openWorldHint, false);

const mixedAuthResponse = await handleMcpWithCardWrite(
  request("/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 90, method: "tools/list", params: {} })
  }),
  {},
  {},
  {
    async fetch() {
      return Response.json({
        jsonrpc: "2.0",
        id: 90,
        result: {
          tools: [{
            name: "public_read",
            inputSchema: { type: "object", properties: {} },
            annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
          }]
        }
      });
    }
  }
);
const mixedAuthPayload = await mixedAuthResponse.json();
const publicRead = mixedAuthPayload.result.tools.find(tool => tool.name === "public_read");
const directWrite = mixedAuthPayload.result.tools.find(tool => tool.name === "upsert_card");
assert.deepEqual(publicRead.securitySchemes, [{ type: "noauth" }]);
assert.deepEqual(publicRead._meta?.securitySchemes, publicRead.securitySchemes);
assert.deepEqual(directWrite.securitySchemes, [{ type: "oauth2", scopes: [CARD_WRITE_SCOPE] }]);
assert.deepEqual(directWrite._meta?.securitySchemes, directWrite.securitySchemes);

assert.throws(
  () => normalizePluginCardInput({ title: "Secret", summary: "Store sk-proj-abcdefghijklmnop1234" }),
  error => error?.code === "secret_like_content"
);
assert.throws(
  () => normalizePluginCardInput({ title: "Bad source", summary: "Summary", sourceUrl: "https://example.com/chat" }),
  error => error?.code === "invalid_source_url"
);

const createCalls = [];
const createDriveFetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  createCalls.push({ url: url.toString(), method: init.method || "GET", body: init.body || "" });
  if (url.hostname !== "www.googleapis.com") return new Response("not found", { status: 404 });
  if (url.pathname === "/drive/v3/files" && !init.method) {
    const query = url.searchParams.get("q") || "";
    if (query.includes("folder-v1")) return Response.json({ files: [{ id: "folder-1", createdTime: "2026-01-01T00:00:00Z" }] });
    if (query.includes("vault-v1")) return Response.json({ files: [] });
  }
  if (url.pathname === "/upload/drive/v3/files" && init.method === "POST") {
    return Response.json({ id: "vault-file-1" });
  }
  return new Response("unexpected", { status: 500 });
};

const saved = await upsertCardInGoogleDrive({
  token: "google-access-token",
  input: {
    title: "Direct save",
    summary: "A canonical card saved directly from the current conversation.",
    goal: "Avoid Share scraping",
    tags: ["memory", "capture"],
    language: "en"
  },
  fetchFn: createDriveFetch,
  now: Date.parse("2026-09-10T10:00:00Z")
});
assert.equal(saved.status, "created");
assert.equal(saved.provider, "google-drive");
assert.equal(saved.fileId, "vault-file-1");
assert.match(saved.card.id, /^result-/);
assert.ok(createCalls.some(call => call.url.includes("/upload/drive/v3/files") && call.method === "POST"));
assert.doesNotMatch(JSON.stringify(saved), /google-access-token/);

const sourceUrl = "https://chatgpt.com/share/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const existingVault = createVault({ createdAt: "2026-09-01T00:00:00.000Z" });
putResult(existingVault, {
  id: "result-existing",
  schemaVersion: 1,
  title: "Old title",
  summary: "Old summary",
  category: "Мои чаты",
  tags: ["chatgpt", "share"],
  decisions: [],
  facts: [],
  constraints: [],
  userPreferences: [],
  openQuestions: [],
  source: { type: "chatgpt-share", url: sourceUrl, title: "Old title" },
  immutable: false,
  contentVersion: 1,
  status: "Сохранено",
  publishedAt: "2026-09-01T00:00:00.000Z"
}, { updatedAt: "2026-09-01T00:00:00.000Z" });

let patchedVaultText = "";
const updateDriveFetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  if (url.pathname === "/drive/v3/files" && !init.method) {
    const query = url.searchParams.get("q") || "";
    if (query.includes("folder-v1")) return Response.json({ files: [{ id: "folder-1", createdTime: "2026-01-01T00:00:00Z" }] });
    if (query.includes("vault-v1")) return Response.json({ files: [{ id: "vault-file-1", createdTime: "2026-01-01T00:00:00Z" }] });
  }
  if (url.pathname === "/drive/v3/files/vault-file-1" && url.searchParams.get("alt") === "media") {
    return new Response(JSON.stringify(existingVault), { headers: { "content-type": "application/json" } });
  }
  if (url.pathname === "/upload/drive/v3/files/vault-file-1" && init.method === "PATCH") {
    patchedVaultText = String(init.body || "");
    return Response.json({ id: "vault-file-1" });
  }
  return new Response("unexpected", { status: 500 });
};

const updated = await upsertCardInGoogleDrive({
  token: "google-access-token",
  input: {
    title: "New title",
    summary: "Updated useful outcome.",
    sourceUrl,
    sourceTitle: "ChatGPT source",
    language: "en"
  },
  fetchFn: updateDriveFetch,
  now: Date.parse("2026-09-10T11:00:00Z")
});
assert.equal(updated.status, "updated");
assert.equal(updated.card.id, "result-existing");
assert.equal(updated.card.contentVersion, 2);
assert.equal(updated.card.sourceUrl, sourceUrl);
assert.match(patchedVaultText, /New title/);
assert.doesNotMatch(patchedVaultText, /google-access-token/);

const noAuthRpc = await worker.fetch(
  request("/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "upsert_card",
        arguments: { title: "Direct save", summary: "Useful outcome", language: "en" }
      }
    })
  }),
  { ASSETS: { fetch: async () => new Response("asset") } },
  { waitUntil() {}, passThroughOnException() {} }
);
assert.equal(noAuthRpc.status, 200);
const noAuthPayload = await noAuthRpc.json();
assert.equal(noAuthPayload.result.isError, true);
assert.ok(Array.isArray(noAuthPayload.result._meta?.["mcp/www_authenticate"]));
assert.match(noAuthPayload.result._meta["mcp/www_authenticate"][0], /oauth-protected-resource/);

const storage = new MemoryStorage();
const env = {
  GOOGLE_CLIENT_ID: "google-client-id.apps.googleusercontent.com",
  PLUGIN_OAUTH_SECRET: "0123456789abcdef0123456789abcdef",
  OAUTH_STATE: makeStateBinding(storage)
};

const verifier = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~";
const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
const challenge = Buffer.from(digest).toString("base64url");
await storage.put("code:test-code", {
  exp: Date.now() + 120000,
  clientId: CHATGPT_CIMD_CLIENT_ID,
  redirectUri: CHATGPT_REDIRECT_URI,
  resource: `${origin}/mcp`,
  scope: CARD_WRITE_SCOPE,
  codeChallenge: challenge,
  providerAccessToken: "google-access-token",
  providerExpiresAt: Date.now() + 3600000
});

const form = new URLSearchParams({
  grant_type: "authorization_code",
  code: "test-code",
  code_verifier: verifier,
  client_id: CHATGPT_CIMD_CLIENT_ID,
  redirect_uri: CHATGPT_REDIRECT_URI,
  resource: `${origin}/mcp`
});
const tokenResponse = await handleOAuthToken(
  request("/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form
  }),
  env
);
assert.equal(tokenResponse.status, 200);
const tokenPayload = await tokenResponse.json();
assert.equal(tokenPayload.token_type, "Bearer");
assert.equal(tokenPayload.scope, CARD_WRITE_SCOPE);
assert.ok(tokenPayload.access_token.startsWith("dg1."));
assert.doesNotMatch(JSON.stringify(tokenPayload), /google-access-token/);
assert.equal(await storage.get("code:test-code"), undefined, "authorization code must be consumed exactly once");

const replayResponse = await handleOAuthToken(
  request("/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form
  }),
  env
);
assert.equal(replayResponse.status, 400);
assert.equal((await replayResponse.json()).error, "invalid_grant");

console.log("F52 plugin direct-card-save regression checks passed.");
