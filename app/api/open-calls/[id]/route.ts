import { NextResponse } from "next/server";
import { getOpenCallById } from "@/app/data/openCalls";
import { getOpenCallValidationMap } from "@/lib/openCallValidation";

function shouldHideByValidation(validation?: { status?: string; reason?: string | null }) {
  if (!validation || validation.status !== "invalid") return false;
  const reason = String(validation.reason || "").toLowerCase();
  if (reason === "missing_or_invalid_url") return true;
  if (reason.startsWith("http_")) return true;
  return false;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const openCall = await getOpenCallById(params.id);
    if (!openCall) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (openCall.isExternal) {
      try {
        const validationMap = await getOpenCallValidationMap([openCall.id]);
        const validation = validationMap.get(openCall.id);
        if (shouldHideByValidation(validation)) {
          return NextResponse.json({ error: "not found" }, { status: 404 });
        }
      } catch (validationError) {
        // Validation infra should never block open call detail rendering.
        console.error("open-call validation check failed (non-blocking):", validationError);
      }
    }
    return NextResponse.json({ openCall });
  } catch (e) {
    console.error("GET /api/open-calls/[id] failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}