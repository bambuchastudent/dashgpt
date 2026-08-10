import {
  createDashRevision,
  createTemporaryDash,
  isResultEligible,
  latestDashRevisions,
  matchSavedDashes,
  materializeDash,
  refreshDash,
  reviseDash,
  saveTemporaryDash
} from "./semantic-dashes.js";
import { putDashRevision, setDashOverride } from "./vault.js";

function paragraph(text, className = "") {
  const element = document.createElement("p");
  element.className = className;
  element.textContent = text;
  return element;
}

function button(label, onClick, className = "button small") {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  element.addEventListener("click", onClick);
  return element;
}

function link(label, href, className = "button small") {
  const element = document.createElement("a");
  element.className = className;
  element.href = href;
  element.textContent = label;
  if (/^https?:/.test(href)) {
    element.target = "_blank";
    element.rel = "noopener noreferrer";
  }
  return element;
}

function decodeBase64Url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function dashRouteId() {
  const match = window.location.pathname.match(/^\/demo\/dashes\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function createSemanticDashUi(options) {
  const getVault = options.getVault;
  const getResults = options.getResults;
  const saveVault = options.saveVault;
  const openResult = options.openResult;
  const continueResult = options.continueResult;
  const recordActivity = options.recordActivity || (() => {});
  const decorateResultCard = options.decorateResultCard || (() => {});
  const renderMemberGallery = options.renderMemberGallery || null;
  const releaseMemberGallery = options.releaseMemberGallery || (() => {});
  const dashboardView = document.querySelector("#dashboardView");
  const resultPage = document.querySelector("#resultPage");
  const addResultButton = document.querySelector("#addResultButton");
  const topicInput = document.querySelector("#dashTopicInput");
  const topicButton = document.querySelector("#buildDashButton");
  const feedback = document.querySelector("#dashBuilderMessage");
  const preview = document.querySelector("#dashPreview");
  const choices = document.querySelector("#dashChoices");
  const dashesGrid = document.querySelector("#dashesGrid");
  const dashCount = document.querySelector("#dashCount");
  let temporaryView = null;

  function revisions() {
    const vault = getVault();
    return latestDashRevisions(vault.dashRevisions || [], vault.events || []);
  }

  function viewFor(revision) {
    const vault = getVault();
    return materializeDash(revision, vault.events, getResults(), { allDashRevisions: vault.dashRevisions || [] });
  }

  function persist() {
    saveVault(getVault());
    renderList();
  }

  function appendRevision(revision) {
    putDashRevision(getVault(), revision, { updatedAt: revision.lastUpdatedAt });
    persist();
  }

  function updateOverride(dashId, type, resultId, value) {
    setDashOverride(getVault(), dashId, type, resultId, value);
    if ((type === "dash.pin" || type === "dash.accept" || type === "dash.manual") && value) recordActivity(resultId, "dash.add");
    if (type === "dash.exclude") recordActivity(resultId, value ? "dash.remove" : "dash.add");
    persist();
    renderDashPage(dashId);
  }

  function resultActions(result, dashId, membership) {
    const actions = document.createElement("div");
    actions.className = "dash-result-actions card-actions";
    actions.append(button("Open", () => openResult(result.id)));
    if (result.source?.url) {
      const original = link("Original chat ↗", result.source.url);
      original.addEventListener("click", () => recordActivity(result.id, "source.open"));
      actions.append(original);
    }
    actions.append(button("Continue ↗", () => continueResult(result.id), "button small"));
    actions.append(button(membership === "pinned" ? "Unpin" : "Pin", () => updateOverride(dashId, "dash.pin", result.id, membership !== "pinned"), "button small ghost"));
    actions.append(button("Exclude", () => updateOverride(dashId, "dash.exclude", result.id, true), "button small ghost danger"));
    return actions;
  }

  function memberNode(member, dashId) {
    const article = document.createElement("article");
    article.className = "result-card dash-result-card";
    article.tabIndex = 0;
    article.dataset.resultId = member.result.id;
    article.setAttribute("aria-label", `Open ${member.result.title}`);
    decorateResultCard(article, member.result);
    const topline = document.createElement("div");
    topline.className = "card-topline";
    const category = document.createElement("span");
    category.className = "category";
    category.textContent = member.result.category || "Result";
    const badge = document.createElement("span");
    badge.className = "dash-membership card-status";
    badge.textContent = member.membership;
    topline.append(category, badge);
    const heading = document.createElement("h3");
    heading.className = "title";
    heading.textContent = member.result.title;
    const summary = paragraph(member.result.summary, "summary");
    const next = paragraph(member.result.next ? `Next: ${member.result.next}` : "", "card-next");
    next.hidden = !member.result.next;
    const relatedCount = [member.result.links, member.result.images, member.result.assets, member.result.relatedResults]
      .reduce((count, items) => count + (Array.isArray(items) ? items.length : 0), 0);
    const related = paragraph(relatedCount ? `${relatedCount} related ${relatedCount === 1 ? "material" : "materials"}` : "", "card-related");
    related.hidden = relatedCount === 0;
    const tags = document.createElement("div");
    tags.className = "tags";
    for (const value of member.result.tags || []) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = `#${value}`;
      tags.append(tag);
    }
    article.append(topline, heading, summary, next, related, tags, resultActions(member.result, dashId, member.membership));
    const openFromCard = (event) => {
      if (event.target.closest?.("a,button,input,summary,details")) return;
      if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
      if (event.type === "keydown") event.preventDefault();
      openResult(member.result.id);
    };
    article.addEventListener("click", openFromCard);
    article.addEventListener("keydown", openFromCard);
    return article;
  }

  function proposalNode(proposal, dashId) {
    const article = document.createElement("article");
    article.className = "dash-result-row proposal";
    const heading = document.createElement("h4");
    heading.textContent = proposal.result.title;
    const actions = document.createElement("div");
    actions.className = "dash-result-actions";
    actions.append(
      button("Accept", () => updateOverride(dashId, "dash.accept", proposal.result.id, true), "button small primary"),
      button("Reject", () => updateOverride(dashId, "dash.exclude", proposal.result.id, true), "button small ghost danger"),
      button("Open", () => openResult(proposal.result.id), "button small ghost")
    );
    article.append(heading, paragraph(proposal.result.summary, "muted"), actions);
    return article;
  }

  function renderPreview(view) {
    temporaryView = view;
    choices.replaceChildren();
    choices.hidden = true;
    preview.replaceChildren();
    preview.hidden = false;
    const header = document.createElement("div");
    header.className = "dash-preview-header";
    const title = document.createElement("h3");
    title.textContent = view.title;
    header.append(title, paragraph("TEMPORARY · NOT SAVED", "dash-temporary-badge"));
    preview.append(header, paragraph(view.summary, "muted"));
    const list = document.createElement("ul");
    for (const member of view.members.slice(0, 6)) {
      const item = document.createElement("li");
      item.textContent = member.result.title;
      list.append(item);
    }
    for (const proposal of view.proposals.slice(0, Math.max(0, 6 - view.members.length))) {
      const item = document.createElement("li");
      item.textContent = `${proposal.result.title} · possible match`;
      list.append(item);
    }
    if (!list.children.length) {
      const item = document.createElement("li");
      item.textContent = "No accessible matching Results.";
      list.append(item);
    }
    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    const hasMatches = view.members.length + view.proposals.length > 0;
    if (hasMatches) actions.append(button("Save Dash", saveTemporary, "button primary"));
    actions.append(
      button("Cancel", () => {
        temporaryView = null;
        preview.hidden = true;
        preview.replaceChildren();
      }, "button ghost")
    );
    preview.append(list, actions);
  }

  function saveTemporary() {
    if (!temporaryView || temporaryView.members.length + temporaryView.proposals.length === 0) return;
    const saved = saveTemporaryDash(temporaryView, { now: new Date().toISOString() });
    appendRevision(saved);
    temporaryView = null;
    preview.hidden = true;
    feedback.textContent = `Saved “${saved.title}” in your active DashGPT Vault.`;
    openDash(saved.dashId, false);
  }

  function renderChoices(matches) {
    temporaryView = null;
    preview.hidden = true;
    choices.replaceChildren(paragraph("Several saved Dashes match. Choose one:", "muted"));
    const actions = document.createElement("div");
    actions.className = "dash-choice-actions";
    for (const match of matches) actions.append(button(match.dash.title, () => openDash(match.dash.dashId, true), "button ghost"));
    choices.append(actions);
    choices.hidden = false;
  }

  function handleTopic() {
    const query = topicInput.value.trim();
    if (!query) {
      feedback.textContent = "Describe a topic first.";
      return;
    }
    const vault = getVault();
    const match = matchSavedDashes(query, vault.dashRevisions || [], vault.events || []);
    if (match.status === "confident") {
      feedback.textContent = `Opening saved Dash “${match.dash.title}”.`;
      openDash(match.dash.dashId, true);
      return;
    }
    if (match.status === "ambiguous") {
      feedback.textContent = "The request matches more than one saved Dash.";
      renderChoices(match.candidates);
      return;
    }
    const view = createTemporaryDash(query, getResults(), { now: new Date().toISOString(), allDashRevisions: vault.dashRevisions || [] });
    feedback.textContent = `No saved Dash matched. Found ${view.members.length + view.proposals.length} related Results and built a temporary view.`;
    renderPreview(view);
  }

  function renderList() {
    if (!dashesGrid) return;
    const current = revisions();
    dashesGrid.replaceChildren();
    dashCount.textContent = String(current.length);
    for (const revision of current) {
      const view = viewFor(revision);
      const article = document.createElement("article");
      article.className = "semantic-dash-card";
      const title = document.createElement("h3");
      title.textContent = revision.title;
      const meta = paragraph(`${view.members.length} Results · ${view.proposals.length} proposals · Review`, "dash-card-meta");
      const updated = paragraph(`Updated ${new Date(view.lastUpdatedAt).toLocaleString()}`, "muted");
      article.append(title, paragraph(revision.description, "muted"), meta, paragraph(view.summary, "dash-card-summary"), updated);
      const actions = document.createElement("div");
      actions.className = "dash-result-actions";
      actions.append(link("Open Dash", `/demo/dashes/${encodeURIComponent(revision.dashId)}/`, "button small primary"));
      article.append(actions);
      dashesGrid.append(article);
    }
    const empty = document.querySelector("#dashesEmpty");
    if (empty) empty.hidden = current.length !== 0;
  }

  function revisionById(dashId) {
    return revisions().find((revision) => revision.dashId === dashId) || null;
  }

  function refreshRevision(revision) {
    const vault = getVault();
    const refreshed = refreshDash(revision, vault.events, getResults(), {
      now: new Date().toISOString(),
      allDashRevisions: vault.dashRevisions || []
    });
    appendRevision(refreshed.revision);
    return refreshed.revision;
  }

  function openDash(dashId, refresh) {
    let revision = revisionById(dashId);
    if (!revision) return;
    if (refresh) revision = refreshRevision(revision);
    history.pushState({}, "", `/demo/dashes/${encodeURIComponent(dashId)}/`);
    renderDashPage(dashId);
  }

  function editDash(revision) {
    const title = window.prompt("Dash name", revision.title);
    if (title == null) return;
    const description = window.prompt("Dash description", revision.description);
    if (description == null) return;
    const next = reviseDash(revision, { title: title.trim() || revision.title, description: description.trim() }, { now: new Date().toISOString() });
    appendRevision(next);
    renderDashPage(revision.dashId);
  }

  function deleteDash(revision) {
    if (!window.confirm(`Delete “${revision.title}”? Its Results will not be deleted.`)) return;
    setDashOverride(getVault(), revision.dashId, "dash.delete", null, true);
    persist();
    history.pushState({}, "", "/demo/");
    showDashboard();
  }

  function addManualResult(revision, select) {
    if (!select.value) return;
    setDashOverride(getVault(), revision.dashId, "dash.exclude", select.value, false);
    setDashOverride(getVault(), revision.dashId, "dash.manual", select.value, true);
    recordActivity(select.value, "dash.add");
    persist();
    renderDashPage(revision.dashId);
  }

  function renderDashPage(dashId) {
    releaseMemberGallery();
    const revision = revisionById(dashId);
    dashboardView.hidden = true;
    resultPage.hidden = false;
    resultPage.classList.add("dash-gallery-page");
    addResultButton.hidden = true;
    resultPage.replaceChildren();
    if (!revision) {
      resultPage.append(paragraph("Dash not found or deleted.", "muted"), link("← Dashboard", "/demo/", "button ghost"));
      return;
    }
    const view = viewFor(revision);
    const article = document.createElement("article");
    article.className = "semantic-dash-page";
    article.append(paragraph("SEMANTIC DASH", "eyebrow"));
    const title = document.createElement("h1");
    title.textContent = revision.title;
    article.append(title, paragraph(revision.description, "result-lead"), paragraph(view.summary, "dash-aggregate-summary"));

    const meta = document.createElement("div");
    meta.className = "dash-meta-grid";
    meta.append(
      paragraph(`Review mode · Automatic is not enabled`, "dash-mode"),
      paragraph(`Updated ${new Date(revision.lastUpdatedAt).toLocaleString()}`, "muted"),
      paragraph(`${view.members.length} members · ${view.proposals.length} proposals · ${view.unavailable.length} unavailable`, "muted")
    );
    article.append(meta);

    const pageActions = document.createElement("div");
    pageActions.className = "page-actions";
    pageActions.append(
      link("← Dashboard", "/demo/", "button ghost"),
      button("Refresh", () => {
        refreshRevision(revision);
        renderDashPage(dashId);
      }, "button primary"),
      button("Edit", () => editDash(revision), "button ghost"),
      button("Delete Dash", () => deleteDash(revision), "button ghost danger")
    );
    resultPage.append(pageActions, article);

    const members = document.createElement("section");
    members.className = "dash-section";
    const membersTitle = document.createElement("h2");
    membersTitle.textContent = "Results";
    members.append(membersTitle);
    if (!view.members.length) members.append(paragraph("No accessible accepted Results.", "muted"));
    else if (renderMemberGallery) {
      renderMemberGallery({
        container: members,
        dashId: revision.dashId,
        members: view.members,
        createMemberNode: (member) => memberNode(member, revision.dashId)
      });
    } else {
      for (const member of view.members) members.append(memberNode(member, revision.dashId));
    }
    article.append(members);

    if (view.proposals.length) {
      const proposals = document.createElement("section");
      proposals.className = "dash-section dash-proposals";
      const heading = document.createElement("h2");
      heading.textContent = "New proposals";
      proposals.append(heading, paragraph("Review these before they join the Dash.", "muted"));
      for (const proposal of view.proposals) proposals.append(proposalNode(proposal, revision.dashId));
      article.append(proposals);
    }

    if (view.excludedResultIds.length) {
      const excluded = document.createElement("section");
      excluded.className = "dash-section";
      const heading = document.createElement("h2");
      heading.textContent = "Excluded";
      excluded.append(heading);
      const byId = new Map(getResults()
        .filter((result) => isResultEligible(result, revision.scope || {}))
        .map((result) => [result.id, result]));
      for (const resultId of view.excludedResultIds) {
        const row = document.createElement("div");
        row.className = "dash-excluded-row";
        row.append(paragraph(byId.get(resultId)?.title || "Unavailable Result", "muted"), button("Restore", () => updateOverride(revision.dashId, "dash.exclude", resultId, false), "button small ghost"));
        excluded.append(row);
      }
      article.append(excluded);
    }

    const manual = document.createElement("section");
    manual.className = "dash-section dash-manual-add";
    const manualTitle = document.createElement("h2");
    manualTitle.textContent = "Add Result manually";
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Result to add manually");
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "Choose a Result…";
    select.append(emptyOption);
    const includedIds = new Set(view.members.map((member) => member.result.id));
    for (const result of getResults().filter((item) => isResultEligible(item, revision.scope || {}) && !includedIds.has(item.id))) {
      const option = document.createElement("option");
      option.value = result.id;
      option.textContent = result.title;
      select.append(option);
    }
    manual.append(manualTitle, select, button("Add", () => addManualResult(revision, select), "button primary"));
    article.append(manual);

    if (view.unavailable.length) article.append(paragraph(`${view.unavailable.length} saved reference${view.unavailable.length === 1 ? " is" : "s are"} currently unavailable. DashGPT did not retain or display their content.`, "dash-unavailable"));
    if (view.relatedDashes.length) {
      const related = document.createElement("section");
      related.className = "dash-section";
      const heading = document.createElement("h2");
      heading.textContent = "Related Dashes";
      related.append(heading);
      for (const item of view.relatedDashes) related.append(link(item.title, `/demo/dashes/${encodeURIComponent(item.dashId)}/`, "button small ghost"));
      article.append(related);
    }
  }

  function showDashboard() {
    releaseMemberGallery();
    dashboardView.hidden = false;
    resultPage.hidden = true;
    resultPage.classList.remove("dash-gallery-page");
    addResultButton.hidden = false;
    renderList();
  }

  function importFromHash() {
    const match = window.location.hash.match(/^#dash-import=(.+)$/);
    if (!match) return false;
    try {
      const payload = JSON.parse(decodeBase64Url(match[1]));
      const revision = createDashRevision({ ...payload, dashId: "temporary", dashRevisionId: "temporary" }, {
        now: new Date().toISOString(),
        dashId: "temporary",
        dashRevisionId: "temporary"
      });
      const view = materializeDash(revision, [], getResults(), { temporary: true, allDashRevisions: getVault().dashRevisions || [] });
      showDashboard();
      feedback.textContent = "Dash prepared by ChatGPT. Review it before saving.";
      renderPreview(view);
      history.replaceState({}, "", `${location.pathname}${location.search}`);
      return true;
    } catch (error) {
      feedback.textContent = `Dash import failed: ${error.message}`;
      return false;
    }
  }

  topicButton?.addEventListener("click", handleTopic);
  topicInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleTopic();
    }
  });
  window.addEventListener("popstate", () => {
    const id = dashRouteId();
    if (id) renderDashPage(id);
    else showDashboard();
  });

  return {
    routeDashId: dashRouteId,
    renderList,
    renderDashPage,
    importFromHash,
    showDashboard
  };
}
