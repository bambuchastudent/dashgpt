import { canonicalizeChatGptSharedUrl } from "./chatgpt-share-url.js";

function canonicalizeChatGptShareInput(raw) {
  return canonicalizeChatGptSharedUrl(raw) || raw;
}

const publicShareForm = document.querySelector("#publicShareForm");
const publicShareUrl = document.querySelector("#publicShareUrl");
if (publicShareForm && publicShareUrl) {
  publicShareForm.addEventListener("submit", () => {
    publicShareUrl.value = canonicalizeChatGptShareInput(publicShareUrl.value);
  }, true);
}

export { canonicalizeChatGptShareInput };
