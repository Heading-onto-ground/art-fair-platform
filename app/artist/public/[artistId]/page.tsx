import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ArtistPublicClient from "./ArtistPublicClient";

const BASE_URL = "https://rob-roleofbridge.com";

async function getArtistName(artistId: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT name, "exhibitions_public" FROM "ArtistProfile" WHERE "artistId" = $1 LIMIT 1`,
      artistId
    ) as any[];
    const row = rows[0];
    return row?.exhibitions_public ? (row.name ?? null) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: { artistId: string } }
): Promise<Metadata> {
  const name = await getArtistName(params.artistId);
  const title = name
    ? `${name} | Exhibition History | ROB`
    : "Exhibition History | ROB";
  const description = "Verified exhibitions on Role of Bridge (ROB).";
  const url = `${BASE_URL}/artist/public/${params.artistId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url,
      images: [{ url: `${BASE_URL}/og/rob-exhibition.png` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE_URL}/og/rob-exhibition.png`],
    },
  };
}

export default function ArtistPublicPage() {
  return <ArtistPublicClient />;
}
