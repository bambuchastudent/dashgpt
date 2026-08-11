const viewRoot = document.querySelector("#view");
const dialog = document.querySelector("#card-dialog");
const dialogTitle = document.querySelector("#dialog-title");
const dialogKind = document.querySelector("#dialog-kind");
const dialogContent = document.querySelector("#dialog-content");
const tabs = [...document.querySelectorAll(".view-tab")];

let memory = null;
let activeView = "map";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function prettyKind(value) {
  return String(value || "card")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function prettyStatus(value) {
  return value === "in-progress" ? "In progress" : value === "shipped" ? "Shipped" : prettyKind(value);
}

function formatDate(value, options = {}) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Unknown date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    ...(options.year ? { year: "numeric" } : {}),
    ...(options.time ? { hour: "2-digit", minute: "2-digit" } : {})
  }).format(date);
}

function byId(id) {
  return memory.cards.find((card) => card.id === id) || null;
}

function sessionById(id) {
  return memory.sessions.find((session) => session.id === id) || null;
}

function cardButton(card, className = "card-node") {
  const outgoing = memory.relations.filter((relation) => relation.from === card.id);
  return `
    <button class="${className}" type="button" data-card-id="${escapeHtml(card.id)}" style="--card-hue:${Number(card.semanticHue) || 220}">
      <span class="card-node-title">${escapeHtml(card.title)}</span>
      <span class="card-node-summary">${escapeHtml(card.summary)}</span>
      <span class="card-node-footer">
        <span class="status ${escapeHtml(card.status)}">${escapeHtml(prettyStatus(card.status))}</span>
        <span class="kind-chip">${escapeHtml(prettyKind(card.kind))}</span>
        ${outgoing.length ? `<span class="relation-chip">${outgoing.length} link${outgoing.length === 1 ? "" : "s"}</span>` : ""}
      </span>
    </button>`;
}

function updateHero() {
  document.querySelector("#project-title").textContent = memory.project.title;
  document.querySelector("#project-summary").textContent = memory.project.summary;
  document.querySelector("[data-testid='memory-path']").textContent = memory.project.memoryPath || ".dashgpt/";
  document.querySelector("#metric-cards").textContent = memory.cards.length;
  document.querySelector("#metric-shipped").textContent = memory.cards.filter((card) => card.status === "shipped").length;
  document.querySelector("#metric-sessions").textContent = memory.sessions.length;
  document.querySelector("#metric-relations").textContent = memory.relations.length;
}

function sectionHeading(title, description, meta) {
  return `
    <div class="section-heading">
      <div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(description)}</p>
      </div>
      ${meta ? `<span class="section-meta">${escapeHtml(meta)}</span>` : ""}
    </div>`;
}

function renderMap() {
  const grouped = new Map();
  for (const card of memory.cards) {
    const topic = card.topic || "Other";
    if (!grouped.has(topic)) grouped.set(topic, []);
    grouped.get(topic).push(card);
  }

  const groups = [...grouped.entries()]
    .map(([topic, cards]) => ({
      topic,
      cards: cards.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
      hue: Math.round(cards.reduce((sum, card) => sum + Number(card.semanticHue || 220), 0) / cards.length)
    }))
    .sort((a, b) => b.cards.length - a.cards.length || a.topic.localeCompare(b.topic));

  const relationLabels = memory.relations.map((relation) => {
    const from = byId(relation.from);
    const to = byId(relation.to);
    if (!from || !to) return "";
    return `<span class="relation-chip">${escapeHtml(from.title)} → ${escapeHtml(relation.kind)} → ${escapeHtml(to.title)}</span>`;
  }).filter(Boolean).join("");

  viewRoot.innerHTML = `
    ${sectionHeading(
      "Project Map",
      "Semantic neighborhoods from canonical cards. Position is presentation; relationships are explicit data.",
      `${groups.length} neighborhoods · ${memory.cards.length} cards`
    )}
    <div class="map-layout" data-testid="project-map">
      ${groups.map((group) => `
        <section class="neighborhood ${group.cards.length >= 2 ? "is-wide" : ""}" style="--topic-hue:${group.hue}">
          <div class="neighborhood-header">
            <h3 class="neighborhood-title">${escapeHtml(group.topic)}</h3>
            <span class="neighborhood-count">${group.cards.length}</span>
          </div>
          <div class="node-stack">
            ${group.cards.map((card) => cardButton(card)).join("")}
          </div>
        </section>
      `).join("")}
    </div>
    <div class="relationships-strip" aria-label="Explicit project relationships">
      <strong>Explicit relationships</strong>
      ${relationLabels || '<span class="empty-note">No relationships.</span>'}
    </div>`;
}

function renderTimeline() {
  const cards = [...memory.cards].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  viewRoot.innerHTML = `
    ${sectionHeading(
      "Timeline",
      "A semantic work log: what changed in the project, not a transcript or commit dump.",
      `Updated ${formatDate(memory.project.updatedAt, { year: true })}`
    )}
    <div class="timeline" data-testid="timeline">
      ${cards.map((card) => `
        <div class="timeline-row" style="--card-hue:${Number(card.semanticHue) || 220}">
          <time class="timeline-date" datetime="${escapeHtml(card.updatedAt)}">${escapeHtml(formatDate(card.updatedAt))}</time>
          <button class="timeline-card" type="button" data-card-id="${escapeHtml(card.id)}">
            <div class="card-node-footer">
              <span class="status ${escapeHtml(card.status)}">${escapeHtml(prettyStatus(card.status))}</span>
              <span class="kind-chip">${escapeHtml(prettyKind(card.kind))}</span>
              <span class="kind-chip">${escapeHtml(card.topic || "Other")}</span>
            </div>
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.outcome || card.summary)}</p>
          </button>
        </div>
      `).join("")}
    </div>`;
}

function renderResults() {
  const shipped = memory.cards.filter((card) => card.status === "shipped");
  const inProgress = memory.cards.filter((card) => card.status === "in-progress");
  const bugs = memory.cards.filter((card) => card.kind === "bug-fix");
  const decisions = memory.cards.filter((card) => card.decision).length;

  const renderResultGroup = (title, cards) => `
    <section class="result-group">
      <h3>${escapeHtml(title)}</h3>
      <div class="result-list">
        ${cards.map((card) => `
          <button class="result-card" type="button" data-card-id="${escapeHtml(card.id)}" style="--card-hue:${Number(card.semanticHue) || 220}">
            <div class="result-card-top">
              <h4>${escapeHtml(card.title)}</h4>
              <span class="status ${escapeHtml(card.status)}">${escapeHtml(prettyStatus(card.status))}</span>
            </div>
            <p>${escapeHtml(card.outcome || card.summary)}</p>
            <div class="result-evidence">${card.evidence?.length || 0} evidence item${card.evidence?.length === 1 ? "" : "s"} · ${card.sessionIds?.length || 0} contributing session${card.sessionIds?.length === 1 ? "" : "s"}</div>
          </button>
        `).join("")}
      </div>
    </section>`;

  viewRoot.innerHTML = `
    ${sectionHeading(
      "Results",
      "Derived from the same canonical cards. There is no parallel Results database in this view.",
      `${shipped.length} shipped · ${inProgress.length} in progress`
    )}
    <div class="results-metrics" data-testid="results-metrics">
      <article class="results-metric"><span>Shipped</span><strong>${shipped.length}</strong></article>
      <article class="results-metric"><span>In progress</span><strong>${inProgress.length}</strong></article>
      <article class="results-metric"><span>Bug fixes</span><strong>${bugs.length}</strong></article>
      <article class="results-metric"><span>Decisions preserved</span><strong>${decisions}</strong></article>
    </div>
    ${renderResultGroup("In progress", inProgress)}
    ${renderResultGroup("Shipped", shipped)}`;
}

function renderSessions() {
  const clientCount = new Set(memory.sessions.map((session) => session.client)).size;
  viewRoot.innerHTML = `
    ${sectionHeading(
      "Sessions",
      "Conversation history is supporting evidence. Canonical project memory stays in cards.",
      `${memory.sessions.length} sessions · ${clientCount} clients`
    )}
    <div class="session-intro">
      <aside class="session-callout">
        <strong>Sessions are evidence</strong>
        <p>A session can disappear without deleting a distilled decision or outcome. This prototype stores only summary metadata.</p>
      </aside>
      <aside class="session-callout">
        <strong>Local-first by default</strong>
        <p>Raw IDE conversations are not claimed to be captured, committed or synchronized by this prototype.</p>
      </aside>
    </div>
    <div class="session-grid" data-testid="sessions-view">
      ${memory.sessions.map((session) => {
        const cards = session.cardIds.map(byId).filter(Boolean);
        return `
          <article class="session-card" data-session-id="${escapeHtml(session.id)}">
            <div class="session-card-header">
              <div>
                <h3>${escapeHtml(session.client)}</h3>
                <small>${escapeHtml(session.model)}</small>
              </div>
              <span class="client-chip">local evidence</span>
            </div>
            <div class="session-meta-row">
              <span class="kind-chip">${session.messageCount} messages</span>
              <span class="kind-chip">${escapeHtml(formatDate(session.startedAt, { time: true }))}</span>
            </div>
            <p>${escapeHtml(session.summary)}</p>
            <div class="session-outcomes" aria-label="Cards distilled from ${escapeHtml(session.client)}">
              ${cards.map((card) => `<button type="button" data-card-id="${escapeHtml(card.id)}">${escapeHtml(card.title)}</button>`).join("")}
            </div>
          </article>`;
      }).join("")}
    </div>`;
}

function renderActiveView() {
  if (!memory) return;
  if (activeView === "timeline") renderTimeline();
  else if (activeView === "results") renderResults();
  else if (activeView === "sessions") renderSessions();
  else renderMap();
  bindCardButtons();
}

function renderEvidence(card) {
  if (!Array.isArray(card.evidence) || card.evidence.length === 0) return '<p class="empty-note">No evidence linked.</p>';
  return `<ul class="detail-list">${card.evidence.map((item) => `<li><strong>${escapeHtml(prettyKind(item.type))}:</strong> ${escapeHtml(item.label)}</li>`).join("")}</ul>`;
}

function renderFiles(card) {
  if (!Array.isArray(card.files) || card.files.length === 0) return '<p class="empty-note">No files linked.</p>';
  return `<ul class="detail-list">${card.files.map((file) => `<li><code>${escapeHtml(file)}</code></li>`).join("")}</ul>`;
}

function renderSessionsForCard(card) {
  const sessions = (card.sessionIds || []).map(sessionById).filter(Boolean);
  if (!sessions.length) return '<p class="empty-note">No session evidence linked.</p>';
  return `<div class="detail-tags">${sessions.map((session) => `<span class="detail-tag">${escapeHtml(session.client)} · ${escapeHtml(session.model)}</span>`).join("")}</div>`;
}

function renderRelationsForCard(card) {
  const relevant = memory.relations.filter((relation) => relation.from === card.id || relation.to === card.id);
  if (!relevant.length) return '<p class="empty-note">No explicit relationships.</p>';
  return `<ul class="detail-list">${relevant.map((relation) => {
    const from = byId(relation.from);
    const to = byId(relation.to);
    return `<li>${escapeHtml(from?.title || relation.from)} → <strong>${escapeHtml(relation.kind)}</strong> → ${escapeHtml(to?.title || relation.to)}</li>`;
  }).join("")}</ul>`;
}

function openCard(cardId) {
  const card = byId(cardId);
  if (!card) return;
  dialogKind.textContent = `${prettyKind(card.kind)} · ${prettyStatus(card.status)}`;
  dialogTitle.textContent = card.title;
  dialogContent.innerHTML = `
    <p class="detail-summary">${escapeHtml(card.summary)}</p>
    <div class="detail-flow" data-testid="detail-flow">
      <div class="flow-box"><span>Problem</span><p>${escapeHtml(card.problem || "Not recorded")}</p></div>
      <div class="flow-arrow" aria-hidden="true">→</div>
      <div class="flow-box"><span>Decision</span><p>${escapeHtml(card.decision || "Not recorded")}</p></div>
      <div class="flow-arrow" aria-hidden="true">→</div>
      <div class="flow-box"><span>Outcome</span><p>${escapeHtml(card.outcome || card.summary)}</p></div>
    </div>
    <section class="detail-section">
      <h3>Code / files</h3>
      ${renderFiles(card)}
    </section>
    <section class="detail-section" data-testid="detail-evidence">
      <h3>Evidence</h3>
      ${renderEvidence(card)}
    </section>
    <section class="detail-section">
      <h3>Contributing sessions</h3>
      ${renderSessionsForCard(card)}
    </section>
    <section class="detail-section">
      <h3>Relationships</h3>
      ${renderRelationsForCard(card)}
    </section>
    <section class="detail-section">
      <h3>Tags</h3>
      <div class="detail-tags">${(card.tags || []).map((tag) => `<span class="detail-tag">${escapeHtml(tag)}</span>`).join("")}</div>
    </section>`;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function bindCardButtons() {
  for (const button of viewRoot.querySelectorAll("[data-card-id]")) {
    button.addEventListener("click", () => openCard(button.dataset.cardId));
  }
}

function setView(view, { updateHash = true } = {}) {
  const allowed = new Set(["map", "timeline", "results", "sessions"]);
  activeView = allowed.has(view) ? view : "map";
  for (const tab of tabs) {
    const active = tab.dataset.view === activeView;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-pressed", String(active));
  }
  if (updateHash) history.replaceState(null, "", `#${activeView}`);
  renderActiveView();
}

for (const tab of tabs) {
  tab.addEventListener("click", () => setView(tab.dataset.view));
}

window.addEventListener("hashchange", () => setView(location.hash.slice(1), { updateHash: false }));

async function boot() {
  try {
    const response = await fetch("../data/developer-memory.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Developer memory fixture returned ${response.status}`);
    const payload = await response.json();
    if (!payload?.project || !Array.isArray(payload.cards) || !Array.isArray(payload.sessions) || !Array.isArray(payload.relations)) {
      throw new Error("Developer memory fixture is invalid.");
    }
    memory = payload;
    updateHero();
    setView(location.hash.slice(1) || "map", { updateHash: false });
  } catch (error) {
    viewRoot.innerHTML = `<div class="error-state"><strong>Could not load project memory.</strong><br>${escapeHtml(error?.message || error)}</div>`;
  }
}

boot();
