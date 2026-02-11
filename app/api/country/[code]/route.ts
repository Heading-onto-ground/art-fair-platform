import { NextResponse } from "next/server";
import { getCountryByCode } from "@/lib/countryData";
import { listOpenCalls } from "@/app/data/openCalls";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const { code } = params;
  const country = getCountryByCode(code);

  if (!country) {
    return NextResponse.json({ error: "Country not found" }, { status: 404 });
  }

  const allOpenCalls = await listOpenCalls();
  const countryOpenCalls = allOpenCalls.filter((oc) => oc.country === country.nameKo);
  const totalOpenCalls = allOpenCalls.length;

  return NextResponse.json({
    country,
    openCalls: countryOpenCalls,
    stats: {
      openCallsInCountry: countryOpenCalls.length,
      totalOpenCalls,
      deadlinesSoon: countryOpenCalls.filter((oc) => {
        const d = new Date(oc.deadline).getTime();
        return d > Date.now() && d <= Date.now() + 30 * 24 * 60 * 60 * 1000;
      }).length,
    },
  });
}
