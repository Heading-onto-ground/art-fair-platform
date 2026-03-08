import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { addComment, getPost, serializePost } from "@/app/data/community";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ADMIN_AUTHOR_ID = "admin";
const ADMIN_AUTHOR_NAME = "관리자";

/** POST — admin posts a comment as "관리자" */
export async function POST(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { postId, content } = await req.json().catch(() => ({}));
  if (!postId || !content?.trim()) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const post = await getPost(postId);
  if (!post) return NextResponse.json({ error: "post not found" }, { status: 404 });

  const comment = await addComment({
    postId,
    authorId: ADMIN_AUTHOR_ID,
    authorName: ADMIN_AUTHOR_NAME,
    authorRole: "gallery",
    content: content.trim(),
  });

  const updatedPost = await getPost(postId);
  return NextResponse.json({ ok: true, comment, post: updatedPost ? serializePost(updatedPost, ADMIN_AUTHOR_ID) : null });
}

/** DELETE — admin deletes any comment */
export async function DELETE(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { commentId } = await req.json().catch(() => ({}));
  if (!commentId) return NextResponse.json({ error: "commentId required" }, { status: 400 });

  const comment = await prisma.communityComment.findUnique({ where: { id: commentId }, select: { id: true, postId: true } });
  if (!comment) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.communityComment.delete({ where: { id: commentId } });
  const updatedPost = await getPost(comment.postId);
  return NextResponse.json({ ok: true, post: updatedPost ? serializePost(updatedPost, ADMIN_AUTHOR_ID) : null });
}
