type ResolveGalleryContactEmailInput = {
  name?: string;
  explicit?: string;
  website?: string;
  fallback?: string;
};

const EMAIL_NOT_FOUND_LABEL = "이메일 확인 불가";

function normalizeText(input: string) {
  return String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hostFromUrl(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase().trim();
  } catch {
    return "";
  }
}

function isValidEmail(input: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input || "").trim());
}

function isPlaceholderGalleryArtEmail(input?: string) {
  const email = String(input || "").trim().toLowerCase();
  return (
    email.endsWith("@gallery.art") ||
    email.endsWith("@rob.art") ||
    email.endsWith("@rob-roleofbridge.com") ||
    email.endsWith("@invalid.local")
  );
}

const EMAIL_BY_NORMALIZED_NAME: Record<string, string> = {
  "the modern institute": "mail@themoderninstitute.com",
  "regen projects": "office@regenprojects.com",
  "galerie max hetzler": "info@maxhetzler.com",
  "gio marconi": "info@giomarconi.com",
  "von bartha": "info@vonbartha.com",
};

const EMAIL_BY_HOST: Record<string, string> = {
  "themoderninstitute.com": "mail@themoderninstitute.com",
  "regenprojects.com": "office@regenprojects.com",
  "maxhetzler.com": "info@maxhetzler.com",
  "giomarconi.com": "info@giomarconi.com",
  "vonbartha.com": "info@vonbartha.com",
};

function pickIfUsable(email?: string) {
  const value = String(email || "").trim().toLowerCase();
  if (!isValidEmail(value)) return "";
  if (isPlaceholderGalleryArtEmail(value)) return "";
  return value;
}

export function resolveGalleryContactEmail(input: ResolveGalleryContactEmailInput) {
  const explicit = pickIfUsable(input.explicit);
  if (explicit) return explicit;

  const normalizedName = normalizeText(input.name || "");
  if (normalizedName && EMAIL_BY_NORMALIZED_NAME[normalizedName]) {
    return EMAIL_BY_NORMALIZED_NAME[normalizedName];
  }

  const host = hostFromUrl(input.website);
  if (host && EMAIL_BY_HOST[host]) {
    return EMAIL_BY_HOST[host];
  }

  const fallback = pickIfUsable(input.fallback);
  if (fallback) return fallback;

  return EMAIL_NOT_FOUND_LABEL;
}

export function isPlaceholderGalleryEmail(input?: string) {
  return isPlaceholderGalleryArtEmail(input);
}
