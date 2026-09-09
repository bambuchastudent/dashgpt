const CARD_WRITE_SCOPE = "cards:write";
const CHATGPT_CIMD_CLIENT_ID = "https://chatgpt.com/oauth/client.json";
const CHATGPT_REDIRECT_URI = "https://chatgpt.com/connector_platform_oauth_redirect";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const PENDING_TTL_MS = 10 * 60 * 1000;
const CODE_TTL_MS = 2 * 60 * 1000;
const ACCESS_TTL_MS = 30 * 60 * 1000;
const GRANT_PREFIX = "dg1";

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function html(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set(
    "content-security-policy",
    "default-src 'none'; script-src 'unsafe-inline' https://accounts.google.com https://accounts.gstatic.com; connect-src 'self' https://accounts.google.com; style-src 'unsafe-inline'; img-src data: https://accounts.gstatic.com https://*.gstatic.com; frame-src https://accounts.google.com; base-uri 'none'; form-action 'self'"
  );
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-content-type-options", "nosniff");
  return new Response(body, { ...init, headers });
}

function origin(request) {
  return new URL(request.url).origin;
}

function issuer(request) {
  return origin(request);
}

function resource(request) {
  return new URL("/mcp", request.url).toString();
}

function metadataUrl(request) {
  return new URL("/.well-known/oauth-protected-resource", request.url).toString();
}

function randomToken(bytes = 24) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64UrlEncodeBytes(value);
}

function base64UrlEncodeBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeBytes(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function encodeJson(value) {
  return new TextEncoder().encode(JSON.stringify(value));
}

function decodeJson(bytes) {
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function secretKey(secret) {
  const clean = String(secret || "").trim();
  if (clean.length < 32) {
    const error = new Error("DashGPT plugin OAuth is not configured on this deployment.");
    error.code = "oauth_unconfigured";
    throw error;
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clean));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encodeGrant(payload, secret) {
  const key = await secretKey(secret);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encodeJson(payload));
  return `${GRANT_PREFIX}.${base64UrlEncodeBytes(iv)}.${base64UrlEncodeBytes(new Uint8Array(ciphertext))}`;
}

async function decodeGrant(token, secret) {
  const [prefix, ivText, ciphertextText] = String(token || "").split(".");
  if (prefix !== GRANT_PREFIX || !ivText || !ciphertextText) throw new Error("Invalid grant.");
  const key = await secretKey(secret);
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlDecodeBytes(ivText) },
    key,
    base64UrlDecodeBytes(ciphertextText)
  );
  return decodeJson(new Uint8Array(clear));
}

async function sha256Base64Url(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value || "")));
  return base64UrlEncodeBytes(new Uint8Array(digest));
}

function oauthStateStub(env) {
  if (!env?.OAUTH_STATE?.idFromName || !env?.OAUTH_STATE?.get) {
    const error = new Error("DashGPT plugin OAuth state is not configured on this deployment.");
    error.code = "oauth_unconfigured";
    throw error;
  }
  return env.OAUTH_STATE.get(env.OAUTH_STATE.idFromName("dashgpt-plugin-oauth"));
}

async function stateCall(env, operation, key, record = null) {
  const response = await oauthStateStub(env).fetch("https://dashgpt-oauth-state.internal/" + operation, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key, record })
  });
  if (!response.ok) throw new Error(`OAuth state ${operation} failed.`);
  return response.json();
}

async function statePut(env, key, record) {
  return stateCall(env, "put", key, record);
}

async function stateGet(env, key) {
  return (await stateCall(env, "get", key)).record || null;
}

async function stateTake(env, key) {
  return (await stateCall(env, "take", key)).record || null;
}

function validClient(clientId, redirectUri) {
  return clientId === CHATGPT_CIMD_CLIENT_ID && redirectUri === CHATGPT_REDIRECT_URI;
}

function parseScope(value) {
  return [...new Set(String(value || "").split(/\s+/).map(item => item.trim()).filter(Boolean))];
}

function exactCardWriteScope(value) {
  const scopes = parseScope(value);
  return scopes.length === 1 && scopes[0] === CARD_WRITE_SCOPE;
}

function authorizationErrorPage(message, status = 400) {
  const safe = String(message || "Authorization could not be completed.")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return html(`<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>DashGPT authorization</title><body style="font-family:system-ui,sans-serif;max-width:42rem;margin:3rem auto;padding:0 1rem"><h1>DashGPT</h1><p>${safe}</p></body></html>`, { status });
}

function oauthConfigured(env) {
  return Boolean(
    String(env?.GOOGLE_CLIENT_ID || "").trim()
    && String(env?.PLUGIN_OAUTH_SECRET || "").trim().length >= 32
    && env?.OAUTH_STATE?.idFromName
    && env?.OAUTH_STATE?.get
  );
}

export function handleOAuthProtectedResource(request) {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, { status: 405, headers: { allow: "GET" } });
  return json({
    resource: resource(request),
    authorization_servers: [issuer(request)],
    scopes_supported: [CARD_WRITE_SCOPE],
    resource_documentation: new URL("/demo/privacy.html", request.url).toString()
  });
}

export function handleOAuthAuthorizationServer(request) {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, { status: 405, headers: { allow: "GET" } });
  const base = issuer(request);
  return json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    scopes_supported: [CARD_WRITE_SCOPE],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    client_id_metadata_document_supported: true,
    authorization_response_iss_parameter_supported: true
  });
}

function authorizationPage({ clientId, nonce, googleClientId }) {
  const values = JSON.stringify({ clientId, nonce, googleClientId });
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connect DashGPT to Google Drive</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#f7f7f5;color:#181817;margin:0}.wrap{max-width:34rem;margin:0 auto;padding:3rem 1.25rem}.card{background:white;border:1px solid #ddd;border-radius:18px;padding:1.4rem;box-shadow:0 8px 30px #0000000d}button{width:100%;border:0;border-radius:12px;padding:.9rem 1rem;font:inherit;font-weight:650;background:#181817;color:white}button:disabled{opacity:.45}.muted{color:#666;line-height:1.45;font-size:.95rem}.status{min-height:1.4em;margin-top:1rem}
</style>
<div class="wrap"><div class="card"><h1>Connect DashGPT</h1><p>Allow DashGPT to save cards from ChatGPT into the DashGPT Vault in your Google Drive.</p><p class="muted">DashGPT requests only the existing <code>drive.file</code> permission. Your cards stay in your Google Drive; this authorization does not create a DashGPT-hosted memory database.</p><button id="connect" disabled>Preparing Google…</button><p id="status" class="status muted"></p></div></div>
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script>
const cfg=${values};
const button=document.querySelector('#connect');
const status=document.querySelector('#status');
let readyTimer=setInterval(()=>{if(globalThis.google?.accounts?.oauth2){clearInterval(readyTimer);button.disabled=false;button.textContent='Continue with Google';}},80);
setTimeout(()=>{if(button.disabled){status.textContent='Google sign-in could not be prepared. Reload this page to retry.';}},8000);
button.addEventListener('click',()=>{
  if(!globalThis.google?.accounts?.oauth2)return;
  button.disabled=true;status.textContent='Waiting for Google authorization…';
  const client=google.accounts.oauth2.initTokenClient({client_id:cfg.googleClientId,scope:'${GOOGLE_DRIVE_SCOPE}',callback:async response=>{
    if(!response?.access_token){button.disabled=false;status.textContent='Google authorization was not completed.';return;}
    status.textContent='Finishing DashGPT connection…';
    try{
      const result=await fetch('/oauth/authorize/complete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nonce:cfg.nonce,accessToken:response.access_token,expiresIn:Number(response.expires_in||3600)})});
      const payload=await result.json();
      if(!result.ok||!payload.redirectUrl)throw new Error(payload.error||'Authorization failed.');
      location.assign(payload.redirectUrl);
    }catch(error){button.disabled=false;status.textContent=error?.message||'Authorization failed.';}
  },error_callback:()=>{button.disabled=false;status.textContent='Google authorization popup was closed or unavailable.';}});
  client.requestAccessToken({prompt:'consent'});
});
</script></html>`;
}

export async function handleOAuthAuthorize(request, env) {
  if (request.method !== "GET") return authorizationErrorPage("Method not allowed.", 405);
  if (!oauthConfigured(env)) return authorizationErrorPage("DashGPT direct save is not configured on this deployment yet.", 503);

  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id") || "";
  const redirectUri = url.searchParams.get("redirect_uri") || "";
  const requestedResource = url.searchParams.get("resource") || "";
  const scope = url.searchParams.get("scope") || "";
  const responseType = url.searchParams.get("response_type") || "";
  const challenge = url.searchParams.get("code_challenge") || "";
  const challengeMethod = url.searchParams.get("code_challenge_method") || "";
  const state = url.searchParams.get("state") || "";

  if (!validClient(clientId, redirectUri)) return authorizationErrorPage("Unsupported ChatGPT OAuth client or redirect URI.");
  if (requestedResource !== resource(request)) return authorizationErrorPage("The requested DashGPT resource does not match this MCP server.");
  if (!exactCardWriteScope(scope)) return authorizationErrorPage("DashGPT requires exactly the cards:write permission for this action.");
  if (responseType !== "code" || challengeMethod !== "S256" || !/^[A-Za-z0-9_-]{43,128}$/.test(challenge)) {
    return authorizationErrorPage("DashGPT requires the OAuth authorization-code flow with PKCE S256.");
  }

  const nonce = randomToken();
  const now = Date.now();
  await statePut(env, `pending:${nonce}`, {
    exp: now + PENDING_TTL_MS,
    clientId,
    redirectUri,
    resource: requestedResource,
    scope,
    state,
    codeChallenge: challenge
  });
  return html(authorizationPage({ clientId, nonce, googleClientId: String(env.GOOGLE_CLIENT_ID).trim() }));
}

function pluginFetch(env) {
  return typeof env?.DASHGPT_PLUGIN_FETCH === "function" ? env.DASHGPT_PLUGIN_FETCH : fetch;
}

async function validateGoogleDriveAccess(env, accessToken) {
  const response = await pluginFetch(env)(
    "https://www.googleapis.com/drive/v3/files?pageSize=1&spaces=drive&fields=files(id)",
    { headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" } }
  );
  if (!response.ok) {
    const error = new Error("Google Drive authorization could not be verified. Please try Continue with Google again.");
    error.code = "google_authorization_invalid";
    throw error;
  }
}

export async function handleOAuthAuthorizeComplete(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, { status: 405, headers: { allow: "POST" } });
  if (!oauthConfigured(env)) return json({ error: "DashGPT direct save is not configured on this deployment yet." }, { status: 503 });

  try {
    const body = await request.json();
    const nonce = String(body?.nonce || "");
    const accessToken = String(body?.accessToken || "").trim();
    const expiresIn = Math.max(60, Math.min(Number(body?.expiresIn || 3600), 3600));
    if (!nonce || !accessToken) throw new Error("Authorization session is incomplete.");

    const pending = await stateGet(env, `pending:${nonce}`);
    if (!pending || Number(pending.exp || 0) <= Date.now()) throw new Error("Authorization session expired. Start the DashGPT connection again.");
    await validateGoogleDriveAccess(env, accessToken);

    const consumed = await stateTake(env, `pending:${nonce}`);
    if (!consumed) throw new Error("Authorization session was already completed. Start the DashGPT connection again.");

    const code = randomToken(32);
    const now = Date.now();
    await statePut(env, `code:${code}`, {
      exp: now + CODE_TTL_MS,
      clientId: consumed.clientId,
      redirectUri: consumed.redirectUri,
      resource: consumed.resource,
      scope: consumed.scope,
      codeChallenge: consumed.codeChallenge,
      providerAccessToken: accessToken,
      providerExpiresAt: now + expiresIn * 1000
    });

    const redirect = new URL(consumed.redirectUri);
    redirect.searchParams.set("code", code);
    if (consumed.state) redirect.searchParams.set("state", consumed.state);
    redirect.searchParams.set("iss", issuer(request));
    return json({ redirectUrl: redirect.toString() });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Authorization could not be completed." }, { status: 400 });
  }
}

function oauthTokenError(error, description, status = 400) {
  return json({ error, error_description: description }, { status });
}

export async function handleOAuthToken(request, env) {
  if (request.method !== "POST") return oauthTokenError("invalid_request", "Method not allowed.", 405);
  if (!oauthConfigured(env)) return oauthTokenError("temporarily_unavailable", "DashGPT direct save is not configured on this deployment yet.", 503);

  let form;
  try {
    form = await request.formData();
  } catch {
    return oauthTokenError("invalid_request", "Expected an OAuth form body.");
  }
  if (String(form.get("grant_type") || "") !== "authorization_code") {
    return oauthTokenError("unsupported_grant_type", "Only authorization_code is supported.");
  }

  const code = String(form.get("code") || "");
  const verifier = String(form.get("code_verifier") || "");
  const clientId = String(form.get("client_id") || "");
  const redirectUri = String(form.get("redirect_uri") || "");
  const requestedResource = String(form.get("resource") || "");
  if (!code || !verifier || !validClient(clientId, redirectUri) || requestedResource !== resource(request)) {
    return oauthTokenError("invalid_grant", "Authorization code exchange parameters are invalid.");
  }

  const stored = await stateGet(env, `code:${code}`);
  if (!stored || Number(stored.exp || 0) <= Date.now()) return oauthTokenError("invalid_grant", "Authorization code is invalid or expired.");
  if (
    stored.clientId !== clientId
    || stored.redirectUri !== redirectUri
    || stored.resource !== requestedResource
    || !exactCardWriteScope(stored.scope)
    || await sha256Base64Url(verifier) !== stored.codeChallenge
  ) {
    return oauthTokenError("invalid_grant", "Authorization code exchange parameters are invalid.");
  }

  const consumed = await stateTake(env, `code:${code}`);
  if (!consumed) return oauthTokenError("invalid_grant", "Authorization code was already used.");
  const now = Date.now();
  const providerExpiresAt = Number(consumed.providerExpiresAt || 0);
  const expiresAt = Math.min(now + ACCESS_TTL_MS, providerExpiresAt - 30_000);
  if (expiresAt <= now + 30_000) return oauthTokenError("invalid_grant", "Google authorization is too close to expiry. Please link DashGPT again.");

  const accessToken = await encodeGrant({
    iss: issuer(request),
    aud: requestedResource,
    scope: CARD_WRITE_SCOPE,
    iat: Math.floor(now / 1000),
    exp: Math.floor(expiresAt / 1000),
    provider: "google-drive",
    providerAccessToken: consumed.providerAccessToken,
    providerExpiresAt: Math.floor(providerExpiresAt / 1000)
  }, env.PLUGIN_OAUTH_SECRET);

  return json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: Math.max(1, Math.floor((expiresAt - now) / 1000)),
    scope: CARD_WRITE_SCOPE
  });
}

export function mcpOAuthChallenge(request, error = "invalid_token", description = "Connect DashGPT to Google Drive to save this card.") {
  const cleanDescription = String(description).replace(/["\\\r\n]/g, " ").slice(0, 220);
  return `Bearer resource_metadata="${metadataUrl(request)}", error="${error}", error_description="${cleanDescription}"`;
}

export function mcpOAuthErrorResult(request, { error = "invalid_token", description, language = "en" } = {}) {
  const text = language === "ru"
    ? "Подключи DashGPT к Google Drive, чтобы сохранить карточку прямо из этого разговора."
    : "Connect DashGPT to Google Drive to save this card directly from the conversation.";
  return {
    content: [{ type: "text", text }],
    _meta: { "mcp/www_authenticate": [mcpOAuthChallenge(request, error, description || text)] },
    isError: true
  };
}

export async function authorizePluginCardWrite(request, env) {
  const header = String(request.headers.get("authorization") || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return { ok: false, error: "insufficient_scope", description: "DashGPT Card write authorization is required." };

  try {
    const grant = await decodeGrant(match[1], env?.PLUGIN_OAUTH_SECRET);
    const now = Math.floor(Date.now() / 1000);
    if (grant?.iss !== issuer(request)) throw new Error("issuer mismatch");
    if (grant?.aud !== resource(request)) throw new Error("resource mismatch");
    if (!parseScope(grant?.scope).includes(CARD_WRITE_SCOPE)) throw new Error("scope mismatch");
    if (!Number.isFinite(Number(grant?.exp)) || Number(grant.exp) <= now) throw new Error("expired");
    if (!Number.isFinite(Number(grant?.providerExpiresAt)) || Number(grant.providerExpiresAt) <= now + 15) throw new Error("provider expired");
    if (grant?.provider !== "google-drive" || !grant?.providerAccessToken) throw new Error("provider mismatch");
    return { ok: true, provider: "google-drive", providerAccessToken: grant.providerAccessToken };
  } catch {
    return { ok: false, error: "invalid_token", description: "DashGPT authorization expired or is invalid. Link Google Drive again." };
  }
}

export class OAuthState {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    if (request.method !== "POST") return json({ error: "Method not allowed." }, { status: 405 });
    const operation = new URL(request.url).pathname.slice(1);
    const body = await request.json();
    const key = String(body?.key || "");
    if (!key) return json({ error: "Missing state key." }, { status: 400 });

    if (operation === "put") {
      const record = body?.record;
      if (!record || !Number.isFinite(Number(record.exp))) return json({ error: "Invalid state record." }, { status: 400 });
      await this.state.storage.put(key, record);
      const alarm = await this.state.storage.getAlarm();
      if (alarm == null || Number(record.exp) < alarm) await this.state.storage.setAlarm(Number(record.exp));
      return json({ ok: true });
    }

    const record = await this.state.storage.get(key);
    if (!record) return json({ record: null });
    if (Number(record.exp || 0) <= Date.now()) {
      await this.state.storage.delete(key);
      return json({ record: null });
    }
    if (operation === "take") await this.state.storage.delete(key);
    else if (operation !== "get") return json({ error: "Unknown state operation." }, { status: 404 });
    return json({ record });
  }

  async alarm() {
    const records = await this.state.storage.list();
    const now = Date.now();
    let next = null;
    const expired = [];
    for (const [key, record] of records) {
      const exp = Number(record?.exp || 0);
      if (!exp || exp <= now) expired.push(key);
      else if (next == null || exp < next) next = exp;
    }
    if (expired.length) await this.state.storage.delete(expired);
    if (next != null) await this.state.storage.setAlarm(next);
  }
}

export {
  CARD_WRITE_SCOPE,
  CHATGPT_CIMD_CLIENT_ID,
  CHATGPT_REDIRECT_URI,
  GOOGLE_DRIVE_SCOPE,
  oauthConfigured
};
