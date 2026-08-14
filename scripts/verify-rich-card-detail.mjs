import assert from "node:assert/strict";
import {
  normalizeRichCardText,
  parseCardInline,
  parseCardRichText,
  projectSharedReply,
  stripProviderMarkers
} from "../demo/card-content.js";

const escapedF36Case = `Готово, **сразу в \`develop\`**. [PR #87](https://github.com/bambuchastudent/dashgpt/pull/87) merged.

- Первый пункт
- Второй пункт

## Decisions
- Link-first остаётся основным UX
- Исходная ссылка остаётся source of truth

## Next
Проверить UX в develop.

memcite`;

assert.equal(stripProviderMarkers("до memcite после"), "до  после");
assert.equal(stripProviderMarkers("citeturn1search0видимый текст"), "видимый текст");

const normalized = normalizeRichCardText("первая строка\r\n\r\nвторая строка memcite");
assert.equal(normalized, "первая строка\n\nвторая строка");

const projected = projectSharedReply(escapedF36Case);
assert.match(projected.summary, /\*\*сразу в `develop`\*\*/);
assert.match(projected.summary, /\n\n- Первый пункт\n- Второй пункт/);
assert.doesNotMatch(projected.summary, /memcite|## Decisions|## Next/);
assert.deepEqual(projected.decisions, [
  "Link-first остаётся основным UX",
  "Исходная ссылка остаётся source of truth"
]);
assert.equal(projected.next, "Проверить UX в develop.");

const noInference = projectSharedReply("Готово. Сразу в develop. Исходная ссылка остаётся source of truth.");
assert.deepEqual(noInference.decisions, []);
assert.equal(noInference.next, "");

const russianSections = projectSharedReply(`Короткий итог.\n\n**Решения:**\n- Сохраняем одну canonical card\n\n**Следующий шаг:**\nОткрыть preview.`);
assert.deepEqual(russianSections.decisions, ["Сохраняем одну canonical card"]);
assert.equal(russianSections.next, "Открыть preview.");
assert.equal(russianSections.summary, "Короткий итог.");

const blocks = parseCardRichText(`# Заголовок\n\nАбзац с **жирным**, *курсивом*, \`кодом\` и [ссылкой](https://example.com/path).\n\n- один\n- два\n\n1. первый\n2. второй`);
assert.deepEqual(blocks.map(block => block.type), ["heading", "paragraph", "ul", "ol"]);
const paragraph = blocks[1];
assert.equal(paragraph.children.some(token => token.type === "strong"), true);
assert.equal(paragraph.children.some(token => token.type === "em"), true);
assert.equal(paragraph.children.some(token => token.type === "code"), true);
assert.equal(paragraph.children.some(token => token.type === "link" && token.href === "https://example.com/path"), true);

const unsafe = parseCardInline("[не нажимать](javascript:alert(1))");
assert.equal(unsafe.some(token => token.type === "link"), false);
assert.equal(unsafe.map(token => token.text || "").join(""), "не нажимать");

const rawHtml = parseCardRichText("<script>alert('x')</script>");
assert.equal(rawHtml[0].type, "paragraph");
assert.equal(rawHtml[0].children.map(token => token.text || "").join(""), "<script>alert('x')</script>");

console.log("F39 rich card content verification passed");
