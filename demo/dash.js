(() => {
  const isDashRoute = /^\/demo\/dash\/?$/.test(window.location.pathname);
  if (!isDashRoute) return;

  document.body.classList.add("dash-route");
  document.title = "DASH — DashGPT";

  const shell = document.querySelector(".shell");
  if (!shell) return;

  const page = document.createElement("section");
  page.id = "dashStatusPage";
  page.className = "dash-status-page";
  page.setAttribute("aria-live", "polite");
  page.innerHTML = `
    <div class="dash-page-head">
      <div>
        <p class="eyebrow">PROJECT STATUS</p>
        <h2>DASH</h2>
        <p class="muted">What is happening now, what is done, what comes next, and what is blocked.</p>
      </div>
      <a class="button ghost" href="/demo/">← Results</a>
    </div>
    <div id="dashStatusGrid" class="dash-status-grid">
      <article class="dash-status-card"><p class="muted">Loading project status…</p></article>
    </div>`;
  shell.appendChild(page);

  const clean = (value) => value.replace(/\*\*/g, "").replace(/`/g, "").trim();

  function lineNode(line) {
    const nested = /^\s+-\s+/.test(line);
    const bullet = /^\s*-\s+/.test(line);
    const numbered = /^\s*\d+\.\s+/.test(line);
    const item = document.createElement("div");
    item.className = nested
      ? "dash-line dash-line-nested"
      : bullet || numbered
        ? "dash-line dash-line-item"
        : "dash-line";
    item.textContent = clean(line.replace(/^\s*-\s+/, "").replace(/^\s*\d+\.\s+/, ""));
    return item;
  }

  function sectionCard(section) {
    const card = document.createElement(section.title === "RULES FOR THIS DASH" ? "details" : "article");
    card.className = `dash-status-card dash-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

    if (card.tagName === "DETAILS") {
      const summary = document.createElement("summary");
      summary.textContent = "How this status stays current";
      card.appendChild(summary);
    } else {
      const heading = document.createElement("h3");
      heading.textContent = section.title === "BLOCKERS / EXTERNAL HINGES" ? "BLOCKERS" : section.title;
      card.appendChild(heading);
    }

    const body = document.createElement("div");
    body.className = "dash-card-body";
    (section.lines || []).forEach((line) => body.appendChild(lineNode(line)));
    card.appendChild(body);
    return card;
  }

  fetch("/demo/data/dash.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`DASH returned ${response.status}`);
      return response.json();
    })
    .then((dash) => {
      const grid = document.querySelector("#dashStatusGrid");
      grid.replaceChildren();

      const preferredOrder = ["NOW", "NEXT", "BLOCKERS / EXTERNAL HINGES", "DONE", "RULES FOR THIS DASH"];
      const byTitle = new Map((dash.sections || []).map((section) => [section.title, section]));
      preferredOrder.forEach((title) => {
        const section = byTitle.get(title);
        if (section) grid.appendChild(sectionCard(section));
      });
    })
    .catch((error) => {
      const grid = document.querySelector("#dashStatusGrid");
      grid.replaceChildren();
      const card = document.createElement("article");
      card.className = "dash-status-card";
      const title = document.createElement("h3");
      title.textContent = "Status unavailable";
      const message = document.createElement("p");
      message.className = "muted";
      message.textContent = error instanceof Error ? error.message : "Could not load DASH.";
      card.append(title, message);
      grid.appendChild(card);
    });
})();
