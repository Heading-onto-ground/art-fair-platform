import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiGuards";
import { getAdminSession } from "@/lib/adminAuth";
import { demandEventName, demandWriteClass } from "@/lib/history/demandQuality";
import { persistMissingSearch } from "@/lib/history/searchFlow";
import { isMissingHistorySchema } from "@/lib/history/schemaError";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "history-missing-search", 60, 60_000);
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  const query = body && typeof body.q === "string" ? body.q.slice(0, 200) : "";
  const event = demandEventName(demandWriteClass({
    adminSession: Boolean(getAdminSession()),
    nodeEnv: process.env.NODE_ENV ?? "production",
  }));
  await persistMissingSearch({
    query,
    event,
    write: async (name, path) => {
      try {
        await prisma.historySignal.create({ data: { name, path } });
      } catch (error) {
        if (!isMissingHistorySchema(error)) throw error;
      }
    },
  });
  return NextResponse.json({ ok: true });
}
