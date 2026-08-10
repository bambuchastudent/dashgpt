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

function requestFor(url = SHARE_URL) {
  return new Request(`https://dashgpt.example/api/shared-chat?url=${encodeURIComponent(url)}`);
}

{
  let browserCalls = 0;
  const env = {
    DASHGPT_SHARE_FETCH: async () => new Response(legacyShareHtml(), { status: 200 }),
    BROWSER: {
      async quickAction() {
        browserCalls += 1;
        return new Response("unexpected", { status: 500 });
      }
    }
  };
  const response = await worker.fetch(requestFor(), env, {});
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.retrieval, "direct");
  assert.equal(payload.title, "Картошка в аэрогриле");
  assert.equal(payload.replies.length, 2);
  assert.equal(browserCalls, 0, "browser fallback must not run after a successful direct parse");
}

{
  let browserCalls = 0;
  const env = {
    DASHGPT_SHARE_FETCH: async () => new Response("blocked", { status: 403 }),
    BROWSER: {
      async quickAction(action, options) {
        browserCalls += 1;
        assert.equal(action, "scrape");
        assert.equal(options.url, SHARE_URL);
        assert.equal(options.gotoOptions.waitUntil, "networkidle2");
        assert.equal(options.elements[0].selector, "[data-message-author-role]");
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
  assert.equal(payload.replies.at(-1).statement.includes("ключница"), true);
  assert.equal(browserCalls, 1, "403 must use one rendered DOM scrape when visible turns are available");
}

{
  let browserCalls = 0;
  const env = {
    DASHGPT_SHARE_FETCH: async () => new Response("blocked", { status: 403 }),
    BROWSER: {
      async quickAction(action) {
        browserCalls += 1;
        if (action === "scrape") {
          return Response.json({ success: true, result: [{ selector: "[data-message-author-role]", results: [] }] });
        }
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
  assert.equal(browserCalls, 2, "legacy rendered payload remains a tertiary compatibility fallback");
}

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
  assert.equal(directCalls, 0, "invalid hosts must be rejected before direct retrieval");
  assert.equal(browserCalls, 0, "invalid hosts must be rejected before browser retrieval");
}

{
  const env = {
    DASHGPT_SHARE_FETCH: async () => new Response("blocked", { status: 403 }),
    BROWSER: {
      async quickAction(action) {
        if (action === "scrape") {
          return Response.json({
            success: true,
            result: [
              { selector: "[data-message-author-role]", results: [] },
              { selector: "h1", results: [{ attributes: [], text: "Just a moment…" }] }
            ]
          });
        }
        return new Response("challenge", { status: 403 });
      }
    }
  };
  const response = await worker.fetch(requestFor(), env, {});
  assert.equal(response.status, 502);
  const payload = await response.json();
  assert.match(payload.error, /Unable to read the public ChatGPT share/);
  assert.match(payload.error, /Direct ChatGPT share fetch returned 403/);
  assert.match(payload.error, /Rendered ChatGPT page contained no readable conversation turns/);
  assert.doesNotMatch(payload.error, /Legacy share payload/, "internal hydration parser details should not leak to onboarding");
}

console.log("Shared ChatGPT direct, rendered DOM, and compatibility fallback checks passed.");
