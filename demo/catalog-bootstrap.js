import { PUBLISHED_RESULT_PATHS, mergePublishedResultCatalogs } from "./result-catalog.js";

const nativeFetch = globalThis.fetch.bind(globalThis);
const primaryPath = PUBLISHED_RESULT_PATHS[0];

function publishedCatalogAllowed() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("personal") === "1") return false;
  if (params.get("showcase") === "1") return true;
  if (["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) return true;
  return /^\/demo\/(?:result|dash)\//.test(window.location.pathname);
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

await import("./app.js");
await import("./public-onboarding.js");
await import("./product-board-discovery.js");
