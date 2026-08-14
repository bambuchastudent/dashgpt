import assert from "node:assert/strict";
import { buildProjectFiles, buildProjectModel, buildProjectZip, cardFileName } from "../demo/project-memory.js";

const NOW = "2026-08-14T10:00:00.000Z";
const vault = {
  schemaVersion: 1,
  vaultId: "vault_google_backed",
  createdAt: NOW,
  updatedAt: NOW,
  results: [],
  events: [],
  profileRevisions: [{ profileRevisionId: "secret-profile", email: "alice@example.com" }],
  dashRevisions: [],
  googleBinding: { folderId: "folder-secret", fileId: "file-secret", token: "oauth-secret" }
};

const cardA = {
  id: "card/a",
  title: "Project memory",
  summary: "Keep project context readable by developers and agents.",
  currentState: "Project view and filesystem view use the same Cards.",
  next: "Verify site and IDE stay aligned.",
  category: "Developer Tools",
  tags: ["dashgpt", "memory"],
  decisions: ["Vault remains source of truth"],
  relatedResults: [{ resultId: "card-b", kind: "uses" }],
  contentVersion: 2,
  contentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  source: { type: "chat", provider: "chatgpt", url: "https://chatgpt.com/share/example" }
};
const cardB = {
  id: "card-b",
  title: "Google Vault",
  summary: "Google Drive carries the same Vault between devices.",
  facts: ["Same vaultId on another device"],
  constraints: ["No second Google artifact"],
  openQuestions: ["Future automatic IDE refresh"],
  source: { url: "javascript:alert(1)" }
};
const cardC = { id: "private-other", title: "Unrelated", summary: "Must never enter this project." };

const dashView = {
  dashId: "dash_project",
  dashRevisionId: "dashrev_project_7",
  title: "DashGPT",
  description: "Developer project memory.",
  lastUpdatedAt: NOW,
  summary: "2 accessible Results. Developer project memory.",
  members: [
    { result: cardA, membership: "automatic", score: 1 },
    { result: cardB, membership: "manual", score: .9 }
  ],
  proposals: [{ result: cardC, score: .7 }],
  unavailable: [{ status: "unavailable" }]
};

const model = buildProjectModel(vault, dashView);
assert.equal(model.vaultId, "vault_google_backed");
assert.equal(model.dashId, "dash_project");
assert.deepEqual(model.cards.map(card => card.id), ["card/a", "card-b"]);
assert.deepEqual(model.relations, [{ from: "card/a", to: "card-b", kind: "uses" }]);
assert.equal(cardFileName("card/a"), "card-636172642f61.md");
assert.equal(cardFileName("card-b"), "card-636172642d62.md");

const files = buildProjectFiles(model);
const paths = files.map(file => file.path);
assert.deepEqual(paths, [
  ".dashgpt/README.md",
  `.dashgpt/cards/${cardFileName("card/a")}`,
  `.dashgpt/cards/${cardFileName("card-b")}`,
  ".dashgpt/manifest.json",
  ".dashgpt/project.md"
].sort());
assert(!paths.some(path => path.includes("private-other")));

const manifest = JSON.parse(files.find(file => file.path.endsWith("manifest.json")).content);
assert.equal(manifest.vaultId, vault.vaultId);
assert.equal(manifest.dashId, dashView.dashId);
assert.equal(manifest.dashRevisionId, dashView.dashRevisionId);
assert.deepEqual(manifest.cards.map(card => card.id), ["card/a", "card-b"]);
assert(!JSON.stringify(manifest).includes("alice@example.com"));
assert(!JSON.stringify(manifest).includes("folder-secret"));
assert(!JSON.stringify(manifest).includes("oauth-secret"));

const project = files.find(file => file.path.endsWith("project.md")).content;
assert(project.includes("```mermaid"));
assert(project.includes("Project memory"));
assert(project.includes("Google Vault"));
assert(project.includes("-->|uses|"));
assert(!project.includes("private-other"));

const cardBMarkdown = files.find(file => file.path.endsWith(cardFileName("card-b"))).content;
assert(!cardBMarkdown.includes("javascript:"));
assert(cardBMarkdown.includes("Same vaultId on another device"));

const filesAgain = buildProjectFiles(buildProjectModel(structuredClone(vault), structuredClone(dashView)));
assert.deepEqual(filesAgain, files);
const zipA = buildProjectZip(files);
const zipB = buildProjectZip(filesAgain);
assert.deepEqual(zipB, zipA);

function u16(view, offset) { return view.getUint16(offset, true); }
function u32(view, offset) { return view.getUint32(offset, true); }
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const view = new DataView(zipA.buffer, zipA.byteOffset, zipA.byteLength);
const end = zipA.byteLength - 22;
assert.equal(u32(view, end), 0x06054b50);
const entryCount = u16(view, end + 10);
const centralOffset = u32(view, end + 16);
assert.equal(entryCount, files.length);
const decoder = new TextDecoder();
const centralNames = [];
let offset = centralOffset;
for (let index = 0; index < entryCount; index += 1) {
  assert.equal(u32(view, offset), 0x02014b50);
  const expectedCrc = u32(view, offset + 16);
  const size = u32(view, offset + 24);
  const nameLength = u16(view, offset + 28);
  const extraLength = u16(view, offset + 30);
  const commentLength = u16(view, offset + 32);
  const localOffset = u32(view, offset + 42);
  const name = decoder.decode(zipA.subarray(offset + 46, offset + 46 + nameLength));
  centralNames.push(name);
  assert.equal(u32(view, localOffset), 0x04034b50);
  const localNameLength = u16(view, localOffset + 26);
  const localExtraLength = u16(view, localOffset + 28);
  const dataStart = localOffset + 30 + localNameLength + localExtraLength;
  const bytes = zipA.subarray(dataStart, dataStart + size);
  assert.equal(crc32(bytes), expectedCrc);
  offset += 46 + nameLength + extraLength + commentLength;
}
assert.deepEqual(centralNames, paths);

const changedView = structuredClone(dashView);
changedView.members[0].result.summary = "Changed project memory summary.";
const changedFiles = buildProjectFiles(buildProjectModel(vault, changedView));
assert.deepEqual(changedFiles.map(file => file.path), files.map(file => file.path));
assert.notEqual(
  changedFiles.find(file => file.path.endsWith(cardFileName("card/a"))).content,
  files.find(file => file.path.endsWith(cardFileName("card/a"))).content
);
assert.equal(
  changedFiles.find(file => file.path.endsWith(cardFileName("card-b"))).content,
  files.find(file => file.path.endsWith(cardFileName("card-b"))).content
);

console.log("Project memory projection verified.");
