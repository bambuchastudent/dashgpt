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

function requestFor(url = SHARE_URL) {
  return new Request(`https://dashgpt.example/api/shared-chat?url=${encodeURIComponent(url)}`);
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
  assert.equal(sessionCalls, 1);
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

  const response = await worker.fetch(requestFor("https://example.com/share/not-chatgpt"), env, {});
  assert.equal(response.status, 502);
  const payload = await response.json();
  assert.match(payload.error, /Only public ChatGPT share URLs/);
  assert.equal(upstreamCalls, 0);
  assert.equal(resolverCalls, 0);
  assert.equal(sessionCalls, 0);
}

console.log("Shared ChatGPT fresh anonymous browser-session recovery checks passed.");
