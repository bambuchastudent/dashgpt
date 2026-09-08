import { CHATGPT_SHARE_HEADERS } from "chatgpt-share-parser";
import { canonicalSharedChatUrl, parseBackendShareJsonText } from "./shared-chat.js";

const BROWSER_NAVIGATION_TIMEOUT_MS = 12_000;
const BROWSER_SETTLE_TIMEOUT_MS = 4_000;
const BROWSER_FETCH_TIMEOUT_MS = 10_000;

function json(data) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function shareIdFromUrl(sourceUrl) {
  return sourceUrl.pathname.split("/").filter(Boolean).at(-1) || "";
}

function anonymousBackendShareUrl(sourceUrl) {
  return new URL(`/backend-anon/share/${shareIdFromUrl(sourceUrl)}`, "https://chatgpt.com");
}

function upstreamFetch(env, input, init) {
  if (typeof env?.DASHGPT_SHARE_FETCH === "function") return env.DASHGPT_SHARE_FETCH(input, init);
  return fetch(input, init);
}

function anonymousHeaders() {
  const headers = new Headers(CHATGPT_SHARE_HEADERS);
  headers.set("accept", "application/json");
  headers.set("cache-control", "no-cache");
  return headers;
}

function ordinaryPublicShare(request) {
  if (request.method !== "GET") return null;

  const input = new URL(request.url).searchParams.get("url");
  if (!input) return null;

  let sourceUrl;
  try {
    sourceUrl = canonicalSharedChatUrl(input);
  } catch {
    return null;
  }

  // The anonymous backend route is defined for ordinary /share/<id> links.
  // Project-specific shared/c URLs keep using the established resolver chain.
  if (!/^\/share\/[^/]+$/.test(sourceUrl.pathname)) return null;

  return {
    sourceUrl,
    backendUrl: anonymousBackendShareUrl(sourceUrl)
  };
}

function chatResponse(raw, sourceUrl, retrieval) {
  const chat = parseBackendShareJsonText(raw, sourceUrl);
  return json({
    sourceUrl: sourceUrl.toString(),
    fetchedAt: new Date().toISOString(),
    retrieval,
    ...chat
  });
}

async function injectedBrowserSessionText(env, sourceUrl, backendUrl) {
  if (typeof env?.DASHGPT_ANON_BROWSER_FETCH !== "function") return undefined;

  const result = await env.DASHGPT_ANON_BROWSER_FETCH({
    sourceUrl: sourceUrl.toString(),
    backendUrl: backendUrl.toString()
  });
  if (result == null) return null;
  if (result instanceof Response) {
    if (!result.ok) return null;
    return result.text();
  }
  if (typeof result === "string") return result;
  if (typeof result !== "object") return null;

  const status = Number(result.status ?? 200);
  if (!Number.isFinite(status) || status < 200 || status >= 300) return null;
  if (typeof result.text === "string") return result.text;
  if (result.body != null) return typeof result.body === "string" ? result.body : JSON.stringify(result.body);
  return JSON.stringify(result);
}

async function browserSessionText(env, sourceUrl, backendUrl) {
  const injected = await injectedBrowserSessionText(env, sourceUrl, backendUrl);
  if (injected !== undefined) return injected;
  if (!env?.BROWSER) return null;

  let browser;
  try {
    const { default: puppeteer } = await import("@cloudflare/puppeteer");
    browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();

    await page.goto(sourceUrl.toString(), {
      waitUntil: "domcontentloaded",
      timeout: BROWSER_NAVIGATION_TIMEOUT_MS
    });

    // Give the public page a short bounded window to finish any anonymous
    // bootstrap that establishes logged-out state before the same-origin JSON request.
    try {
      await page.waitForNetworkIdle({
        idleTime: 400,
        timeout: BROWSER_SETTLE_TIMEOUT_MS
      });
    } catch {
      // A continuously active page is still allowed to try the bounded JSON request.
    }

    const result = await page.evaluate(async ({ url, timeoutMs }) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: { accept: "application/json" },
          credentials: "include",
          cache: "no-store",
          signal: controller.signal
        });
        return {
          status: response.status,
          text: await response.text()
        };
      } catch {
        return { status: 0, text: "" };
      } finally {
        clearTimeout(timeout);
      }
    }, {
      url: backendUrl.toString(),
      timeoutMs: BROWSER_FETCH_TIMEOUT_MS
    });

    if (!result || result.status < 200 || result.status >= 300) return null;
    return result.text || null;
  } catch {
    return null;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Session cleanup is best-effort after a failed public retrieval.
      }
    }
  }
}

export async function tryAnonymousSharedChat(request, env = {}) {
  const context = ordinaryPublicShare(request);
  if (!context) return null;

  try {
    const response = await upstreamFetch(env, context.backendUrl, {
      method: "GET",
      headers: anonymousHeaders(),
      redirect: "follow"
    });
    if (!response.ok) return null;
    return chatResponse(await response.text(), context.sourceUrl, "chatgpt-anon");
  } catch {
    return null;
  }
}

export async function tryBrowserSessionSharedChat(request, env = {}) {
  const context = ordinaryPublicShare(request);
  if (!context) return null;
  if (typeof env?.DASHGPT_ANON_BROWSER_FETCH !== "function" && !env?.BROWSER) return null;

  try {
    const raw = await browserSessionText(env, context.sourceUrl, context.backendUrl);
    if (!raw) return null;
    return chatResponse(raw, context.sourceUrl, "browser-anon-session");
  } catch {
    return null;
  }
}
