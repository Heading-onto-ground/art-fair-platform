import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SEOUL_SPACES = [
  "Independent Space Seoul",
  "Project Space Seoul",
  "Space 55",
  "Gallery Hyundai",
  "Kukje Gallery",
  "National Museum of Modern and Contemporary Art",
  "MMCA",
  "Arario Museum",
  "Platform-L",
  "Alternative Space Loop",
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim().toLowerCase();

    if (q.length >= 2) {
      const dbSpaces = await prisma.space.findMany({
        take: 20,
        select: { id: true, name: true, city: true, country: true },
      });
      type SpaceRow = { id: string; name: string; city: string | null; country: string | null };
      const dbNames = new Set(dbSpaces.map((s: SpaceRow) => s.name));
      const filtered = dbSpaces.filter(
        (s: SpaceRow) =>
          s.name.toLowerCase().includes(q) ||
          (s.city?.toLowerCase().includes(q)) ||
          (s.country?.toLowerCase().includes(q))
      );
      const suggested = SEOUL_SPACES.filter((s) => s.toLowerCase().includes(q) && !dbNames.has(s));
      const combined = [
        ...filtered.map((s: SpaceRow) => ({ id: s.id, name: s.name, city: s.city, country: s.country })),
        ...suggested.map((name: string) => ({ id: "", name, city: "Seoul", country: "Korea" })),
      ].slice(0, 12);
      return NextResponse.json({ spaces: combined });
    }

    const spaces = await prisma.space.findMany({
      include: { _count: { select: { exhibitions: true } } },
    });
    const sorted = spaces.sort((a: { _count: { exhibitions: number } }, b: { _count: { exhibitions: number } }) => b._count.exhibitions - a._count.exhibitions);
    return NextResponse.json({ spaces: sorted.map((s: { id: string; name: string; type: string | null; city: string | null; country: string | null; _count: { exhibitions: number } }) => ({ id: s.id, name: s.name, type: s.type, city: s.city, country: s.country, exhibitionCount: s._count.exhibitions })) });
  } catch {
    return NextResponse.json({ spaces: [] });
  }
}
