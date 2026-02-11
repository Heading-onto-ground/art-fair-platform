/** Strip HTML tags and dangerous characters from user input */
export function sanitizeText(input: string, maxLength = 5000): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim()
    .slice(0, maxLength);
}

/** Sanitize email input */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input.toLowerCase().trim().slice(0, 254);
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Sanitize URL input */
export function sanitizeUrl(input: string): string {
  if (!input || typeof input !== "string") return "";
  const trimmed = input.trim();
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:")) return "";
  return trimmed.slice(0, 2048);
}

