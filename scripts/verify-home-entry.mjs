import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [home, css, bootstrap] = await Promise.all([
  readFile(new URL("../demo/home-entry.js", import.meta.url), "utf8"),
  readFile(new URL("../demo/home-entry.css", import.meta.url), "utf8"),
  readFile(new URL("../demo/catalog-bootstrap.js", import.meta.url), "utf8")
]);

assert.match(home, /dashgptHomeEntry/);
assert.match(home, /dashgptHomeImport/);
assert.match(home, /dashgptHomeSaveChat/);
assert.match(home, /dashgptHomeCards/);
assert.match(home, /#chatgptImportGuideButton/);
assert.match(home, /#addResultButton/);
assert.match(home, /#galleryRegion/);
assert.match(home, /#searchInput/);
assert.match(home, /chatgpt-history-import-progress/);
assert.match(home, /showcase/);
assert.match(home, /^((?!saveBrowserVault).)*$/s, "Home entry must not own Vault writes");
assert.match(home, /^((?!buildChatGptHistoryImportAction).)*$/s, "Home entry must not duplicate import transport");
assert.match(home, /^((?!fetch\().)*$/s, "Home entry must delegate instead of adding network flows");
assert.match(css, /@media \(max-width: 390px\)/);
assert.match(css, /max-width: 100%/);

const guideInit = bootstrap.indexOf("chatGptImportGuide.initializeChatGptImportGuide()");
const homeInit = bootstrap.indexOf("homeEntry.initializeHomeEntry()");
assert.ok(homeInit > guideInit, "Home entry must initialize after canonical import guide controls");
assert.match(bootstrap, /import\("\.\/home-entry\.js"\)/);

console.log("F42 import-first home verification passed");
