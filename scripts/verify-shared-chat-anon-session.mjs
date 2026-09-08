import assert from "node:assert/strict";
import worker from "../src/worker.js";

const SHARE_ID = "6a7a445b-a420-83ea-9c36-3c10fd1ce85f";
const SHARE_URL = `https://chatgpt.com/share/${SHARE_ID}`;
const ANON_BACKEND_URL = `https://chatgpt.com/backend-anon/share/${SHARE_ID}`;

function backendPayload() {
  return {
    title: "New chat",
    conversation_id: SHARE_ID,
    current_node: "a1",
    default_model_slug: "auto",
    mapping: {
      root: {
        id: "root",
        parent: null,
        children: ["u1"],
        message: {
          author: { role: "system" },
          content: { content_type: "text", parts: ["internal"] },
          create_time: 1
        }
      },
      u1: {
        id: "u1",
        parent: "root",
        children: ["a-old", "a1"],
        message: {
          author: { role: "user" },
          content: { content_type: "text", parts: ["Нужен план на выходные"] },
          create_time: 2
        }
      },
      "a-old": {
        id: "a-old",
        parent: "u1",
        children: [],
        message: {
          author: { role: "assistant" },
          content: { content_type: "text", parts: ["Старый ответ"] },
          create_time: 3
        }
      },
      a1: {
        id: "a1",
        parent: "u1",
        children: [],
        message: {
          author: { role: "assistant" },
          content: { content_type: "text", parts: ["Рынок утром, прогулка вечером."] },
          create_time: 4
        }
      }
    }
  };
}

function backendReaderTranscript() {
  return `Title:\n\nURL Source: https://chatgpt.com/backend-api/share/${SHARE_ID}\n\nMarkdown Content:\n${JSON.stringify(backendPayload())}`;
}

function emptyScrape() {
  return {
    success: true,
    result: [
      { selector: "[data-message-author-role]", results: [] },
      { selector: "h1", results: [{ attributes: [], text: "Just a moment…" }] }
    ]
  };
}

function requestFor(url = SHARE_URL, diagnostics = false) {
  const suffix = diagnostics ? "&diagnostics=1" : "";
  return new Request(`https://dashgpt.example/api/shared-chat?url=${encodeURIComponent(url)}${suffix}`);
}

function exhaustedPublicEnv(sessionFetch) {
  return {
    DASHGPT_SHARE_FETCH: async input => {
      const url = String(input);
      if (url === ANON_BACKEND_URL) return new Response("anonymous backend unavailable", { status: 503 });
      if (url === SHARE_URL) return new Response("blocked", { status: 403 });
      return new Response("unexpected upstream", { status: 500 });
    },
    DASHGPT_RESOLVER_FETCH: async () => new Response("provider unavailable", { status: 503 }),
    DASHGPT_ANON_BROWSER_FETCH: sessionFetch,
    BROWSER: {
      async quickAction(action) {
        if (action === "scrape") return Response.json(emptyScrape());
        return new Response("challenge", { status: 403 });
      }
    }
  };
}

// Existing resolver success must return immediately without launching the extra browser-session recovery.
{
  let sessionCalls = 0;
  const env = {
    DASHGPT_SHARE_FETCH: async input => {
      assert.equal(String(input), ANON_BACKEND_URL);
      return new Response("anonymous backend unavailable", { status: 503 });
    },
    DASHGPT_RESOLVER_FETCH: async input => {
      const url = String(input);
      assert.match(url, /backend-api\/share\//);
      return new Response(backendReaderTranscript(), { status: 200 });
    },
    DASHGPT_ANON_BROWSER_FETCH: async () => {
      sessionCalls += 1;
      return { status: 200, body: backendPayload() };
    }
  };

  const response = await worker.fetch(requestFor(), env, {});
  assert.equal(response.status, 200, await response.clone().text());
  const payload = await response.json();
  assert.equal(payload.retrieval, "reader-backend");
  assert.equal(sessionCalls, 0);
}

// After exact SHARED_CHAT_UNREADABLE, a fresh-session result can recover the same canonical public Share.
{
  let sessionCalls = 0;
  const env = exhaustedPublicEnv(async context => {
    sessionCalls += 1;
    assert.deepEqual(Object.keys(context).sort(), ["backendUrl", "sourceUrl"]);
    assert.equal(context.sourceUrl, SHARE_URL);
    assert.equal(context.backendUrl, ANON_BACKEND_URL);
    return { status: 200, body: backendPayload() };
  });

  const response = await worker.fetch(requestFor(`${SHARE_URL}?ogimg=plain`), env, {});
  assert.equal(response.status, 200, await response.clone().text());
  const payload = await response.json();
  assert.equal(payload.retrieval, "browser-anon-session");
  assert.equal(payload.sourceUrl, SHARE_URL);
  assert.equal(payload.shareId, SHARE_ID);
  assert.equal(payload.title, "Нужен план на выходные");
  assert.deepEqual(payload.replies.map(reply => reply.statement), [
    "Нужен план на выходные",
    "Рынок утром, прогулка вечером."
  ]);
  assert.doesNotMatch(JSON.stringify(payload), /Старый ответ|internal/);
  assert.equal(sessionCalls, 1);
}

// A failed fresh-session request is one bounded miss and preserves the original human unreadable contract.
{
  let sessionCalls = 0;
  const env = exhaustedPublicEnv(async context => {
    sessionCalls += 1;
    assert.equal(context.sourceUrl, SHARE_URL);
    assert.equal(context.backendUrl, ANON_BACKEND_URL);
    return { status: 403, text: "challenge" };
  });

  const response = await worker.fetch(requestFor(), env, {});
  assert.equal(response.status, 502);
  const payload = await response.json();
  assert.equal(payload.code, "SHARED_CHAT_UNREADABLE");
  assert.match(payload.error, /Unable to read this public ChatGPT conversation/);
  assert.doesNotMatch(payload.error, /403|backend-anon|browser-anon-session|challenge/i);
  assert.equal(payload.diagnostics, undefined);
  assert.equal(sessionCalls, 1);
}

// Explicit support diagnostics return only sanitized stage metadata after the same unresolved failure.
{
  const rawSecrets = [
    "COOKIE_SECRET_123",
    "AUTH_SECRET_456",
    "TRANSCRIPT_SECRET_789",
    "challenge-body-secret"
  ];
  const env = {
    DASHGPT_SHARE_FETCH: async input => {
      const url = String(input);
      if (url === ANON_BACKEND_URL) return new Response(rawSecrets[0], { status: 503 });
      if (url === SHARE_URL) return new Response(rawSecrets[2], { status: 403 });
      return new Response(rawSecrets[1], { status: 500 });
    },
    DASHGPT_RESOLVER_FETCH: async () => new Response(rawSecrets[1], { status: 503 }),
    DASHGPT_ANON_BROWSER_FETCH: async context => {
      assert.equal(context.sourceUrl, SHARE_URL);
      assert.equal(context.backendUrl, ANON_BACKEND_URL);
      return { status: 403, text: rawSecrets[3] };
    },
    BROWSER: {
      async quickAction(action) {
        if (action === "scrape") return Response.json(emptyScrape());
        return new Response(rawSecrets[3], { status: 403 });
      }
    }
  };

  const response = await worker.fetch(requestFor(`${SHARE_URL}?ogimg=plain`, true), env, {});
  assert.equal(response.status, 502);
  const payload = await response.json();
  assert.equal(payload.code, "SHARED_CHAT_UNREADABLE");
  assert.equal(payload.diagnostics?.version, 1);
  assert.equal(payload.diagnostics?.sanitized, true);
  assert.equal(payload.diagnostics?.shareId, SHARE_ID);
  assert.equal(typeof payload.diagnostics?.traceId, "string");
  assert.ok(payload.diagnostics.traceId.length >= 8);
  assert.equal(typeof payload.diagnostics?.generatedAt, "string");
  assert.ok(Array.isArray(payload.diagnostics?.steps));

  const direct = payload.diagnostics.steps.find(step => step.stage === "anon-direct");
  assert.deepEqual(direct, {
    phase: "live",
    stage: "anon-direct",
    outcome: "miss",
    kind: "http",
    status: 503
  });

  const browserBackend = payload.diagnostics.steps.find(step => step.stage === "browser-backend" && step.phase === "live");
  assert.equal(browserBackend?.status, 403);
  assert.equal(browserBackend?.kind, "http");

  const legacyStages = new Set(payload.diagnostics.steps
    .filter(step => step.phase === "support-replay")
    .map(step => step.stage));
  assert.ok(legacyStages.has("reader-backend"));
  assert.ok(legacyStages.has("reader-page"));
  assert.ok(legacyStages.has("raw-proxy"));
  assert.ok(legacyStages.has("browser-dom"));
  assert.ok(legacyStages.has("direct-page"));
  assert.ok(legacyStages.has("browser-html"));

  const serialized = JSON.stringify(payload.diagnostics);
  for (const secret of rawSecrets) assert.doesNotMatch(serialized, new RegExp(secret));
  assert.doesNotMatch(serialized, /cookie|authorization|set-cookie/i);
}

// Successful diagnostic-mode requests stay normal successful shared-chat responses without failure diagnostics.
{
  const env = {
    DASHGPT_SHARE_FETCH: async input => {
      assert.equal(String(input), ANON_BACKEND_URL);
      return Response.json(backendPayload());
    }
  };
  const response = await worker.fetch(requestFor(SHARE_URL, true), env, {});
  assert.equal(response.status, 200, await response.clone().text());
  const payload = await response.json();
  assert.equal(payload.retrieval, "chatgpt-anon");
  assert.equal(payload.diagnostics, undefined);
}

// Invalid hosts never reach either public resolver or the fresh anonymous browser-session hook.
{
  let upstreamCalls = 0;
  let resolverCalls = 0;
  let sessionCalls = 0;
  const env = {
    DASHGPT_SHARE_FETCH: async () => {
      upstreamCalls += 1;
      return new Response("no", { status: 500 });
    },
    DASHGPT_RESOLVER_FETCH: async () => {
      resolverCalls += 1;
      return new Response("no", { status: 500 });
    },
    DASHGPT_ANON_BROWSER_FETCH: async () => {
      sessionCalls += 1;
      return { status: 200, body: backendPayload() };
    }
  };

  const response = await worker.fetch(requestFor("https://example.com/share/not-chatgpt", true), env, {});
  assert.equal(response.status, 502);
  const payload = await response.json();
  assert.match(payload.error, /Only public ChatGPT share URLs/);
  assert.equal(payload.diagnostics, undefined);
  assert.equal(upstreamCalls, 0);
  assert.equal(resolverCalls, 0);
  assert.equal(sessionCalls, 0);
}

console.log("Shared ChatGPT fresh anonymous browser-session recovery and diagnostics checks passed.");
