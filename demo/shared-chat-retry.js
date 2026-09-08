const SHARED_CHAT_PATH = "/api/shared-chat";
const SHARED_CHAT_UNREADABLE = "SHARED_CHAT_UNREADABLE";
const RETRY_DELAYS_MS = [0, 100, 250, 500, 900, 1500];
const INSTALL_KEY = Symbol.for("dashgpt.shared-chat-retry-installed");

function sleep(ms) {
  if (!ms) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, ms));
}

function requestSignal(input, init) {
  return init?.signal || (input instanceof Request ? input.signal : null);
}

function interactiveSaveChatOpen() {
  const dialog = document.querySelector("#saveChatDialog");
  return Boolean(dialog?.open);
}

function announceRetry(attempt, maxAttempts) {
  const status = document.querySelector("#saveChatLinkStatus");
  if (!status) return;
  status.classList.remove("error");
  status.textContent = `ChatGPT отвечает нестабильно. Пробую ещё раз (${attempt}/${maxAttempts})…`;
}

async function isRetryableUnreadable(response) {
  if (response.status !== 502) return false;
  try {
    const payload = await response.clone().json();
    return payload?.code === SHARED_CHAT_UNREADABLE;
  } catch {
    return false;
  }
}

export async function fetchSharedChatWithRetry(fetchImpl, input, init) {
  const signal = requestSignal(input, init);
  const maxAttempts = RETRY_DELAYS_MS.length;
  let lastTransportError = null;

  for (let index = 0; index < maxAttempts; index += 1) {
    if (signal?.aborted) throw signal.reason || new DOMException("Aborted", "AbortError");
    await sleep(RETRY_DELAYS_MS[index]);

    try {
      const response = await fetchImpl(input, init);
      const retryable = await isRetryableUnreadable(response);
      if (!retryable || index === maxAttempts - 1) return response;
      announceRetry(index + 2, maxAttempts);
    } catch (error) {
      if (signal?.aborted) throw error;
      lastTransportError = error;
      if (index === maxAttempts - 1) throw error;
      announceRetry(index + 2, maxAttempts);
    }
  }

  throw lastTransportError || new Error("Shared Chat retry budget exhausted.");
}

export function installSharedChatRetry() {
  if (globalThis[INSTALL_KEY]) return;
  globalThis[INSTALL_KEY] = true;

  const previousFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    if (
      interactiveSaveChatOpen()
      && url.origin === window.location.origin
      && url.pathname === SHARED_CHAT_PATH
    ) {
      return fetchSharedChatWithRetry(previousFetch, input, init);
    }
    return previousFetch(input, init);
  };
}
