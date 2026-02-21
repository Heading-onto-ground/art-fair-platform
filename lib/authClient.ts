export type Role = "artist" | "gallery";

export type MeResponse = {
  session: { userId: string; role: Role; email?: string } | null;
  profile: any | null;
};

const ME_CACHE_KEY = "afp_me_cache_v1";
const ME_CACHE_TTL_MS = 20_000;

function readCachedMe() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: MeResponse | null };
    if (!parsed?.ts) return null;
    if (Date.now() - parsed.ts > ME_CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCachedMe(data: MeResponse | null) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ME_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore cache write failure
  }
}

export async function fetchMe(options?: { preferCache?: boolean }): Promise<MeResponse | null> {
  if (options?.preferCache !== false) {
    const cached = readCachedMe();
    if (cached) return cached;
  }
  try {
    const res = await fetch("/api/auth/me?lite=1", {
      cache: "default",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as MeResponse | null;
    writeCachedMe(data);
    return data;
  } catch {
    return null;
  }
}