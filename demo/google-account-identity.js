const DRIVE_ABOUT_URL = "https://www.googleapis.com/drive/v3/about";

function requireToken(token) {
  const value = String(token || "").trim();
  if (!value) {
    const error = new Error("Google authorization is required to read account identity.");
    error.code = "google_reconnect_required";
    throw error;
  }
  return value;
}

function cleanText(value, max = 320) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function identityError(status, payload = null) {
  const error = new Error(payload?.error?.message || "Google account identity request failed.");
  error.status = Number(status || 0);
  if (error.status === 401) error.code = "google_reconnect_required";
  else if (error.status === 429) error.code = "google_drive_rate_limited";
  else if (error.status >= 500) error.code = "google_drive_unavailable";
  else error.code = "google_account_identity_unavailable";
  return error;
}

export function sanitizeGoogleAccountIdentity(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const displayName = cleanText(input.displayName, 160);
  const emailAddress = cleanText(input.emailAddress, 320);
  const photoLink = cleanText(input.photoLink, 2048);
  const identity = {
    displayName,
    emailAddress,
    photoLink,
    me: input.me === true
  };
  if (!identity.displayName && !identity.emailAddress) return null;
  return identity;
}

export async function loadGoogleDriveAccountIdentity({ token, fetchFn = fetch } = {}) {
  const url = new URL(DRIVE_ABOUT_URL);
  url.searchParams.set("fields", "user(displayName,emailAddress,photoLink,me)");
  const response = await fetchFn(url.toString(), {
    headers: {
      authorization: `Bearer ${requireToken(token)}`,
      accept: "application/json"
    }
  });
  let payload = null;
  try { payload = await response.json(); } catch {}
  if (!response.ok) throw identityError(response.status, payload);
  return sanitizeGoogleAccountIdentity(payload?.user);
}

export function formatGoogleAccountIdentity(identity) {
  const clean = sanitizeGoogleAccountIdentity(identity);
  if (!clean) return "";
  if (clean.displayName && clean.emailAddress) return `${clean.displayName} · ${clean.emailAddress}`;
  return clean.emailAddress || clean.displayName;
}
