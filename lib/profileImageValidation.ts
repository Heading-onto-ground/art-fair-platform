/** Max base64 data-URI length (~600KB original). Matches /api/profile/image. */
export const MAX_PROFILE_IMAGE_DATA_URI_LENGTH = 800 * 1024;

export function validateProfileImageInput(
  value: unknown,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === null || value === "") {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, error: "invalid profile image" };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (trimmed.length > 2048) {
      return { ok: false, error: "profile image URL too long" };
    }
    return { ok: true, value: trimmed };
  }

  if (!trimmed.startsWith("data:image/")) {
    return { ok: false, error: "invalid image format" };
  }
  if (trimmed.length > MAX_PROFILE_IMAGE_DATA_URI_LENGTH) {
    return { ok: false, error: "Image too large. Please use a smaller image (max ~500KB)." };
  }

  return { ok: true, value: trimmed };
}
