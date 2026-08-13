import { PUBLISHED_RESULT_PATHS, mergePublishedResultCatalogs } from "./result-catalog.js";

const nativeFetch = globalThis.fetch.bind(globalThis);
const primaryPath = PUBLISHED_RESULT_PATHS[0];

function localVaultHasResults() {
  try {
    const vault = JSON.parse(globalThis.localStorage?.getItem?.("dashgpt.demo.vault.v1") || "null");
    return Array.isArray(vault?.results) && vault.results.length > 0;
  } catch {
    return false;
  }
}

function publishedCatalogAllowed() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("personal") === "1") return false;
  if (params.get("showcase") === "1") return true;
  if (["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) return !localVaultHasResults();
  return /^\/demo\/(?:result|dash)\//.test(window.location.pathname);
}

function chatGptHistoryImportAllowed() {
  const params = new URLSearchParams(window.location.search);
  if (!/^\/demo\/?$/.test(window.location.pathname) || params.get("showcase") === "1") return false;
  if (params.get("chatgptImportReceiver") === "1") return true;
  const local = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  return local ? params.get("personal") === "1" : true;
}

function emptyCatalogResponse() {
  return new Response("[]", {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-dashgpt-catalog-scope": "personal"
    }
  });
}

async function mergedPublishedResults(input, init) {
  const primaryResponse = await nativeFetch(input, init);
  if (!primaryResponse.ok) return primaryResponse;

  const primary = await primaryResponse.clone().json();
  if (!Array.isArray(primary)) return primaryResponse;

  const shards = await Promise.all(PUBLISHED_RESULT_PATHS.slice(1).map(async (path) => {
    const response = await nativeFetch(path, { ...init, cache: "no-store" });
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`Published Result catalog ${path} returned ${response.status}`);
    const parsed = await response.json();
    if (!Array.isArray(parsed)) throw new Error(`Published Result catalog ${path} is not an array.`);
    return parsed;
  }));

  const combined = mergePublishedResultCatalogs([primary, ...shards]);
  const headers = new Headers(primaryResponse.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-dashgpt-catalog-scope", "published");
  return new Response(JSON.stringify(combined), {
    status: primaryResponse.status,
    statusText: primaryResponse.statusText,
    headers
  });
}

globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
  if (url.origin === window.location.origin && url.pathname === primaryPath) {
    if (!publishedCatalogAllowed()) return emptyCatalogResponse();
    return mergedPublishedResults(input, init);
  }
  return nativeFetch(input, init);
};

if (!document.querySelector('link[data-dashgpt-onboarding]')) {
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "/demo/onboarding.css";
  stylesheet.dataset.dashgptOnboarding = "true";
  document.head.append(stylesheet);
}

if (!document.querySelector('link[data-dashgpt-unified-dashboard]')) {
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "/demo/unified-dashboard.css";
  stylesheet.dataset.dashgptUnifiedDashboard = "true";
  document.head.append(stylesheet);
}

const feature20PersonalEntry = chatGptHistoryImportAllowed();
let chatGptHistoryImport = null;
if (feature20PersonalEntry) {
  // F28 observes enrichment-aware HELLO/BATCH first. The established Feature 20
  // fast path remains installed behind it for source-state handling and as a
  // compatibility fallback for older source runners.
  const semanticBridge = await import("./chatgpt-semantic-import-bridge.js");
  semanticBridge.installChatGptSemanticImportBridge();

  const chatGptBatchFastPath = await import("./chatgpt-history-import-batch.js");
  chatGptBatchFastPath.installChatGptImportBatchFastPath();

  // Feature 20 seeds the one default import card before app.js and the clean-user
  // onboarding make their empty/non-empty decision. The same module also arms the
  // bounded cross-window receiver before any ChatGPT source runner can connect.
  chatGptHistoryImport = await import("./chatgpt-history-import.js");
  chatGptHistoryImport.initializeChatGptHistoryImport({ phase: "pre-app" });
}

await import("./app.js");
await import("./google-drive-sync.js");
await import("./share-link-compat.js");
await import("./public-onboarding.js");
await import("./anonymous-share-onboarding.js");
await import("./product-board-discovery.js");
await import("./unified-dashboard.js");
await import("./unified-onboarding.js");
await import("./unified-search.js");
await import("./unified-dashboard-routing.js");
await import("./unified-product-board.js");

if (chatGptHistoryImport) {
  // App/gallery ownership remains with the existing canonical renderer. Feature
  // 20 only decorates its one operational card and adds the explicit restore
  // action for already-populated Vaults.
  chatGptHistoryImport.initializeChatGptHistoryImport({ phase: "post-app" });
}
