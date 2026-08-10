import { App, Octokit } from "octokit";
import { portableVault } from "../demo/vault.js";
import { locatorKey, resolveStorageLocator } from "./storage-locator.js";
import { mergeVaultObjectSets, vaultToObjects } from "./vault-layout.js";

const PENDING_COOKIE = "dashgpt_gh_pending";
const SESSION_COOKIE = "dashgpt_gh_session";
const COOKIE_PATH = "/";
const PENDING_TTL_SECONDS = 10 * 60;
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const API_VERSION = "2026-03-10";

function base64UrlEncodeBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function base64UrlEncodeText(value) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlDecodeText(value) {
  return new TextDecoder().decode(base64UrlDecodeBytes(value));
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function encodeSigned(payload, secret) {
  const body = base64UrlEncodeText(JSON.stringify(payload));
  const signature = base64UrlEncodeBytes(await hmac(body, secret));
  return `${body}.${signature}`;
}

async function decodeSigned(value, secret) {
  if (!value || !value.includes(".")) return null;
  const [body, signature] = value.split(".", 2);
  const expected = await hmac(body, secret);
  const actual = base64UrlDecodeBytes(signature);
  if (!timingSafeEqual(expected, actual)) return null;
  const payload = JSON.parse(base64UrlDecodeText(body));
  if (!payload?.exp || Date.now() >= Number(payload.exp)) return null;
  return payload;
}

function parseCookies(request) {
  const cookies = new Map();
  for (const part of String(request.headers.get("cookie") || "").split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    cookies.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  }
  return cookies;
}

function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=${COOKIE_PATH}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookie(name) {
  return `${name}=; Path=${COOKIE_PATH}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data, null, 2), { ...init, headers });
}

function configured(env) {
  return Boolean(env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY && env.GITHUB_APP_SLUG && env.GITHUB_SESSION_SECRET);
}

function requireConfig(env) {
  if (!configured(env)) {
    const error = new Error("GitHub sync is not configured on this DashGPT deployment yet.");
    error.code = "github_app_unconfigured";
    throw error;
  }
}

function privateKey(env) {
  return String(env.GITHUB_APP_PRIVATE_KEY).replace(/\\n/g, "\n");
}

async function productionRepoClient(env, installationId, locator) {
  requireConfig(env);
  const app = new App({ appId: String(env.GITHUB_APP_ID), privateKey: privateKey(env) });
  const tokenResponse = await app.octokit.request("POST /app/installations/{installation_id}/access_tokens", {
    installation_id: Number(installationId),
    repositories: [locator.repo],
    permissions: { contents: "write" },
    headers: { "x-github-api-version": API_VERSION }
  });
  const octokit = new Octokit({ auth: tokenResponse.data.token });

  return {
    async getRepo() {
      return (await octokit.request("GET /repos/{owner}/{repo}", {
        owner: locator.owner,
        repo: locator.repo,
        headers: { "x-github-api-version": API_VERSION }
      })).data;
    },
    async getRef(branch) {
      return (await octokit.request("GET /repos/{owner}/{repo}/git/ref/{ref}", {
        owner: locator.owner,
        repo: locator.repo,
        ref: `heads/${branch}`,
        headers: { "x-github-api-version": API_VERSION }
      })).data;
    },
    async getCommit(sha) {
      return (await octokit.request("GET /repos/{owner}/{repo}/git/commits/{commit_sha}", {
        owner: locator.owner,
        repo: locator.repo,
        commit_sha: sha,
        headers: { "x-github-api-version": API_VERSION }
      })).data;
    },
    async getTree(sha) {
      return (await octokit.request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
        owner: locator.owner,
        repo: locator.repo,
        tree_sha: sha,
        recursive: "1",
        headers: { "x-github-api-version": API_VERSION }
      })).data;
    },
    async getBlob(sha) {
      return (await octokit.request("GET /repos/{owner}/{repo}/git/blobs/{file_sha}", {
        owner: locator.owner,
        repo: locator.repo,
        file_sha: sha,
        headers: { "x-github-api-version": API_VERSION }
      })).data;
    },
    async createBlob(content) {
      return (await octokit.request("POST /repos/{owner}/{repo}/git/blobs", {
        owner: locator.owner,
        repo: locator.repo,
        content,
        encoding: "utf-8",
        headers: { "x-github-api-version": API_VERSION }
      })).data;
    },
    async createTree(baseTree, tree) {
      return (await octokit.request("POST /repos/{owner}/{repo}/git/trees", {
        owner: locator.owner,
        repo: locator.repo,
        base_tree: baseTree,
        tree,
        headers: { "x-github-api-version": API_VERSION }
      })).data;
    },
    async createCommit(message, tree, parent) {
      return (await octokit.request("POST /repos/{owner}/{repo}/git/commits", {
        owner: locator.owner,
        repo: locator.repo,
        message,
        tree,
        parents: [parent],
        headers: { "x-github-api-version": API_VERSION }
      })).data;
    },
    async updateRef(branch, sha) {
      return (await octokit.request("PATCH /repos/{owner}/{repo}/git/refs/{ref}", {
        owner: locator.owner,
        repo: locator.repo,
        ref: `heads/${branch}`,
        sha,
        force: false,
        headers: { "x-github-api-version": API_VERSION }
      })).data;
    },
    async initializeFile(path, content, branch = null) {
      const parameters = {
        owner: locator.owner,
        repo: locator.repo,
        path,
        message: "Initialize DashGPT Vault",
        content: base64UrlToBase64(base64UrlEncodeText(content)),
        headers: { "x-github-api-version": API_VERSION }
      };
      if (branch) parameters.branch = branch;
      return (await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", parameters)).data;
    }
  };
}

function base64UrlToBase64(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return normalized + "=".repeat((4 - normalized.length % 4) % 4);
}

async function repoClient(env, installationId, locator) {
  if (typeof env.DASHGPT_GITHUB_CLIENT_FACTORY === "function") {
    return env.DASHGPT_GITHUB_CLIENT_FACTORY({ installationId: Number(installationId), locator });
  }
  return productionRepoClient(env, installationId, locator);
}

function isNotFound(error) {
  return Number(error?.status) === 404 || String(error?.message || "").includes("404");
}

function decodeBlob(blob) {
  if (blob.encoding !== "base64") throw new Error("Unsupported GitHub blob encoding.");
  const binary = atob(String(blob.content || "").replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function underRoot(path, root) {
  return path === `${root}/dashgpt-vault.json` || path.startsWith(`${root}/results/`) || path.startsWith(`${root}/events/`) || path.startsWith(`${root}/profile/`);
}

async function readRemoteObjects(client, locator, branch) {
  let ref;
  try {
    ref = await client.getRef(branch);
  } catch (error) {
    if (isNotFound(error)) return { branchExists: false, headSha: null, treeSha: null, objects: [] };
    throw error;
  }
  const commit = await client.getCommit(ref.object.sha);
  const tree = await client.getTree(commit.tree.sha);
  if (tree.truncated) throw new Error("GitHub repository tree is too large for safe DashGPT sync.");
  const entries = (tree.tree || []).filter((entry) => entry.type === "blob" && underRoot(entry.path, locator.path));
  const objects = await Promise.all(entries.map(async (entry) => ({
    path: entry.path,
    sha: entry.sha,
    content: decodeBlob(await client.getBlob(entry.sha))
  })));
  return { branchExists: true, headSha: ref.object.sha, treeSha: commit.tree.sha, objects };
}

async function writeObjectCommit(client, locator, branch, remote, desiredObjects) {
  const currentByPath = new Map(remote.objects.map((object) => [object.path, object]));
  const changed = desiredObjects.filter((object) => currentByPath.get(object.path)?.content !== object.content);
  if (!changed.length) return { changed: 0, commitSha: remote.headSha };

  if (!remote.branchExists) {
    const manifest = desiredObjects.find((object) => object.path === `${locator.path}/dashgpt-vault.json`);
    if (!manifest) throw new Error("DashGPT Vault manifest is missing.");
    await client.initializeFile(manifest.path, manifest.content, null);
    const initialized = await readRemoteObjects(client, locator, branch);
    return writeObjectCommit(client, locator, branch, initialized, desiredObjects);
  }

  const treeEntries = [];
  for (const object of changed) {
    const blob = await client.createBlob(object.content);
    treeEntries.push({ path: object.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const tree = await client.createTree(remote.treeSha, treeEntries);
  const commit = await client.createCommit(`Sync DashGPT Vault (${changed.length} object${changed.length === 1 ? "" : "s"})`, tree.sha, remote.headSha);
  try {
    await client.updateRef(branch, commit.sha);
  } catch (error) {
    const conflict = new Error("GitHub branch changed during DashGPT sync. Retry to merge the newer state.");
    conflict.code = "github_sync_race";
    conflict.cause = error;
    throw conflict;
  }
  return { changed: changed.length, commitSha: commit.sha };
}

async function sessionFromRequest(request, env) {
  if (!env.GITHUB_SESSION_SECRET) return null;
  const signed = parseCookies(request).get(SESSION_COOKIE);
  const payload = await decodeSigned(signed, String(env.GITHUB_SESSION_SECRET));
  if (!payload?.installationId || !payload?.locator) return null;
  return payload;
}

export async function handleGitHubPairStart(request, env) {
  try {
    requireConfig(env);
    if (request.method !== "POST") return json({ error: "Method not allowed." }, { status: 405, headers: { allow: "POST" } });
    const body = await request.json();
    const locator = resolveStorageLocator(body?.url);
    const pending = {
      locator,
      key: locatorKey(locator),
      exp: Date.now() + PENDING_TTL_SECONDS * 1000
    };
    const signed = await encodeSigned(pending, String(env.GITHUB_SESSION_SECRET));
    const installUrl = `https://github.com/apps/${encodeURIComponent(String(env.GITHUB_APP_SLUG))}/installations/new`;
    return json(
      { locator, installUrl, authorization: "github-app-installation" },
      { headers: { "set-cookie": cookie(PENDING_COOKIE, signed, PENDING_TTL_SECONDS) } }
    );
  } catch (error) {
    return json({ error: error.message, code: error.code || "github_pair_failed" }, { status: error.code === "github_app_unconfigured" ? 503 : 400 });
  }
}

export async function handleGitHubSetup(request, env) {
  try {
    requireConfig(env);
    const url = new URL(request.url);
    const installationId = Number(url.searchParams.get("installation_id"));
    if (!Number.isSafeInteger(installationId) || installationId <= 0) throw new Error("GitHub installation id is missing.");
    const pending = await decodeSigned(parseCookies(request).get(PENDING_COOKIE), String(env.GITHUB_SESSION_SECRET));
    if (!pending?.locator) throw new Error("GitHub pairing session expired. Start from DashGPT Storage again.");

    const client = await repoClient(env, installationId, pending.locator);
    const repository = await client.getRepo();
    if (repository.full_name?.toLowerCase() !== `${pending.locator.owner}/${pending.locator.repo}`.toLowerCase()) {
      throw new Error("The GitHub App installation does not match the selected repository.");
    }
    const branch = pending.locator.ref || repository.default_branch;
    if (!branch) throw new Error("Selected GitHub repository has no default branch.");

    const session = {
      installationId,
      locator: { ...pending.locator, ref: branch },
      key: pending.key,
      exp: Date.now() + SESSION_TTL_SECONDS * 1000
    };
    const signed = await encodeSigned(session, String(env.GITHUB_SESSION_SECRET));
    const redirect = new URL("/demo/", request.url);
    redirect.searchParams.set("storage", "github-paired");
    const headers = new Headers({ location: redirect.toString() });
    headers.append("set-cookie", cookie(SESSION_COOKIE, signed, SESSION_TTL_SECONDS));
    headers.append("set-cookie", clearCookie(PENDING_COOKIE));
    return new Response(null, { status: 302, headers });
  } catch (error) {
    const redirect = new URL("/demo/", request.url);
    redirect.searchParams.set("storage", "github-error");
    redirect.searchParams.set("message", error.message.slice(0, 180));
    return Response.redirect(redirect, 302);
  }
}

export async function handleGitHubStatus(request, env) {
  const session = await sessionFromRequest(request, env);
  return json({
    configured: configured(env),
    paired: Boolean(session),
    locator: session?.locator || null,
    authorization: session ? "github-app-installation" : null
  });
}

export async function handleGitHubDisconnect(request) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, { status: 405, headers: { allow: "POST" } });
  return json({ paired: false }, { headers: { "set-cookie": clearCookie(SESSION_COOKIE) } });
}

export async function handleGitHubSync(request, env) {
  try {
    if (request.method !== "POST") return json({ error: "Method not allowed." }, { status: 405, headers: { allow: "POST" } });
    const session = await sessionFromRequest(request, env);
    if (!session) return json({ error: "GitHub storage is not paired.", code: "github_not_paired" }, { status: 401 });
    const body = await request.json();
    const localVault = portableVault(body?.vault);
    const client = await repoClient(env, session.installationId, session.locator);
    const repository = await client.getRepo();
    const branch = session.locator.ref || repository.default_branch;
    const remote = await readRemoteObjects(client, session.locator, branch);
    const merged = mergeVaultObjectSets(localVault, remote.objects, session.locator.path);
    const desired = vaultToObjects(merged, session.locator.path);
    const write = await writeObjectCommit(client, session.locator, branch, remote, desired);
    return json({
      paired: true,
      locator: session.locator,
      vault: merged,
      sync: { changedObjects: write.changed, commitSha: write.commitSha, branch }
    });
  } catch (error) {
    const status = error.code === "vault_id_mismatch" ? 409 : error.code === "github_sync_race" ? 409 : 500;
    return json({
      error: error.message,
      code: error.code || "github_sync_failed",
      ...(error.remoteVaultId ? { remoteVaultId: error.remoteVaultId } : {})
    }, { status });
  }
}

export { configured as githubStorageConfigured };
