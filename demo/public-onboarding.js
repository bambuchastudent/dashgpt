import {
  loadBrowserVault,
  materializeResults,
  putResult,
  recordResultActivity,
  saveBrowserVault
} from "./vault.js";
import { normalizeRichCardText, projectSharedReply } from "./card-content.js";

const params = new URLSearchParams(window.location.search);
const isPersonalRoot = /^\/demo\/?$/.test(window.location.pathname) && params.get("showcase") !== "1";
const CHATGPT_IMPORT_RESULT_ID = "dashgpt-chatgpt-history-import";
const CHATGPT_SHARE_HOSTS = new Set(["chatgpt.com", "chat.openai.com"]);

const DASHGPT_CAPTURE_COMMAND = `DashGPT. Подготовь полезный итог ЭТОГО текущего разговора для сохранения.
Верни только один JSON-объект без markdown, пояснений и code fence:
{
  "title": "Короткое понятное название",
  "summary": "Кратко: что полезного выяснили, решили или подготовили",
  "category": "Короткая тема",
  "tags": ["2-5 коротких тегов"],
  "decisions": ["принятые решения, если есть"],
  "facts": ["важные факты, которые стоит сохранить"],
  "constraints": ["важные ограничения, если есть"],
  "userPreferences": ["выраженные предпочтения пользователя, если есть"],
  "openQuestions": ["что осталось неясным, если есть"],
  "next": "Следующий полезный шаг, если он есть"
}
Не пересказывай чат по сообщениям. Сохрани только долговременный полезный результат. Не включай пароли, API-ключи, платёжные данные и другие секреты.`;

if (isPersonalRoot) {
  const dashboard = document.querySelector("#dashboardView");
  const resultPage = document.querySelector("#resultPage");
  const addButton = document.querySelector("#addResultButton");
  const storageButton = document.querySelector("#storageButton");
  const storageDialog = document.querySelector("#storageDialog");
  const productBoardLink = document.querySelector(".dash-nav-link");
  const topbar = document.querySelector(".topbar");
  const subtitle = topbar?.querySelector(".subtitle");
  const eyebrow = topbar?.querySelector(".eyebrow");

  if (eyebrow) eyebrow.textContent = "ТВОИ СОХРАНЁННЫЕ РАЗГОВОРЫ";
  if (subtitle) subtitle.textContent = "Полезное из твоих разговоров с ИИ — чтобы продолжить потом.";
  if (storageButton) storageButton.textContent = "Настройки";
  if (productBoardLink) productBoardLink.hidden = true;
  if (addButton) addButton.textContent = "+ Сохранить чат";

  const load = () => loadBrowserVault(globalThis.localStorage);
  const ownResults = () => materializeResults(load().vault);
  const userResults = () => ownResults().filter(result => result.id !== CHATGPT_IMPORT_RESULT_ID);
  const hasImportCard = () => ownResults().some(result => result.id === CHATGPT_IMPORT_RESULT_ID);

  function make(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text) node.textContent = options.text;
    return node;
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function cleanText(value, maxLength) {
    const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}…` : text;
  }

  function cleanList(value, { maxItems = 12, maxLength = 500 } = {}) {
    const input = Array.isArray(value)
      ? value
      : typeof value === "string" && value.trim()
        ? value.split(/[,\n]/)
        : [];
    const output = [];
    const seen = new Set();
    for (const item of input) {
      const text = cleanText(item, maxLength);
      if (!text) continue;
      const key = text.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(text);
      if (output.length >= maxItems) break;
    }
    return output;
  }

  function jsonCandidate(raw) {
    let text = String(raw || "").trim();
    const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenced) text = fenced[1].trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
    return text;
  }

  function parseResultEnvelope(raw) {
    let parsed;
    try {
      parsed = JSON.parse(jsonCandidate(raw));
    } catch {
      throw new Error("Не вижу карточку. Скопируй ответ ChatGPT целиком и вставь сюда.");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Не вижу карточку. Скопируй ответ ChatGPT целиком и вставь сюда.");
    }

    const title = cleanText(parsed.title, 120);
    const summary = normalizeRichCardText(parsed.summary, { maxLength: 5000 });
    if (!title || !summary) {
      throw new Error("В ответе не хватает названия или итога. Попроси ChatGPT выполнить DashGPT-команду ещё раз.");
    }

    return {
      title,
      summary,
      category: cleanText(parsed.category, 60) || "Мои чаты",
      tags: cleanList(parsed.tags, { maxItems: 8, maxLength: 40 }),
      decisions: cleanList(parsed.decisions),
      facts: cleanList(parsed.facts),
      constraints: cleanList(parsed.constraints),
      userPreferences: cleanList(parsed.userPreferences),
      openQuestions: cleanList(parsed.openQuestions),
      next: normalizeRichCardText(parsed.next || parsed.suggestedNextStep, { maxLength: 1000 })
    };
  }

  function normalizeChatGptShareUrl(raw) {
    let url;
    try {
      url = new URL(String(raw || "").trim());
    } catch {
      throw new Error("Вставь ссылку Share из ChatGPT вида chatgpt.com/share/…");
    }

    if (url.protocol !== "https:" || !CHATGPT_SHARE_HOSTS.has(url.hostname)) {
      throw new Error("Нужна публичная ссылка Share из ChatGPT.");
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "c" && parts[1]) {
      throw new Error("Это приватная ссылка на чат. В ChatGPT нажми Share и вставь сюда получившуюся ссылку chatgpt.com/share/…");
    }

    const shareId = parts[0] === "s" && parts[1]
      ? parts[1]
      : parts[0] === "share" && parts[1] === "e" && parts[2]
        ? parts[2]
        : parts[0] === "share" && parts[1]
          ? parts[1]
          : "";
    if (!shareId) throw new Error("Нужна публичная ссылка Share из ChatGPT вида chatgpt.com/share/…");
    return `https://chatgpt.com/share/${shareId}`;
  }

  function projectionFromSharedChat(payload) {
    const replies = Array.isArray(payload?.replies) ? payload.replies : [];
    const assistantReplies = replies
      .filter(reply => reply?.type === "assistant")
      .map(reply => normalizeRichCardText(reply?.statement, { maxLength: 5000 }))
      .filter(Boolean);
    const visibleReplies = replies
      .map(reply => normalizeRichCardText(reply?.statement, { maxLength: 5000 }))
      .filter(Boolean);
    const statement = assistantReplies.at(-1)
      || visibleReplies.at(-1)
      || "Разговор сохранён. Открой карточку, чтобы вернуться к нему позже.";
    return projectSharedReply(statement, { maxLength: 5000 });
  }

  async function resolveSharedChatCard(rawUrl) {
    const sourceUrl = normalizeChatGptShareUrl(rawUrl);
    let response;
    let payload;
    try {
      response = await fetch(`/api/shared-chat?url=${encodeURIComponent(sourceUrl)}`, { cache: "no-store" });
      payload = await response.json();
    } catch {
      throw new Error("Не удалось прочитать публичный чат. Проверь Share-ссылку или используй запасной способ ниже.");
    }
    if (!response.ok || payload?.error) {
      throw new Error("Не удалось прочитать публичный чат. Проверь Share-ссылку или используй запасной способ ниже.");
    }

    const title = cleanText(payload?.title, 120) || "Сохранённый разговор";
    const projection = projectionFromSharedChat(payload);
    return {
      title,
      summary: projection.summary,
      category: "Мои чаты",
      tags: ["share"],
      decisions: projection.decisions,
      facts: [],
      constraints: [],
      userPreferences: [],
      openQuestions: [],
      next: projection.next,
      source: {
        type: "chatgpt-share",
        url: sourceUrl,
        title
      }
    };
  }

  function persistFirstResult(prepared) {
    const loaded = load();
    const source = prepared?.source?.type === "chatgpt-share" && prepared.source.url
      ? {
          type: "chatgpt-share",
          url: normalizeChatGptShareUrl(prepared.source.url),
          title: cleanText(prepared.source.title || prepared.title, 120) || "ChatGPT conversation"
        }
      : { type: "chatgpt-handoff", title: "ChatGPT conversation" };
    const existing = source.type === "chatgpt-share"
      ? materializeResults(loaded.vault).find(result => result.source?.type === "chatgpt-share" && result.source?.url === source.url)
      : null;
    const tags = [...new Set(["chatgpt", ...(source.type === "chatgpt-share" ? ["share"] : []), ...(prepared.tags || [])])];
    const result = {
      id: existing?.id || `result-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
      schemaVersion: 1,
      title: prepared.title,
      summary: normalizeRichCardText(prepared.summary, { maxLength: 5000 }),
      category: prepared.category,
      tags,
      decisions: cleanList(prepared.decisions),
      facts: prepared.facts || [],
      constraints: prepared.constraints || [],
      userPreferences: prepared.userPreferences || [],
      openQuestions: prepared.openQuestions || [],
      next: normalizeRichCardText(prepared.next, { maxLength: 1000 }),
      source,
      immutable: false,
      contentVersion: existing ? Number(existing.contentVersion || 1) + 1 : 1,
      status: "Сохранено"
    };
    putResult(loaded.vault, result);
    recordResultActivity(loaded.vault, result.id, existing ? "updated" : "created");
    saveBrowserVault(globalThis.localStorage, loaded.vault);
    return { result, updated: Boolean(existing) };
  }

  async function copyCaptureCommand() {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(DASHGPT_CAPTURE_COMMAND);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = DASHGPT_CAPTURE_COMMAND;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function isVisible(node) {
    return Boolean(node && !node.hidden);
  }

  function providerState() {
    const googleConnect = document.querySelector("#connectGoogleDriveButton");
    const googleDisconnect = document.querySelector("#disconnectGoogleDriveButton");
    const googleSync = document.querySelector("#syncGoogleDriveButton");
    const googleStatus = document.querySelector("#googleDriveStatus")?.textContent || "";
    const githubConnect = document.querySelector("#connectGithubButton");
    const githubPairedControls = document.querySelector("#githubPairedControls");
    const githubStatus = document.querySelector("#githubStatus")?.textContent || "";

    const googleConnected = isVisible(googleDisconnect);
    const githubConnected = isVisible(githubPairedControls);
    const googleReady = isVisible(googleConnect) && !googleConnect.disabled;
    const githubReady = Boolean(githubConnect && !githubConnect.disabled && !githubConnected);

    return {
      google: {
        connected: googleConnected,
        ready: googleReady,
        canonical: googleConnect,
        sync: googleSync,
        status: googleStatus
      },
      github: {
        connected: githubConnected,
        ready: githubReady,
        canonical: githubConnect,
        status: githubStatus
      }
    };
  }

  function openStorageFor(provider = "") {
    const dialog = document.querySelector("#saveChatDialog");
    if (dialog?.open) dialog.close();
    if (storageDialog && !storageDialog.open) {
      if (storageButton && !storageButton.hidden) storageButton.click();
      else storageDialog.showModal();
    }
    requestAnimationFrame(() => {
      const target = provider === "github"
        ? document.querySelector(".github-storage-provider")
        : provider === "google"
          ? document.querySelector("#googleDriveStorageProvider")
          : null;
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      if (provider === "github") document.querySelector("#githubStorageUrl")?.focus();
      else if (provider === "google") document.querySelector("#connectGoogleDriveButton")?.focus();
    });
  }

  function waitForProviderAction(button, statusNode, timeoutMs = 6500) {
    return new Promise(resolve => {
      if (!button || button.hidden || button.disabled) {
        resolve();
        return;
      }
      const initial = statusNode?.textContent || "";
      let changed = false;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        observer?.disconnect();
        clearTimeout(timer);
        resolve();
      };
      const observer = statusNode ? new MutationObserver(() => {
        const current = statusNode.textContent || "";
        if (current !== initial) changed = true;
        if (changed && !/syncing/i.test(current)) finish();
      }) : null;
      observer?.observe(statusNode, { childList: true, characterData: true, subtree: true });
      const timer = setTimeout(finish, timeoutMs);
      button.click();
      if (!statusNode) setTimeout(finish, 250);
    });
  }

  async function syncConnectedProviderBeforeReload() {
    const state = providerState();
    if (state.google.connected && isVisible(state.google.sync) && !state.google.sync.disabled) {
      await waitForProviderAction(state.google.sync, document.querySelector("#googleDriveStatus"));
      return;
    }
    const githubSync = document.querySelector("#syncGithubButton");
    if (state.github.connected && isVisible(githubSync) && !githubSync.disabled) {
      await waitForProviderAction(githubSync, document.querySelector("#githubStatus"));
    }
  }

  function refreshSaveChatProviders(dialog) {
    if (!dialog) return;
    const state = providerState();
    const googleStatus = dialog.querySelector("#saveChatGoogleStatus");
    const googleAction = dialog.querySelector("#saveChatGoogleAction");
    const githubStatus = dialog.querySelector("#saveChatGithubStatus");
    const githubAction = dialog.querySelector("#saveChatGithubAction");

    if (googleStatus && googleAction) {
      if (state.google.connected) {
        const reconnect = isVisible(state.google.canonical) && /reconnect/i.test(state.google.canonical.textContent || "");
        googleStatus.textContent = reconnect
          ? "Подключён · нужно переподключить перед следующей синхронизацией."
          : "Подключён · синхронизирует тот же Vault и те же карточки.";
        googleAction.disabled = !reconnect;
        googleAction.textContent = reconnect ? "Переподключить Google Drive" : "Google Drive подключён";
      } else if (state.google.ready) {
        googleStatus.textContent = "Не подключён · можно переносить те же карточки между устройствами.";
        googleAction.disabled = false;
        googleAction.textContent = /retry/i.test(state.google.canonical?.textContent || "")
          ? "Повторить Google Drive"
          : "Подключить Google Drive";
      } else {
        const blockedByGithub = state.github.connected || /github/i.test(state.google.status);
        googleStatus.textContent = blockedByGithub
          ? "Недоступен, пока активен GitHub. Используется один удалённый провайдер."
          : "Google Drive готовится или недоступен. Локальное сохранение всё равно работает.";
        googleAction.disabled = true;
        googleAction.textContent = blockedByGithub ? "Google Drive недоступен" : "Google Drive готовится…";
      }
    }

    if (githubStatus && githubAction) {
      if (state.github.connected) {
        githubStatus.textContent = "Подключён · синхронизирует тот же Vault и те же карточки.";
        githubAction.disabled = true;
        githubAction.textContent = "GitHub подключён";
      } else if (state.github.ready) {
        githubStatus.textContent = "Не подключён · настройка использует выбранный репозиторий или папку.";
        githubAction.disabled = false;
        githubAction.textContent = "Настроить GitHub";
      } else {
        const blockedByGoogle = state.google.connected || /google drive/i.test(state.github.status);
        githubStatus.textContent = blockedByGoogle
          ? "Недоступен, пока активен Google Drive. Используется один удалённый провайдер."
          : "GitHub сейчас недоступен. Локальное сохранение всё равно работает.";
        githubAction.disabled = blockedByGoogle;
        githubAction.textContent = blockedByGoogle ? "GitHub недоступен" : "Открыть настройки GitHub";
      }
    }
  }

  function installProviderWatch(dialog) {
    const targets = [
      document.querySelector("#googleDriveStorageProvider"),
      document.querySelector(".github-storage-provider"),
      storageButton
    ].filter(Boolean);
    const observer = new MutationObserver(() => refreshSaveChatProviders(dialog));
    for (const target of targets) observer.observe(target, { childList: true, characterData: true, subtree: true, attributes: true });
    dialog.addEventListener("close", () => observer.disconnect(), { once: true });
  }

  function ensureSaveChatDialog() {
    let dialog = document.querySelector("#saveChatDialog");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "saveChatDialog";
    dialog.className = "dialog save-chat-dialog";
    dialog.innerHTML = `
      <article>
        <p class="eyebrow">СОХРАНИТЬ ЧАТ</p>
        <h2>Вставь ссылку на чат</h2>
        <p class="muted save-chat-lead">В ChatGPT нажми Share и вставь ссылку. DashGPT сам достанет название и главное — руками заполнять карточку не нужно.</p>
        <section class="save-chat-capture" aria-labelledby="save-chat-capture-title">
          <p class="public-step-label">1 · ССЫЛКА</p>
          <h3 id="save-chat-capture-title">ChatGPT Share → готовая карточка</h3>
          <form id="saveChatLinkForm" class="public-share-link-form save-chat-link-form">
            <label>Ссылка ChatGPT Share
              <input id="saveChatLink" type="url" required inputmode="url" autocomplete="off" placeholder="https://chatgpt.com/share/…" />
            </label>
            <button type="submit" class="button primary public-handoff-submit">Добавить карточку</button>
            <p id="saveChatLinkStatus" class="public-share-status" aria-live="polite"></p>
          </form>
          <section id="saveChatReview" class="public-share-review" hidden>
            <h3>Вот что сохранится</h3>
            <label>Название<input id="saveChatReviewTitle" maxlength="120" /></label>
            <label>Главное<textarea id="saveChatReviewSummary" rows="6"></textarea></label>
            <button id="saveChatCommit" type="button" class="button primary public-save-first">Сохранить карточку</button>
          </section>
          <details id="saveChatFallback" class="save-chat-fallback">
            <summary>Нет Share-ссылки? Использовать ответ ChatGPT</summary>
            <div class="save-chat-fallback-body">
              <p class="public-step-label">ЗАПАСНОЙ СПОСОБ</p>
              <h3>Попроси ChatGPT выделить полезный итог</h3>
              <div class="public-command-panel save-chat-command-panel">
                <code class="public-command">DashGPT, сохрани этот разговор</code>
                <button id="saveChatCopyCommand" type="button" class="button primary public-copy-command">Скопировать DashGPT-команду</button>
                <p id="saveChatCommandStatus" class="public-share-status" aria-live="polite"></p>
              </div>
              <form id="saveChatForm" class="public-handoff-form">
                <label>Вставь ответ ChatGPT<textarea id="saveChatPayload" required rows="7" autocomplete="off" placeholder='{"title":"…","summary":"…"}'></textarea></label>
                <button type="submit" class="button primary public-handoff-submit">Проверить карточку</button>
                <p id="saveChatStatus" class="public-share-status" aria-live="polite"></p>
              </form>
            </div>
          </details>
        </section>
        <section class="save-chat-storage" aria-labelledby="save-chat-storage-title">
          <div class="save-chat-section-heading">
            <div><p class="public-step-label">СИНХРОНИЗАЦИЯ · НЕОБЯЗАТЕЛЬНО</p><h3 id="save-chat-storage-title">Карточка сохраняется здесь сразу</h3></div>
            <button id="saveChatStorageDetails" type="button" class="button ghost small">Все настройки</button>
          </div>
          <div class="save-chat-provider-grid">
            <article class="save-chat-provider active-provider">
              <strong>Это устройство</strong>
              <p>Активно · карточка всегда сохраняется сюда первой.</p>
              <span class="save-chat-provider-state">Локально ✓</span>
            </article>
            <article class="save-chat-provider">
              <strong>Google Drive</strong>
              <p id="saveChatGoogleStatus">Проверяю…</p>
              <button id="saveChatGoogleAction" type="button" class="button primary small">Google Drive</button>
            </article>
            <article class="save-chat-provider">
              <strong>GitHub</strong>
              <p id="saveChatGithubStatus">Проверяю…</p>
              <button id="saveChatGithubAction" type="button" class="button ghost small">GitHub</button>
            </article>
          </div>
          <p class="save-chat-storage-note">Одновременно используется один удалённый провайдер. Без него DashGPT полностью работает локально.</p>
        </section>
      </article>
      <form method="dialog" class="dialog-footer"><button class="button">Закрыть</button></form>`;
    document.body.append(dialog);

    const linkForm = dialog.querySelector("#saveChatLinkForm");
    const linkInput = dialog.querySelector("#saveChatLink");
    const linkStatus = dialog.querySelector("#saveChatLinkStatus");
    const linkSubmit = linkForm.querySelector('button[type="submit"]');
    const copyButton = dialog.querySelector("#saveChatCopyCommand");
    const commandStatus = dialog.querySelector("#saveChatCommandStatus");
    const form = dialog.querySelector("#saveChatForm");
    const payload = dialog.querySelector("#saveChatPayload");
    const status = dialog.querySelector("#saveChatStatus");
    const review = dialog.querySelector("#saveChatReview");
    const titleInput = dialog.querySelector("#saveChatReviewTitle");
    const summaryInput = dialog.querySelector("#saveChatReviewSummary");
    const save = dialog.querySelector("#saveChatCommit");
    let prepared = null;

    linkForm.addEventListener("submit", async event => {
      event.preventDefault();
      review.hidden = true;
      linkStatus.classList.remove("error");
      linkStatus.textContent = "Читаю публичный разговор…";
      linkSubmit.disabled = true;
      try {
        prepared = await resolveSharedChatCard(linkInput.value);
        titleInput.value = prepared.title;
        summaryInput.value = prepared.summary;
        review.hidden = false;
        linkStatus.textContent = "Готово. Проверь карточку и сохрани.";
        review.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (error) {
        prepared = null;
        linkStatus.classList.add("error");
        linkStatus.textContent = error instanceof Error
          ? error.message
          : "Не удалось прочитать публичный чат. Проверь Share-ссылку или используй запасной способ ниже.";
      } finally {
        linkSubmit.disabled = false;
      }
    });

    copyButton.addEventListener("click", async () => {
      commandStatus.classList.remove("error");
      try {
        await copyCaptureCommand();
        commandStatus.textContent = "Скопировано. Отправь команду в нужный ChatGPT-разговор и вставь сюда его ответ.";
      } catch {
        commandStatus.classList.add("error");
        commandStatus.textContent = "Не получилось скопировать автоматически. Выдели команду выше и скопируй её.";
      }
    });

    form.addEventListener("submit", event => {
      event.preventDefault();
      review.hidden = true;
      status.classList.remove("error");
      try {
        prepared = parseResultEnvelope(payload.value);
        titleInput.value = prepared.title;
        summaryInput.value = prepared.summary;
        review.hidden = false;
        status.textContent = "Готово. Проверь карточку и сохрани.";
        review.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (error) {
        prepared = null;
        status.classList.add("error");
        status.textContent = error instanceof Error ? error.message : "Не удалось подготовить карточку.";
      }
    });

    save.addEventListener("click", async () => {
      if (!prepared) return;
      save.disabled = true;
      const saved = persistFirstResult({
        ...prepared,
        title: cleanText(titleInput.value, 120) || prepared.title,
        summary: normalizeRichCardText(summaryInput.value, { maxLength: 5000 }) || prepared.summary
      });
      const saveStatus = prepared.source?.type === "chatgpt-share" ? linkStatus : status;
      saveStatus.classList.remove("error");
      saveStatus.textContent = saved.updated
        ? "Карточка обновлена на этом устройстве. Если синхронизация подключена — отправляю ту же карточку туда."
        : "Сохранено на этом устройстве. Если синхронизация подключена — отправляю ту же карточку туда.";
      await syncConnectedProviderBeforeReload();
      window.location.replace("/demo/");
    });

    dialog.querySelector("#saveChatGoogleAction").addEventListener("click", () => {
      const state = providerState();
      if (state.google.canonical && !state.google.canonical.hidden && !state.google.canonical.disabled) {
        // Preserve F26: no await/fetch/timer may be inserted before this
        // delegated click. The canonical handler opens Google from this same
        // originating user action.
        state.google.canonical.click();
        queueMicrotask(() => refreshSaveChatProviders(dialog));
        return;
      }
      openStorageFor("google");
    });

    dialog.querySelector("#saveChatGithubAction").addEventListener("click", () => openStorageFor("github"));
    dialog.querySelector("#saveChatStorageDetails").addEventListener("click", () => openStorageFor());
    return dialog;
  }

  function openSaveChatDialog() {
    const dialog = ensureSaveChatDialog();
    refreshSaveChatProviders(dialog);
    installProviderWatch(dialog);
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => dialog.querySelector("#saveChatLink")?.focus());
  }

  function humanizeDashboard() {
    const summaryTitle = document.querySelector("#summary-title");
    const summaryText = document.querySelector("#summaryText");
    const resultsTitle = document.querySelector("#resultsTitle");
    const dashEmpty = document.querySelector("#dashesEmpty");
    setText(summaryTitle, "Здесь остаётся то, к чему стоит вернуться.");
    if (summaryText) {
      const count = userResults().length;
      if (count === 0 && hasImportCard()) setText(summaryText, "Начни с импорта старых чатов или сохрани текущий разговор — обе возможности уже готовы.");
      else setText(summaryText, count === 1 ? "1 сохранённая карточка из твоего разговора." : `${count} сохранённых карточек из твоих разговоров.`);
    }
    setText(resultsTitle, "Твои карточки");
    if (dashEmpty) {
      setText(dashEmpty.querySelector("h3"), "Темы появятся сами");
      setText(dashEmpty.querySelector("p"), "Когда карточек станет больше, DashGPT соберёт связанные разговоры рядом.");
    }
  }

  function renderWelcome() {
    dashboard.hidden = true;
    if (resultPage) resultPage.hidden = true;
    if (addButton) addButton.hidden = true;
    if (storageButton) storageButton.hidden = true;

    let welcome = document.querySelector("#publicWelcome");
    if (welcome) return welcome;

    welcome = make("section", { className: "public-welcome" });
    welcome.id = "publicWelcome";

    const badge = make("p", { className: "public-welcome-badge", text: "НАЧНИ В СВОЁМ ЧАТЕ" });
    const title = make("h2", { text: "Сохрани разговор через ChatGPT" });
    const copy = make("p", {
      className: "public-welcome-copy",
      text: "Открой разговор, который хочешь оставить на потом. ChatGPT сам выделит итог, решения и следующий шаг — DashGPT сохранит готовую карточку."
    });

    const commandPanel = make("section", { className: "public-command-panel" });
    const commandLabel = make("p", { className: "public-step-label", text: "1 · В своём ChatGPT-чате" });
    const command = make("code", { className: "public-command", text: "DashGPT, сохрани этот разговор" });
    const copyButton = make("button", { className: "button primary public-copy-command", text: "Скопировать DashGPT-команду" });
    copyButton.id = "copyDashGptCommand";
    copyButton.type = "button";
    const commandHint = make("p", { className: "public-welcome-hint", text: "Отправь скопированную команду в конце нужного разговора." });
    const copyStatus = make("p", { className: "public-share-status" });
    copyStatus.id = "publicCommandStatus";
    copyStatus.setAttribute("aria-live", "polite");
    commandPanel.append(commandLabel, command, copyButton, commandHint, copyStatus);

    const form = make("form", { className: "public-handoff-form" });
    form.id = "publicHandoffForm";
    const handoffLabel = make("label", { text: "2 · Вставь ответ ChatGPT" });
    const handoff = document.createElement("textarea");
    handoff.id = "publicHandoffPayload";
    handoff.required = true;
    handoff.rows = 7;
    handoff.autocomplete = "off";
    handoff.placeholder = '{"title":"…","summary":"…"}';
    handoffLabel.append(handoff);
    const submit = make("button", { className: "button primary public-handoff-submit", text: "Проверить карточку" });
    submit.type = "submit";
    const status = make("p", { className: "public-share-status" });
    status.id = "publicHandoffStatus";
    status.setAttribute("aria-live", "polite");
    form.append(handoffLabel, submit, status);

    const review = make("section", { className: "public-share-review" });
    review.id = "publicShareReview";
    review.hidden = true;
    const reviewTitle = make("h3", { text: "Вот что сохранится" });
    const titleLabel = make("label", { text: "Название" });
    const titleInput = document.createElement("input");
    titleInput.id = "publicReviewTitle";
    titleInput.maxLength = 120;
    titleLabel.append(titleInput);
    const summaryLabel = make("label", { text: "Главное" });
    const summaryInput = document.createElement("textarea");
    summaryInput.id = "publicReviewSummary";
    summaryInput.rows = 6;
    summaryLabel.append(summaryInput);
    const save = make("button", { className: "button primary public-save-first", text: "Сохранить первую карточку" });
    save.type = "button";
    review.append(reviewTitle, titleLabel, summaryLabel, save);

    welcome.append(badge, title, copy, commandPanel, form, review);
    dashboard.before(welcome);

    let prepared = null;

    copyButton.addEventListener("click", async () => {
      copyStatus.classList.remove("error");
      try {
        await copyCaptureCommand();
        copyStatus.textContent = "Скопировано. Вернись в нужный чат и отправь команду.";
      } catch {
        copyStatus.classList.add("error");
        copyStatus.textContent = "Не получилось скопировать автоматически. Выдели команду выше и скопируй её.";
      }
    });

    form.addEventListener("submit", event => {
      event.preventDefault();
      review.hidden = true;
      status.classList.remove("error");
      try {
        prepared = parseResultEnvelope(handoff.value);
        titleInput.value = prepared.title;
        summaryInput.value = prepared.summary;
        review.hidden = false;
        status.textContent = "Готово. Проверь карточку и сохрани.";
        review.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (error) {
        prepared = null;
        status.classList.add("error");
        status.textContent = error instanceof Error ? error.message : "Не удалось подготовить карточку.";
      }
    });

    save.addEventListener("click", () => {
      if (!prepared) return;
      save.disabled = true;
      persistFirstResult({
        ...prepared,
        title: cleanText(titleInput.value, 120) || prepared.title,
        summary: normalizeRichCardText(summaryInput.value, { maxLength: 5000 }) || prepared.summary
      });
      window.location.replace("/demo/");
    });
    return welcome;
  }

  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target.closest("#addResultButton") : null;
    if (!target || target !== addButton) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openSaveChatDialog();
  }, true);

  if (userResults().length === 0) {
    const welcome = renderWelcome();
    if (hasImportCard()) {
      // Bulk migration is a secondary bootstrap path, so keep the normal
      // chat-first capture instructions available while showing the default
      // import card in the canonical My Dash above them.
      dashboard.hidden = false;
      if (addButton) addButton.hidden = false;
      if (storageButton) storageButton.hidden = false;
      const gallery = document.querySelector("#galleryRegion");
      if (gallery && welcome) gallery.after(welcome);
      humanizeDashboard();
    }
  } else {
    dashboard.hidden = false;
    if (addButton) addButton.hidden = false;
    if (storageButton) storageButton.hidden = false;
    humanizeDashboard();
    const observer = new MutationObserver(() => humanizeDashboard());
    const summaryText = document.querySelector("#summaryText");
    if (summaryText) observer.observe(summaryText, { childList: true, characterData: true, subtree: true });
  }
}
