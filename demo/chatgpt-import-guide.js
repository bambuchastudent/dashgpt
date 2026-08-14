import { importChatGptExportFiles } from "./chatgpt-export-import.js";
import { CHATGPT_IMPORT_RESULT_ID } from "./chatgpt-history-import.js";

const GUIDE_DIALOG_ID = "chatgptImportGuideDialog";
const GUIDE_BUTTON_ID = "chatgptImportGuideButton";
const STORAGE_SECTION_ID = "chatgptStorageImportSection";
const GUIDE_STYLE_ID = "chatgpt-import-guide-style";
const OPENAI_EXPORT_HELP = "https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data";

let importing = false;

function ru() {
  return String(document.documentElement?.lang || navigator.language || "en").toLocaleLowerCase().startsWith("ru");
}

function copy(key) {
  const messages = {
    en: {
      topAction: "Import ChatGPT",
      title: "Import ChatGPT history",
      intro: "For your full history, use the official ChatGPT data export. DashGPT reads the archive on this device and turns the conversations into your normal cards.",
      step1: "In ChatGPT, open your profile → Settings → Data Controls → Export data, choose Export, then confirm the export.",
      step2: "When OpenAI says the export is ready, download the ZIP file from the message you receive.",
      step3: "Come back to DashGPT and choose that ZIP below. If you already unpacked it, conversations.json or compatible numbered conversation JSON files also work.",
      privacy: "Local-first: the selected archive and raw conversation bodies are parsed in this browser. DashGPT does not upload the raw export to its servers.",
      choose: "Choose ChatGPT ZIP / JSON",
      officialHelp: "Official OpenAI export help ↗",
      quick: "Quick recent chats",
      close: "Close",
      storageCopy: "Bring in your full ChatGPT history from the official ZIP/JSON export. The archive is read locally on this device.",
      storageAction: "How to import / choose archive",
      exportVault: "Export DashGPT Vault",
      importVault: "Import DashGPT Vault",
      reading: ({ name, found, failed }) => `Reading ${name || "export"} · ${found} found · ${failed} skipped`,
      importing: ({ processed, discovered, added, updated, duplicates, failed }) => `${processed}/${discovered} processed · ${added} new · ${updated} updated · ${duplicates} duplicates · ${failed} failed`,
      done: ({ added, updated, duplicates, failed }) => `Done locally: ${added} new, ${updated} updated, ${duplicates} duplicates, ${failed} failed.`,
      view: "View imported cards",
      noLive: "The live import entry is unavailable here. Use the ZIP/JSON route above.",
      genericError: "Could not import this ChatGPT export. Your existing Vault is unchanged."
    },
    ru: {
      topAction: "Импорт ChatGPT",
      title: "Импортировать историю ChatGPT",
      intro: "Для всей истории используй официальный экспорт ChatGPT. DashGPT читает архив на этом устройстве и превращает разговоры в обычные карточки.",
      step1: "В ChatGPT открой профиль → Settings → Data Controls → Export data, нажми Export и подтверди экспорт.",
      step2: "Когда OpenAI сообщит, что экспорт готов, скачай ZIP-файл из полученного сообщения.",
      step3: "Вернись в DashGPT и выбери этот ZIP ниже. Если архив уже распакован, подойдут conversations.json или совместимые пронумерованные JSON-файлы разговоров.",
      privacy: "Локально: выбранный архив и сырой текст разговоров разбираются прямо в этом браузере. DashGPT не загружает исходный экспорт на свои серверы.",
      choose: "Выбрать ChatGPT ZIP / JSON",
      officialHelp: "Официальная инструкция OpenAI ↗",
      quick: "Быстро импортировать свежие чаты",
      close: "Закрыть",
      storageCopy: "Перенеси всю историю ChatGPT из официального ZIP/JSON. Архив читается локально на этом устройстве.",
      storageAction: "Как импортировать / выбрать архив",
      exportVault: "Экспорт DashGPT Vault",
      importVault: "Импорт DashGPT Vault",
      reading: ({ name, found, failed }) => `Читаю ${name || "экспорт"} · найдено ${found} · пропущено ${failed}`,
      importing: ({ processed, discovered, added, updated, duplicates, failed }) => `${processed}/${discovered} обработано · новых ${added} · обновлено ${updated} · дублей ${duplicates} · ошибок ${failed}`,
      done: ({ added, updated, duplicates, failed }) => `Готово локально: новых ${added}, обновлено ${updated}, дублей ${duplicates}, ошибок ${failed}.`,
      view: "Показать импортированные карточки",
      noLive: "Live-импорт сейчас недоступен. Используй ZIP/JSON выше.",
      genericError: "Не удалось импортировать этот экспорт ChatGPT. Существующий Vault не изменён."
    }
  };
  return messages[ru() ? "ru" : "en"][key];
}

function text(key, values = {}) {
  const value = copy(key);
  return typeof value === "function" ? value(values) : value;
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

function updateProgress(dialog, stats = {}) {
  const progress = dialog.querySelector("#chatgptGuideProgress");
  const status = dialog.querySelector("#chatgptGuideStatus");
  if (!progress || !status) return;

  const discovered = Number(stats.discovered || stats.uniqueConversations || 0);
  const processed = Number(stats.processed || 0);
  if (discovered > 0) {
    progress.hidden = false;
    progress.max = discovered;
    progress.value = Math.min(discovered, processed);
  }

  if (stats.phase === "reading") {
    status.textContent = text("reading", {
      name: stats.name,
      found: Number(stats.uniqueConversations || 0),
      failed: Number(stats.malformed || 0)
    });
    return;
  }

  if (stats.phase === "importing") {
    status.textContent = text("importing", {
      processed,
      discovered,
      added: Number(stats.accepted || 0),
      updated: Number(stats.updated || 0),
      duplicates: Number(stats.skipped || 0),
      failed: Number(stats.failed || 0)
    });
  }
}

function launchExistingLiveImport(dialog) {
  const importButton = document.querySelector(`[data-result-id="${CHATGPT_IMPORT_RESULT_ID}"] .open-button`);
  if (!importButton) {
    const status = dialog.querySelector("#chatgptGuideStatus");
    if (status) status.textContent = text("noLive");
    return;
  }

  dialog.close();
  importButton.click();
  setTimeout(() => document.querySelector("#chatgptExportLiveButton")?.click(), 0);
}

function installStyles() {
  if (document.getElementById(GUIDE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = GUIDE_STYLE_ID;
  style.textContent = `
    .chatgpt-import-guide-dialog { width:min(760px,calc(100vw - 24px)); max-width:760px; }
    .chatgpt-import-guide-dialog article { display:grid; gap:16px; }
    .chatgpt-import-guide-dialog h2,.chatgpt-import-guide-dialog p { margin:0; }
    .chatgpt-import-guide-steps { display:grid; gap:10px; margin:0; padding-left:1.35rem; }
    .chatgpt-import-guide-steps li { padding-left:.25rem; line-height:1.45; }
    .chatgpt-import-guide-privacy { padding:12px 14px; border:1px solid rgba(56,189,248,.35); border-radius:14px; background:rgba(14,165,233,.06); }
    .chatgpt-import-guide-dialog progress { width:100%; height:12px; }
    .chatgpt-storage-import .provider-content { width:100%; }
    .chatgpt-storage-import .dialog-actions { margin-top:10px; }
    @media(max-width:390px) {
      .chatgpt-import-guide-dialog { width:calc(100vw - 16px); padding:12px; }
      .chatgpt-import-guide-dialog .dialog-actions { display:grid; grid-template-columns:1fr; }
      .chatgpt-import-guide-dialog .button { width:100%; white-space:normal; }
      #${GUIDE_BUTTON_ID} { white-space:normal; }
    }
  `;
  document.head.append(style);
}

function ensureGuideDialog() {
  let dialog = document.getElementById(GUIDE_DIALOG_ID);
  if (dialog) return dialog;

  dialog = document.createElement("dialog");
  dialog.id = GUIDE_DIALOG_ID;
  dialog.className = "dialog chatgpt-import-guide-dialog";
  dialog.innerHTML = `
    <article>
      <p class="eyebrow">CHATGPT → DASHGPT</p>
      <h2>${text("title")}</h2>
      <p class="muted">${text("intro")}</p>
      <ol class="chatgpt-import-guide-steps">
        <li>${text("step1")}</li>
        <li>${text("step2")}</li>
        <li>${text("step3")}</li>
      </ol>
      <p class="chatgpt-import-guide-privacy">${text("privacy")}</p>
      <input id="chatgptGuideFileInput" type="file" accept=".zip,.json,application/zip,application/json" multiple hidden />
      <div class="dialog-actions">
        <button id="chatgptGuideChooseButton" type="button" class="button primary">${text("choose")}</button>
        <a class="button ghost" href="${OPENAI_EXPORT_HELP}" target="_blank" rel="noopener noreferrer">${text("officialHelp")}</a>
        <button id="chatgptGuideLiveButton" type="button" class="button ghost">${text("quick")}</button>
      </div>
      <progress id="chatgptGuideProgress" hidden></progress>
      <p id="chatgptGuideStatus" class="muted" aria-live="polite"></p>
      <button id="chatgptGuideViewCards" type="button" class="button primary" hidden>${text("view")}</button>
    </article>
    <form method="dialog" class="dialog-footer"><button class="button">${text("close")}</button></form>`;
  document.body.append(dialog);

  const input = dialog.querySelector("#chatgptGuideFileInput");
  const choose = dialog.querySelector("#chatgptGuideChooseButton");
  const live = dialog.querySelector("#chatgptGuideLiveButton");
  const status = dialog.querySelector("#chatgptGuideStatus");
  const view = dialog.querySelector("#chatgptGuideViewCards");

  choose.addEventListener("click", () => input.click());
  live.addEventListener("click", () => {
    if (!importing) launchExistingLiveImport(dialog);
  });
  view.addEventListener("click", () => window.location.reload());

  input.addEventListener("change", async () => {
    const files = Array.from(input.files || []);
    input.value = "";
    if (!files.length || importing) return;

    importing = true;
    choose.disabled = true;
    live.disabled = true;
    view.hidden = true;
    status.textContent = "";
    const progress = dialog.querySelector("#chatgptGuideProgress");
    if (progress) {
      progress.hidden = true;
      progress.value = 0;
    }

    try {
      const result = await importChatGptExportFiles(files, {
        onProgress: stats => updateProgress(dialog, stats)
      });
      triggerExistingRemoteSync();
      status.textContent = text("done", {
        added: Number(result.imported || 0),
        updated: Number(result.updated || 0),
        duplicates: Number(result.skipped || 0),
        failed: Number(result.failed || 0)
      });
      view.hidden = false;
    } catch (error) {
      status.textContent = error instanceof Error && error.message ? error.message : text("genericError");
    } finally {
      importing = false;
      choose.disabled = false;
      live.disabled = false;
    }
  });

  return dialog;
}

function openGuide() {
  const dialog = ensureGuideDialog();
  if (!dialog.open) dialog.showModal();
}

function installTopAction() {
  if (document.getElementById(GUIDE_BUTTON_ID)) return;
  const actions = document.querySelector(".topbar-actions");
  if (!actions) return;
  const button = document.createElement("button");
  button.id = GUIDE_BUTTON_ID;
  button.type = "button";
  button.className = "button ghost";
  button.textContent = text("topAction");
  button.addEventListener("click", openGuide);
  const add = document.querySelector("#addResultButton");
  actions.insertBefore(button, add || null);
}

function installStorageEntry() {
  const storage = document.querySelector("#storageDialog article");
  if (!storage) return;

  const exportVault = document.querySelector("#exportVaultButton");
  const importVault = document.querySelector("#importVaultButton");
  if (exportVault) exportVault.textContent = text("exportVault");
  if (importVault) importVault.textContent = text("importVault");

  if (document.getElementById(STORAGE_SECTION_ID)) return;
  const section = document.createElement("section");
  section.id = STORAGE_SECTION_ID;
  section.className = "storage-provider chatgpt-storage-import";
  section.innerHTML = `
    <span class="provider-dot" aria-hidden="true"></span>
    <div class="provider-content">
      <strong>${text("title")}</strong>
      <p>${text("storageCopy")}</p>
      <div class="dialog-actions compact-actions">
        <button id="chatgptStorageImportButton" type="button" class="button primary">${text("storageAction")}</button>
      </div>
    </div>`;
  section.querySelector("#chatgptStorageImportButton").addEventListener("click", openGuide);
  const firstProvider = storage.querySelector(".storage-provider");
  storage.insertBefore(section, firstProvider || null);
}

export function initializeChatGptImportGuide() {
  installStyles();
  installTopAction();
  installStorageEntry();
}
