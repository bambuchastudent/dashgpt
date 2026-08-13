const IMPORT_ID = "dashgpt-chatgpt-history-import";

function install() {
  const welcome = document.querySelector("#publicWelcome");
  if (!welcome || welcome.querySelector("#importDataConnector")) return;
  const current = welcome.querySelector(".public-command-panel");
  if (!current) return;

  const box = document.createElement("section");
  box.id = "importDataConnector";
  box.className = "public-command-panel";
  box.innerHTML = `<p class="public-step-label">ИЛИ · ИМПОРТ</p><h3>Импортировать данные</h3><p>Для массового переноса. Сейчас поддержан ChatGPT ZIP / JSON; позже сюда можно добавлять другие источники.</p><button type="button" class="button primary">Выбрать источник / импорт</button>`;
  current.before(box);
  box.querySelector("button").addEventListener("click", () => {
    document.querySelector(`[data-result-id="${IMPORT_ID}"] .open-button`)?.click();
  });
}

export function initializeImportOnboardingConnector() {
  install();
  new MutationObserver(install).observe(document.body, { childList: true, subtree: true });
}
