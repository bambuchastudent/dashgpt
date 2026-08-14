const CHATGPT_SHARE_HOSTS = new Set(["chatgpt.com", "chat.openai.com"]);

export function inspectChatGptSharedUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || "").trim());
  } catch {
    return { kind: "invalid-url", url: null };
  }

  if (
    url.protocol !== "https:"
    || !CHATGPT_SHARE_HOSTS.has(url.hostname)
    || url.username
    || url.password
  ) {
    return { kind: "unsupported", url: null };
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "c" && parts[1]) {
    return { kind: "private", url: null };
  }

  let canonical = null;
  let family = null;

  if (parts.length === 2 && parts[0] === "s" && parts[1]) {
    canonical = new URL(`/share/${parts[1]}`, "https://chatgpt.com");
    family = "classic";
  } else if (parts.length === 2 && parts[0] === "share" && parts[1]) {
    canonical = new URL(`/share/${parts[1]}`, "https://chatgpt.com");
    family = "classic";
  } else if (parts.length === 3 && parts[0] === "share" && parts[1] === "e" && parts[2]) {
    canonical = new URL(`/share/${parts[2]}`, "https://chatgpt.com");
    family = "classic";
  } else if (
    parts.length === 5
    && parts[0] === "g"
    && parts[1]
    && parts[2] === "shared"
    && parts[3] === "c"
    && parts[4]
  ) {
    canonical = new URL(`/g/${parts[1]}/shared/c/${parts[4]}`, "https://chatgpt.com");
    const ownerUserId = url.searchParams.get("owner_user_id");
    if (ownerUserId) canonical.searchParams.set("owner_user_id", ownerUserId);
    family = "project";
  }

  if (!canonical) return { kind: "unsupported", url: null };
  return { kind: "shared", family, url: canonical.toString() };
}

export function canonicalizeChatGptSharedUrl(raw) {
  const inspected = inspectChatGptSharedUrl(raw);
  return inspected.kind === "shared" ? inspected.url : null;
}
