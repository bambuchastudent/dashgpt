import assert from "node:assert/strict";
import worker from "../src/worker.js";

const SHARE_URL = "https://chatgpt.com/share/6a7a445b-a420-83ea-9c36-3c10fd1ce85f";
const SHARE_ID = "6a7a445b-a420-83ea-9c36-3c10fd1ce85f";

function legacyShareHtml() {
  const data = {
    conversation_id: SHARE_ID,
    author_name: "Visitor",
    title: "Картошка в аэрогриле",
    update_time: 1786390000,
    model: { slug: "gpt-test" },
    linear_conversation: [
      {
        id: "user-node",
        message: {
          id: "user-message",
          author: { role: "user" },
          content: { content_type: "text", parts: ["Как приготовить картошку в аэрогриле?"] },
          create_time: 1786389900
        }
      },
      {
        id: "assistant-node",
        message: {
          id: "assistant-message",
          author: { role: "assistant" },
          content: { content_type: "text", parts: ["Нарежь картошку, добавь масло и специи и готовь до румяности."] },
          create_time: 1786389950
        }
      }
    ]
  };
  return `<!doctype html><html><head><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: { pageProps: { serverResponse: { data } } }
  })}</script></head><body></body></html>`;
}

function backendSharePayload() {
  return {
    title: "New chat",
    conversation_id: SHARE_ID,
    current_node: "a2",
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
          content: { content_type: "text", parts: ["Составь план выходных"] },
          create_time: 2
        }
      },
      "a-old": {
        id: "a-old",
        parent: "u1",
        children: [],
        message: {
          author: { role: "assistant" },
          content: { content_type: "text", parts: ["Старый регенерированный ответ"] },
          create_time: 3
        }
      },
      a1: {
        id: "a1",
        parent: "u1",
        children: ["hidden", "u2"],
        message: {
          author: { role: "assistant" },
          content: { content_type: "text", parts: ["Утром рынок, вечером прогулка."] },
          create_time: 4
        }
      },
      hidden: {
        id: "hidden",
        parent: "a1",
        children: [],
        message: {
          author: { role: "assistant" },
          content: { content_type: "text", parts: ["Скрытый служебный ответ"] },
          metadata: { is_visually_hidden_from_conversation: true },
          create_time: 5
        }
      },
      u2: {
        id: "u2",
        parent: "a1",
        children: ["a2"],
        message: {
          author: { role: "user" },
          content: { content_type: "multimodal_text", parts: ["Без лишних переездов"] },
          create_time: 6
        }
      },
      a2: {
        id: "a2",
        parent: "u2",
        children: [],
        message: {
          author: { role: "assistant" },
          content: { content_type: "text", parts: [{ text: "Тогда оставим всё рядом с центром." }] },
          create_time: 7
        }
      }
    }
  };
}

function backendReaderTranscript() {
  return `Title:\n\nURL Source: https://chatgpt.com/backend-api/share/${SHARE_ID}\n\nMarkdown Content:\n${JSON.stringify(backendSharePayload())}`;
}

function readerTranscript() {
  return `Title: Картошка в аэрогриле\nURL Source: ${SHARE_URL}\n\nMarkdown Content:\n## You said:\nКак приготовить картошку в аэрогриле?\n\n## ChatGPT said:\nНарежь картошку, добавь масло и специи и готовь до румяности.`;
}

function renderedScrape() {
  return {
    success: true,
    result: [
      {
        selector: "[data-message-author-role]",
        results: [
          { attributes: [{ name: "data-message-author-role", value: "user" }], text: "Опиши вечер в Валенсии" },
          { attributes: [{ name: "data-message-author-role", value: "assistant" }], text: "Спокойный вечер с прогулкой и ужином." }
        ]
      },
      { selector: "h1", results: [{ attributes: [], text: "Вечер в Валенсии" }] }
    ]
  };
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

// Fresh-share happy path: current public backend JSON succeeds immediately and selects only current_node ancestry.
{
  const resolverUrls = [];
  let directCalls = 0;
  let browserCalls = 0;
  const env = {
    DASHGPT_RESOLVER_FETCH: async input => {
      const url = String(input);
      resolverUrls.push(url);
      assert.match(url, new RegExp(`^https://r\\.jina\\.ai/https://chatgpt\\.com/backend-api/share/${SHARE_ID}$`));
      return new Response(backendReaderTranscript(), { status: 200 });
    },
    DASHGPT_SHARE_FETCH: async () => {
      directCalls += 1;
      return new Response("should not run", { status: 500 });
    },
    BROWSER: {
      async quickAction() {
        browserCalls += 1;
        return Response.json(renderedScrape());
      }
    }
  };
  const response = await worker.fetch(requestFor(), env, {});
  assert.equal(response.status, 200, await response.clone().text());
  const payload = await response.json();
  assert.equal(payload.retrieval, "reader-backend");
  assert.equal(payload.title, "Составь план выходных");
  assert.deepEqual(payload.replies.map(reply => reply.type), ["user", "assistant", "user", "assistant"]);
  assert.deepEqual(payload.replies.map(reply => reply.statement), [
    "Составь план выходных",
    "Утром рынок, вечером прогулка.",
    "Без лишних переездов",
    "Тогда оставим всё рядом с центром."
  ]);
  assert.doesNotMatch(JSON.stringify(payload), /Старый регенерированный|Скрытый служебный/);
  assert.equal(resolverUrls.length, 1);
  assert.equal(directCalls, 0);
  assert.equal(browserCalls, 0);
}

// Reader page fallback remains available if backend JSON cannot be resolved.
{
  const resolverUrls = [];
  const env = {
    DASHGPT_RESOLVER_FETCH: async input => {
      const url = String(input);
      resolverUrls.push(url);
      if (url.includes("/backend-api/share/")) return new Response("backend unavailable", { status: 503 });
      return new Response(readerTranscript(), { status: 200 });
    },
    DASHGPT_SHARE_FETCH: async () => new Response("should not run", { status: 500 })
  };
  const response = await worker.fetch(requestFor(), env, {});
  assert.equal(response.status, 200, await response.clone().text());
  const payload = await response.json();
  assert.equal(payload.retrieval, "reader");
  assert.equal(payload.title, "Картошка в аэрогриле");
  assert.deepEqual(payload.replies.map(reply => reply.type), ["user", "assistant"]);
  assert.equal(resolverUrls.length, 2);
}

// Provider fallback: both Reader forms can fail and AllOrigins raw HTML can still satisfy the same contract.
{
  const resolverUrls = [];
  let directCalls = 0;
  const env = {
    DASHGPT_RESOLVER_FETCH: async input => {
      const url = String(input);
      resolverUrls.push(url);
      if (url.startsWith("https://r.jina.ai/")) return new Response("reader unavailable", { status: 503 });
      if (url.startsWith("https://api.allorigins.win/raw?url=")) return new Response(legacyShareHtml(), { status: 200 });
      return new Response("unexpected resolver", { status: 500 });
    },
    DASHGPT_SHARE_FETCH: async () => {
      directCalls += 1;
      return new Response("should not run", { status: 500 });
    }
  };
  const response = await worker.fetch(requestFor(), env, {});
  assert.equal(response.status, 200, await response.clone().text());
  const payload = await response.json();
  assert.equal(payload.retrieval, "raw-proxy");
  assert.equal(payload.title, "Картошка в аэрогриле");
  assert.equal(payload.replies.length, 2);
  assert.equal(resolverUrls.length, 3);
  assert.match(resolverUrls[2], /^https:\/\/api\.allorigins\.win\/raw\?url=/);
  assert.equal(directCalls, 0);
}

// Existing rendered browser path remains a later compatibility fallback.
{
  let resolverCalls = 0;
  let directCalls = 0;
  let browserCalls = 0;
  const env = {
    DASHGPT_RESOLVER_FETCH: async () => {
      resolverCalls += 1;
      return new Response("unavailable", { status: 503 });
    },
    DASHGPT_SHARE_FETCH: async () => {
      directCalls += 1;
      return new Response("should not run", { status: 500 });
    },
    BROWSER: {
      async quickAction(action, options) {
        browserCalls += 1;
        assert.equal(action, "scrape");
        assert.equal(options.url, SHARE_URL);
        return Response.json(renderedScrape());
      }
    }
  };
  const response = await worker.fetch(requestFor(), env, {});
  assert.equal(response.status, 200, await response.clone().text());
  const payload = await response.json();
  assert.equal(payload.retrieval, "browser-dom");
  assert.equal(payload.title, "Вечер в Валенсии");
  assert.equal(resolverCalls, 3);
  assert.equal(browserCalls, 1);
  assert.equal(directCalls, 0);
}

// Direct parser still works in local/test environments after the anonymous providers fail.
{
  let resolverCalls = 0;
  let directCalls = 0;
  const env = {
    DASHGPT_RESOLVER_FETCH: async () => {
      resolverCalls += 1;
      return new Response("unavailable", { status: 503 });
    },
    DASHGPT_SHARE_FETCH: async () => {
      directCalls += 1;
      return new Response(legacyShareHtml(), { status: 200 });
    }
  };
  const response = await worker.fetch(requestFor(), env, {});
  assert.equal(response.status, 200, await response.clone().text());
  const payload = await response.json();
  assert.equal(payload.retrieval, "direct");
  assert.equal(payload.title, "Картошка в аэрогриле");
  assert.equal(resolverCalls, 3);
  assert.equal(directCalls, 1);
}

// SSRF boundary: invalid hosts are rejected before any resolver/direct/browser action.
{
  let resolverCalls = 0;
  let directCalls = 0;
  let browserCalls = 0;
  const env = {
    DASHGPT_RESOLVER_FETCH: async () => {
      resolverCalls += 1;
      return new Response("no", { status: 500 });
    },
    DASHGPT_SHARE_FETCH: async () => {
      directCalls += 1;
      return new Response("no", { status: 500 });
    },
    BROWSER: {
      async quickAction() {
        browserCalls += 1;
        return Response.json(renderedScrape());
      }
    }
  };
  const response = await worker.fetch(requestFor("https://example.com/share/not-chatgpt"), env, {});
  assert.equal(response.status, 502);
  const payload = await response.json();
  assert.match(payload.error, /Only public ChatGPT share URLs/);
  assert.equal(resolverCalls, 0);
  assert.equal(directCalls, 0);
  assert.equal(browserCalls, 0);
}

// Product error boundary: no provider, anti-bot, or parser details leak to onboarding.
{
  const env = {
    DASHGPT_RESOLVER_FETCH: async () => new Response("provider failed", { status: 429 }),
    DASHGPT_SHARE_FETCH: async () => new Response("blocked", { status: 403 }),
    BROWSER: {
      async quickAction(action) {
        if (action === "scrape") return Response.json(emptyScrape());
        return new Response("challenge", { status: 403 });
      }
    }
  };
  const response = await worker.fetch(requestFor(), env, {});
  assert.equal(response.status, 502);
  const payload = await response.json();
  assert.equal(payload.code, "SHARED_CHAT_UNREADABLE");
  assert.match(payload.error, /Unable to read this public ChatGPT conversation/);
  assert.doesNotMatch(payload.error, /403|429|Jina|AllOrigins|Reader|proxy|Legacy|backend/i);
}

console.log("Shared ChatGPT fresh-backend resolver and compatibility fallback checks passed.");
