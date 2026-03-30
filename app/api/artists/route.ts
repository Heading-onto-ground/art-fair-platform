import { NextResponse } from "next/server";
import { listArtistProfiles } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(500, Number(url.searchParams.get("limit") ?? "200"));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0"));
  const q = (url.searchParams.get("q")?.trim() ?? "").toLowerCase();

  const all = await listArtistProfiles();
  const filtered = q
    ? all.filter((a) =>
        [a.name, a.genre, a.country, a.city]
          .map((v) => String(v || "").toLowerCase())
          .some((v) => v.includes(q))
      )
    : all;
  const artists = filtered.slice(offset, offset + limit);
  return NextResponse.json({ artists, total: filtered.length });
}
