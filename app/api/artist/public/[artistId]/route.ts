import { NextResponse } from "next/server";
import { loadPublicArtist } from "@/lib/artist/loadPublicArtist";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { artistId: string } }) {
  const data = await loadPublicArtist(params.artistId);
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(data);
}
