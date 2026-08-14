import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SEO_CANONICAL_URL,
  SEO_DESCRIPTION,
  SEO_PRIMARY_ORIGIN,
  SEO_SOCIAL_IMAGE_URL,
  SEO_TITLE,
  decorateSeoResponse,
  permanentDemoRedirect,
  rewritePublicSeoHtml,
  robotsText,
  shouldNoIndex,
  sitemapResponse,
  sitemapXml
} from "../src/seo.js";

const index = readFileSync(new URL("../demo/index.html", import.meta.url), "utf8");
const support = readFileSync(new URL("../demo/support.html", import.meta.url), "utf8");
const privacy = readFileSync(new URL("../demo/privacy.html", import.meta.url), "utf8");
const terms = readFileSync(new URL("../demo/terms.html", import.meta.url), "utf8");
const favicon = readFileSync(new URL("../demo/favicon.svg", import.meta.url), "utf8");
const pluginLogo = readFileSync(new URL("../plugins/dashgpt/assets/logo.svg", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../demo/site.webmanifest", import.meta.url), "utf8"));
const robots = readFileSync(new URL("../demo/robots.txt", import.meta.url), "utf8");
const sitemap = readFileSync(new URL("../demo/sitemap.xml", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const ogImage = readFileSync(new URL("../demo/og-card.png", import.meta.url));

function requireText(haystack, needle, label) {
  if (!haystack.includes(needle)) throw new Error(`Missing ${label}: ${needle}`);
}

const faviconLink = '<link rel="icon" type="image/svg+xml" href="/demo/favicon.svg" />';
const productionHtml = rewritePublicSeoHtml(index);

requireText(productionHtml, `<title>${SEO_TITLE}</title>`, "document title");
requireText(productionHtml, `<meta name="description" content="${SEO_DESCRIPTION}" />`, "production meta description");
requireText(productionHtml, `<link rel="canonical" href="${SEO_CANONICAL_URL}" />`, "absolute canonical");
requireText(productionHtml, '<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />', "robots meta");
requireText(productionHtml, `<meta property="og:title" content="${SEO_TITLE}" />`, "Open Graph title");
requireText(productionHtml, `<meta property="og:description" content="${SEO_DESCRIPTION}" />`, "Open Graph description");
requireText(productionHtml, `<meta property="og:url" content="${SEO_CANONICAL_URL}" />`, "Open Graph URL");
requireText(productionHtml, `<meta property="og:image" content="${SEO_SOCIAL_IMAGE_URL}" />`, "Open Graph image");
requireText(productionHtml, '<meta property="og:image:width" content="1200" />', "Open Graph image width");
requireText(productionHtml, '<meta property="og:image:height" content="630" />', "Open Graph image height");
requireText(productionHtml, '<meta name="twitter:card" content="summary_large_image" />', "Twitter large card");
requireText(productionHtml, `<meta name="twitter:image" content="${SEO_SOCIAL_IMAGE_URL}" />`, "Twitter image");
requireText(productionHtml, 'id="dashgptStructuredData" type="application/ld+json"', "structured-data block");

const structuredMatch = productionHtml.match(/<script id="dashgptStructuredData" type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(structuredMatch, "structured data must be present");
const structured = JSON.parse(structuredMatch[1]);
assert.equal(structured["@type"], "WebApplication");
assert.equal(structured.name, "DashGPT");
assert.equal(structured.url, SEO_CANONICAL_URL);
assert.equal(structured.description, SEO_DESCRIPTION);
assert.equal(structured.operatingSystem, "Web");
for (const forbidden of ["aggregateRating", "review", "offers", "userCount"]) {
  assert.equal(structured[forbidden], undefined, `structured data must not invent ${forbidden}`);
}

requireText(index, faviconLink, "favicon link");
for (const [name, html] of [["support", support], ["privacy", privacy], ["terms", terms]]) {
  requireText(html, faviconLink, `${name} favicon link`);
}
requireText(index, '<link rel="manifest" href="/demo/site.webmanifest" />', "manifest link");

if (favicon.trim() !== pluginLogo.trim()) {
  throw new Error("Demo favicon must remain byte-equivalent to the established starter DashGPT logo.");
}
assert.equal(manifest.name, "DashGPT");
assert.equal(manifest.short_name, "DashGPT");
assert.equal(manifest.description, SEO_DESCRIPTION);
assert.equal(manifest.start_url, "/demo/");
assert.equal(manifest.scope, "/demo/");
assert.ok(manifest.icons?.some((icon) => icon.src === "/demo/favicon.svg" && icon.type === "image/svg+xml"));

assert.equal(ogImage.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "OG card must be PNG");
assert.equal(ogImage.readUInt32BE(16), 1200, "OG card width must be 1200");
assert.equal(ogImage.readUInt32BE(20), 630, "OG card height must be 630");

for (const path of ["/api/", "/mcp", "/.well-known/", "/demo/result/", "/demo/dashes/", "/demo/dash/"]) {
  requireText(robots, `Disallow: ${path}`, `robots exclusion ${path}`);
}
requireText(robots, "Allow: /demo/", "public demo crawler allowance");
requireText(robots, `Sitemap: ${SEO_PRIMARY_ORIGIN}/sitemap.xml`, "robots sitemap declaration");
assert.equal(sitemap.trim(), sitemapXml().trim(), "static sitemap fallback must match Worker sitemap");
assert.deepEqual((sitemap.match(/<loc>/g) || []).length, 1, "sitemap should list only the canonical product entry");
requireText(sitemap, `<loc>${SEO_CANONICAL_URL}</loc>`, "sitemap canonical URL");

assert.equal(robotsText(`${SEO_PRIMARY_ORIGIN}/robots.txt`), robots, "production robots fallback must match Worker policy");
assert.equal(robotsText("https://preview.example/robots.txt"), "User-agent: *\nDisallow: /\n");
assert.equal(shouldNoIndex(SEO_CANONICAL_URL), false);
assert.equal(shouldNoIndex(`${SEO_CANONICAL_URL}?personal=1`), true);
assert.equal(shouldNoIndex(`${SEO_PRIMARY_ORIGIN}/demo/result/example/`), true);
assert.equal(shouldNoIndex("https://preview.example/demo/"), true);

const rootRedirect = permanentDemoRedirect(`${SEO_PRIMARY_ORIGIN}/`);
assert.equal(rootRedirect.status, 308);
assert.equal(rootRedirect.headers.get("location"), SEO_CANONICAL_URL);
const slashlessRedirect = permanentDemoRedirect(`${SEO_PRIMARY_ORIGIN}/demo`);
assert.equal(slashlessRedirect.status, 308);
assert.equal(slashlessRedirect.headers.get("location"), SEO_CANONICAL_URL);

const canonicalResponse = await decorateSeoResponse(
  new Request(SEO_CANONICAL_URL),
  new Response(index, { headers: { "content-type": "text/html; charset=utf-8" } })
);
assert.equal(canonicalResponse.headers.get("x-robots-tag"), null);
requireText(await canonicalResponse.text(), `<link rel="canonical" href="${SEO_CANONICAL_URL}" />`, "served canonical metadata");

const previewResponse = await decorateSeoResponse(
  new Request("https://preview.example/demo/"),
  new Response(index, { headers: { "content-type": "text/html; charset=utf-8" } })
);
assert.equal(previewResponse.headers.get("x-robots-tag"), "noindex, nofollow");
const privateResponse = await decorateSeoResponse(
  new Request(`${SEO_CANONICAL_URL}?personal=1`),
  new Response(index, { headers: { "content-type": "text/html; charset=utf-8" } })
);
assert.equal(privateResponse.headers.get("x-robots-tag"), "noindex, nofollow");
assert.equal((await sitemapResponse(new Request("https://preview.example/sitemap.xml"))).status, 404);

requireText(wrangler, '"main": "./src/seo-worker.js"', "SEO worker entry");
for (const route of ['"/"', '"/robots.txt"', '"/sitemap.xml"', '"/demo"', '"/demo/*"']) {
  requireText(wrangler, route, `Worker-first SEO route ${route}`);
}

console.log("Demo branding/production SEO verification passed.");
