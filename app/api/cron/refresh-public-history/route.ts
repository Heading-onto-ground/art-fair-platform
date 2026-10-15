import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cronAuth";
import { publicCacheTargets } from "@/lib/history/cacheRefresh";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isCronAuthorized(req, { allowAdminSession: true, allowDevWithoutSecret: false })) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const targets = publicCacheTargets();
  revalidateTag(targets.tag);
  for (const path of targets.paths) revalidatePath(path);
  return NextResponse.json({ status: "CACHE_INVALIDATION_COMPLETE", tag: targets.tag, paths: targets.paths });
}
