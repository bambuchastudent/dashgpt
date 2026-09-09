import assert from "node:assert/strict";
import worker from "../src/worker.js";
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

assert.throws(
  () => normalizePluginCardInput({ title: "Secret", summary: "Store sk-proj-abcdefghijklmnop1234" }),
  error => error?.code === "secret_like_content"
);
assert.throws(
  () => normalizePluginCardInput({ title: "Bad source", summary: "Summary", sourceUrl: "https://example.com/chat" }),
  error => error?.code === "invalid_source_url"
);

const calls = [];
const fakeDriveFetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  calls.push({ url: url.toString(), method: init.method || "GET", body: init.body || "" });
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
  fetchFn: fakeDriveFetch,
  now: Date.parse("2026-09-10T10:00:00Z")
});
assert.equal(saved.status, "created");
assert.equal(saved.provider, "google-drive");
assert.equal(saved.fileId, "vault-file-1");
assert.match(saved.card.id, /^result-/);
assert.ok(calls.some(call => call.url.includes("/upload/drive/v3/files") && call.method === "POST"));

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
