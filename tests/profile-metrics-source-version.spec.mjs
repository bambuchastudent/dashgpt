import { expect, test } from "@playwright/test";
import {
  CHATGPT_HISTORY_SOURCE_VERSION,
  buildChatGptHistorySourceRunner
} from "../demo/chatgpt-history-source-runner.js";

test("F27 runner uses usage-aware source protocol", () => {
  expect(CHATGPT_HISTORY_SOURCE_VERSION).toBe(4);
  const runner = buildChatGptHistorySourceRunner({
    receiverOrigin: "https://dashgpt.example",
    receiverPath: "/demo/",
    sessionId: "session_f27",
    nonce: "nonce_f27"
  });
  expect(runner).toContain('"sourceVersion":4');
  expect(runner).toContain("data.usageAware === true");
  expect(runner).toContain("visible-text-v1");
});
