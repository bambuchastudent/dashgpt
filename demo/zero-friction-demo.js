export const VALUE_STATE_KEY = "dashgpt.zero-friction.v1";
export const VALUE_STATE_VERSION = 1;

export const DEMO_RESULTS = Object.freeze([
  {
    id: "demo-dashgpt-purpose",
    title: "Как работает DashGPT",
    summary: "Полезный итог разговора превращается в короткую карточку: главное, решения и следующий шаг остаются рядом и не теряются в истории чатов.",
    category: "DashGPT",
    tags: ["dashgpt", "memory", "ai"],
    decisions: ["Сохранять не весь чат, а полезный результат и состояние работы."],
    current: "Карточку можно найти по теме и открыть одним касанием.",
    next: "Вернуться к карточке и продолжить разговор с сохранённого состояния.",
    status: "Актуально",
    _demo: true
  },
  {
    id: "demo-food-salmon",
    title: "Что приготовить из лосося",
    summary: "Быстрый план: слабосолёный лосось сегодня, а оставшуюся часть — на тёплый ужин завтра.",
    category: "Еда",
    tags: ["еда", "лосось", "рецепт"],
    decisions: ["Сделать небольшую слабосолёную порцию и не перегружать специями."],
    current: "Продукты уже есть, рецепт можно открыть прямо из карточки.",
    next: "Подготовить соль, сахар и контейнер.",
    status: "На сегодня",
    _demo: true
  },
  {
    id: "demo-travel-morocco",
    title: "Маршрут по Марокко",
    summary: "Маракеш, Касабланка и Танжер собраны в один короткий маршрут с переездами и идеями на свободные дни.",
    category: "Поездки",
    tags: ["поездки", "марокко", "маршрут"],
    decisions: ["Не менять отель каждый день и оставить время на одну поездку за город."],
    current: "Маршрут собран, осталось выбрать конкретные билеты и жильё.",
    next: "Сравнить транспорт между городами.",
    status: "План",
    _demo: true
  },
  {
    id: "demo-home-aircon",
    title: "Кондиционер: что проверить",
    summary: "Чистка фильтра и понятная схема дренажа собраны в одной карточке, чтобы не искать советы заново.",
    category: "Дом",
    tags: ["дом", "кондиционер", "ремонт"],
    decisions: ["Дренаж вести с постоянным уклоном; при подъёме использовать насос."],
    current: "Нужно только проверить фактическую трассу слива.",
    next: "Осмотреть дренаж и тип фильтра.",
    status: "К проверке",
    _demo: true
  },
  {
    id: "demo-health-heat",
    title: "План на жаркий день",
    summary: "В одной карточке остаются базовые договорённости: вода, тень, перерывы и признаки, когда планы лучше отменить.",
    category: "Здоровье",
    tags: ["здоровье", "жара", "план"],
    decisions: ["Не планировать долгую нагрузку в самые жаркие часы."],
    current: "План нужен как короткая памятка, а не как медицинский диагноз.",
    next: "Проверить прогноз перед выходом.",
    status: "Памятка",
    _demo: true
  }
]);

export const DEMO_DASHES = Object.freeze([
  { id: "demo-dash-about", title: "Про DashGPT", category: "DashGPT", hint: "Как сохранять и продолжать полезные разговоры" },
  { id: "demo-dash-food", title: "Что приготовить", category: "Еда", hint: "Рецепты и решения про еду" },
  { id: "demo-dash-travel", title: "Поездки и планы", category: "Поездки", hint: "Маршруты, брони и следующие шаги" }
]);

export const DEMO_STORY_RESULT = Object.freeze({
  id: "demo-story-salmon",
  title: "Слабосолёный лосось на завтра",
  summary: "Для небольшой порции достаточно мягкой засолки и ночи в холодильнике.",
  category: "Еда",
  tags: ["еда", "лосось", "рецепт"],
  decisions: ["Солить небольшую порцию без тяжёлого маринада."],
  current: "Филе уже куплено; важно приготовить его сегодня.",
  next: "Смешать соль и сахар, убрать в холодильник и проверить утром.",
  status: "Готово к действию",
  _demo: true
});

export function isDemoResult(value) {
  if (!value) return false;
  if (typeof value === "string") return value.startsWith("demo-");
  return Boolean(value._demo) || String(value.id || "").startsWith("demo-");
}

export function withDemoResults(userResults = []) {
  const userIds = new Set(userResults.map(result => result.id));
  return [...DEMO_RESULTS.filter(result => !userIds.has(result.id)), ...userResults];
}

export function defaultValueState() {
  return {
    version: VALUE_STATE_VERSION,
    confirmedUserResultIds: [],
    persistencePrompt: { lastShownAtCount: 0, dismissedAtCount: 0 }
  };
}

export function normalizeValueState(input) {
  if (!input || input.version !== VALUE_STATE_VERSION) return defaultValueState();
  const ids = Array.isArray(input.confirmedUserResultIds)
    ? [...new Set(input.confirmedUserResultIds.filter(id => typeof id === "string" && id && !isDemoResult(id)))]
    : [];
  const prompt = input.persistencePrompt && typeof input.persistencePrompt === "object" ? input.persistencePrompt : {};
  return {
    version: VALUE_STATE_VERSION,
    confirmedUserResultIds: ids,
    persistencePrompt: {
      lastShownAtCount: Number.isInteger(prompt.lastShownAtCount) && prompt.lastShownAtCount >= 0 ? prompt.lastShownAtCount : 0,
      dismissedAtCount: Number.isInteger(prompt.dismissedAtCount) && prompt.dismissedAtCount >= 0 ? prompt.dismissedAtCount : 0
    }
  };
}

export function loadValueState(storage) {
  try {
    return normalizeValueState(JSON.parse(storage?.getItem?.(VALUE_STATE_KEY) || "null"));
  } catch {
    return defaultValueState();
  }
}

export function saveValueState(storage, state) {
  const normalized = normalizeValueState(state);
  storage?.setItem?.(VALUE_STATE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function confirmedUserCount(state) {
  return normalizeValueState(state).confirmedUserResultIds.length;
}

export function recordConfirmedUserResult(state, resultId) {
  const normalized = normalizeValueState(state);
  if (!resultId || isDemoResult(resultId) || normalized.confirmedUserResultIds.includes(resultId)) return normalized;
  return {
    ...normalized,
    confirmedUserResultIds: [...normalized.confirmedUserResultIds, resultId]
  };
}

export function shouldOfferPersistence(state) {
  const normalized = normalizeValueState(state);
  const count = normalized.confirmedUserResultIds.length;
  if (count < 3) return false;
  const { lastShownAtCount, dismissedAtCount } = normalized.persistencePrompt;
  if (dismissedAtCount > 0) return count >= dismissedAtCount + 5 && lastShownAtCount < count;
  return lastShownAtCount < 3;
}

export function markPersistenceShown(state) {
  const normalized = normalizeValueState(state);
  const count = normalized.confirmedUserResultIds.length;
  return {
    ...normalized,
    persistencePrompt: { ...normalized.persistencePrompt, lastShownAtCount: count }
  };
}

export function dismissPersistenceOffer(state) {
  const normalized = normalizeValueState(state);
  const count = normalized.confirmedUserResultIds.length;
  return {
    ...normalized,
    persistencePrompt: { lastShownAtCount: count, dismissedAtCount: count }
  };
}

export function isShowcaseMode(search = "") {
  return new URLSearchParams(search).get("showcase") === "1";
}
