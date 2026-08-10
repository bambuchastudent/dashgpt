export const SEMANTIC_ENGINE_VERSION = 1;

export const SEMANTIC_THRESHOLDS = Object.freeze({
  resultAccepted: 0.42,
  resultProposal: 0.22,
  dashConfident: 0.62,
  dashAmbiguous: 0.50,
  dashMargin: 0.12
});

const INTENT_WORDS = new Set([
  "dash", "dashboard", "my", "mine", "open", "show", "find", "continue", "continued", "everything", "all", "about", "topic", "topics", "we", "discussed", "had",
  "даш", "дашборд", "мой", "мои", "мою", "открой", "открыть", "покажи", "показать", "найди", "продолжим", "продолжить", "все", "всё", "что", "мы", "обсуждали", "было", "были", "тема", "теме", "тему", "про", "по", "у", "меня",
  "mi", "mis", "abrir", "abre", "mostrar", "muestra", "buscar", "continuar", "continuemos", "todo", "todos", "sobre", "tema", "temas", "hablamos", "de", "del", "el", "la", "los", "las"
]);

const CONCEPTS = Object.freeze([
  {
    id: "food",
    terms: [
      "еда", "еду", "пища", "кухня", "готовить", "рецепт", "рецепты", "суп", "котлета", "квас", "окрошка", "огурцы", "капуста", "песто", "авокадо", "чогетхан",
      "food", "recipe", "recipes", "cooking", "soup", "chicken", "kiev", "pechuga", "kvass", "pickle", "cabbage", "pesto", "avocado", "chogyetang", "naengmyeon",
      "comida", "receta", "recetas", "cocina", "sopa", "pollo"
    ]
  },
  {
    id: "dashgpt",
    terms: [
      "dashgpt", "dash gpt", "дашгпт"
    ]
  },
  {
    id: "product",
    terms: [
      "product", "product discussion", "capability", "product design",
      "продукт", "продуктовое обсуждение", "возможность", "дизайн продукта",
      "producto", "discusion de producto", "capacidad", "diseno de producto"
    ]
  },
  {
    id: "travel",
    terms: [
      "поездка", "поездки", "путешествие", "марокко", "кемпинг", "палатка", "рыбалка", "разрешение", "валенсия",
      "trip", "travel", "morocco", "camping", "tent", "fishing", "permit", "gva", "valencia",
      "viaje", "marruecos", "campamento", "tienda", "pesca", "permiso"
    ]
  },
  {
    id: "phone-repair",
    terms: [
      "телефон", "смартфон", "ремонт телефона", "экран", "корпус", "аккумулятор", "пиксель",
      "phone", "smartphone", "phone repair", "screen", "display", "frame", "battery", "pixel",
      "telefono", "reparacion", "pantalla", "marco", "bateria"
    ]
  },
  {
    id: "home",
    terms: [
      "дом", "ремонт", "кондиционер", "дренаж", "фильтр", "уборка",
      "home", "air conditioner", "air-conditioner", "drainage", "filter", "cleaning",
      "casa", "aire acondicionado", "drenaje", "filtro", "limpieza"
    ]
  },
  {
    id: "health",
    terms: [
      "здоровье", "врач", "анализ", "щитовидка", "зоб", "эндокринолог",
      "health", "doctor", "test", "thyroid", "goiter", "endocrinology",
      "salud", "medico", "tiroides", "bocio"
    ]
  },
  {
    id: "language",
    terms: [
      "испанский", "язык", "перевод", "урок", "фраза",
      "spanish", "language", "translation", "lesson", "phrase",
      "espanol", "idioma", "traduccion", "leccion", "frase"
    ]
  },
  {
    id: "software",
    terms: [
      "разработка", "код", "архитектура", "github", "cloudflare", "mcp", "api", "тест",
      "development", "software", "code", "architecture", "github", "cloudflare", "mcp", "api", "test",
      "desarrollo", "codigo", "arquitectura", "prueba"
    ]
  }
]);

const FIELD_WEIGHTS = Object.freeze({
  title: 1,
  tags: 0.98,
  category: 0.94,
  summary: 0.74,
  decisions: 0.58,
  next: 0.46,
  status: 0.44,
  body: 0.54,
  instructions: 0.46,
  links: 0.32,
  openQuestions: 0.40,
  continuation: 0.40,
  related: 0.24,
  source: 0.28
});

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function randomId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${uuid}`;
}

function isoNow() {
  return new Date().toISOString();
}

function stableCompare(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  return left < right ? -1 : left > right ? 1 : 0;
}

export function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stemToken(token) {
  if (token.length <= 2) return token;
  const suffixes = [
    "иями", "ями", "ами", "ого", "ему", "ыми", "ими", "ение", "ений", "ость", "ости", "овать", "ировать", "иях", "иях", "ах", "ях", "ый", "ий", "ая", "яя", "ое", "ее", "ые", "ие", "ов", "ев", "ом", "ем", "ам", "ям", "ую", "юю", "а", "я", "ы", "и", "у", "ю", "е", "о",
    "ments", "ment", "ations", "ation", "ing", "ers", "er", "ies", "es", "s",
    "aciones", "acion", "ando", "iendo", "ados", "adas", "ado", "ada", "es", "os", "as"
  ];
  for (const suffix of suffixes) {
    if (token.length - suffix.length >= 2 && token.endsWith(suffix)) return token.slice(0, -suffix.length);
  }
  return token;
}

function includesTerm(normalized, term) {
  const needle = normalizeText(term);
  if (!needle) return false;
  if (needle.includes(" ")) return ` ${normalized} `.includes(` ${needle} `);
  return normalized.split(" ").some((token) => token === needle || (needle.length >= 5 && token.startsWith(needle)));
}

function conceptIds(normalized) {
  return CONCEPTS
    .filter((concept) => concept.terms.some((term) => includesTerm(normalized, term)))
    .map((concept) => `concept:${concept.id}`);
}

function topicWords(value) {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !INTENT_WORDS.has(token));
}

export function semanticTerms(value, options = {}) {
  const normalized = normalizeText(value);
  const words = (options.stripIntent === false ? normalized.split(" ") : topicWords(normalized))
    .filter((token) => token.length >= 2)
    .map(stemToken);
  return [...new Set([...words, ...conceptIds(normalized)])].sort(stableCompare);
}

function trigrams(value) {
  const normalized = normalizeText(value).replace(/\s+/g, " ");
  if (normalized.length < 3) return new Set(normalized ? [normalized] : []);
  const items = new Set();
  for (let index = 0; index <= normalized.length - 3; index += 1) items.add(normalized.slice(index, index + 3));
  return items;
}

function trigramSimilarity(left, right) {
  const a = trigrams(left);
  const b = trigrams(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  return (2 * intersection) / (a.size + b.size);
}

function termSimilarity(queryTerm, candidateTerms) {
  if (candidateTerms.has(queryTerm)) return 1;
  if (queryTerm.startsWith("concept:")) return 0;
  let best = 0;
  for (const candidate of candidateTerms) {
    if (candidate.startsWith("concept:")) continue;
    if (queryTerm.length >= 4 && candidate.length >= 4 && (queryTerm.startsWith(candidate) || candidate.startsWith(queryTerm))) {
      best = Math.max(best, 0.84);
      continue;
    }
    best = Math.max(best, trigramSimilarity(queryTerm, candidate) * 0.72);
  }
  return best;
}

export function semanticScore(query, candidate) {
  const queryTerms = semanticTerms(query);
  if (!queryTerms.length) return 0;
  const candidateTerms = new Set(semanticTerms(candidate, { stripIntent: false }));
  if (!candidateTerms.size) return 0;

  const queryConcepts = queryTerms.filter((term) => term.startsWith("concept:"));
  const queryLexical = queryTerms.filter((term) => !term.startsWith("concept:"));
  const conceptScore = queryConcepts.length
    ? queryConcepts.filter((term) => candidateTerms.has(term)).length / queryConcepts.length
    : 0;
  const lexicalScore = queryLexical.length
    ? queryLexical.reduce((sum, term) => sum + termSimilarity(term, candidateTerms), 0) / queryLexical.length
    : 0;
  const fuzzyScore = trigramSimilarity(topicWords(query).join(" "), normalizeText(candidate));
  const normalizedTopic = topicWords(query).join(" ");
  const phraseBonus = normalizedTopic.length >= 4 && normalizeText(candidate).includes(normalizedTopic) ? 0.12 : 0;

  const score = queryConcepts.length
    ? conceptScore * 0.62 + lexicalScore * 0.28 + fuzzyScore * 0.10 + phraseBonus
    : lexicalScore * 0.78 + fuzzyScore * 0.12 + phraseBonus;
  return Math.max(0, Math.min(1, Number(score.toFixed(6))));
}

function sourceText(result) {
  return [result?.source?.type, result?.source?.provider, result?.source?.title, result?.source?.url]
    .filter(Boolean)
    .join(" ");
}

function structuredText(value, depth = 0) {
  if (value == null || depth > 4) return "";
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => structuredText(item, depth + 1)).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return Object.keys(value).sort(stableCompare).slice(0, 100)
      .map((key) => structuredText(value[key], depth + 1))
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function resultFields(result) {
  return [
    ["title", result?.title],
    ["tags", Array.isArray(result?.tags) ? result.tags.join(" ") : ""],
    ["category", result?.category],
    ["summary", result?.summary],
    ["decisions", Array.isArray(result?.decisions) ? result.decisions.join(" ") : ""],
    ["next", result?.next],
    ["status", result?.status],
    ["body", structuredText([result?.result, result?.body]).slice(0, 20000)],
    ["instructions", structuredText([result?.instructions, result?.code]).slice(0, 12000)],
    ["links", structuredText(result?.links).slice(0, 8000)],
    ["openQuestions", structuredText(result?.openQuestions).slice(0, 8000)],
    ["continuation", structuredText(result?.continuationContext).slice(0, 12000)],
    ["related", structuredText(result?.relatedResults).slice(0, 4000)],
    ["source", sourceText(result)]
  ].filter(([, value]) => Boolean(value));
}

export function isResultEligible(result, scope = {}) {
  if (!result || typeof result.id !== "string") return false;
  if (result.deleted === true || result.available === false || result.unavailable === true) return false;
  if (["denied", "inaccessible", "deleted"].includes(String(result.access || "").toLowerCase())) return false;
  if (!scope.includeArchived && (result.archived === true || String(result.status || "").toLowerCase() === "archived")) return false;

  const providers = Array.isArray(scope.providers) ? scope.providers : ["*"];
  const provider = String(result.storageProvider || result.source?.provider || "local");
  if (!providers.includes("*") && !providers.includes(provider)) return false;

  const sourceTypes = Array.isArray(scope.sourceTypes) ? scope.sourceTypes : ["*"];
  const sourceType = String(result.source?.type || "unknown");
  if (!sourceTypes.includes("*") && !sourceTypes.includes(sourceType)) return false;

  const excludedIds = new Set(scope.excludedResultIds || []);
  const excludedSources = new Set(scope.excludedSourceIds || []);
  const excludedUrls = new Set(scope.excludedSourceUrls || []);
  if (excludedIds.has(result.id)) return false;
  if (result.source?.sourceId && excludedSources.has(result.source.sourceId)) return false;
  if (result.source?.url && excludedUrls.has(result.source.url)) return false;
  return true;
}

export function resultSemanticScore(query, result) {
  const scores = resultFields(result)
    .map(([field, value]) => semanticScore(query, value) * FIELD_WEIGHTS[field])
    .sort((a, b) => b - a);
  if (!scores.length) return 0;
  return Math.max(0, Math.min(1, Number((scores[0] + (scores[1] || 0) * 0.15).toFixed(6))));
}

export function rankResults(results, query, options = {}) {
  const scope = options.scope || {};
  const needle = normalizeText(query);
  return (Array.isArray(results) ? results : [])
    .filter((result) => isResultEligible(result, scope))
    .filter((result) => !options.category || result.category === options.category)
    .filter((result) => !options.favoritesOnly || Boolean(result.favorite))
    .map((result, index) => ({
      result,
      score: needle ? resultSemanticScore(query, result) : 1,
      exact: needle ? resultFields(result).some(([, value]) => normalizeText(value).includes(needle)) : true,
      index
    }))
    .filter((item) => !needle || item.score > 0 || item.exact)
    .sort((left, right) => right.score - left.score || Number(right.exact) - Number(left.exact) || (needle ? stableCompare(left.result.id, right.result.id) : left.index - right.index))
    .slice(0, options.limit || Number.POSITIVE_INFINITY);
}

export function createSemanticDefinition(query) {
  const words = topicWords(query);
  const normalizedQuery = words.join(" ") || normalizeText(query);
  return {
    query: normalizedQuery,
    normalizedTerms: semanticTerms(normalizedQuery),
    engineVersion: SEMANTIC_ENGINE_VERSION
  };
}

function titleFromQuery(query) {
  const value = topicWords(query).join(" ") || normalizeText(query) || "New Dash";
  const title = value.charAt(0).toLocaleUpperCase() + value.slice(1);
  return title.replace(/\bdashgpt\b/gi, "DashGPT");
}

function uniqueIds(items) {
  return [...new Set((items || []).filter((item) => typeof item === "string" && item))];
}

export function createDashRevision(input = {}, options = {}) {
  const updateMode = String(input.updateMode || "review").toLowerCase();
  if (updateMode === "automatic" && !options.allowAutomatic) {
    throw new Error("Automatic update mode is not available in this version; use review.");
  }
  if (!["review", "automatic"].includes(updateMode)) throw new Error(`Unsupported Dash update mode: ${updateMode}`);
  const now = options.now || input.lastUpdatedAt || isoNow();
  const semanticDefinition = input.semanticDefinition || createSemanticDefinition(input.query || input.title || "");
  return {
    schemaVersion: 1,
    dashId: input.dashId || options.dashId || randomId("dash"),
    dashRevisionId: input.dashRevisionId || options.dashRevisionId || randomId("dashrev"),
    baseRevisionId: input.baseRevisionId || null,
    title: String(input.title || titleFromQuery(semanticDefinition.query)).trim(),
    description: String(input.description || `Living Dash for ${semanticDefinition.query}.`).trim(),
    semanticDefinition: clone(semanticDefinition),
    scope: {
      providers: uniqueIds(input.scope?.providers?.length ? input.scope.providers : ["*"]),
      sourceTypes: uniqueIds(input.scope?.sourceTypes?.length ? input.scope.sourceTypes : ["*"]),
      includeArchived: Boolean(input.scope?.includeArchived),
      excludedResultIds: uniqueIds(input.scope?.excludedResultIds),
      excludedSourceIds: uniqueIds(input.scope?.excludedSourceIds),
      excludedSourceUrls: uniqueIds(input.scope?.excludedSourceUrls)
    },
    updateMode,
    automaticResultIds: uniqueIds(input.automaticResultIds),
    suggestedResultIds: uniqueIds(input.suggestedResultIds),
    createdAt: String(input.createdAt || now),
    lastUpdatedAt: String(now)
  };
}

function orderedEvents(events) {
  return (events || []).slice().sort((left, right) =>
    stableCompare(left.createdAt, right.createdAt) || stableCompare(left.eventId, right.eventId));
}

function dashEventState(events, dashId) {
  const byResult = new Map();
  let deleted = false;
  let lastEventAt = null;
  for (const event of orderedEvents(events).filter((item) => item.dashId === dashId)) {
    lastEventAt = event.createdAt || lastEventAt;
    if (event.type === "dash.delete") {
      deleted = Boolean(event.value);
      continue;
    }
    if (!event.resultId || !["dash.pin", "dash.exclude", "dash.manual", "dash.accept"].includes(event.type)) continue;
    const state = byResult.get(event.resultId) || { pin: false, exclude: false, manual: false, accept: false };
    state[event.type.slice("dash.".length)] = Boolean(event.value);
    byResult.set(event.resultId, state);
  }
  return { byResult, deleted, lastEventAt };
}

export function latestDashRevisions(revisions, events = []) {
  const byDash = new Map();
  for (const revision of revisions || []) {
    if (!revision?.dashId || !revision?.dashRevisionId) continue;
    const bucket = byDash.get(revision.dashId) || [];
    bucket.push(revision);
    byDash.set(revision.dashId, bucket);
  }

  const current = [];
  for (const [dashId, bucket] of byDash) {
    const bases = new Set(bucket.map((item) => item.baseRevisionId).filter(Boolean));
    const heads = bucket.filter((item) => !bases.has(item.dashRevisionId));
    const candidates = (heads.length ? heads : bucket).slice().sort((left, right) =>
      stableCompare(right.lastUpdatedAt || right.createdAt, left.lastUpdatedAt || left.createdAt) || stableCompare(right.dashRevisionId, left.dashRevisionId));
    const revision = clone(candidates[0]);
    if (heads.length > 1) revision._dashConflictCount = heads.length;
    if (!dashEventState(events, dashId).deleted) current.push(revision);
  }
  return current.sort((left, right) => stableCompare(left.title, right.title) || stableCompare(left.dashId, right.dashId));
}

function dashSearchText(dash) {
  return [
    dash.title,
    dash.description,
    dash.semanticDefinition?.query,
    ...(dash.semanticDefinition?.normalizedTerms || [])
  ].filter(Boolean).join(" ");
}

export function matchSavedDashes(query, revisions, events = [], options = {}) {
  const candidates = latestDashRevisions(revisions, events)
    .map((dash) => ({ dash, score: semanticScore(query, dashSearchText(dash)) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || stableCompare(left.dash.title, right.dash.title) || stableCompare(left.dash.dashId, right.dash.dashId));
  const top = candidates[0];
  const second = candidates[1];
  const thresholds = { ...SEMANTIC_THRESHOLDS, ...(options.thresholds || {}) };
  if (top && top.score >= thresholds.dashConfident && (!second || top.score - second.score >= thresholds.dashMargin)) {
    return { status: "confident", dash: top.dash, score: top.score, candidates: [top] };
  }
  if (top && top.score >= thresholds.dashAmbiguous) {
    const ambiguous = candidates.filter((item) => item.score >= thresholds.dashAmbiguous && top.score - item.score <= thresholds.dashMargin);
    if (ambiguous.length > 1) return { status: "ambiguous", candidates: ambiguous };
  }
  return { status: "none", candidates: [] };
}

function sentence(value) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const match = normalized.match(/^.*?[.!?](?:\s|$)/);
  return (match?.[0] || normalized).trim();
}

export function buildAggregateSummary(members, options = {}) {
  if (!members.length) return "No accessible Results currently belong to this Dash.";
  const groups = new Map();
  for (const member of members) {
    const category = member.result.category || "Other";
    const bucket = groups.get(category) || [];
    bucket.push(member.result);
    groups.set(category, bucket);
  }
  const orderedGroups = [...groups.entries()].sort((left, right) => right[1].length - left[1].length || stableCompare(left[0], right[0]));
  const groupText = orderedGroups.slice(0, options.groupLimit || 4).map(([category, results]) => {
    const titles = results.slice(0, 3).map((result) => result.title).join("; ");
    return `${category} (${results.length}): ${titles}`;
  }).join(". ");
  const seenExcerpts = new Set();
  const excerpts = [];
  for (const member of members) {
    const excerpt = sentence(member.result.summary);
    const key = normalizeText(excerpt);
    if (!excerpt || seenExcerpts.has(key)) continue;
    seenExcerpts.add(key);
    excerpts.push(excerpt);
    if (excerpts.length >= (options.excerptLimit || 2)) break;
  }
  return `${members.length} accessible Result${members.length === 1 ? "" : "s"}. ${groupText}.${excerpts.length ? ` ${excerpts.join(" ")}` : ""}`.slice(0, options.maxLength || 900);
}

function relatedDashes(revision, allRevisions, events) {
  return latestDashRevisions(allRevisions || [], events)
    .filter((candidate) => candidate.dashId !== revision.dashId)
    .map((candidate) => ({
      dashId: candidate.dashId,
      title: candidate.title,
      score: semanticScore(revision.semanticDefinition?.query || revision.title, dashSearchText(candidate))
    }))
    .filter((item) => item.score >= SEMANTIC_THRESHOLDS.resultProposal)
    .sort((left, right) => right.score - left.score || stableCompare(left.dashId, right.dashId))
    .slice(0, 5);
}

export function materializeDash(revision, events, results, options = {}) {
  const scope = revision.scope || {};
  const eligible = (results || []).filter((result) => isResultEligible(result, scope));
  const eligibleById = new Map(eligible.map((result) => [result.id, result]));
  const ranked = rankResults(eligible, revision.semanticDefinition?.query || revision.title, { scope });
  const scores = new Map(ranked.map((item) => [item.result.id, item.score]));
  const automatic = new Set(revision.automaticResultIds || []);
  const suggested = new Set(revision.suggestedResultIds || []);
  const state = dashEventState(events, revision.dashId);
  const referenced = new Set([...automatic, ...suggested, ...state.byResult.keys()]);
  const members = [];
  const proposals = [];
  const unavailable = [];
  const excludedResultIds = [];

  for (const resultId of referenced) {
    const override = state.byResult.get(resultId) || { pin: false, exclude: false, manual: false, accept: false };
    if (override.exclude) {
      excludedResultIds.push(resultId);
      continue;
    }
    const result = eligibleById.get(resultId);
    if (!result) {
      unavailable.push({ status: "unavailable" });
      continue;
    }
    const included = override.pin || override.manual || override.accept || automatic.has(resultId);
    if (included) {
      const membership = override.pin ? "pinned" : override.manual ? "manual" : override.accept ? "accepted" : "automatic";
      members.push({ result, membership, score: scores.get(resultId) || 0 });
    } else if (suggested.has(resultId)) {
      proposals.push({ result, score: scores.get(resultId) || 0 });
    }
  }

  members.sort((left, right) => Number(right.membership === "pinned") - Number(left.membership === "pinned") || right.score - left.score || stableCompare(left.result.id, right.result.id));
  proposals.sort((left, right) => right.score - left.score || stableCompare(left.result.id, right.result.id));

  return {
    dashId: revision.dashId,
    dashRevisionId: revision.dashRevisionId,
    title: revision.title,
    description: revision.description,
    semanticDefinition: clone(revision.semanticDefinition),
    updateMode: revision.updateMode,
    lastUpdatedAt: [revision.lastUpdatedAt, state.lastEventAt].filter(Boolean).sort(stableCompare).at(-1) || revision.lastUpdatedAt,
    temporary: Boolean(options.temporary),
    deleted: state.deleted,
    summary: buildAggregateSummary(members),
    members,
    proposals,
    unavailable,
    excludedResultIds: excludedResultIds.sort(stableCompare),
    relatedDashes: relatedDashes(revision, options.allDashRevisions || [], events),
    _dashConflictCount: revision._dashConflictCount || 0,
    revision: clone(revision)
  };
}

export function createTemporaryDash(query, results, options = {}) {
  const semanticDefinition = createSemanticDefinition(query);
  const scope = options.scope || {};
  const ranked = rankResults(results, semanticDefinition.query, { scope });
  const automaticResultIds = ranked.filter((item) => item.score >= SEMANTIC_THRESHOLDS.resultAccepted).map((item) => item.result.id);
  const suggestedResultIds = ranked
    .filter((item) => item.score >= SEMANTIC_THRESHOLDS.resultProposal && item.score < SEMANTIC_THRESHOLDS.resultAccepted)
    .map((item) => item.result.id);
  const revision = createDashRevision({
    dashId: options.dashId || "temporary",
    dashRevisionId: options.dashRevisionId || "temporary",
    title: options.title || titleFromQuery(query),
    description: options.description || `Semantic topic: ${semanticDefinition.query}.`,
    semanticDefinition,
    scope,
    updateMode: "review",
    automaticResultIds,
    suggestedResultIds,
    createdAt: options.now,
    lastUpdatedAt: options.now
  }, { now: options.now, dashId: options.dashId || "temporary", dashRevisionId: options.dashRevisionId || "temporary" });
  return materializeDash(revision, [], results, { temporary: true, allDashRevisions: options.allDashRevisions || [] });
}

export function saveTemporaryDash(temporary, options = {}) {
  const source = temporary.revision || temporary;
  return createDashRevision({
    ...source,
    dashId: options.dashId,
    dashRevisionId: options.dashRevisionId,
    baseRevisionId: null,
    title: options.title || source.title,
    description: options.description || source.description,
    updateMode: "review",
    createdAt: options.now,
    lastUpdatedAt: options.now
  }, options);
}

export function reviseDash(revision, updates = {}, options = {}) {
  return createDashRevision({
    ...revision,
    ...updates,
    dashId: revision.dashId,
    dashRevisionId: options.dashRevisionId,
    baseRevisionId: revision.dashRevisionId,
    semanticDefinition: updates.semanticDefinition || revision.semanticDefinition,
    scope: updates.scope || revision.scope,
    automaticResultIds: updates.automaticResultIds || revision.automaticResultIds,
    suggestedResultIds: updates.suggestedResultIds || revision.suggestedResultIds,
    createdAt: options.now,
    lastUpdatedAt: options.now
  }, options);
}

export function refreshDash(revision, events, results, options = {}) {
  if (revision.updateMode === "automatic") throw new Error("Automatic update mode is not available in this version; use review.");
  const scope = revision.scope || {};
  const ranked = rankResults(results, revision.semanticDefinition?.query || revision.title, { scope });
  const previousAutomatic = new Set(revision.automaticResultIds || []);
  const previousSuggested = new Set(revision.suggestedResultIds || []);
  const eligibleIds = new Set((results || []).filter((result) => isResultEligible(result, scope)).map((result) => result.id));
  const state = dashEventState(events, revision.dashId);
  const automaticResultIds = new Set([...previousAutomatic].filter((resultId) => !eligibleIds.has(resultId)));
  const suggestedResultIds = new Set([...previousSuggested].filter((resultId) => !eligibleIds.has(resultId)));

  for (const item of ranked) {
    const override = state.byResult.get(item.result.id) || { pin: false, exclude: false, manual: false, accept: false };
    if (override.exclude) {
      if (item.score >= SEMANTIC_THRESHOLDS.resultAccepted && previousAutomatic.has(item.result.id)) automaticResultIds.add(item.result.id);
      else if (item.score >= SEMANTIC_THRESHOLDS.resultProposal) suggestedResultIds.add(item.result.id);
      continue;
    }
    if (item.score >= SEMANTIC_THRESHOLDS.resultAccepted && previousAutomatic.has(item.result.id)) {
      automaticResultIds.add(item.result.id);
      continue;
    }
    if (override.pin || override.manual || override.accept) continue;
    if (item.score >= SEMANTIC_THRESHOLDS.resultProposal) suggestedResultIds.add(item.result.id);
  }

  const next = reviseDash(revision, {
    automaticResultIds: [...automaticResultIds].sort(stableCompare),
    suggestedResultIds: [...suggestedResultIds].sort(stableCompare)
  }, options);
  return {
    revision: next,
    view: materializeDash(next, events, results, { allDashRevisions: options.allDashRevisions || [next] })
  };
}

export function formatDashForChat(view, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit || 6), 12));
  const lines = [
    `# ${view.title}${view.temporary ? " · temporary" : ""}`,
    "",
    view.summary,
    "",
    `Updated: ${view.lastUpdatedAt || "not yet"}`,
    `Mode: ${view.updateMode || "review"}`,
    "",
    "## Results"
  ];
  if (!view.members.length) lines.push("- No accessible matching Results.");
  for (const member of view.members.slice(0, limit)) {
    const result = member.result;
    const page = result.pageUrl ? ` — ${result.pageUrl}` : "";
    const source = result.source?.url ? ` (original: ${result.source.url})` : "";
    lines.push(`- ${result.title}${page}${source}`);
  }
  if (view.members.length > limit) lines.push(`- …and ${view.members.length - limit} more Results.`);
  if (view.proposals.length) {
    lines.push("", "## New proposals");
    for (const proposal of view.proposals.slice(0, limit)) lines.push(`- ${proposal.result.title}`);
    if (view.proposals.length > limit) lines.push(`- …and ${view.proposals.length - limit} more proposals.`);
  }
  if (view.unavailable.length) lines.push("", `${view.unavailable.length} referenced Result${view.unavailable.length === 1 ? " is" : "s are"} currently unavailable; no saved content was shown.`);
  if (view.relatedDashes.length) lines.push("", `Related Dashes: ${view.relatedDashes.map((item) => item.title).join(", ")}`);
  lines.push("", "Continue in this chat by naming a Result or asking to expand this Dash.");
  return lines.join("\n");
}

export function dashImportData(view) {
  const revision = view.revision || view;
  return {
    schemaVersion: 1,
    title: revision.title,
    description: revision.description,
    semanticDefinition: clone(revision.semanticDefinition),
    scope: clone(revision.scope),
    updateMode: "review",
    automaticResultIds: uniqueIds(revision.automaticResultIds),
    suggestedResultIds: uniqueIds(revision.suggestedResultIds)
  };
}
