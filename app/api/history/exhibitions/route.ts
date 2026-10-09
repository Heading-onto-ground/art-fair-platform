import { NextResponse } from "next/server";
import { enforceRateLimit, requireUserSession } from "@/lib/apiGuards";
import { isMissingHistorySchema } from "@/lib/history/schemaError";
import { addArtistExhibition } from "@/lib/history/mutate";

export const dynamic = "force-dynamic";

function optionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "history-add-exhibition", 10, 60_000);
  if (limited) return limited;
  const { session, error } = requireUserSession();
  if (error) return error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.title !== "string") {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  try {
    const result = await addArtistExhibition({
      userId: session.userId,
      artistSlug: typeof body.artistSlug === "string" ? body.artistSlug : null,
      title: body.title,
      precision: typeof body.precision === "string" ? body.precision : "UNKNOWN",
      year: optionalNumber(body.year),
      month: optionalNumber(body.month),
      day: optionalNumber(body.day),
      endYear: optionalNumber(body.endYear),
      endMonth: optionalNumber(body.endMonth),
      endDay: optionalNumber(body.endDay),
      spaceName: typeof body.spaceName === "string" ? body.spaceName : null,
      city: typeof body.city === "string" ? body.city : null,
      country: typeof body.country === "string" ? body.country : null,
      curatorName: typeof body.curatorName === "string" ? body.curatorName : null,
      participantNames: Array.isArray(body.participantNames) ? body.participantNames.filter((name: unknown) => typeof name === "string") : [],
      sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl : null,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ slug: result.slug, publicationStatus: result.publicationStatus });
  } catch (err) {
    if (isMissingHistorySchema(err)) {
      return NextResponse.json({ error: "History records are not available until the schema is applied." }, { status: 503 });
    }
    console.error("add exhibition failed", err);
    return NextResponse.json({ error: "Could not add the exhibition." }, { status: 500 });
  }
}
