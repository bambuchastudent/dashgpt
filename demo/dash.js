import {
  PRODUCT_BOARD_ID,
  PRODUCT_BOARD_PATH,
  DELIVERY_STATUSES,
  boardMemberResults,
  buildProductBoardContinuation,
  isProductBoardPath,
  productBoardMeta,
  reconcileProductBoard,
  summarizeProductBoard
} from "./product-board.js";

if (isProductBoardPath(window.location.pathname)) {
  document.body.classList.add("dash-route", "product-board-route");
  document.title = "DashGPT Product Board";

  const shell = document.querySelector(".shell");
  if (shell) renderProductBoard(shell);
}

const STATUS_LABELS = Object.freeze({
  idea: "Idea",
  specified: "Specified",
  in_development: "In development",
  merged: "Merged",
  deployed: "Deployed",
  product_verified: "Product verified",
  blocked: "Blocked",
  archived: "Archived"
});

function text(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function safeHttpUrl(value) {
  const raw = text(value);
  if (!raw) return null;
  try {
    const url = new URL(raw, window.location.origin);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function addLink(container, label, href) {
  const safe = safeHttpUrl(href);
  if (!safe) return;
  const link = document.createElement("a");
  link.className = "product-board-link";
  link.href = safe;
  link.target = safe.startsWith(window.location.origin) ? "_self" : "_blank";
  if (link.target === "_blank") link.rel = "noopener noreferrer";
  link.textContent = label;
  container.appendChild(link);
}

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function metadataRow(label, value) {
  const row = element("div", "product-board-meta-row");
  row.append(element("dt", "product-board-meta-label", label), element("dd", "product-board-meta-value", value || "—"));
  return row;
}

function renderSummary(container, members) {
  const summary = summarizeProductBoard(members);
  const grid = element("div", "product-board-summary-grid");
  const counts = [
    ["Topics", summary.total],
    ["Specified", summary.specified],
    ["In development", summary.in_development],
    ["Merged", summary.merged],
    ["Deployed", summary.deployed],
    ["Product verified", summary.product_verified],
    ["Blocked", summary.blocked],
    ["Ideas", summary.idea]
  ];
  for (const [label, value] of counts) {
    const item = element("div", "product-board-summary-item");
    item.append(element("strong", "product-board-summary-value", String(value)), element("span", "product-board-summary-label", label));
    grid.appendChild(item);
  }
  container.appendChild(grid);
  return summary;
}

function renderProductCard(result) {
  const metadata = productBoardMeta(result) || {};
  const card = element("article", `product-topic-card status-${metadata.deliveryStatus || "unknown"}`);
  card.id = result.id;

  const top = element("div", "product-topic-topline");
  top.append(
    element("span", "product-topic-area", text(metadata.area, result.category || "DashGPT")),
    element("span", `product-status status-${metadata.deliveryStatus || "unknown"}`, STATUS_LABELS[metadata.deliveryStatus] || metadata.deliveryStatus || "Unknown")
  );

  card.append(top, element("h3", "product-topic-title", result.title), element("p", "product-topic-summary", result.summary));

  const state = element("div", "product-topic-state");
  state.append(element("h4", "product-topic-subtitle", "Current state"), element("p", "", text(metadata.currentState, "No current-state note.")));
  card.appendChild(state);

  if (metadata.blocker) {
    const blocker = element("div", "product-topic-blocker");
    blocker.append(element("strong", "", "Blocker"), element("p", "", metadata.blocker));
    card.appendChild(blocker);
  }

  const next = element("div", "product-topic-next");
  next.append(element("strong", "", "Next"), element("p", "", text(metadata.nextAction, result.next || "No next action recorded.")));
  card.appendChild(next);

  const tags = element("div", "product-topic-tags");
  for (const tag of [metadata.primaryTag, ...(Array.isArray(result.tags) ? result.tags : [])].filter(Boolean)) {
    tags.appendChild(element("span", "product-topic-tag", tag));
  }
  card.appendChild(tags);

  const links = element("div", "product-topic-links");
  addLink(links, metadata.openSpecChangeId ? `OpenSpec · ${metadata.openSpecChangeId}` : "OpenSpec", metadata.openSpecUrl);
  addLink(links, metadata.prNumber ? `PR #${metadata.prNumber}` : "Pull request", metadata.prUrl);
  addLink(links, "Preview", metadata.previewUrl);
  addLink(links, "Production", metadata.productionUrl);
  addLink(links, "Source", result?.source?.url);
  if (links.childElementCount) card.appendChild(links);

  const verification = Array.isArray(metadata.verificationNotes) ? metadata.verificationNotes : [];
  if (verification.length) {
    const details = element("details", "product-topic-verification");
    const summary = element("summary", "", "Verification notes");
    const list = element("ul", "");
    verification.forEach((note) => list.appendChild(element("li", "", note)));
    details.append(summary, list);
    card.appendChild(details);
  }

  const meta = element("dl", "product-board-meta");
  meta.append(
    metadataRow("Updated", formatDate(metadata.updatedAt || metadata.lastMeaningfulUpdate)),
    metadataRow("Source", text(metadata.updateSource, "unknown")),
    metadataRow("Merge", text(metadata.mergeCommit, "—"))
  );
  card.appendChild(meta);
  return card;
}

function renderMissingCard(resultId) {
  const card = element("article", "product-topic-card status-missing");
  card.append(
    element("span", "product-status status-missing", "Unavailable"),
    element("h3", "product-topic-title", resultId),
    element("p", "product-topic-summary", "This referenced Result is not available in the current public catalog. Its content is not retained by the board.")
  );
  return card;
}

function renderReconciliation(container, reconciliation) {
  container.replaceChildren();
  if (!reconciliation.proposals.length) {
    container.appendChild(element("p", "product-board-fresh", "No pending delivery-state changes in the saved evidence."));
    return;
  }

  const warning = element("div", "product-board-stale");
  warning.appendChild(element("strong", "", `${reconciliation.proposals.length} proposed status change${reconciliation.proposals.length === 1 ? "" : "s"}`));
  const list = element("ul", "");
  for (const proposal of reconciliation.proposals) {
    list.appendChild(element("li", "", `${proposal.title}: ${STATUS_LABELS[proposal.from] || proposal.from} → ${STATUS_LABELS[proposal.to] || proposal.to}`));
  }
  warning.appendChild(list);
  warning.appendChild(element("p", "muted", "Review mode only: refresh never silently saves these changes."));
  container.appendChild(warning);
}

function createContinuationDialog(dash, members) {
  const dialog = element("dialog", "dialog context-dialog product-board-context-dialog");
  const article = element("article", "");
  article.append(
    element("p", "eyebrow", "STRUCTURED CONTINUATION"),
    element("h2", "", "Continue DashGPT product work"),
    element("p", "muted", "Generated from the current saved product-board Results; raw chat history is not included.")
  );
  const textarea = element("textarea", "product-board-context-output");
  textarea.rows = 22;
  textarea.readOnly = true;
  const boardUrl = new URL(PRODUCT_BOARD_PATH, window.location.origin).href;
  textarea.value = buildProductBoardContinuation(dash, members, { boardUrl });
  const actions = element("div", "dialog-actions");
  const copy = element("button", "button primary", "Copy continuation");
  copy.type = "button";
  const status = element("span", "muted", "");
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(textarea.value);
      status.textContent = "Copied.";
    } catch {
      textarea.focus();
      textarea.select();
      const copied = document.execCommand?.("copy");
      status.textContent = copied ? "Copied." : "Select and copy the text manually.";
    }
  });
  actions.append(copy, status);
  article.append(textarea, actions);
  const footer = element("form", "dialog-footer");
  footer.method = "dialog";
  const close = element("button", "button", "Close");
  footer.appendChild(close);
  dialog.append(article, footer);
  document.body.appendChild(dialog);
  return dialog;
}

async function renderProductBoard(shell) {
  const page = element("section", "product-board-page");
  page.id = "dashgptProductBoard";
  page.setAttribute("aria-live", "polite");
  page.appendChild(element("p", "muted", "Loading DashGPT Product Board…"));
  shell.appendChild(page);

  try {
    const [dashResponse, resultResponse] = await Promise.all([
      fetch("/demo/data/dashes.json", { cache: "no-store" }),
      fetch("/demo/data/results.json", { cache: "no-store" })
    ]);
    if (!dashResponse.ok) throw new Error(`Dash catalog returned ${dashResponse.status}`);
    if (!resultResponse.ok) throw new Error(`Result catalog returned ${resultResponse.status}`);

    const [dashes, results] = await Promise.all([dashResponse.json(), resultResponse.json()]);
    const dash = (Array.isArray(dashes) ? dashes : []).find((item) => item.dashId === PRODUCT_BOARD_ID);
    if (!dash) throw new Error("DashGPT Product Board is missing from the saved Dash catalog.");

    const members = boardMemberResults(dash, results);
    const memberIds = new Set(members.map((result) => result.id));
    const missingIds = (Array.isArray(dash.automaticResultIds) ? dash.automaticResultIds : []).filter((resultId) => !memberIds.has(resultId));
    const boardMetadata = dash.productBoard || {};

    page.replaceChildren();
    const header = element("header", "product-board-head");
    const intro = element("div", "product-board-intro");
    intro.append(
      element("p", "eyebrow", "LIVING PRODUCT MEMORY"),
      element("h2", "", dash.title || "DashGPT Product Board"),
      element("p", "muted product-board-description", dash.description || "Decisions, delivery status, current work and next changes.")
    );
    const headActions = element("div", "product-board-head-actions");
    const canonical = element("a", "button ghost", "Stable board URL");
    canonical.href = PRODUCT_BOARD_PATH;
    const back = element("a", "button ghost", "← Results");
    back.href = "/demo/";
    headActions.append(canonical, back);
    header.append(intro, headActions);
    page.appendChild(header);

    const summarySection = element("section", "product-board-summary");
    summarySection.append(element("p", "eyebrow", "CURRENT PRODUCT STATE"));
    const summary = renderSummary(summarySection, members);
    const freshness = element("div", "product-board-freshness");
    freshness.append(
      element("span", "", `Last refreshed: ${formatDate(boardMetadata.lastRefreshedAt)}`),
      element("span", "", `Last saved: ${formatDate(boardMetadata.lastSavedAt || dash.lastUpdatedAt)}`),
      element("span", "", `Update source: ${text(boardMetadata.updateSource, summary.updateSources.join(", ") || "repository")}`),
      element("span", "", `Mode: ${dash.updateMode === "review" ? "Review" : dash.updateMode || "unknown"}`)
    );
    summarySection.appendChild(freshness);

    const reviewActions = element("div", "product-board-review-actions");
    const refreshButton = element("button", "button primary", "Refresh board");
    refreshButton.type = "button";
    const contextButton = element("button", "button", "Copy / inspect continuation");
    contextButton.type = "button";
    const reconciliationContainer = element("div", "product-board-reconciliation");
    const initialReconciliation = reconcileProductBoard(members, { refreshedAt: boardMetadata.lastRefreshedAt || null });
    renderReconciliation(reconciliationContainer, initialReconciliation);
    const continuationDialog = createContinuationDialog(dash, members);

    refreshButton.addEventListener("click", () => {
      const refreshedAt = new Date().toISOString();
      renderReconciliation(reconciliationContainer, reconcileProductBoard(members, { refreshedAt }));
      freshness.firstElementChild.textContent = `Last refreshed: ${formatDate(refreshedAt)} (review only, not saved)`;
    });
    contextButton.addEventListener("click", () => continuationDialog.showModal());
    reviewActions.append(refreshButton, contextButton);
    summarySection.append(reviewActions, reconciliationContainer);
    page.appendChild(summarySection);

    const topicsSection = element("section", "product-board-topics");
    const topicsHeading = element("div", "section-heading");
    const headingText = element("div", "");
    headingText.append(element("p", "eyebrow", "PRODUCT TOPICS"), element("h2", "", "Tracked Results"));
    topicsHeading.append(headingText, element("span", "count", String(members.length + missingIds.length)));
    topicsSection.appendChild(topicsHeading);

    const grid = element("div", "product-board-topic-grid");
    for (const result of members) grid.appendChild(renderProductCard(result));
    for (const resultId of missingIds) grid.appendChild(renderMissingCard(resultId));
    topicsSection.appendChild(grid);
    page.appendChild(topicsSection);

    const legend = element("section", "product-board-legend");
    legend.appendChild(element("p", "eyebrow", "DELIVERY MODEL"));
    const legendItems = element("div", "product-board-status-legend");
    for (const status of DELIVERY_STATUSES) {
      const item = element("span", `product-status status-${status}`, STATUS_LABELS[status] || status);
      legendItems.appendChild(item);
    }
    legend.appendChild(legendItems);
    page.appendChild(legend);
  } catch (error) {
    page.replaceChildren();
    const card = element("article", "dash-status-card");
    card.append(
      element("h3", "", "Product Board unavailable"),
      element("p", "muted", error instanceof Error ? error.message : "Could not load DashGPT Product Board."),
      Object.assign(element("a", "button ghost", "Back to Results"), { href: "/demo/" })
    );
    page.appendChild(card);
  }
}

