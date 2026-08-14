import { expect, test } from "./playwright-fixture.mjs";
import {
  CHATGPT_HISTORY_SOURCE_VERSION,
  buildChatGptHistorySourceRunner
} from "../demo/chatgpt-history-source-runner.js";

test("F27 runner layers usage awareness on current source protocol", () => {
  expect(CHATGPT_HISTORY_SOURCE_VERSION).toBe(7);
  const runner = buildChatGptHistorySourceRunner({
    receiverOrigin: "https://dashgpt.example",
    receiverPath: "/demo/",
    sessionId: "session_f27",
    nonce: "nonce_f27"
  });
  expect(runner).toContain('"sourceVersion":7');
  expect(runner).toContain("data.usageAware === true");
  expect(runner).toContain("visible-text-v1");
  expect(runner).toContain('event.data.type === "CONTROL_WAKE"');
});
