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

function safeStatus(value) {
  const status = Number(value);
  return Number.isInteger(status) && status >= 0 && status <= 599 ? status : undefined;
}

function safeKindFromError(error, fallback = "error") {
  const text = `${error?.name || ""} ${error?.message || ""}`.toLowerCase();
  if (/timeout|timed out|abort/.test(text)) return "timeout";
  if (/challenge|just a moment|captcha|turnstile/.test(text)) return "challenge";
  if (/json|parse|readable|recognizable|conversation turns|no content|did not contain/.test(text)) return "parse";
  if (safeStatus(error?.status) !== undefined) return "http";
  return fallback;
}

function safeKindFromBody(raw, contentType = "") {
  const prefix = String(raw || "").slice(0, 600).toLowerCase();
  if (/just a moment|cf-chl|turnstile|captcha|challenge/.test(prefix)) return "challenge";
  if (/text\/html/i.test(contentType) || /^\s*</.test(prefix)) return "html";
  return "parse";
}

function traceStep(trace, stage, values = {}) {
  if (!Array.isArray(trace)) return;
  const step = { phase: "live", stage, outcome: values.outcome || "miss" };
  if (values.kind) step.kind = values.kind;
  const status = safeStatus(values.status);
  if (status !== undefined) step.status = status;
  trace.push(step);
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

async function injectedBrowserSessionText(env, sourceUrl, backendUrl, trace) {
  if (typeof env?.DASHGPT_ANON_BROWSER_FETCH !== "function") return undefined;

  let result;
  try {
    result = await env.DASHGPT_ANON_BROWSER_FETCH({
      sourceUrl: sourceUrl.toString(),
      backendUrl: backendUrl.toString()
    });
  } catch (error) {
    traceStep(trace, "browser-backend", { outcome: "error", kind: safeKindFromError(error) });
    return null;
  }

  if (result == null) {
    traceStep(trace, "browser-backend", { outcome: "miss", kind: "empty" });
    return null;
  }
  if (result instanceof Response) {
    traceStep(trace, "browser-backend", {
      outcome: result.ok ? "response" : "miss",
      kind: result.ok ? undefined : "http",
      status: result.status
    });
    if (!result.ok) return null;
    return result.text();
  }
  if (typeof result === "string") {
    traceStep(trace, "browser-backend", { outcome: "response" });
    return result;
  }
  if (typeof result !== "object") {
    traceStep(trace, "browser-backend", { outcome: "miss", kind: "empty" });
    return null;
  }

  const status = Number(result.status ?? 200);
  traceStep(trace, "browser-backend", {
    outcome: status >= 200 && status < 300 ? "response" : "miss",
    kind: status >= 200 && status < 300 ? undefined : "http",
    status
  });
  if (!Number.isFinite(status) || status < 200 || status >= 300) return null;
  if (typeof result.text === "string") return result.text;
  if (result.body != null) return typeof result.body === "string" ? result.body : JSON.stringify(result.body);
  return JSON.stringify(result);
}

async function browserSessionText(env, sourceUrl, backendUrl, trace) {
  const injected = await injectedBrowserSessionText(env, sourceUrl, backendUrl, trace);
  if (injected !== undefined) return injected;
  if (!env?.BROWSER) {
    traceStep(trace, "browser-binding", { outcome: "miss", kind: "missing-binding" });
    return null;
  }
  traceStep(trace, "browser-binding", { outcome: "available" });

  let browser;
  try {
    const { default: puppeteer } = await import("@cloudflare/puppeteer");
    browser = await puppeteer.launch(env.BROWSER);
    traceStep(trace, "browser-launch", { outcome: "ok" });
    const page = await browser.newPage();

    let navigationResponse;
    try {
      navigationResponse = await page.goto(sourceUrl.toString(), {
        waitUntil: "domcontentloaded",
        timeout: BROWSER_NAVIGATION_TIMEOUT_MS
      });
      traceStep(trace, "browser-navigation", {
        outcome: "ok",
        status: typeof navigationResponse?.status === "function" ? navigationResponse.status() : undefined
      });
    } catch (error) {
      traceStep(trace, "browser-navigation", { outcome: "error", kind: safeKindFromError(error, "navigation") });
      return null;
    }

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
      } catch (error) {
        return {
          status: 0,
          kind: error?.name === "AbortError" ? "timeout" : "error",
          text: ""
        };
      } finally {
        clearTimeout(timeout);
      }
    }, {
      url: backendUrl.toString(),
      timeoutMs: BROWSER_FETCH_TIMEOUT_MS
    });

    traceStep(trace, "browser-backend", {
      outcome: result?.status >= 200 && result?.status < 300 ? "response" : "miss",
      kind: result?.status >= 200 && result?.status < 300 ? undefined : (result?.kind || "http"),
      status: result?.status
    });
    if (!result || result.status < 200 || result.status >= 300) return null;
    return result.text || null;
  } catch (error) {
    if (!browser) traceStep(trace, "browser-launch", { outcome: "error", kind: safeKindFromError(error, "launch") });
    else traceStep(trace, "browser-session", { outcome: "error", kind: safeKindFromError(error) });
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

export async function tryAnonymousSharedChat(request, env = {}, trace = null) {
  const context = ordinaryPublicShare(request);
  if (!context) return null;

  try {
    const response = await upstreamFetch(env, context.backendUrl, {
      method: "GET",
      headers: anonymousHeaders(),
      redirect: "follow"
    });
    if (!response.ok) {
      traceStep(trace, "anon-direct", { outcome: "miss", kind: "http", status: response.status });
      return null;
    }

    const raw = await response.text();
    try {
      const result = chatResponse(raw, context.sourceUrl, "chatgpt-anon");
      traceStep(trace, "anon-direct", { outcome: "ok", status: response.status });
      return result;
    } catch (error) {
      traceStep(trace, "anon-direct", {
        outcome: "miss",
        kind: safeKindFromBody(raw, response.headers.get("content-type") || "") || safeKindFromError(error),
        status: response.status
      });
      return null;
    }
  } catch (error) {
    traceStep(trace, "anon-direct", { outcome: "error", kind: safeKindFromError(error) });
    return null;
  }
}

export async function tryBrowserSessionSharedChat(request, env = {}, trace = null) {
  const context = ordinaryPublicShare(request);
  if (!context) return null;
  if (typeof env?.DASHGPT_ANON_BROWSER_FETCH !== "function" && !env?.BROWSER) {
    traceStep(trace, "browser-binding", { outcome: "miss", kind: "missing-binding" });
    return null;
  }

  try {
    const raw = await browserSessionText(env, context.sourceUrl, context.backendUrl, trace);
    if (!raw) return null;
    try {
      const result = chatResponse(raw, context.sourceUrl, "browser-anon-session");
      traceStep(trace, "browser-parse", { outcome: "ok" });
      return result;
    } catch (error) {
      traceStep(trace, "browser-parse", { outcome: "miss", kind: safeKindFromBody(raw) || safeKindFromError(error) });
      return null;
    }
  } catch (error) {
    traceStep(trace, "browser-session", { outcome: "error", kind: safeKindFromError(error) });
    return null;
  }
}
