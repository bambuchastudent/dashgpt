import {
  CHATGPT_IMPORT_RESULT_ID,
  applyChatGptImportBatch
} from "./chatgpt-history-import.js";
import { readChatGptExportFiles } from "./chatgpt-export-parser.js";
import {
  loadBrowserVault,
  materializeResults,
  putResult,
  saveBrowserVault
} from "./vault.js";

const BATCH_SIZE = 32;
const DIALOG_ID = "chatgptExportImportDialog";
let bypassChoiceOnce = false;
let importing = false;

function ru() {
  return String(document.documentElement?.lang || navigator.language || "en").toLocaleLowerCase().startsWith("ru");
}

function importedCount(vault) {
  return materializeResults(vault).filter(result =>
    result.id !== CHATGPT_IMPORT_RESULT_ID
    && result.source?.provider === "chatgpt"
    && result.source?.type === "conversation"
    && typeof result.source?.sourceId === "string"
  ).length;
}

function progressCard(vault) {
  return materializeResults(vault).find(result => result.id === CHATGPT_IMPORT_RESULT_ID) || null;
}

function completeProgress(vault, { discovered, failed }) {
  const current = progressCard(vault);
  if (!current) return;
  const imported = discovered ? Math.min(discovered, importedCount(vault)) : importedCount(vault);
  const state = failed ? "partial" : "completed";
  const next = structuredClone(current);
  next.summary = ru()
    ? (failed
      ? `Импортировано ${imported} из ${discovered}. ${failed} разговоров не удалось разобрать.`
      : `Импортировано ${imported} разговоров ChatGPT из официального экспорта.`)
    : (failed
      ? `Imported ${imported} of ${discovered}. ${failed} conversations could not be parsed.`
      : `Imported ${imported} ChatGPT conversations from the official export.`);
  next.status = ru() ? (failed ? "Почти готово" : "Готово") : (failed ? "Almost complete" : "Complete");
  next.next = ru() ? "Показать импортированные карточки" : "View imported cards";
  next.result = {
    ...(next.result || {}),
    kind: "chatgpt-history-import-progress",
    state,
    discovered,
    imported,
    failed,
    deferred: 0,
    updatedAt: new Date().toISOString(),
    lastSuccessAt: next.result?.lastSuccessAt || new Date().toISOString()
  };
  putResult(vault, next);
}

function notifyProgress() {
  window.dispatchEvent(new CustomEvent("dashgpt:chatgpt-import-vault-updated", { detail: { reload: false } }));
}

function yieldUi() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

export async function importChatGptExportFiles(files, {
  storage = globalThis.localStorage,
  onProgress = () => {},
  yieldFn = yieldUi
} = {}) {
  const parsed = await readChatGptExportFiles(files, {
    onFile(detail) { onProgress({ phase: "reading", ...detail }); }
  });
  const discovered = parsed.discovered + parsed.malformed;
  const loaded = loadBrowserVault(storage);
  const vault = loaded.vault;
  let accepted = 0;
  let updated = 0;
  let skipped = parsed.duplicateSourceRecords;
  let processed = 0;

  for (let index = 0; index < parsed.candidates.length; index += BATCH_SIZE) {
    const batch = parsed.candidates.slice(index, index + BATCH_SIZE);
    const result = applyChatGptImportBatch(vault, batch, {
      discovered,
      unresolved: parsed.malformed,
      deferred: 0
    });
    accepted += result.accepted;
    updated += result.updated;
    skipped += result.skipped;
    processed += batch.length;
    saveBrowserVault(storage, vault);
    notifyProgress();
    onProgress({
      phase: "importing",
      discovered,
      processed: Math.min(discovered, processed + parsed.malformed),
      accepted,
      updated,
      skipped,
      failed: parsed.malformed,
      remaining: Math.max(0, parsed.candidates.length - processed)
    });
    await yieldFn();
  }

  completeProgress(vault, { discovered, failed: parsed.malformed });
  saveBrowserVault(storage, vault);
  notifyProgress();
  const result = {
    discovered,
    imported: accepted,
    updated,
    skipped,
    failed: parsed.malformed,
    totalCanonicalChatGptCards: importedCount(vault)
  };
  onProgress({ phase: "complete", ...result, remaining: 0 });
  return result;
}

function visible(node) {
  return Boolean(node && !node.hidden && !node.disabled && node.getClientRects().length);
}

function triggerExistingRemoteSync() {
  const google = document.querySelector("#syncGoogleDriveButton");
  if (visible(google)) {
    google.click();
    return "google";
  }
  const github = document.querySelector("#syncGithubButton");
  if (visible(github)) {
    github.click();
    return "github";
  }
  return "";
}

function currentImportButton() {
  return document.querySelector(`[data-result-id="${CHATGPT_IMPORT_RESULT_ID}"] .open-button`);
}

function launchLiveImport() {
  const button = currentImportButton();
  if (!button) return;
  bypassChoiceOnce = true;
  button.click();
  queueMicrotask(() => { bypassChoiceOnce = false; });
}

function setStats(dialog, stats = {}) {
  const node = dialog.querySelector("#chatgptExportImportStats");
  const progress = dialog.querySelector("#chatgptExportImportProgress");
  if (!node || !progress) return;
  const discovered = Number(stats.discovered || stats.uniqueConversations || 0);
  const processed = Number(stats.processed || 0);
  if (discovered > 0) {
    progress.hidden = false;
    progress.max = discovered;
    progress.value = Math.min(discovered, processed);
  }
  if (stats.phase === "reading") {
    node.textContent = ru()
      ? `Читаю ${stats.name || "экспорт"} · найдено ${stats.uniqueConversations || 0} · пропущено ${stats.malformed || 0}`
      : `Reading ${stats.name || "export"} · ${stats.uniqueConversations || 0} found · ${stats.malformed || 0} skipped`;
    return;
  }
  if (["importing", "complete"].includes(stats.phase)) {
    node.textContent = ru()
      ? `${stats.processed ?? stats.discovered ?? 0}/${stats.discovered || 0} обработано · новых ${stats.accepted ?? stats.imported ?? 0} · обновлено ${stats.updated || 0} · дублей ${stats.skipped || 0} · ошибок ${stats.failed || 0}`
      : `${stats.processed ?? stats.discovered ?? 0}/${stats.discovered || 0} processed · ${stats.accepted ?? stats.imported ?? 0} new · ${stats.updated || 0} updated · ${stats.skipped || 0} duplicates · ${stats.failed || 0} failed`;
  }
}

function ensureDialog() {
  let dialog = document.getElementById(DIALOG_ID);
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.id = DIALOG_ID;
  dialog.className = "dialog chatgpt-export-import-dialog";
  dialog.innerHTML = `
    <article>
      <p class="eyebrow">CHATGPT → DASHGPT</p>
      <h2>${ru() ? "Импорт истории ChatGPT" : "Import ChatGPT history"}</h2>
      <p class="muted">${ru()
        ? "Для всей истории рекомендуем официальный экспорт: файл разбирается прямо на этом устройстве, без тысяч запросов к ChatGPT."
        : "For your full history, use the official export. DashGPT reads it on this device without thousands of ChatGPT requests."}</p>
      <section class="chatgpt-export-recommended">
        <span class="chatgpt-export-badge">${ru() ? "РЕКОМЕНДУЕМ" : "RECOMMENDED"}</span>
        <h3>${ru() ? "Надёжно всю историю" : "Reliable full-history import"}</h3>
        <p>${ru()
          ? "ChatGPT → Settings → Data Controls → Export data. Когда ZIP придёт, просто выбери его здесь. Можно также выбрать conversations.json или несколько пронумерованных JSON-файлов."
          : "ChatGPT → Settings → Data Controls → Export data. When the ZIP arrives, choose it here. You can also select conversations.json or multiple numbered JSON files."}</p>
        <input id="chatgptExportImportInput" type="file" accept=".zip,.json,application/zip,application/json" multiple hidden />
        <div class="dialog-actions">
          <button id="chatgptExportChooseButton" type="button" class="button primary">${ru() ? "Выбрать ZIP / JSON" : "Choose ZIP / JSON"}</button>
          <a class="button ghost" href="https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data" target="_blank" rel="noopener noreferrer">${ru() ? "Как получить экспорт ↗" : "How to get the export ↗"}</a>
        </div>
        <progress id="chatgptExportImportProgress" hidden></progress>
        <p id="chatgptExportImportStats" class="muted" aria-live="polite"></p>
        <p id="chatgptExportImportError" class="public-share-status error" aria-live="polite"></p>
        <button id="chatgptExportShowCards" type="button" class="button primary" hidden>${ru() ? "Показать карточки" : "View cards"}</button>
      </section>
      <section class="chatgpt-export-live">
        <h3>${ru() ? "Быстро последние чаты" : "Quick recent chats"}</h3>
        <p class="muted">${ru()
          ? "Старый live-импорт оставляем для небольшого количества свежих разговоров. При лимитах ChatGPT его можно остановить и вернуться к ZIP."
          : "The live importer remains useful for a small number of recent conversations. If ChatGPT throttles it, stop and use the export instead."}</p>
        <button id="chatgptExportLiveButton" type="button" class="button ghost">${ru() ? "Запустить live-импорт" : "Run live import"}</button>
      </section>
    </article>
    <form method="dialog" class="dialog-footer"><button class="button">${ru() ? "Закрыть" : "Close"}</button></form>`;
  document.body.append(dialog);

  const input = dialog.querySelector("#chatgptExportImportInput");
  const choose = dialog.querySelector("#chatgptExportChooseButton");
  const error = dialog.querySelector("#chatgptExportImportError");
  const show = dialog.querySelector("#chatgptExportShowCards");
  const live = dialog.querySelector("#chatgptExportLiveButton");
  choose.addEventListener("click", () => input.click());
  live.addEventListener("click", () => {
    if (importing) return;
    dialog.close();
    launchLiveImport();
  });
  show.addEventListener("click", () => window.location.reload());
  input.addEventListener("change", async () => {
    const files = Array.from(input.files || []);
    input.value = "";
    if (!files.length || importing) return;
    importing = true;
    choose.disabled = true;
    live.disabled = true;
    show.hidden = true;
    error.textContent = "";
    setStats(dialog, {});
    try {
      const result = await importChatGptExportFiles(files, { onProgress: stats => setStats(dialog, stats) });
      const provider = triggerExistingRemoteSync();
      error.classList.remove("error");
      error.textContent = ru()
        ? `Готово локально: ${result.imported} новых, ${result.updated} обновлено, ${result.skipped} дублей, ${result.failed} ошибок.${provider ? " Запущена синхронизация существующего Vault." : ""}`
        : `Done locally: ${result.imported} new, ${result.updated} updated, ${result.skipped} duplicates, ${result.failed} failed.${provider ? " Existing Vault sync started." : ""}`;
      show.hidden = false;
    } catch (cause) {
      error.classList.add("error");
      error.textContent = cause instanceof Error ? cause.message : (ru() ? "Не удалось импортировать экспорт." : "Could not import the export.");
    } finally {
      importing = false;
      choose.disabled = false;
      live.disabled = false;
    }
  });
  return dialog;
}

function openChoice() {
  const dialog = ensureDialog();
  if (!dialog.open) dialog.showModal();
}

function installImportChoiceInterception() {
  document.addEventListener("click", event => {
    if (bypassChoiceOnce || importing) return;
    const target = event.target instanceof Element ? event.target.closest(`[data-result-id="${CHATGPT_IMPORT_RESULT_ID}"] .open-button`) : null;
    if (!target) return;
    const card = target.closest(`[data-result-id="${CHATGPT_IMPORT_RESULT_ID}"]`);
    const state = card?.dataset.importState || "";
    if (["running", "rate_limited", "completed"].includes(state)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openChoice();
  }, true);
}

function installStyles() {
  if (document.getElementById("chatgpt-export-import-style")) return;
  const style = document.createElement("style");
  style.id = "chatgpt-export-import-style";
  style.textContent = `
    .chatgpt-export-import-dialog { width:min(760px,calc(100vw - 24px)); max-width:760px; }
    .chatgpt-export-import-dialog article { display:grid; gap:16px; }
    .chatgpt-export-recommended,.chatgpt-export-live { display:grid; gap:10px; padding:16px; border:1px solid rgba(148,163,184,.24); border-radius:18px; }
    .chatgpt-export-recommended { border-color:rgba(56,189,248,.42); background:rgba(14,165,233,.06); }
    .chatgpt-export-badge { width:max-content; font-size:.72rem; font-weight:800; letter-spacing:.1em; }
    .chatgpt-export-import-dialog h3,.chatgpt-export-import-dialog p { margin:0; }
    .chatgpt-export-import-dialog progress { width:100%; height:12px; }
    @media(max-width:390px) {
      .chatgpt-export-import-dialog { width:calc(100vw - 16px); padding:12px; }
      .chatgpt-export-import-dialog .dialog-actions { display:grid; grid-template-columns:1fr; }
      .chatgpt-export-import-dialog .button { width:100%; white-space:normal; }
    }
  `;
  document.head.append(style);
}

export function initializeChatGptExportImport() {
  installStyles();
  installImportChoiceInterception();
}
