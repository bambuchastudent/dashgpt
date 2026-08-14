const encoder = new TextEncoder();

function stableCompare(left, right) {
  return String(left || "").localeCompare(String(right || ""));
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function shortText(value, maximum = 280) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > maximum ? `${text.slice(0, maximum - 1).trimEnd()}…` : text;
}

function safeHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function list(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item !== undefined && item !== null);
}

function relationTarget(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  return value.resultId || value.cardId || value.id || value.to || value.targetId || null;
}

function relationKind(value) {
  if (!value || typeof value !== "object") return "related";
  return shortText(value.kind || value.type || value.relationship || "related", 40) || "related";
}

function projectCard(result) {
  return {
    id: String(result.id),
    title: String(result.title || result.id),
    summary: shortText(result.summary, 500),
    goal: clone(result.goal),
    currentState: clone(result.currentState),
    category: result.category ? String(result.category) : "",
    tags: list(result.tags).map(String),
    decisions: clone(list(result.decisions)),
    facts: clone(list(result.facts)),
    constraints: clone(list(result.constraints)),
    userPreferences: clone(list(result.userPreferences)),
    openQuestions: clone(list(result.openQuestions)),
    next: clone(result.next ?? result.suggestedNextStep),
    suggestedNextStep: clone(result.suggestedNextStep),
    links: clone(list(result.links)),
    relatedMaterials: clone(list(result.relatedMaterials)),
    relatedResults: clone(list(result.relatedResults)),
    source: result.source && typeof result.source === "object" ? {
      type: result.source.type ? String(result.source.type) : undefined,
      provider: result.source.provider ? String(result.source.provider) : undefined,
      sourceId: result.source.sourceId ? String(result.source.sourceId) : undefined,
      title: result.source.title ? String(result.source.title) : undefined,
      url: safeHttpUrl(result.source.url) || undefined
    } : undefined,
    contentVersion: result.contentVersion === undefined ? undefined : Number(result.contentVersion),
    contentHash: typeof result.contentHash === "string" ? result.contentHash : undefined
  };
}

export function projectRelations(cards) {
  const ids = new Set(cards.map(card => card.id));
  const relations = [];
  const seen = new Set();
  for (const card of cards) {
    for (const raw of list(card.relatedResults)) {
      const target = relationTarget(raw);
      if (!target || !ids.has(String(target)) || String(target) === card.id) continue;
      const kind = relationKind(raw);
      const key = `${card.id}\u0000${String(target)}\u0000${kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      relations.push({ from: card.id, to: String(target), kind });
    }
  }
  return relations.sort((a, b) => stableCompare(a.from, b.from) || stableCompare(a.to, b.to) || stableCompare(a.kind, b.kind));
}

export function buildProjectModel(vault, dashView) {
  if (!vault || typeof vault.vaultId !== "string") throw new Error("Project memory requires a valid Vault");
  if (!dashView || typeof dashView.dashId !== "string") throw new Error("Project memory requires a saved Dash");
  const cards = (dashView.members || []).map(member => projectCard(member.result));
  const byId = new Map(cards.map(card => [card.id, card]));
  const orderedCards = (dashView.members || []).map(member => byId.get(String(member.result.id))).filter(Boolean);
  return {
    schemaVersion: 1,
    kind: "dashgpt-project-memory",
    vaultId: vault.vaultId,
    vaultUpdatedAt: String(vault.updatedAt || vault.createdAt || ""),
    dashId: dashView.dashId,
    dashRevisionId: dashView.dashRevisionId,
    dashTitle: String(dashView.title || "DashGPT Project"),
    dashDescription: String(dashView.description || ""),
    dashUpdatedAt: String(dashView.lastUpdatedAt || ""),
    summary: String(dashView.summary || ""),
    cards: orderedCards,
    relations: projectRelations(orderedCards)
  };
}

export function cardFileName(cardId) {
  const bytes = encoder.encode(String(cardId));
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return `card-${hex || "empty"}.md`;
}

function markdownValue(value) {
  if (value === undefined || value === null || value === "") return "";
  if (["string", "number", "boolean"].includes(typeof value)) return String(value).trim();
  if (Array.isArray(value)) {
    return value.map(item => {
      if (["string", "number", "boolean"].includes(typeof item)) return `- ${String(item).trim()}`;
      return `- \`${JSON.stringify(item)}\``;
    }).join("\n");
  }
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

function markdownSection(title, value) {
  const rendered = markdownValue(value);
  return rendered ? `\n## ${title}\n\n${rendered}\n` : "";
}

function safeLinkItems(items) {
  const output = [];
  for (const item of list(items)) {
    if (typeof item === "string") {
      const url = safeHttpUrl(item);
      if (url) output.push({ title: url, url });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const url = safeHttpUrl(item.url || item.href || item.reference);
    if (!url) continue;
    output.push({ title: shortText(item.title || item.label || url, 140), url });
  }
  return output;
}

function cardMarkdown(card, model) {
  const lines = [
    `# ${card.title}`,
    "",
    `> Canonical Card ID: \`${card.id}\``,
    card.category ? `> Category: ${card.category}` : "",
    card.tags.length ? `> Tags: ${card.tags.map(tag => `#${tag}`).join(" ")}` : "",
    ""
  ].filter(line => line !== "");
  let text = `${lines.join("\n")}\n`;
  text += markdownSection("Summary", card.summary);
  text += markdownSection("Goal", card.goal);
  text += markdownSection("Current state", card.currentState);
  text += markdownSection("Decisions", card.decisions);
  text += markdownSection("Facts / context", card.facts);
  text += markdownSection("Constraints", card.constraints);
  text += markdownSection("User preferences", card.userPreferences);
  text += markdownSection("Open questions", card.openQuestions);
  text += markdownSection("Next", card.next || card.suggestedNextStep);

  const related = projectRelations(model.cards).filter(relation => relation.from === card.id);
  if (related.length) {
    text += "\n## Related Cards\n\n";
    for (const relation of related) {
      const target = model.cards.find(item => item.id === relation.to);
      text += `- ${relation.kind}: [${target?.title || relation.to}](./${cardFileName(relation.to)})\n`;
    }
  }

  const links = [...safeLinkItems(card.links), ...safeLinkItems(card.relatedMaterials)];
  if (card.source?.url) links.unshift({ title: card.source.title || "Original source", url: card.source.url });
  if (links.length) {
    text += "\n## References\n\n";
    const seen = new Set();
    for (const item of links) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      text += `- [${item.title}](${item.url})\n`;
    }
  }
  return text.endsWith("\n") ? text : `${text}\n`;
}

function mermaidLabel(value) {
  return shortText(value, 48).replace(/[\[\]{}()"`]/g, " ").replace(/\s+/g, " ").trim() || "Card";
}

function projectMarkdown(model) {
  const lines = [
    `# ${model.dashTitle}`,
    "",
    "> DashGPT project memory. Canonical memory lives in the source Vault; this file mirrors the current saved Dash.",
    "",
    `- Vault: \`${model.vaultId}\``,
    `- Dash: \`${model.dashId}\``,
    `- Dash revision: \`${model.dashRevisionId}\``,
    model.dashUpdatedAt ? `- Source updated: ${model.dashUpdatedAt}` : "",
    `- Cards: ${model.cards.length}`,
    ""
  ].filter(Boolean);
  if (model.dashDescription) lines.push(model.dashDescription, "");
  if (model.summary) lines.push("## Project summary", "", model.summary, "");
  lines.push("## Current memory", "");
  if (!model.cards.length) lines.push("No current Cards in this saved Dash.", "");
  for (const card of model.cards) {
    const cues = [shortText(card.currentState, 120), shortText(card.next || card.suggestedNextStep, 120)].filter(Boolean).join(" · ");
    const suffix = [card.summary, cues].filter(Boolean).join(" — ");
    lines.push(`- [${card.title}](cards/${cardFileName(card.id)})${suffix ? ` — ${suffix}` : ""}`);
  }
  if (model.cards.length) {
    lines.push("", "## Memory map", "", "```mermaid", "flowchart LR");
    model.cards.forEach((card, index) => lines.push(`  c${index}["${mermaidLabel(card.title)}"]`));
    const indexById = new Map(model.cards.map((card, index) => [card.id, index]));
    for (const relation of model.relations) lines.push(`  c${indexById.get(relation.from)} -->|${mermaidLabel(relation.kind)}| c${indexById.get(relation.to)}`);
    lines.push("```", "");
  }
  lines.push("## Refresh", "", "Regenerate this `.dashgpt` snapshot from the same saved Dash in DashGPT. Editing these generated files does not write back to the Vault.", "");
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}

function readmeMarkdown() {
  return `# .dashgpt\n\nThis folder is generated project memory from DashGPT.\n\n- Start with [project.md](./project.md).\n- Detailed canonical Card snapshots are under [cards/](./cards/).\n- The DashGPT Vault remains the source of truth.\n- Regenerate this folder from the saved Dash to refresh it.\n- Review memory before committing it to a shared or public repository.\n`;
}

export function buildProjectFiles(model) {
  const cards = model.cards.map(card => ({
    id: card.id,
    path: `.dashgpt/cards/${cardFileName(card.id)}`,
    ...(card.contentVersion === undefined ? {} : { contentVersion: card.contentVersion }),
    ...(card.contentHash ? { contentHash: card.contentHash } : {})
  }));
  const manifest = {
    schemaVersion: 1,
    kind: "dashgpt-project-memory",
    vaultId: model.vaultId,
    vaultUpdatedAt: model.vaultUpdatedAt,
    dashId: model.dashId,
    dashRevisionId: model.dashRevisionId,
    dashTitle: model.dashTitle,
    dashUpdatedAt: model.dashUpdatedAt,
    cards
  };
  const files = [
    { path: ".dashgpt/README.md", content: readmeMarkdown() },
    { path: ".dashgpt/manifest.json", content: `${JSON.stringify(manifest, null, 2)}\n` },
    { path: ".dashgpt/project.md", content: projectMarkdown(model) }
  ];
  for (const card of model.cards) files.push({ path: `.dashgpt/cards/${cardFileName(card.id)}`, content: cardMarkdown(card, model) });
  return files.sort((a, b) => stableCompare(a.path, b.path));
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    table[n] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(view, offset, value) { view.setUint16(offset, value, true); }
function u32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }

export function buildProjectZip(files) {
  const entries = files.slice().sort((a, b) => stableCompare(a.path, b.path)).map(file => ({
    path: String(file.path),
    name: encoder.encode(String(file.path)),
    bytes: encoder.encode(String(file.content)),
  }));
  if (entries.length > 65535) throw new Error("Too many project-memory files");
  let localSize = 0;
  let centralSize = 0;
  for (const entry of entries) {
    if (entry.name.length > 65535 || entry.bytes.length > 0xffffffff) throw new Error("Project-memory file is too large");
    entry.crc = crc32(entry.bytes);
    entry.localOffset = localSize;
    localSize += 30 + entry.name.length + entry.bytes.length;
    centralSize += 46 + entry.name.length;
  }
  const output = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(output.buffer);
  let offset = 0;
  for (const entry of entries) {
    u32(view, offset, 0x04034b50); u16(view, offset + 4, 20); u16(view, offset + 6, 0x0800); u16(view, offset + 8, 0);
    u16(view, offset + 10, 0); u16(view, offset + 12, 0x0021); u32(view, offset + 14, entry.crc);
    u32(view, offset + 18, entry.bytes.length); u32(view, offset + 22, entry.bytes.length); u16(view, offset + 26, entry.name.length); u16(view, offset + 28, 0);
    output.set(entry.name, offset + 30); output.set(entry.bytes, offset + 30 + entry.name.length);
    offset += 30 + entry.name.length + entry.bytes.length;
  }
  const centralOffset = offset;
  for (const entry of entries) {
    u32(view, offset, 0x02014b50); u16(view, offset + 4, 20); u16(view, offset + 6, 20); u16(view, offset + 8, 0x0800); u16(view, offset + 10, 0);
    u16(view, offset + 12, 0); u16(view, offset + 14, 0x0021); u32(view, offset + 16, entry.crc); u32(view, offset + 20, entry.bytes.length); u32(view, offset + 24, entry.bytes.length);
    u16(view, offset + 28, entry.name.length); u16(view, offset + 30, 0); u16(view, offset + 32, 0); u16(view, offset + 34, 0); u16(view, offset + 36, 0); u32(view, offset + 38, 0); u32(view, offset + 42, entry.localOffset);
    output.set(entry.name, offset + 46); offset += 46 + entry.name.length;
  }
  u32(view, offset, 0x06054b50); u16(view, offset + 4, 0); u16(view, offset + 6, 0); u16(view, offset + 8, entries.length); u16(view, offset + 10, entries.length);
  u32(view, offset + 12, centralSize); u32(view, offset + 16, centralOffset); u16(view, offset + 20, 0);
  return output;
}

export function projectArchiveName(title) {
  const stem = String(title || "dashgpt-project-memory").normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 80);
  return `${stem || "dashgpt-project-memory"}.dashgpt.zip`;
}
