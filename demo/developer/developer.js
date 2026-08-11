const viewRoot = document.querySelector("#view");
const dialog = document.querySelector("#card-dialog");
const dialogTitle = document.querySelector("#dialog-title");
const dialogKind = document.querySelector("#dialog-kind");
const dialogContent = document.querySelector("#dialog-content");
const tabs = [...document.querySelectorAll(".view-tab")];

let memory = null;
let activeView = "state";

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
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function prettyStatus(value) {
  if (value === "in-progress") return "In progress";
  if (value === "shipped") return "Shipped";
  if (value === "planned") return "Planned";
  return prettyKind(value);
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
  return memory.cards.find(card => card.id === id) || null;
}

function sessionById(id) {
  return memory.sessions.find(session => session.id === id) || null;
}

function cardsByStage(...stages) {
  const allowed = new Set(stages);
  return memory.cards.filter(card => allowed.has(card.stage));
}

function stageRank(stage) {
  return ({ active: 0, prototype: 1, next: 2, shipped: 3 })[stage] ?? 9;
}

function cardOrder(left, right) {
  return stageRank(left.stage) - stageRank(right.stage)
    || Number(left.priority || 99) - Number(right.priority || 99)
    || new Date(right.updatedAt) - new Date(left.updatedAt)
    || left.title.localeCompare(right.title);
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

function stageBadge(card) {
  return `<span class="stage-badge ${escapeHtml(card.stage || "")}">${escapeHtml(card.stageLabel || prettyStatus(card.status))}</span>`;
}

function progressPills(card) {
  const progress = Array.isArray(card.progress) ? card.progress : [];
  return progress.map(item => `<span class="progress-pill">${escapeHtml(item)}</span>`).join("");
}

function updateHero() {
  document.querySelector("#project-title").textContent = memory.project.title;
  document.querySelector("#project-summary").textContent = memory.project.summary;
  document.querySelector("[data-testid='memory-path']").textContent = memory.project.memoryPath || ".dashgpt/";
  document.querySelector("#metric-active").textContent = cardsByStage("active", "prototype").length;
  document.querySelector("#metric-shipped").textContent = cardsByStage("shipped").length;
  document.querySelector("#metric-next").textContent = cardsByStage("next").length;
  document.querySelector("#metric-sessions").textContent = memory.sessions.length;
}

function renderProductSpine() {
  const steps = Array.isArray(memory.project.productSpine) ? memory.project.productSpine : [];
  if (!steps.length) return "";
  return `
    <section aria-labelledby="product-spine-title">
      ${sectionHeading(
        "How DashGPT fits together",
        "The product flow first; implementation cards second.",
        `${steps.length} capability steps`
      )}
      <div class="product-spine" data-testid="product-spine">
        ${steps.map(step => `
          <article class="spine-step">
            <strong>${escapeHtml(step.label)}</strong>
            <p>${escapeHtml(step.description)}</p>
          </article>
        `).join("")}
      </div>
    </section>`;
}

function renderNowCard(card) {
  return `
    <button class="now-card" type="button" data-card-id="${escapeHtml(card.id)}" style="--card-hue:${Number(card.semanticHue) || 220}">
      <div class="now-card-top">
        <div>
          <span class="eyebrow">${escapeHtml(card.workstream || "Project")}</span>
          <h3>${escapeHtml(card.title)}</h3>
        </div>
        ${stageBadge(card)}
      </div>
      <span class="outcome-label">What this changes</span>
      <p class="outcome-copy">${escapeHtml(card.outcome || card.summary)}</p>
      <div class="progress-rail" aria-label="Progress for ${escapeHtml(card.title)}">
        ${progressPills(card)}
      </div>
    </button>`;
}

function renderWorkstreamCard(card) {
  return `
    <button class="workstream-card" type="button" data-card-id="${escapeHtml(card.id)}" style="--card-hue:${Number(card.semanticHue) || 220}">
      <div class="workstream-card-top">
        <h4>${escapeHtml(card.title)}</h4>
        ${stageBadge(card)}
      </div>
      <p class="workstream-outcome">${escapeHtml(card.outcome || card.summary)}</p>
      <div class="workstream-stage-line">${escapeHtml(card.stageLabel || prettyStatus(card.status))}</div>
    </button>`;
}

function renderProjectState() {
  const active = cardsByStage("active", "prototype").sort(cardOrder);
  const shipped = cardsByStage("shipped").sort(cardOrder);
  const next = cardsByStage("next").sort(cardOrder);

  const grouped = new Map();
  for (const card of [...memory.cards].sort(cardOrder)) {
    const workstream = card.workstream || "Other";
    if (!grouped.has(workstream)) grouped.set(workstream, []);
    grouped.get(workstream).push(card);
  }

  const workstreams = [...grouped.entries()]
    .map(([name, cards]) => ({ name, cards }))
    .sort((left, right) => {
      const leftActive = left.cards.some(card => card.stage === "active" || card.stage === "prototype") ? 0 : 1;
      const rightActive = right.cards.some(card => card.stage === "active" || card.stage === "prototype") ? 0 : 1;
      return leftActive - rightActive || left.name.localeCompare(right.name);
    });

  viewRoot.innerHTML = `
    ${sectionHeading(
      "Project State",
      "What DashGPT is building now, what is already in develop, and what comes next.",
      `Snapshot ${formatDate(memory.project.updatedAt, { time: true })}`
    )}

    <div class="state-summary" data-testid="state-summary">
      <article class="state-summary-card"><span>Active / prototype</span><strong>${active.length}</strong></article>
      <article class="state-summary-card"><span>In develop</span><strong>${shipped.length}</strong></article>
      <article class="state-summary-card"><span>Next / planned</span><strong>${next.length}</strong></article>
    </div>

    ${renderProductSpine()}

    <section class="now-section" data-testid="now-section">
      ${sectionHeading(
        "Now",
        "Open work is intentionally larger than historical cards so the current direction is obvious.",
        `${active.length} active changes`
      )}
      <div class="now-grid">
        ${active.map(renderNowCard).join("") || '<p class="empty-note">No active work in this snapshot.</p>'}
      </div>
    </section>

    <section data-testid="workstreams">
      ${sectionHeading(
        "Workstreams",
        "Human project areas organize the same canonical cards; semantic color stays a secondary cue.",
        `${workstreams.length} areas`
      )}
      <div class="workstreams">
        ${workstreams.map(group => `
          <section class="workstream ${group.cards.length >= 3 ? "is-wide" : ""}">
            <div class="workstream-header">
              <h3>${escapeHtml(group.name)}</h3>
              <span class="workstream-count">${group.cards.length} card${group.cards.length === 1 ? "" : "s"}</span>
            </div>
            <div class="workstream-list">
              ${group.cards.map(renderWorkstreamCard).join("")}
            </div>
          </section>
        `).join("")}
      </div>
    </section>

    ${next.length ? `
      <aside class="next-callout" data-testid="next-callout">
        <strong>Next: ${escapeHtml(next[0].title)}</strong>
        <p>${escapeHtml(next[0].outcome || next[0].summary)} This is planned only; automatic coding-agent capture is not implemented by this prototype.</p>
      </aside>` : ""}`;
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
      ${cards.map(card => `
        <div class="timeline-row" style="--card-hue:${Number(card.semanticHue) || 220}">
          <time class="timeline-date" datetime="${escapeHtml(card.updatedAt)}">${escapeHtml(formatDate(card.updatedAt))}</time>
          <button class="timeline-card" type="button" data-card-id="${escapeHtml(card.id)}">
            <div class="card-node-footer">
              ${stageBadge(card)}
              <span class="kind-chip">${escapeHtml(prettyKind(card.kind))}</span>
              <span class="kind-chip">${escapeHtml(card.workstream || card.topic || "Other")}</span>
            </div>
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.outcome || card.summary)}</p>
          </button>
        </div>
      `).join("")}
    </div>`;
}

function renderResults() {
  const shipped = cardsByStage("shipped").sort(cardOrder);
  const active = cardsByStage("active", "prototype").sort(cardOrder);
  const next = cardsByStage("next").sort(cardOrder);
  const bugs = memory.cards.filter(card => card.kind === "bug-fix");

  const renderGroup = (title, cards) => `
    <section class="result-group">
      <h3>${escapeHtml(title)}</h3>
      <div class="result-list">
        ${cards.map(card => `
          <button class="result-card" type="button" data-card-id="${escapeHtml(card.id)}" style="--card-hue:${Number(card.semanticHue) || 220}">
            <div class="result-card-top">
              <h4>${escapeHtml(card.title)}</h4>
              ${stageBadge(card)}
            </div>
            <p>${escapeHtml(card.outcome || card.summary)}</p>
            <div class="result-evidence">${escapeHtml(card.stageLabel || prettyStatus(card.status))} · ${card.evidence?.length || 0} evidence item${card.evidence?.length === 1 ? "" : "s"}</div>
          </button>
        `).join("")}
      </div>
    </section>`;

  viewRoot.innerHTML = `
    ${sectionHeading(
      "Results",
      "The same canonical cards grouped by project stage; no parallel Results database.",
      `${shipped.length} in develop · ${active.length} active · ${next.length} next`
    )}
    <div class="results-metrics" data-testid="results-metrics">
      <article class="results-metric"><span>In develop</span><strong>${shipped.length}</strong></article>
      <article class="results-metric"><span>Active</span><strong>${active.length}</strong></article>
      <article class="results-metric"><span>Next</span><strong>${next.length}</strong></article>
      <article class="results-metric"><span>Bug fixes</span><strong>${bugs.length}</strong></article>
    </div>
    ${renderGroup("Active / prototype", active)}
    ${renderGroup("In develop", shipped)}
    ${renderGroup("Next / planned", next)}`;
}

function renderSessions() {
  const clientCount = new Set(memory.sessions.map(session => session.client)).size;
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
      ${memory.sessions.map(session => {
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
              ${cards.map(card => `<button type="button" data-card-id="${escapeHtml(card.id)}">${escapeHtml(card.title)}</button>`).join("")}
            </div>
          </article>`;
      }).join("")}
    </div>`;
}

function renderEvidence(card) {
  if (!Array.isArray(card.evidence) || card.evidence.length === 0) return '<p class="empty-note">No evidence linked.</p>';
  return `<ul class="detail-list">${card.evidence.map(item => `<li><strong>${escapeHtml(prettyKind(item.type))}:</strong> ${escapeHtml(item.label)}</li>`).join("")}</ul>`;
}

function renderFiles(card) {
  if (!Array.isArray(card.files) || card.files.length === 0) return '<p class="empty-note">No files linked.</p>';
  return `<ul class="detail-list">${card.files.map(file => `<li><code>${escapeHtml(file)}</code></li>`).join("")}</ul>`;
}

function renderSessionsForCard(card) {
  const sessions = (card.sessionIds || []).map(sessionById).filter(Boolean);
  if (!sessions.length) return '<p class="empty-note">No session evidence linked.</p>';
  return `<div class="detail-tags">${sessions.map(session => `<span class="detail-tag">${escapeHtml(session.client)} · ${escapeHtml(session.model)}</span>`).join("")}</div>`;
}

function renderRelationsForCard(card) {
  const relevant = memory.relations.filter(relation => relation.from === card.id || relation.to === card.id);
  if (!relevant.length) return '<p class="empty-note">No explicit relationships.</p>';
  return `<ul class="detail-list">${relevant.map(relation => {
    const from = byId(relation.from);
    const to = byId(relation.to);
    return `<li>${escapeHtml(from?.title || relation.from)} → <strong>${escapeHtml(relation.kind)}</strong> → ${escapeHtml(to?.title || relation.to)}</li>`;
  }).join("")}</ul>`;
}

function openCard(cardId) {
  const card = byId(cardId);
  if (!card) return;
  dialogKind.textContent = `${prettyKind(card.kind)} · ${card.stageLabel || prettyStatus(card.status)}`;
  dialogTitle.textContent = card.title;
  dialogContent.innerHTML = `
    <p class="detail-summary">${escapeHtml(card.summary)}</p>
    ${card.progress?.length ? `
      <section class="detail-section">
        <h3>Project state</h3>
        <div class="progress-rail">${progressPills(card)}</div>
      </section>` : ""}
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
      <div class="detail-tags">${(card.tags || []).map(tag => `<span class="detail-tag">${escapeHtml(tag)}</span>`).join("")}</div>
    </section>`;

  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function bindCardButtons() {
  for (const button of viewRoot.querySelectorAll("[data-card-id]")) {
    button.addEventListener("click", () => openCard(button.dataset.cardId));
  }
}

function renderActiveView() {
  if (!memory) return;
  if (activeView === "timeline") renderTimeline();
  else if (activeView === "results") renderResults();
  else if (activeView === "sessions") renderSessions();
  else renderProjectState();
  bindCardButtons();
}

function setView(view, { updateHash = true } = {}) {
  const allowed = new Set(["state", "timeline", "results", "sessions"]);
  activeView = allowed.has(view) ? view : "state";

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
    setView(location.hash.slice(1) || "state", { updateHash: false });
  } catch (error) {
    viewRoot.innerHTML = `<div class="error-state"><strong>Could not load project memory.</strong><br>${escapeHtml(error?.message || error)}</div>`;
  }
}

boot();
