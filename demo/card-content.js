const PROVIDER_MARKER_PATTERN = /[^\r\n]{0,320}/g;
const PROVIDER_MARKER_EDGE_PATTERN = /[]/g;
const HEADING_PATTERN = /^\s*(#{1,6})\s+(.+?)\s*$/;
const UL_PATTERN = /^\s*[-+*]\s+(.+?)\s*$/;
const OL_PATTERN = /^\s*\d+[.)]\s+(.+?)\s*$/;

const DECISION_LABELS = new Set([
  "decision",
  "decisions",
  "решение",
  "решения",
  "что решили",
  "принятые решения"
]);
const NEXT_LABELS = new Set([
  "next",
  "next step",
  "next steps",
  "следующий шаг",
  "следующие шаги",
  "что дальше",
  "дальше"
]);

export function stripProviderMarkers(value) {
  return String(value ?? "")
    .replace(PROVIDER_MARKER_PATTERN, "")
    .replace(PROVIDER_MARKER_EDGE_PATTERN, "");
}

export function normalizeRichCardText(value, { maxLength = 5000 } = {}) {
  let text = stripProviderMarkers(value)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(line => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return "";
  if (Number.isFinite(maxLength) && maxLength > 0 && text.length > maxLength) {
    text = `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
  }
  return text;
}

function normalizedSectionLabel(line) {
  let label = String(line || "").trim();
  const heading = label.match(HEADING_PATTERN);
  if (heading) label = heading[2].trim();
  if ((label.startsWith("**") && label.endsWith("**")) || (label.startsWith("__") && label.endsWith("__"))) {
    label = label.slice(2, -2).trim();
  }
  label = label.replace(/:\s*$/, "").trim().toLocaleLowerCase();
  return label;
}

function sectionKind(line) {
  const label = normalizedSectionLabel(line);
  if (DECISION_LABELS.has(label)) return "decisions";
  if (NEXT_LABELS.has(label)) return "next";
  return "";
}

function isHeading(line) {
  return HEADING_PATTERN.test(String(line || ""));
}

function cleanStructuredItem(value, maxLength = 500) {
  const text = normalizeRichCardText(value, { maxLength })
    .replace(/^\s*(?:[-+*]|\d+[.)])\s+/, "")
    .trim();
  return text;
}

function decisionItems(lines) {
  const items = [];
  const seen = new Set();
  let paragraph = [];
  const flushParagraph = () => {
    if (!paragraph.length) return;
    const item = cleanStructuredItem(paragraph.join(" "));
    paragraph = [];
    if (!item) return;
    const key = item.toLocaleLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }
    if (UL_PATTERN.test(line) || OL_PATTERN.test(line)) {
      flushParagraph();
      const item = cleanStructuredItem(line);
      if (!item) continue;
      const key = item.toLocaleLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        items.push(item);
      }
      if (items.length >= 12) break;
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  return items.slice(0, 12);
}

function nextText(lines) {
  const cleaned = lines.map(line => line.trim()).filter(Boolean);
  if (!cleaned.length) return "";
  if (cleaned.length === 1) return cleanStructuredItem(cleaned[0], 1000);
  return normalizeRichCardText(cleaned.join("\n"), { maxLength: 1000 });
}

export function projectSharedReply(value, { maxLength = 5000 } = {}) {
  const original = normalizeRichCardText(value, { maxLength });
  if (!original) return { summary: "", decisions: [], next: "" };

  const lines = original.split("\n");
  const sections = [];
  for (let index = 0; index < lines.length; index += 1) {
    const kind = sectionKind(lines[index]);
    if (!kind) continue;
    let end = index + 1;
    while (end < lines.length) {
      if (sectionKind(lines[end]) || isHeading(lines[end])) break;
      end += 1;
    }
    sections.push({ kind, start: index, end, lines: lines.slice(index + 1, end) });
    index = end - 1;
  }

  if (!sections.length) return { summary: original, decisions: [], next: "" };

  const removed = new Set();
  let decisions = [];
  let next = "";
  for (const section of sections) {
    for (let index = section.start; index < section.end; index += 1) removed.add(index);
    if (section.kind === "decisions" && !decisions.length) decisions = decisionItems(section.lines);
    if (section.kind === "next" && !next) next = nextText(section.lines);
  }

  const summary = normalizeRichCardText(
    lines.filter((_, index) => !removed.has(index)).join("\n"),
    { maxLength }
  );

  if (!summary) return { summary: original, decisions: [], next: "" };
  return { summary, decisions, next };
}

function safeWebUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function linkTargetEnd(text, start) {
  let depth = 1;
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === "(") depth += 1;
    else if (text[index] === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function pushText(tokens, text) {
  if (!text) return;
  const previous = tokens.at(-1);
  if (previous?.type === "text") previous.text += text;
  else tokens.push({ type: "text", text });
}

export function parseCardInline(value) {
  const text = String(value ?? "");
  const tokens = [];
  let index = 0;

  while (index < text.length) {
    if (text[index] === "`") {
      const end = text.indexOf("`", index + 1);
      if (end > index + 1) {
        tokens.push({ type: "code", text: text.slice(index + 1, end) });
        index = end + 1;
        continue;
      }
    }

    if (text[index] === "[") {
      const labelEnd = text.indexOf("](", index + 1);
      if (labelEnd > index + 1) {
        const hrefStart = labelEnd + 2;
        const hrefEnd = linkTargetEnd(text, hrefStart);
        if (hrefEnd > hrefStart) {
          const label = text.slice(index + 1, labelEnd);
          const href = safeWebUrl(text.slice(hrefStart, hrefEnd));
          if (href) tokens.push({ type: "link", href, children: parseCardInline(label) });
          else tokens.push(...parseCardInline(label));
          index = hrefEnd + 1;
          continue;
        }
      }
    }

    const strongMarker = text.startsWith("**", index) ? "**" : text.startsWith("__", index) ? "__" : "";
    if (strongMarker) {
      const end = text.indexOf(strongMarker, index + 2);
      if (end > index + 2) {
        tokens.push({ type: "strong", children: parseCardInline(text.slice(index + 2, end)) });
        index = end + 2;
        continue;
      }
    }

    const marker = text[index];
    if ((marker === "*" || marker === "_") && text[index + 1] !== marker) {
      const end = text.indexOf(marker, index + 1);
      if (end > index + 1) {
        tokens.push({ type: "em", children: parseCardInline(text.slice(index + 1, end)) });
        index = end + 1;
        continue;
      }
    }

    let next = index + 1;
    while (next < text.length && !"`[*_".includes(text[next])) next += 1;
    pushText(tokens, text.slice(index, next));
    index = next;
  }

  return tokens;
}

export function parseCardRichText(value) {
  const text = normalizeRichCardText(value);
  if (!text) return [];
  const lines = text.split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(HEADING_PATTERN);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, children: parseCardInline(heading[2]) });
      index += 1;
      continue;
    }

    const unordered = line.match(UL_PATTERN);
    if (unordered) {
      const items = [];
      while (index < lines.length) {
        const match = lines[index].match(UL_PATTERN);
        if (!match) break;
        items.push(parseCardInline(match[1]));
        index += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    const ordered = line.match(OL_PATTERN);
    if (ordered) {
      const items = [];
      while (index < lines.length) {
        const match = lines[index].match(OL_PATTERN);
        if (!match) break;
        items.push(parseCardInline(match[1]));
        index += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !HEADING_PATTERN.test(lines[index]) && !UL_PATTERN.test(lines[index]) && !OL_PATTERN.test(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", children: parseCardInline(paragraph.join(" ")) });
  }

  return blocks;
}

function appendInline(parent, tokens) {
  for (const token of tokens) {
    if (token.type === "text") {
      parent.append(document.createTextNode(token.text));
      continue;
    }
    if (token.type === "code") {
      const code = document.createElement("code");
      code.textContent = token.text;
      parent.append(code);
      continue;
    }
    if (token.type === "link") {
      const link = document.createElement("a");
      link.href = token.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      appendInline(link, token.children || []);
      parent.append(link);
      continue;
    }
    const node = document.createElement(token.type === "strong" ? "strong" : "em");
    appendInline(node, token.children || []);
    parent.append(node);
  }
}

export function renderCardRichText(value, { className = "card-rich-text" } = {}) {
  const root = document.createElement("div");
  root.className = className;
  const blocks = parseCardRichText(value);

  for (const block of blocks) {
    if (block.type === "heading") {
      const heading = document.createElement(block.level <= 2 ? "h3" : "h4");
      heading.className = "card-rich-heading";
      appendInline(heading, block.children || []);
      root.append(heading);
      continue;
    }
    if (block.type === "ul" || block.type === "ol") {
      const list = document.createElement(block.type);
      for (const item of block.items || []) {
        const li = document.createElement("li");
        appendInline(li, item);
        list.append(li);
      }
      root.append(list);
      continue;
    }
    const paragraph = document.createElement("p");
    appendInline(paragraph, block.children || []);
    root.append(paragraph);
  }

  return root;
}
