import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../demo/index.html", import.meta.url), "utf8");
const favicon = readFileSync(new URL("../demo/favicon.svg", import.meta.url), "utf8");
const pluginLogo = readFileSync(new URL("../plugins/dashgpt/assets/logo.svg", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../demo/site.webmanifest", import.meta.url), "utf8"));
const robots = readFileSync(new URL("../demo/robots.txt", import.meta.url), "utf8");

function requireText(haystack, needle, label) {
  if (!haystack.includes(needle)) throw new Error(`Missing ${label}: ${needle}`);
}

const title = "DashGPT — Save, find and continue useful AI work";
const description = "DashGPT keeps useful outcomes from AI conversations as cards so you can find them and continue your work later.";

requireText(index, `<title>${title}</title>`, "document title");
requireText(index, `<meta name="description" content="${description}" />`, "meta description");
requireText(index, '<link rel="icon" href="/demo/favicon.svg" type="image/svg+xml" />', "favicon link");
requireText(index, '<link rel="manifest" href="/demo/site.webmanifest" />', "manifest link");
requireText(index, '<link rel="canonical" href="/demo/" />', "canonical link");
requireText(index, '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />', "robots meta");
requireText(index, `<meta property="og:title" content="${title}" />`, "Open Graph title");
requireText(index, `<meta property="og:description" content="${description}" />`, "Open Graph description");
requireText(index, '<meta property="og:type" content="website" />', "Open Graph type");
requireText(index, '<meta property="og:site_name" content="DashGPT" />', "Open Graph site name");
requireText(index, '<meta name="twitter:card" content="summary" />', "Twitter card");
requireText(index, `<meta name="twitter:title" content="${title}" />`, "Twitter title");
requireText(index, `<meta name="twitter:description" content="${description}" />`, "Twitter description");

if (favicon.trim() !== pluginLogo.trim()) {
  throw new Error("Demo favicon must remain byte-equivalent to the established starter DashGPT logo.");
}

if (manifest.name !== "DashGPT" || manifest.short_name !== "DashGPT") throw new Error("Manifest product name drifted.");
if (manifest.description !== description) throw new Error("Manifest description drifted from public product messaging.");
if (manifest.start_url !== "/demo/" || manifest.scope !== "/demo/") throw new Error("Manifest scope/start URL must remain /demo/.");
if (!manifest.icons?.some((icon) => icon.src === "/demo/favicon.svg" && icon.type === "image/svg+xml")) {
  throw new Error("Manifest must reuse the public DashGPT favicon.");
}

for (const path of ["/api/", "/mcp", "/.well-known/", "/demo/result/", "/demo/dashes/", "/demo/dash/"]) {
  requireText(robots, `Disallow: ${path}`, `robots exclusion ${path}`);
}
requireText(robots, "Allow: /demo/", "public demo crawler allowance");

console.log("Demo branding/SEO metadata verification passed.");
