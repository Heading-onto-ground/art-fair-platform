import { NextResponse } from "next/server";
import { getCountryByCode } from "@/lib/countryData";
import { listOpenCalls } from "@/app/data/openCalls";
import { getOpenCallValidationMap, isOpenCallDeadlineActive, shouldHideOpenCallByValidation } from "@/lib/openCallValidation";

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
  let validationMap = new Map<string, { status?: string; reason?: string | null }>();
  try {
    validationMap = await getOpenCallValidationMap(allOpenCalls.map((oc) => oc.id));
  } catch (validationError) {
    console.error("country open-call validation map load failed (non-blocking):", validationError);
  }
  const visibleOpenCalls = allOpenCalls.filter((oc) => {
    if (!isOpenCallDeadlineActive(String(oc.deadline || ""))) return false;
    if (!oc.isExternal) return true;
    return !shouldHideOpenCallByValidation(validationMap.get(oc.id));
  });
  const countryOpenCalls = visibleOpenCalls.filter((oc) => oc.country === country.nameKo);
  const totalOpenCalls = visibleOpenCalls.length;

  return NextResponse.json({
    country,
    openCalls: countryOpenCalls,
    stats: {
      openCallsInCountry: countryOpenCalls.length,
      totalOpenCalls,
      deadlinesSoon: countryOpenCalls.filter((oc) => {
        const d = new Date(`${oc.deadline}T23:59:59Z`).getTime();
        return d >= Date.now() && d <= Date.now() + 30 * 24 * 60 * 60 * 1000;
      }).length,
    },
  });
}
