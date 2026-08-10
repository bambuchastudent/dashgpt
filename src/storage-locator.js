const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);
const DEFAULT_VAULT_PATH = ".dashgpt";

function normalizeRepo(value) {
  return value.endsWith(".git") ? value.slice(0, -4) : value;
}

function normalizeVaultPath(value = DEFAULT_VAULT_PATH) {
  const raw = String(value || DEFAULT_VAULT_PATH).trim().replace(/^\/+|\/+$/g, "");
  const segments = raw.split("/").filter(Boolean);
  if (!segments.length) return DEFAULT_VAULT_PATH;
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("GitHub storage path cannot contain . or .. segments.");
  }
  const normalized = segments.join("/");
  if (normalized.length > 240) throw new Error("GitHub storage path is too long.");
  return normalized;
}

function validSlug(value) {
  return /^[A-Za-z0-9_.-]+$/.test(value || "");
}

export function resolveStorageLocator(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Expected a valid storage URL.");
  }

  if (url.protocol !== "https:" || !GITHUB_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("This Slice supports HTTPS github.com repository links.");
  }
  if (url.username || url.password) throw new Error("Storage URL must not contain credentials.");

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) throw new Error("Expected https://github.com/OWNER/REPO.");

  const owner = segments[0];
  const repo = normalizeRepo(segments[1]);
  if (!validSlug(owner) || !validSlug(repo)) throw new Error("Invalid GitHub owner or repository name.");

  let ref = null;
  let path = DEFAULT_VAULT_PATH;
  if (segments.length > 2) {
    const mode = segments[2];
    if (mode === "tree") {
      if (!segments[3]) throw new Error("GitHub tree link is missing a branch or ref.");
      ref = decodeURIComponent(segments[3]);
      path = normalizeVaultPath(segments.slice(4).map(decodeURIComponent).join("/") || DEFAULT_VAULT_PATH);
    } else if (mode === "blob") {
      throw new Error("Use a repository or folder URL, not a single file URL.");
    } else {
      throw new Error("Unsupported GitHub repository URL shape.");
    }
  }

  return {
    adapter: "github",
    displayUrl: `https://github.com/${owner}/${repo}${ref ? `/tree/${encodeURIComponent(ref)}/${path.split("/").map(encodeURIComponent).join("/")}` : ""}`,
    provider: "github.com",
    owner,
    repo,
    ref,
    path: normalizeVaultPath(path),
    capabilities: ["read", "write", "sync"]
  };
}

export function locatorKey(locator) {
  if (locator?.adapter !== "github") throw new Error("Unsupported StorageLocator.");
  return `github:${locator.owner.toLowerCase()}/${locator.repo.toLowerCase()}@${locator.ref || "default"}:${locator.path}`;
}

export { DEFAULT_VAULT_PATH };
