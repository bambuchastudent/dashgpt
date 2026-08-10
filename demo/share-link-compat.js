function canonicalizeChatGptShareInput(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  if (url.protocol !== "https:" || !["chatgpt.com", "chat.openai.com"].includes(url.hostname)) return raw;
  const match = url.pathname.match(/^\/s\/([^/]+)\/?$/);
  if (!match) return raw;
  url.hostname = "chatgpt.com";
  url.pathname = `/share/${match[1]}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

document.addEventListener("submit", event => {
  if (event.target?.id !== "publicShareForm") return;
  const input = document.querySelector("#publicShareUrl");
  if (!input) return;
  input.value = canonicalizeChatGptShareInput(input.value.trim());
}, true);

export { canonicalizeChatGptShareInput };
