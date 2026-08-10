export const PUBLISHED_RESULT_PATHS = Object.freeze([
  "/demo/data/results.json",
  "/demo/data/product-results-a.json",
  "/demo/data/product-results-b.json",
  "/demo/data/product-results-c.json"
]);

function comparableResult(result) {
  return JSON.stringify(result);
}

export function mergePublishedResultCatalogs(catalogs) {
  const merged = [];
  const byId = new Map();

  for (const catalog of Array.isArray(catalogs) ? catalogs : []) {
    if (!Array.isArray(catalog)) throw new Error("Published Result catalog is not an array.");
    for (const result of catalog) {
      if (!result || typeof result.id !== "string" || !result.id.trim()) {
        throw new Error("Published Result catalog contains an invalid Result.");
      }

      const existing = byId.get(result.id);
      if (!existing) {
        byId.set(result.id, result);
        merged.push(result);
        continue;
      }

      if (comparableResult(existing) !== comparableResult(result)) {
        throw new Error(`Published Result catalog contains conflicting duplicate id ${result.id}.`);
      }
    }
  }

  return merged;
}

export async function loadPublishedResultCatalog(fetcher, options = {}) {
  if (typeof fetcher !== "function") throw new TypeError("A fetcher function is required.");
  const paths = Array.isArray(options.paths) ? options.paths : PUBLISHED_RESULT_PATHS;
  const catalogs = [];

  for (let index = 0; index < paths.length; index += 1) {
    const path = paths[index];
    const response = await fetcher(path);
    if (response.status === 404 && index > 0) continue;
    if (!response.ok) throw new Error(`Published Result catalog ${path} returned ${response.status}`);
    const parsed = await response.json();
    if (!Array.isArray(parsed)) throw new Error(`Published Result catalog ${path} is not an array.`);
    catalogs.push(parsed);
  }

  return mergePublishedResultCatalogs(catalogs);
}
