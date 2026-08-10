export const PRODUCT_BOARD_ID = "dashgpt-product";
export const PRODUCT_BOARD_PATH = "/demo/dash/dashgpt-product/";

export const DELIVERY_STATUSES = Object.freeze([
  "idea",
  "specified",
  "in_development",
  "merged",
  "deployed",
  "product_verified",
  "blocked",
  "archived"
]);

const FORWARD_STATUS_RANK = Object.freeze({
  idea: 0,
  specified: 1,
  in_development: 2,
  merged: 3,
  deployed: 4,
  product_verified: 5
});

const COMPLETED_STATUSES = new Set(["merged", "deployed", "product_verified"]);
const ACTIVE_STATUSES = new Set(["in_development", "blocked"]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stableCompare(left, right) {
  return String(left || "").localeCompare(String(right || ""), "en");
}

export function isDeliveryStatus(value) {
  return DELIVERY_STATUSES.includes(value);
}

export function isProductBoardPath(pathname) {
  return /^\/demo\/dash\/?$/.test(pathname) || /^\/demo\/dash\/dashgpt-product\/?$/.test(pathname);
}

export function productBoardMeta(result) {
  const metadata = result?.productBoard;
  if (!metadata || typeof metadata !== "object") return null;
  return metadata;
}

export function boardMemberResults(dash, results) {
  if (!dash || dash.dashId !== PRODUCT_BOARD_ID) return [];
  const byId = new Map(asArray(results).map((result) => [result.id, result]));
  return asArray(dash.automaticResultIds)
    .map((resultId) => byId.get(resultId))
    .filter(Boolean);
}

export function summarizeProductBoard(results) {
  const summary = Object.fromEntries(DELIVERY_STATUSES.map((status) => [status, 0]));
  summary.total = 0;
  summary.updatedAt = null;
  summary.updateSources = [];

  const sources = new Set();
  let newest = "";
  for (const result of asArray(results)) {
    const metadata = productBoardMeta(result);
    if (!metadata || !isDeliveryStatus(metadata.deliveryStatus)) continue;
    summary.total += 1;
    summary[metadata.deliveryStatus] += 1;
    const updatedAt = asText(metadata.updatedAt || metadata.lastMeaningfulUpdate || result.publishedAt);
    if (updatedAt > newest) newest = updatedAt;
    if (asText(metadata.updateSource)) sources.add(metadata.updateSource);
  }

  summary.updatedAt = newest || null;
  summary.updateSources = [...sources].sort(stableCompare);
  return summary;
}

function proposedStatus(metadata) {
  if (!metadata || ["blocked", "archived"].includes(metadata.deliveryStatus)) return null;

  const acceptance = metadata.productAcceptance;
  if (acceptance?.accepted === true && acceptance?.source === "manual") return "product_verified";

  const evidence = metadata.evidence || {};
  if (evidence.productionDeployment === "success" || evidence.productionDeploymentConfirmed === true) return "deployed";
  if (evidence.prState === "merged" || evidence.prMerged === true) return "merged";
  if (evidence.prState === "open") return "in_development";
  return null;
}

export function reconcileProductBoard(results, options = {}) {
  const refreshedAt = asText(options.refreshedAt) || null;
  const proposals = [];

  for (const result of asArray(results)) {
    const metadata = productBoardMeta(result);
    if (!metadata || !isDeliveryStatus(metadata.deliveryStatus)) continue;
    const targetStatus = proposedStatus(metadata);
    if (!targetStatus || targetStatus === metadata.deliveryStatus) continue;

    const currentRank = FORWARD_STATUS_RANK[metadata.deliveryStatus];
    const targetRank = FORWARD_STATUS_RANK[targetStatus];
    if (!Number.isFinite(currentRank) || !Number.isFinite(targetRank) || targetRank <= currentRank) continue;

    proposals.push({
      resultId: result.id,
      title: result.title,
      from: metadata.deliveryStatus,
      to: targetStatus,
      refreshedAt,
      evidence: structuredClone(metadata.evidence || {})
    });
  }

  proposals.sort((left, right) => stableCompare(left.resultId, right.resultId));
  return {
    boardId: PRODUCT_BOARD_ID,
    refreshedAt,
    proposals,
    stale: proposals.length > 0
  };
}

function bullet(lines) {
  return lines.length ? lines.map((line) => `- ${line}`).join("\n") : "- None recorded.";
}

function statusLine(result) {
  const metadata = productBoardMeta(result);
  const blocker = asText(metadata?.blocker);
  return `${result.title} — ${metadata?.deliveryStatus || "unknown"}${blocker ? ` — BLOCKED: ${blocker}` : ""}`;
}

function sourceLines(results, boardUrl) {
  const lines = [`Product board: ${boardUrl}`];
  const seen = new Set(lines);
  for (const result of results) {
    const metadata = productBoardMeta(result);
    const pairs = [
      ["Result", `${boardUrl}#${encodeURIComponent(result.id)}`],
      ["OpenSpec", metadata?.openSpecUrl],
      ["Pull request", metadata?.prUrl],
      ["Preview", metadata?.previewUrl],
      ["Production", metadata?.productionUrl],
      ["Source", result?.source?.url]
    ];
    for (const [label, url] of pairs) {
      if (!asText(url)) continue;
      const line = `${label}: ${url}`;
      if (!seen.has(line)) {
        seen.add(line);
        lines.push(line);
      }
    }
  }
  return lines;
}

export function buildProductBoardContinuation(dash, results, options = {}) {
  const boardUrl = asText(options.boardUrl) || PRODUCT_BOARD_PATH;
  const members = asArray(results).filter((result) => productBoardMeta(result));
  const summary = summarizeProductBoard(members);
  const completed = members.filter((result) => COMPLETED_STATUSES.has(productBoardMeta(result).deliveryStatus));
  const active = members.filter((result) => ACTIVE_STATUSES.has(productBoardMeta(result).deliveryStatus));
  const decisions = members.flatMap((result) => asArray(result.decisions).map((decision) => `${result.title}: ${decision}`));
  const openQuestions = members.flatMap((result) => asArray(result.openQuestions).map((question) => `${result.title}: ${question}`));
  const nextActions = members
    .filter((result) => !["archived", "product_verified"].includes(productBoardMeta(result).deliveryStatus))
    .map((result) => `${result.title}: ${asText(productBoardMeta(result).nextAction || result.next)}`)
    .filter((line) => !line.endsWith(": "));

  const currentState = [
    `Total topics: ${summary.total}`,
    ...DELIVERY_STATUSES.filter((status) => summary[status] > 0).map((status) => `${status}: ${summary[status]}`),
    ...members.map(statusLine)
  ];

  return [
    "# Role",
    "",
    "You are continuing product work on DashGPT.",
    "",
    "# Product definition",
    "",
    "DashGPT is user-controlled AI memory represented by portable Result cards and Semantic Dashes. Raw chat history is a source, not the primary stored artifact.",
    "",
    "# Current objective",
    "",
    asText(options.objective) || dash?.description || "Continue the highest-priority unfinished DashGPT product work from the current board state.",
    "",
    "# Current product state",
    "",
    bullet(currentState),
    "",
    "# Completed",
    "",
    bullet(completed.map(statusLine)),
    "",
    "# Active work",
    "",
    bullet(active.map(statusLine)),
    "",
    "# Decisions already made",
    "",
    bullet(decisions),
    "",
    "# Constraints",
    "",
    bullet([
      "Product discussions and implementation discussions are separated.",
      "Every implementation PR follows OpenSpec.",
      "Preserve privacy and portability.",
      "Do not treat raw chat history as the primary stored artifact.",
      "Do not mark merged work as product-verified without explicit product verification.",
      "Review mode is active; invisible automatic board mutation is disabled."
    ]),
    "",
    "# Open questions",
    "",
    bullet(openQuestions),
    "",
    "# Next actions",
    "",
    bullet(nextActions),
    "",
    "# Sources",
    "",
    bullet(sourceLines(members, boardUrl)),
    ""
  ].join("\n");
}

