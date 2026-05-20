import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import path from "path";
import { promises as fs } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AgentLogItem = {
  date: string;
  fileName: string;
  updatedAt: number;
  content: string;
};

export async function GET(req: Request) {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const limitRaw = Number(url.searchParams.get("limit") || "14");
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(60, limitRaw)) : 14;

    const logsDir = path.join(process.cwd(), "docs", "worklogs");
    let fileNames: string[] = [];
    try {
      fileNames = await fs.readdir(logsDir);
    } catch {
      return NextResponse.json({ ok: true, logs: [] });
    }

    const mdFiles = fileNames.filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name));

    const withMeta = await Promise.all(
      mdFiles.map(async (fileName) => {
        const fullPath = path.join(logsDir, fileName);
        const stat = await fs.stat(fullPath);
        return { fileName, fullPath, mtimeMs: stat.mtimeMs };
      })
    );

    withMeta.sort((a, b) => b.mtimeMs - a.mtimeMs);
    const selected = withMeta.slice(0, limit);

    const logs: AgentLogItem[] = [];
    for (const item of selected) {
      const raw = await fs.readFile(item.fullPath, "utf-8");
      logs.push({
        date: item.fileName.replace(".md", ""),
        fileName: item.fileName,
        updatedAt: Math.floor(item.mtimeMs),
        content: raw,
      });
    }

    return NextResponse.json({ ok: true, logs });
  } catch (e) {
    console.error("GET /api/admin/agent-logs failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

