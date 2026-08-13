export const CHATGPT_DETAIL_RETRY_STAGES_MS = Object.freeze([
  5_000,
  15_000,
  30_000,
  60_000,
  120_000,
  300_000
]);

export function computeChatGptDetailRetryDelay(rawRetryAfter, attempt = 0, sourceId = "", now = Date.now()) {
  const current = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  let providerMinimum = 0;
  const raw = typeof rawRetryAfter === "string" ? rawRetryAfter.trim() : "";
  if (raw) {
    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds >= 0) providerMinimum = seconds * 1000;
    else {
      const at = Date.parse(raw);
      if (Number.isFinite(at)) providerMinimum = Math.max(0, at - current);
    }
  }

  const stages = [5_000, 15_000, 30_000, 60_000, 120_000, 300_000];
  const index = Math.min(stages.length - 1, Math.max(0, Math.floor(Number(attempt) || 0)));
  const base = Math.max(stages[index], providerMinimum);
  const key = `${String(sourceId || "")}:${index}`;
  let hash = 2166136261;
  for (let offset = 0; offset < key.length; offset += 1) {
    hash ^= key.charCodeAt(offset);
    hash = Math.imul(hash, 16777619);
  }
  const stagger = (hash >>> 0) % 751;
  return Math.max(0, Math.round(base)) + stagger;
}
