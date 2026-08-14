export const SEO_PRIMARY_HOST = "dashgpt.dimkashir.workers.dev";
export const SEO_PRIMARY_ORIGIN = `https://${SEO_PRIMARY_HOST}`;
export const SEO_CANONICAL_URL = `${SEO_PRIMARY_ORIGIN}/demo/`;
export const SEO_SOCIAL_IMAGE_URL = `${SEO_PRIMARY_ORIGIN}/demo/og-card.png`;
export const SEO_TITLE = "DashGPT — Save, find and continue useful AI work";
export const SEO_DESCRIPTION = "DashGPT is your personal AI memory for ChatGPT and other assistants: save useful outcomes as cards, find them later, and continue with the context preserved.";

function toUrl(input) {
  if (input instanceof URL) return input;
  if (input instanceof Request) return new URL(input.url);
  return new URL(String(input));
}

export function isProductionSeoHost(input) {
  return toUrl(input).hostname === SEO_PRIMARY_HOST;
}

export function shouldNoIndex(input) {
  const url = toUrl(input);
  if (!isProductionSeoHost(url)) return true;
  return url.pathname !== "/demo/" || Boolean(url.search);
}

export function permanentDemoRedirect(input) {
  const url = toUrl(input);
  url.pathname = "/demo/";
  url.search = "";
  url.hash = "";
  return Response.redirect(url, 308);
}

export function robotsText(input) {
  if (!isProductionSeoHost(input)) {
    return "User-agent: *\nDisallow: /\n";
  }
  return [
    "User-agent: *",
    "Allow: /demo/",
    "Disallow: /api/",
    "Disallow: /mcp",
    "Disallow: /.well-known/",
    "Disallow: /demo/result/",
    "Disallow: /demo/dashes/",
    "Disallow: /demo/dash/",
    `Sitemap: ${SEO_PRIMARY_ORIGIN}/sitemap.xml`,
    ""
  ].join("\n");
}

export function sitemapXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${SEO_CANONICAL_URL}</loc>\n  </url>\n</urlset>\n`;
}

export function robotsResponse(request) {
  return new Response(robotsText(request), {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600"
    }
  });
}

export function sitemapResponse(request) {
  if (!isProductionSeoHost(request)) return new Response("Not found", { status: 404 });
  return new Response(sitemapXml(), {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600"
    }
  });
}

function replaceMeta(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

export function rewritePublicSeoHtml(source) {
  let html = String(source || "");
  html = replaceMeta(html, /<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${SEO_DESCRIPTION}" />`);
  html = replaceMeta(html, /<meta name="robots" content="[^"]*"\s*\/>/, '<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />');
  html = replaceMeta(html, /<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${SEO_CANONICAL_URL}" />`);
  html = replaceMeta(html, /<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${SEO_DESCRIPTION}" />`);
  html = replaceMeta(html, /<meta name="twitter:card" content="[^"]*"\s*\/>/, '<meta name="twitter:card" content="summary_large_image" />');
  html = replaceMeta(html, /<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${SEO_DESCRIPTION}" />`);

  if (!html.includes('property="og:url"')) {
    html = html.replace(
      '<meta property="og:site_name" content="DashGPT" />',
      `<meta property="og:site_name" content="DashGPT" /><meta property="og:url" content="${SEO_CANONICAL_URL}" /><meta property="og:image" content="${SEO_SOCIAL_IMAGE_URL}" /><meta property="og:image:type" content="image/png" /><meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" /><meta property="og:image:alt" content="DashGPT — your personal AI memory" />`
    );
  }

  if (!html.includes('name="twitter:image"')) {
    html = html.replace(
      `<meta name="twitter:description" content="${SEO_DESCRIPTION}" />`,
      `<meta name="twitter:description" content="${SEO_DESCRIPTION}" /><meta name="twitter:image" content="${SEO_SOCIAL_IMAGE_URL}" /><meta name="twitter:image:alt" content="DashGPT — your personal AI memory" />`
    );
  }

  if (!html.includes('name="application-name"')) {
    html = html.replace('<meta name="theme-color" content="#111827" />', '<meta name="theme-color" content="#111827" /><meta name="application-name" content="DashGPT" />');
  }

  if (!html.includes('id="dashgptStructuredData"')) {
    const structured = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "DashGPT",
      url: SEO_CANONICAL_URL,
      description: SEO_DESCRIPTION,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires a modern web browser with JavaScript",
      image: SEO_SOCIAL_IMAGE_URL
    });
    html = html.replace("</head>", `<script id="dashgptStructuredData" type="application/ld+json">${structured}</script></head>`);
  }

  return html;
}

export async function decorateSeoResponse(request, response) {
  const headers = new Headers(response.headers);
  const contentType = headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  let body = await response.text();
  const url = toUrl(request);
  if (url.pathname === "/demo/") body = rewritePublicSeoHtml(body);
  if (shouldNoIndex(url)) headers.set("x-robots-tag", "noindex, nofollow");
  else headers.delete("x-robots-tag");

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
