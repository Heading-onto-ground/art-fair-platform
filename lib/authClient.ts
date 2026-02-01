export type Role = "artist" | "gallery";

export type MeResponse = {
  session: { userId: string; role: Role; email?: string } | null;
  profile: any | null;
};

export async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as MeResponse | null;
    return data;
  } catch {
    return null;
  }
}