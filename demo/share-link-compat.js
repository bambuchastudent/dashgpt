import { canonicalizeChatGptSharedUrl } from "./chatgpt-share-url.js";

function canonicalizeChatGptShareInput(raw) {
  return canonicalizeChatGptSharedUrl(raw) || raw;
}

document.addEventListener("submit", event => {
  if (event.target?.id !== "publicShareForm") return;
  const input = document.querySelector("#publicShareUrl");
  if (!input) return;
  input.value = canonicalizeChatGptShareInput(input.value.trim());
}, true);

export { canonicalizeChatGptShareInput };
