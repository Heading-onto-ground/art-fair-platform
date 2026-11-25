import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicImageSources } from "@/lib/artist/publicProfile";

export const dynamic = "force-dynamic";

function decodeDataUri(dataUri: string): { mime: string; bytes: Buffer } | null {
  if (!dataUri.startsWith("data:")) return null;
  const comma = dataUri.indexOf(",");
  if (comma < 0) return null;
  const meta = dataUri.slice(5, comma);
  const payload = dataUri.slice(comma + 1);
  const mime = (meta.split(";")[0] || "application/octet-stream").toLowerCase();
  const isBase64 = meta.toLowerCase().includes("base64");
  try {
    const bytes = isBase64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
    return { mime, bytes };
  } catch {
    return null;
  }
}

const PRIVATE_CACHE = "private, no-store";

function imageResponse(value: string) {
  if (value.startsWith("data:")) {
    const decoded = decodeDataUri(value);
    if (!decoded) return NextResponse.json({ error: "invalid image" }, { status: 400, headers: { "Cache-Control": PRIVATE_CACHE } });
    return new NextResponse(new Uint8Array(decoded.bytes), {
      status: 200,
      headers: {
        "Content-Type": decoded.mime.startsWith("image/") ? decoded.mime : "image/jpeg",
        "Cache-Control": PRIVATE_CACHE,
      },
    });
  }
  if (value.startsWith("https://") || value.startsWith("http://")) {
    return NextResponse.redirect(value, { status: 302, headers: { "Cache-Control": PRIVATE_CACHE } });
  }
  return NextResponse.json({ error: "not found" }, { status: 404, headers: { "Cache-Control": PRIVATE_CACHE } });
}

function imageIndex(value: string | null): number | null {
  if (!value) return 0;
  if (!/^\d+$/.test(value)) return null;
  return Number(value);
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const index = imageIndex(new URL(req.url).searchParams.get("i"));
  if (index === null) return NextResponse.json({ error: "not found" }, { status: 404, headers: { "Cache-Control": PRIVATE_CACHE } });
  const artwork = await prisma.artwork.findFirst({
    where: { id: params.id, isPublic: true },
    select: {
      imageUrl: true,
      images: { select: { url: true }, orderBy: { position: "asc" } },
    },
  }).catch(() => null);
  if (!artwork) return NextResponse.json({ error: "not found" }, { status: 404, headers: { "Cache-Control": PRIVATE_CACHE } });
  const source = publicImageSources(artwork.imageUrl, artwork.images)[index] || "";
  if (!source) return NextResponse.json({ error: "not found" }, { status: 404, headers: { "Cache-Control": PRIVATE_CACHE } });
  return imageResponse(source);
}
