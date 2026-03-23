/**
 * API configuration.
 * Set EXPO_PUBLIC_API_URL in .env or app.config.js for production.
 */

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://art-fair-platform.vercel.app";

/** Web profile V2 URL (Hero, Timeline, Network, Add Exhibition) */
export function getArtistProfileUrl(artistId: string): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  return `${base}/artist/public/${artistId}`;
}
