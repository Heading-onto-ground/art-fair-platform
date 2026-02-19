import { NextResponse } from "next/server";
import { getOpenCallById } from "@/app/data/openCalls";
import {
  getOpenCallValidationMap,
  isOpenCallDeadlineActive,
  shouldHideOpenCallByValidation,
} from "@/lib/openCallValidation";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const openCall = await getOpenCallById(params.id);
    if (!openCall) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (!isOpenCallDeadlineActive(String(openCall.deadline || ""))) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (openCall.isExternal) {
      try {
        const validationMap = await getOpenCallValidationMap([openCall.id]);
        const validation = validationMap.get(openCall.id);
        if (shouldHideOpenCallByValidation(validation)) {
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