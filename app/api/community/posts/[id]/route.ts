import { NextResponse } from "next/server";
import { getPost, serializePost } from "@/app/data/community";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const post = await getPost(params.id);
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ post: serializePost(post) });
}
