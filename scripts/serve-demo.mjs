import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const port = Number(process.env.PORT || 4173);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function safePath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const normalized = normalize(decoded).replace(/^[/\\]+/, "");
  if (normalized.startsWith("..")) return null;
  return join(root, normalized);
}

async function fileResponse(pathname) {
  const file = safePath(pathname);
  if (!file) return null;
  try {
    const info = await stat(file);
    const target = info.isDirectory() ? join(file, "index.html") : file;
    return new Response(await readFile(target), {
      headers: { "content-type": types[extname(target)] || "application/octet-stream", "cache-control": "no-store" }
    });
  } catch {
    return null;
  }
}

function isDemoDeepRoute(pathname) {
  return /^\/demo\/result\/[^/]+\/?$/.test(pathname)
    || /^\/demo\/dashes\/[^/]+\/?$/.test(pathname)
    || /^\/demo\/dash\/[^/]+\/?$/.test(pathname);
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  let result = await fileResponse(url.pathname);
  if (!result && isDemoDeepRoute(url.pathname)) result = await fileResponse("/demo/index.html");
  result ||= new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  response.writeHead(result.status, Object.fromEntries(result.headers));
  response.end(Buffer.from(await result.arrayBuffer()));
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`DashGPT demo test server listening on http://127.0.0.1:${port}\n`);
});
