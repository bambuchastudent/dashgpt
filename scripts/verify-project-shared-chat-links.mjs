import assert from "node:assert/strict";
import {
  canonicalizeChatGptSharedUrl,
  inspectChatGptSharedUrl
} from "../demo/chatgpt-share-url.js";
import {
  canonicalSharedChatUrl,
  handleSharedChat
} from "../src/shared-chat.js";

const PROJECT_PATH = "/g/g-p-6a7ae11856fc8191aad4d68742133156-dashgpt/shared/c/6a7f3509-886c-83eb-af4c-cf71f8a3599b";
const PROJECT_INPUT = `https://chat.openai.com${PROJECT_PATH}?utm_source=ignored&owner_user_id=user-test#fragment`;
const PROJECT_CANONICAL = `https://chatgpt.com${PROJECT_PATH}?owner_user_id=user-test`;
const CONVERSATION_ID = "6a7f3509-886c-83eb-af4c-cf71f8a3599b";

assert.deepEqual(inspectChatGptSharedUrl(PROJECT_INPUT), {
  kind: "shared",
  family: "project",
  url: PROJECT_CANONICAL
});
assert.equal(canonicalizeChatGptSharedUrl(PROJECT_INPUT), PROJECT_CANONICAL);
assert.equal(canonicalSharedChatUrl(PROJECT_INPUT).toString(), PROJECT_CANONICAL);

assert.equal(
  canonicalizeChatGptSharedUrl("https://chat.openai.com/share/e/share-123?utm_source=test#fragment"),
  "https://chatgpt.com/share/share-123"
);
assert.equal(
  canonicalizeChatGptSharedUrl("https://chat.openai.com/s/share-123"),
  "https://chatgpt.com/share/share-123"
);
assert.equal(canonicalSharedChatUrl("https://chat.openai.com/s/share-123").toString(), "https://chatgpt.com/share/share-123");

assert.equal(inspectChatGptSharedUrl("https://chatgpt.com/c/private-id").kind, "private");
assert.equal(canonicalizeChatGptSharedUrl("https://chatgpt.com/c/private-id"), null);
assert.equal(canonicalizeChatGptSharedUrl("http://chatgpt.com/share/share-123"), null);
assert.equal(canonicalizeChatGptSharedUrl("https://evil.example/share/share-123"), null);
assert.equal(canonicalizeChatGptSharedUrl("https://user:pass@chatgpt.com/share/share-123"), null);
assert.equal(canonicalizeChatGptSharedUrl("https://chatgpt.com/g/project/c/private-id"), null);
assert.throws(() => canonicalSharedChatUrl("https://chatgpt.com/c/private-id"));
assert.throws(() => canonicalSharedChatUrl("https://user:pass@chatgpt.com/share/share-123"));

const backendPayload = {
  title: "Project shared chat",
  conversation_id: CONVERSATION_ID,
  current_node: "assistant",
  mapping: {
    user: {
      parent: null,
      children: ["assistant"],
      message: {
        author: { role: "user" },
        content: { parts: ["Сохрани этот разговор"] },
        create_time: 1
      }
    },
    assistant: {
      parent: "user",
      children: [],
      message: {
        author: { role: "assistant" },
        content: { parts: ["Готовая карточка из Project Share"] },
        create_time: 2
      }
    }
  }
};

const backendRequests = [];
const backendResponse = await handleSharedChat(
  new Request(`https://dashgpt.test/api/shared-chat?url=${encodeURIComponent(PROJECT_INPUT)}`),
  {
    DASHGPT_RESOLVER_FETCH: async input => {
      const url = String(input);
      backendRequests.push(url);
      if (url.includes(`/backend-api/share/${CONVERSATION_ID}`)) {
        return new Response(JSON.stringify(backendPayload), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response("unavailable", { status: 502 });
    }
  }
);
assert.equal(backendResponse.status, 200);
const backendJson = await backendResponse.json();
assert.equal(backendJson.sourceUrl, PROJECT_CANONICAL);
assert.equal(backendJson.retrieval, "reader-backend");
assert.equal(backendJson.title, "Project shared chat");
assert.ok(backendRequests.some(url => url.includes(`/backend-api/share/${CONVERSATION_ID}`)));

let browserUrl = null;
const browserResponse = await handleSharedChat(
  new Request(`https://dashgpt.test/api/shared-chat?url=${encodeURIComponent(PROJECT_INPUT)}`),
  {
    DASHGPT_RESOLVER_FETCH: async () => new Response("unavailable", { status: 502 }),
    DASHGPT_SHARE_FETCH: async () => new Response("unavailable", { status: 403 }),
    BROWSER: {
      quickAction: async (action, options) => {
        if (action !== "scrape") return new Response("unavailable", { status: 502 });
        browserUrl = options.url;
        return new Response(JSON.stringify({
          result: [
            {
              selector: "[data-message-author-role]",
              results: [
                { attributes: [{ name: "data-message-author-role", value: "user" }], text: "Сохрани этот разговор" },
                { attributes: [{ name: "data-message-author-role", value: "assistant" }], text: "Project Share прочитан" }
              ]
            },
            { selector: "h1", results: [{ text: "Project fallback" }] }
          ]
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
    }
  }
);
assert.equal(browserResponse.status, 200);
const browserJson = await browserResponse.json();
assert.equal(browserJson.sourceUrl, PROJECT_CANONICAL);
assert.equal(browserJson.retrieval, "browser-dom");
assert.equal(browserUrl, PROJECT_CANONICAL);

const unreadable = await handleSharedChat(
  new Request(`https://dashgpt.test/api/shared-chat?url=${encodeURIComponent(PROJECT_INPUT)}`),
  {
    DASHGPT_RESOLVER_FETCH: async () => new Response("membership required", { status: 403 }),
    DASHGPT_SHARE_FETCH: async () => new Response("membership required", { status: 403 })
  }
);
assert.equal(unreadable.status, 502);
const unreadableJson = await unreadable.json();
assert.equal(unreadableJson.code, "SHARED_CHAT_UNREADABLE");
assert.match(unreadableJson.error, /Unable to read this public ChatGPT conversation/);
assert.doesNotMatch(unreadableJson.error, /403|membership|required|resolver/i);

console.log("F45 Project shared-chat URL verification passed.");
