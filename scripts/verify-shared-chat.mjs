import assert from "node:assert/strict";
import worker from "../src/worker.js";

const SHARE_URL = "https://chatgpt.com/share/6a7a445b-a420-83ea-9c36-3c10fd1ce85f";

function legacyShareHtml() {
  const data = {
    conversation_id: "6a7a445b-a420-83ea-9c36-3c10fd1ce85f",
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

function renderedScrape({ withTitle = true } = {}) {
  return {
    success: true,
    result: [
      {
        selector: "[data-message-author-role]",
        results: [
          {
            attributes: [{ name: "data-message-author-role", value: "user" }],
            text: "мы столкнулись с проблемой просто опиши вечер в валенсии у нас есть теб"
          },
          {
            attributes: [{ name: "data-message-author-role", value: "assistant" }],
            text: "Похоже, сообщение оборвалось."
          },
          {
            attributes: [{ name: "data-message-author-role", value: "user" }],
            text: "теперь ключница и она сделана с якорем и браслетик с якорем"
          },
          {
            attributes: [{ name: "data-message-author-role", value: "assistant" }],
            text: "А теперь у нас появилась ещё одна интересная находка — ключница с якорем и браслетик."
          },
          {
            attributes: [{ name: "data-message-author-role", value: "assistant" }],
            text: "А теперь у нас появилась ещё одна интересная находка — ключница с якорем и браслетик."
          },
          {
            attributes: [{ name: "data-message-author-role", value: "system" }],
            text: "internal noise"
          }
        ]
      },
      {
        selector: "h1",
        results: withTitle ? [{ attributes: [], text: "Вечер в Валенсии" }] : []
      }
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

// Production path: rendered DOM succeeds, so DashGPT never issues the raw ChatGPT fetch that commonly returns 403.
{
  let directCalls = 0;
  let browserCalls = 0;
  const env = {
    DASHGPT_SHARE_FETCH: async () => {
      directCalls += 1;
      return new Response("should not run", { status: 403 });
    },
    BROWSER: {
      async quickAction(action, options) {
        browserCalls += 1;
        assert.equal(action, "scrape");
        assert.equal(options.url, SHARE_URL);
        assert.equal(options.gotoOptions.waitUntil, "networkidle2");
        return Response.json(renderedScrape());
      }
    }
  };
  const response = await worker.fetch(requestFor(), env, {});
  assert.equal(response.status, 200, await response.clone().text());
  const payload = await response.json();
  assert.equal(payload.retrieval, "browser-dom");
  assert.equal(payload.title, "Вечер в Валенсии");
  assert.deepEqual(payload.replies.map(reply => reply.type), ["user", "assistant", "user", "assistant"]);
  assert.equal(directCalls, 0, "successful rendered extraction must not perform a raw ChatGPT fetch");
  assert.equal(browserCalls, 1);
}

// Local/test compatibility: direct structured parsing still works when Browser Run is unavailable.
{
  let directCalls = 0;
  const env = {
    DASHGPT_SHARE_FETCH: async () => {
      directCalls += 1;
      return new Response(legacyShareHtml(), { status: 200 });
    }
  };
  const response = await worker.fetch(requestFor(), env, {});
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.retrieval, "direct");
  assert.equal(payload.title, "Картошка в аэрогриле");
  assert.equal(payload.replies.length, 2);
  assert.equal(directCalls, 1);
}

// If rendered DOM is unreadable, direct structured parsing remains the next fallback.
{
  let directCalls = 0;
  let browserCalls = 0;
  const env = {
    DASHGPT_SHARE_FETCH: async () => {
      directCalls += 1;
      return new Response(legacyShareHtml(), { status: 200 });
    },
    BROWSER: {
      async quickAction(action) {
        browserCalls += 1;
        assert.equal(action, "scrape");
        return Response.json(emptyScrape());
      }
    }
  };
  const response = await worker.fetch(requestFor(), env, {});
  assert.equal(response.status, 200, await response.clone().text());
  const payload = await response.json();
  assert.equal(payload.retrieval, "direct");
  assert.equal(payload.title, "Картошка в аэрогриле");
  assert.equal(browserCalls, 1);
  assert.equal(directCalls, 1);
}

// Tertiary compatibility: rendered payload parsing remains available after DOM + direct failures.
{
  let directCalls = 0;
  let browserCalls = 0;
  const env = {
    DASHGPT_SHARE_FETCH: async () => {
      directCalls += 1;
      return new Response("blocked", { status: 403 });
    },
    BROWSER: {
      async quickAction(action) {
        browserCalls += 1;
        if (action === "scrape") return Response.json(emptyScrape());
        assert.equal(action, "content");
        return new Response(legacyShareHtml(), { status: 200 });
      }
    }
  };
  const response = await worker.fetch(requestFor(), env, {});
  assert.equal(response.status, 200, await response.clone().text());
  const payload = await response.json();
  assert.equal(payload.retrieval, "browser-payload");
  assert.equal(payload.title, "Картошка в аэрогриле");
  assert.equal(browserCalls, 2);
  assert.equal(directCalls, 1);
}

// SSRF boundary: invalid hosts are rejected before any external action.
{
  let directCalls = 0;
  let browserCalls = 0;
  const env = {
    DASHGPT_SHARE_FETCH: async () => {
      directCalls += 1;
      return new Response(legacyShareHtml(), { status: 200 });
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
  assert.equal(directCalls, 0);
  assert.equal(browserCalls, 0);
}

// Product error boundary: internal anti-bot and parser details never leak into onboarding.
{
  const env = {
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
  assert.doesNotMatch(payload.error, /403/);
  assert.doesNotMatch(payload.error, /Legacy share payload/);
  assert.doesNotMatch(payload.error, /fallback/);
}

console.log("Shared ChatGPT browser-first and sanitized fallback checks passed.");
