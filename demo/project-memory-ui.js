import { loadBrowserVault, materializeResults } from "./vault.js";
import { latestDashRevisions, materializeDash } from "./semantic-dashes.js";
import { semanticHue } from "./semantic-gallery.js";
import { buildProjectFiles, buildProjectModel, buildProjectZip, projectArchiveName } from "./project-memory.js";

const resultPage = document.querySelector("#resultPage");
let scheduled = false;

function routeDashId() {
  const match = window.location.pathname.match(/^\/demo\/dashes\/([^/]+)\/?$/);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return null; }
}

function text(value, maximum = 180) {
  if (value === undefined || value === null) return "";
  const raw = typeof value === "string" ? value : Array.isArray(value) ? value.join(" · ") : JSON.stringify(value);
  const clean = String(raw || "").replace(/\s+/g, " ").trim();
  return clean.length > maximum ? `${clean.slice(0, maximum - 1).trimEnd()}…` : clean;
}

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function projectContext(dashId) {
  const loaded = loadBrowserVault(globalThis.localStorage);
  const vault = loaded.vault;
  const revision = latestDashRevisions(vault.dashRevisions || [], vault.events || []).find(item => item.dashId === dashId);
  if (!revision) return null;
  const results = materializeResults(vault);
  const view = materializeDash(revision, vault.events || [], results, { allDashRevisions: vault.dashRevisions || [] });
  const model = buildProjectModel(vault, view);
  const resultsById = new Map(results.map(result => [result.id, result]));
  return { vault, revision, view, model, resultsById };
}

function openCanonicalCard(cardId) {
  const escaped = globalThis.CSS?.escape ? CSS.escape(cardId) : cardId.replace(/["\\]/g, "\\$&");
  const card = document.querySelector(`[data-result-id="${escaped}"]`);
  if (card) {
    card.click();
    return;
  }
  const pageLink = document.querySelector(`[data-result-id="${escaped}"] .page-link`);
  if (pageLink?.href) window.location.href = pageLink.href;
}

function projectCardNode(card, rawResult) {
  const node = document.createElement("button");
  node.type = "button";
  node.className = "project-memory-card";
  node.dataset.projectCardId = card.id;
  node.style.setProperty("--project-hue", String(semanticHue(rawResult || card)));
  const top = element("div", "project-memory-card-top");
  top.append(
    element("span", "project-memory-card-category", card.category || "Card"),
    element("span", "project-memory-card-id", card.id)
  );
  const title = element("h3", "project-memory-card-title", card.title);
  const summary = element("p", "project-memory-card-summary", card.summary || "No summary yet.");
  node.append(top, title, summary);
  const state = text(card.currentState, 150);
  const next = text(card.next || card.suggestedNextStep, 150);
  if (state) node.append(element("p", "project-memory-cue", `Now · ${state}`));
  if (next) node.append(element("p", "project-memory-cue project-memory-next", `Next · ${next}`));
  if (card.tags?.length) {
    const tags = element("div", "project-memory-tags");
    for (const tag of card.tags.slice(0, 5)) tags.append(element("span", "project-memory-tag", `#${tag}`));
    node.append(tags);
  }
  node.addEventListener("click", () => openCanonicalCard(card.id));
  return node;
}

function projectMap(model) {
  const section = element("section", "project-memory-map");
  const heading = element("div", "project-memory-section-heading");
  heading.append(element("div", "", "Memory map"), element("span", "project-memory-count", `${model.relations.length} relations`));
  section.append(heading);
  const nodes = element("div", "project-memory-map-nodes");
  for (const card of model.cards) nodes.append(element("span", "project-memory-map-node", card.title));
  section.append(nodes);
  if (model.relations.length) {
    const byId = new Map(model.cards.map(card => [card.id, card]));
    const edges = element("div", "project-memory-edges");
    for (const relation of model.relations) {
      const row = element("div", "project-memory-edge");
      row.append(
        element("span", "project-memory-edge-card", byId.get(relation.from)?.title || relation.from),
        element("span", "project-memory-edge-arrow", `→ ${relation.kind} →`),
        element("span", "project-memory-edge-card", byId.get(relation.to)?.title || relation.to)
      );
      edges.append(row);
    }
    section.append(edges);
  } else {
    section.append(element("p", "muted project-memory-map-note", "No explicit Card relationships yet. The same Cards still remain visible as one project memory set."));
  }
  return section;
}

function renderProjectPanel(context) {
  const { model, resultsById } = context;
  const panel = element("section", "project-memory-panel");
  panel.hidden = true;
  const intro = element("div", "project-memory-intro");
  const copy = element("div", "project-memory-intro-copy");
  copy.append(
    element("p", "eyebrow", "PROJECT MEMORY"),
    element("h2", "project-memory-title", model.dashTitle),
    element("p", "project-memory-description", model.dashDescription || model.summary || "The same canonical Cards as this saved Dash, shown as project state.")
  );
  const stats = element("div", "project-memory-stats");
  stats.append(
    element("span", "project-memory-stat", `${model.cards.length} Cards`),
    element("span", "project-memory-stat", `${model.relations.length} relations`),
    element("span", "project-memory-stat project-memory-vault", `Vault ${model.vaultId}`)
  );
  intro.append(copy, stats);
  panel.append(intro);

  if (model.summary) panel.append(element("p", "project-memory-aggregate", model.summary));

  const cards = element("section", "project-memory-cards");
  const heading = element("div", "project-memory-section-heading");
  heading.append(element("div", "", "Current project memory"), element("span", "project-memory-count", String(model.cards.length)));
  cards.append(heading);
  const grid = element("div", "project-memory-grid");
  for (const card of model.cards) grid.append(projectCardNode(card, resultsById.get(card.id)));
  if (!model.cards.length) grid.append(element("p", "muted", "This saved Dash has no accepted Cards yet."));
  cards.append(grid);
  panel.append(cards, projectMap(model));
  return panel;
}

function downloadProject(context, status) {
  try {
    const files = buildProjectFiles(context.model);
    const zip = buildProjectZip(files);
    const blob = new Blob([zip], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = projectArchiveName(context.model.dashTitle);
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    status.textContent = `Prepared ${context.model.cards.length} Cards. Extract the .dashgpt folder at the repository root; review it before committing.`;
  } catch {
    status.textContent = "Could not prepare .dashgpt project memory. Your Vault was not changed.";
  }
}

function decorate() {
  scheduled = false;
  const dashId = routeDashId();
  const article = resultPage?.querySelector(".semantic-dash-page");
  if (!dashId || !article || article.dataset.projectMemoryEnhanced === "1") return;
  const context = projectContext(dashId);
  if (!context) return;
  article.dataset.projectMemoryEnhanced = "1";

  const panel = renderProjectPanel(context);
  const originalSections = [...article.querySelectorAll(":scope > .dash-section, :scope > .dash-unavailable")];
  const firstSection = originalSections[0] || null;
  article.insertBefore(panel, firstSection);

  const actions = resultPage.querySelector(":scope > .page-actions") || resultPage.querySelector(".page-actions");
  if (!actions) return;
  const switcher = element("div", "project-memory-switcher");
  switcher.setAttribute("role", "group");
  switcher.setAttribute("aria-label", "Dash view");
  const cardsButton = element("button", "button small primary", "Cards");
  cardsButton.type = "button";
  cardsButton.setAttribute("aria-pressed", "true");
  const projectButton = element("button", "button small ghost", "Project");
  projectButton.type = "button";
  projectButton.setAttribute("aria-pressed", "false");
  const getButton = element("button", "button small ghost project-memory-get", "Get .dashgpt");
  getButton.type = "button";
  const status = element("span", "project-memory-status muted");
  status.setAttribute("aria-live", "polite");

  function setMode(project) {
    panel.hidden = !project;
    for (const section of originalSections) section.hidden = project;
    cardsButton.className = project ? "button small ghost" : "button small primary";
    projectButton.className = project ? "button small primary" : "button small ghost";
    cardsButton.setAttribute("aria-pressed", String(!project));
    projectButton.setAttribute("aria-pressed", String(project));
    article.classList.toggle("project-memory-mode", project);
  }

  cardsButton.addEventListener("click", () => setMode(false));
  projectButton.addEventListener("click", () => setMode(true));
  getButton.addEventListener("click", () => downloadProject(context, status));
  switcher.append(cardsButton, projectButton, getButton, status);
  actions.prepend(switcher);
}

function scheduleDecorate() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(decorate);
}

if (resultPage) {
  const observer = new MutationObserver(scheduleDecorate);
  observer.observe(resultPage, { childList: true, subtree: true });
}
window.addEventListener("popstate", scheduleDecorate);
window.addEventListener("hashchange", scheduleDecorate);
document.addEventListener("click", scheduleDecorate, { capture: true });
scheduleDecorate();
