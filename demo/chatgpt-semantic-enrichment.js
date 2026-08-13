export const CHATGPT_SEMANTIC_ENRICHMENT_VERSION = 1;
export const CHATGPT_SEMANTIC_RESULT_KIND = "chatgpt-conversation-projection";

export function deriveChatGptSemanticMetadata({ title = "", messages = [] } = {}) {
  const normalize = value => String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}+#.-]+/gu, " ")
    .trim();
  const stop = new Set("chatgpt gpt assistant user conversation chat message response question answer result help please thanks need want make show give tell about with from into this that what when where which have will would could should just also more your you the and for are can how why not but all new чат диалог разговор сообщение ответ вопрос результат помоги пожалуйста спасибо нужно надо хочу сделай дай покажи расскажи про это этот что как когда где какой будет можно может тоже уже просто теперь потом все для или если так там тут мне мы вы они его их из на по до от за при без под над и а но не да conversacion mensaje respuesta pregunta resultado ayuda favor gracias quiero necesito hacer dime sobre esto esta este como cuando donde que para con sin del los las una uno muy mas tambien".split(" "));
  const concepts = [
    ["food", "Food", "recipe cook food salmon soup chicken pasta sauce рецепт готов еда кухн лосос рыб суп куриц макарон соус засол receta cocina comida sopa pollo pescado"],
    ["travel", "Travel", "travel trip flight hotel camping fishing permit morocco valencia route путеше поезд перелет отел кемп палат рыбал лиценз марок валенси viaje vuelo pesca permiso marruecos"],
    ["language", "Language", "language spanish translation phrase grammar lesson испан язык перевод фраз граммат урок espanol idioma traduccion frase gramatica leccion"],
    ["health", "Health", "health doctor medical medicine blood test symptom здоров врач медицин лекар анализ симптом salud medico medicina analisis sintoma"],
    ["home", "Home", "home house rent repair cleaning aircon дом квартир аренд ремонт уборк кондиционер casa alquiler reparacion limpieza aire"],
    ["phone-repair", "Phone repair", "phone smartphone pixel screen display battery телефон смартфон пиксел экран диспле батар telefono pantalla bateria"],
    ["dashgpt", "DashGPT", "dashgpt dash card cards semantic vault карточ даш семантич волт"],
    ["product", "Product", "product feature capability onboarding ux roadmap продукт фич возможност онбординг дизайн producto capacidad"],
    ["software", "Software", "software code coding development developer architecture github javascript typescript java python api mcp openspec safari browser plugin skill import разработ код архитект гитхаб скрипт браузер плагин скилл импорт desarrollo codigo arquitectura navegador"]
  ].map(([id, category, terms]) => [id, category, terms.split(" ")]);
  const tokenScores = new Map();
  const conceptScores = new Map(concepts.map(([id]) => [id, 0]));
  const selected = Array.isArray(messages) ? messages.slice(-14) : [];
  const segments = [{ text: title, weight: 5 }, ...selected.map((message, index) => ({
    text: String(message?.text || "").slice(0, 2400),
    weight: (message?.role === "user" ? 2.25 : 1.15) * (0.7 + 0.3 * ((index + 1) / Math.max(1, selected.length)))
  }))];
  for (const segment of segments) {
    const tokens = normalize(segment.text).split(/\s+/).filter(Boolean);
    const unique = new Set(tokens);
    for (const token of unique) {
      if (token.length < 3 || token.length > 32 || stop.has(token) || /^\d+$/.test(token)) continue;
      tokenScores.set(token, (tokenScores.get(token) || 0) + segment.weight);
    }
    for (const [id, , terms] of concepts) {
      const hits = terms.filter(term => tokens.some(token => token === term || (term.length >= 4 && token.startsWith(term)))).length;
      if (hits) conceptScores.set(id, (conceptScores.get(id) || 0) + segment.weight * Math.min(3, hits));
    }
  }
  const ranked = concepts.map(([id, category]) => ({ id, category, score: conceptScores.get(id) || 0 }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const primary = ranked[0]?.score >= 2.2 ? ranked[0] : null;
  const terms = new Set(concepts.flatMap(([, , values]) => values));
  const lexical = [...tokenScores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([token]) => token).filter(token => !terms.has(token));
  const tags = [...(primary ? [primary.id] : []), ...lexical].filter((tag, index, all) => all.indexOf(tag) === index).slice(0, 5);
  return { category: primary?.category || "Other", tags: tags.length ? tags : ["topic"] };
}

export function normalizeChatGptSemanticCandidate(candidate = {}) {
  const category = String(candidate.category || "").replace(/\s+/g, " ").trim().slice(0, 60);
  const seen = new Set();
  const tags = [];
  for (const item of Array.isArray(candidate.tags) ? candidate.tags : []) {
    const tag = String(item || "").replace(/\s+/g, " ").trim().slice(0, 40);
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key) || ["chatgpt", "conversation", "result"].includes(key)) continue;
    seen.add(key); tags.push(tag);
    if (tags.length >= 6) break;
  }
  return { category: category && category.toLocaleLowerCase() !== "chatgpt" ? category : "Other", tags: tags.length ? tags : ["topic"] };
}

export function semanticProjectionMetadata() {
  return { kind: CHATGPT_SEMANTIC_RESULT_KIND, semanticEnrichmentVersion: CHATGPT_SEMANTIC_ENRICHMENT_VERSION };
}

export function semanticEnrichmentVersionOf(result) {
  return result?.result?.kind === CHATGPT_SEMANTIC_RESULT_KIND ? Math.max(0, Math.floor(Number(result.result.semanticEnrichmentVersion) || 0)) : 0;
}

export function needsChatGptSemanticBackfill(result) {
  if (!result || result.source?.provider !== "chatgpt" || result.source?.type !== "conversation") return false;
  if (semanticEnrichmentVersionOf(result) >= CHATGPT_SEMANTIC_ENRICHMENT_VERSION) return false;
  const category = String(result.category || "").trim().toLocaleLowerCase();
  const tags = Array.isArray(result.tags) ? result.tags.map(tag => String(tag).trim().toLocaleLowerCase()) : [];
  return category === "chatgpt" && tags.includes("chatgpt");
}

export function isCurrentChatGptSemanticProjection(result) {
  return semanticEnrichmentVersionOf(result) >= CHATGPT_SEMANTIC_ENRICHMENT_VERSION && String(result?.category || "").trim().toLocaleLowerCase() !== "chatgpt";
}

export function shouldReplaceChatGptImportedResult(current, incoming) {
  if (!current) return true;
  const existing = Date.parse(current.publishedAt || "") || 0;
  const next = Date.parse(incoming?.publishedAt || "") || 0;
  if (next !== existing) return next > existing;
  return needsChatGptSemanticBackfill(current) && isCurrentChatGptSemanticProjection(incoming);
}
