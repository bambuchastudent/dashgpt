import coreWorker from "./index.js";
import { handleGoogleDriveConfig } from "./google-drive-config.js";
import {
  handleGitHubDisconnect,
  handleGitHubPairStart,
  handleGitHubSetup,
  handleGitHubStatus,
  handleGitHubSync
} from "./github-storage.js";
import {
  tryAnonymousSharedChat,
  tryBrowserSessionSharedChat
} from "./shared-chat-anon.js";
import {
  attachDiagnostics,
  diagnosticsRequested,
  legacyDiagnosticReplay
} from "./shared-chat-diagnostics.js";
import { handleSharedChat } from "./shared-chat.js";

const PRODUCT_RESULT_SHARDS = Object.freeze([
  "/data/product-results-a.json",
  "/data/product-results-b.json"
]);

function withUnifiedResultAssets(env) {
  const assets = env?.ASSETS;
  if (!assets || typeof assets.fetch !== "function") return env;
  const assetFetch = assets.fetch.bind(assets);

  const unifiedAssets = {
    async fetch(input, init) {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.pathname !== "/data/results.json") return assetFetch(input, init);

      const primaryResponse = await assetFetch(input, init);
      if (!primaryResponse.ok) return primaryResponse;

      let primary;
      try {
        primary = await primaryResponse.clone().json();
      } catch {
        return primaryResponse;
      }
      if (!Array.isArray(primary)) return primaryResponse;

      const extra = [];
      for (const path of PRODUCT_RESULT_SHARDS) {
        const response = await assetFetch(new Request(new URL(path, "https://dashgpt-assets.local")), init);
        if (response.status === 404) continue;
        if (!response.ok) throw new Error(`Published Result catalog ${path} returned ${response.status}`);
        const parsed = await response.json();
        if (!Array.isArray(parsed)) throw new Error(`Published Result catalog ${path} is not an array.`);
        extra.push(...parsed);
      }

      const combined = [...primary, ...extra];
      const ids = new Set();
      for (const result of combined) {
        if (!result?.id || ids.has(result.id)) throw new Error(`Invalid or duplicate published Result id: ${result?.id || "<missing>"}`);
        ids.add(result.id);
      }

      const headers = new Headers(primaryResponse.headers);
      headers.set("content-type", "application/json; charset=utf-8");
      headers.set("cache-control", "no-store");
      return new Response(JSON.stringify(combined), {
        status: primaryResponse.status,
        statusText: primaryResponse.statusText,
        headers
      });
    }
  };

  return { ...env, ASSETS: unifiedAssets };
}

async function isSharedChatUnreadable(response) {
  if (response.status !== 502) return false;
  try {
    const payload = await response.clone().json();
    return payload?.code === "SHARED_CHAT_UNREADABLE";
  } catch {
    return false;
  }
}

async function handleSharedChatWithAnonymousRecovery(request, env) {
  const trace = diagnosticsRequested(request) ? [] : null;

  const anonymousResponse = await tryAnonymousSharedChat(request, env, trace);
  if (anonymousResponse) return anonymousResponse;

  const existingResponse = await handleSharedChat(request, env);
  if (!(await isSharedChatUnreadable(existingResponse))) return existingResponse;

  const browserSessionResponse = await tryBrowserSessionSharedChat(request, env, trace);
  if (browserSessionResponse) return browserSessionResponse;
  if (!trace) return existingResponse;

  trace.push(...await legacyDiagnosticReplay(request, env));
  return attachDiagnostics(existingResponse, request, trace);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/shared-chat") return handleSharedChatWithAnonymousRecovery(request, env);
    if (url.pathname === "/api/storage/google/config") return handleGoogleDriveConfig(request, env);
    if (url.pathname === "/api/storage/github/pair") return handleGitHubPairStart(request, env);
    if (url.pathname === "/api/storage/github/setup") return handleGitHubSetup(request, env);
    if (url.pathname === "/api/storage/github/status") return handleGitHubStatus(request, env);
    if (url.pathname === "/api/storage/github/sync") return handleGitHubSync(request, env);
    if (url.pathname === "/api/storage/github/disconnect") return handleGitHubDisconnect(request, env);

    return coreWorker.fetch(request, withUnifiedResultAssets(env), ctx);
  }
};
