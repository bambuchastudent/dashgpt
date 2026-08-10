import {
  loadBrowserVault,
  putResult,
  recordResultActivity,
  saveBrowserVault
} from "./vault.js";

const params = new URLSearchParams(window.location.search);
const isPersonalRoot = /^\/demo\/?$/.test(window.location.pathname) && params.get("showcase") !== "1";

function cleanText(value, maxLength = 4000) {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}…` : text;
}

function normalizeShareUrl(raw) {
  const url = new URL(raw);
  if (url.protocol !== "https:" || !["chatgpt.com", "chat.openai.com"].includes(url.hostname)) {
    throw new Error("Нужна публичная ссылка Share из ChatGPT.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "s" && parts[1]) return `https://chatgpt.com/share/${parts[1]}`;
  if (parts[0] === "share" && parts[1] === "e" && parts[2]) return `https://chatgpt.com/share/${parts[2]}`;
  if (parts[0] === "share" && parts[1]) return `https://chatgpt.com/share/${parts[1]}`;
  throw new Error("Нужна публичная ссылка вида chatgpt.com/share/…");
}

function summaryFromSharedChat(payload) {
  const replies = Array.isArray(payload?.replies) ? payload.replies : [];
  const assistantReplies = replies
    .filter(reply => reply?.type === "assistant")
    .map(reply => cleanText(reply?.statement, 2600))
    .filter(Boolean);
  const anyReplies = replies
    .map(reply => cleanText(reply?.statement, 2600))
    .filter(Boolean);
  return assistantReplies.at(-1)
    || anyReplies.at(-1)
    || "Разговор сохранён. Открой карточку, чтобы вернуться к нему позже.";
}

function persistSharedResult({ title, summary, sourceUrl }) {
  const loaded = loadBrowserVault(globalThis.localStorage);
  const result = {
    id: `result-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
    schemaVersion: 1,
    title: cleanText(title, 120) || "Сохранённый разговор",
    summary: cleanText(summary, 5000) || "Полезный разговор сохранён для продолжения.",
    category: "Мои чаты",
    tags: ["chatgpt", "share"],
    favorite: false,
    decisions: [],
    facts: [],
    constraints: [],
    userPreferences: [],
    openQuestions: [],
    next: "Вернуться к сохранённому разговору и продолжить с полезного итога.",
    source: { type: "chatgpt-share", url: sourceUrl, title: cleanText(title, 120) || "ChatGPT conversation" },
    immutable: false,
    contentVersion: 1,
    status: "Сохранено"
  };
  putResult(loaded.vault, result);
  recordResultActivity(loaded.vault, result.id, "created");
  saveBrowserVault(globalThis.localStorage, loaded.vault);
  return result;
}

if (isPersonalRoot) {
  const welcome = document.querySelector("#publicWelcome");
  if (welcome && !document.querySelector("#publicShareFallback")) {
    const block = document.createElement("section");
    block.id = "publicShareFallback";
    block.className = "public-share-fallback";
    block.innerHTML = `
      <div class="public-share-divider"><span>или</span></div>
      <p class="public-step-label">Уже нажал Share в ChatGPT?</p>
      <p class="public-welcome-hint">Вставь публичную ссылку — аккаунт DashGPT не нужен.</p>
      <form id="anonymousShareForm" class="public-share-link-form">
        <label>Ссылка из ChatGPT Share
          <input id="anonymousShareUrl" type="url" required inputmode="url" autocomplete="off" placeholder="https://chatgpt.com/share/…" />
        </label>
        <button class="button primary" type="submit">Понять этот чат</button>
        <p id="anonymousShareStatus" class="public-share-status" aria-live="polite"></p>
      </form>
      <section id="anonymousShareReview" class="public-share-review" hidden>
        <h3>Вот что сохранится</h3>
        <label>Название<input id="anonymousShareTitle" maxlength="120" /></label>
        <label>Главное<textarea id="anonymousShareSummary" rows="6"></textarea></label>
        <button id="anonymousShareSave" class="button primary public-save-first" type="button">Сохранить первую карточку</button>
      </section>`;

    const handoffForm = welcome.querySelector("#publicHandoffForm");
    const existingReview = welcome.querySelector("#publicShareReview");
    if (existingReview) existingReview.before(block);
    else if (handoffForm) handoffForm.after(block);
    else welcome.append(block);

    const form = block.querySelector("#anonymousShareForm");
    const input = block.querySelector("#anonymousShareUrl");
    const status = block.querySelector("#anonymousShareStatus");
    const review = block.querySelector("#anonymousShareReview");
    const titleInput = block.querySelector("#anonymousShareTitle");
    const summaryInput = block.querySelector("#anonymousShareSummary");
    const saveButton = block.querySelector("#anonymousShareSave");
    const submitButton = form.querySelector('button[type="submit"]');
    let prepared = null;

    async function resolveShare() {
      review.hidden = true;
      status.classList.remove("error");
      status.textContent = "Читаю публичный разговор…";
      submitButton.disabled = true;
      try {
        const sourceUrl = normalizeShareUrl(input.value.trim());
        const response = await fetch(`/api/shared-chat?url=${encodeURIComponent(sourceUrl)}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || payload?.error) throw new Error(payload?.error || "Не удалось прочитать этот разговор.");
        prepared = {
          sourceUrl,
          title: cleanText(payload.title, 120) || "Сохранённый разговор",
          summary: summaryFromSharedChat(payload)
        };
        titleInput.value = prepared.title;
        summaryInput.value = prepared.summary;
        review.hidden = false;
        status.textContent = "Готово. Проверь карточку и сохрани.";
        review.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (error) {
        prepared = null;
        status.classList.add("error");
        status.textContent = error instanceof Error ? error.message : "Не удалось прочитать этот разговор.";
      } finally {
        submitButton.disabled = false;
      }
    }

    form.addEventListener("submit", event => {
      event.preventDefault();
      void resolveShare();
    });

    saveButton.addEventListener("click", () => {
      if (!prepared) return;
      saveButton.disabled = true;
      persistSharedResult({
        sourceUrl: prepared.sourceUrl,
        title: titleInput.value,
        summary: summaryInput.value
      });
      window.location.replace("/demo/");
    });

    const handedOffShare = params.get("share");
    if (handedOffShare) {
      input.value = handedOffShare;
      queueMicrotask(() => form.requestSubmit());
    }
  }
}
