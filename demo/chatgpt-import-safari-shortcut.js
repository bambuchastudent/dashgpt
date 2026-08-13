import { initializeCardKeyboardNavigation } from "./card-keyboard-navigation.js";
import { buildChatGptHistorySafariShortcutScript } from "./chatgpt-history-source-runner.js";

initializeCardKeyboardNavigation();

function isIphoneOrIpadSafari() {
  const ua = String(navigator.userAgent || "");
  const platform = String(navigator.platform || "");
  const ios = /iPhone|iPad|iPod/i.test(ua)
    || (/Mac/i.test(platform) && Number(navigator.maxTouchPoints || 0) > 1);
  if (!ios) return false;
  return /Safari/i.test(ua) && !/(CriOS|FxiOS|EdgiOS|OPiOS)/i.test(ua);
}

function isRussian() {
  return String(document.documentElement?.lang || navigator.language || "en")
    .toLocaleLowerCase()
    .startsWith("ru");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.readOnly = true;
  area.style.cssText = "position:fixed;left:-9999px;top:0";
  document.body.append(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  return Boolean(ok);
}

function safariShortcutScript() {
  return buildChatGptHistorySafariShortcutScript({
    receiverOrigin: window.location.origin,
    receiverPath: "/demo/"
  });
}

function instructionCopy() {
  if (isRussian()) {
    return {
      intro: "На iPhone/iPad Safari запускай импорт через команду «DashGPT Import» из меню «Поделиться». JavaScript-закладка здесь не нужна.",
      steps: [
        "Нажми «Скопировать скрипт для Safari».",
        "Открой приложение «Команды», создай команду «DashGPT Import» и добавь действие «Выполнить JavaScript на веб-странице». Вставь скопированный скрипт.",
        "В деталях команды включи показ в меню «Поделиться» и оставь вход только для веб-страниц Safari. Если iPhone попросит — разреши выполнение скриптов в настройках «Команд».",
        "Открой chatgpt.com в Safari → «Поделиться» → «DashGPT Import»."
      ],
      copy: "Скопировать скрипт для Safari",
      copied: "Скрипт для Safari скопирован",
      failed: "Не получилось скопировать — нажми ещё раз.",
      saved: "Уже настроил команду? Открой chatgpt.com в Safari и запусти «DashGPT Import» через «Поделиться»."
    };
  }

  return {
    intro: "On iPhone/iPad Safari, run import through a “DashGPT Import” Shortcut from the Share Sheet. A JavaScript bookmark is not required.",
    steps: [
      "Tap “Copy Safari Shortcut script”.",
      "Open Shortcuts, create “DashGPT Import”, add “Run JavaScript on Web Page”, and paste the copied script.",
      "In Shortcut details, enable Show in Share Sheet and accept Safari webpages only. If prompted, allow running scripts in Shortcuts settings.",
      "Open chatgpt.com in Safari → Share → DashGPT Import."
    ],
    copy: "Copy Safari Shortcut script",
    copied: "Safari Shortcut script copied",
    failed: "Could not copy — tap again.",
    saved: "Already configured it? Open chatgpt.com in Safari and run “DashGPT Import” from Share."
  };
}

function patchDialog() {
  const dialog = document.querySelector("#chatgptImportLaunchDialog");
  if (!dialog || dialog.dataset.launchAdapter === "safari-shortcut") return;

  const copy = instructionCopy();
  dialog.dataset.launchAdapter = "safari-shortcut";

  const intro = dialog.querySelector("#chatgptImportLaunchCopy");
  if (intro) intro.textContent = copy.intro;

  const steps = dialog.querySelector(".chatgpt-import-steps");
  if (steps) {
    steps.replaceChildren(...copy.steps.map(text => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    }));
  }

  const saved = dialog.querySelector(".chatgpt-import-origin + .muted");
  if (saved) saved.textContent = copy.saved;

  const currentButton = dialog.querySelector("#chatgptImportCopyAction");
  if (currentButton) {
    const button = currentButton.cloneNode(true);
    button.textContent = copy.copy;
    button.removeAttribute("data-copied");
    currentButton.replaceWith(button);
    button.addEventListener("click", async () => {
      const ok = await copyText(safariShortcutScript());
      button.textContent = ok ? copy.copied : copy.failed;
      button.dataset.copied = ok ? "true" : "false";
    });
  }
}

if (isIphoneOrIpadSafari()) {
  const observer = new MutationObserver(() => queueMicrotask(patchDialog));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("click", event => {
    if (event.target instanceof Element && event.target.closest("[data-result-id='dashgpt-chatgpt-history-import'] .open-button")) {
      queueMicrotask(patchDialog);
    }
  }, true);
  queueMicrotask(patchDialog);
}
