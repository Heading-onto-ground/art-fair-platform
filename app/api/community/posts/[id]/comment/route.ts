import { NextRequest, NextResponse } from "next/server";
import { getServerSession, getProfileByUserId } from "@/lib/auth";
import { addComment, getPost, serializePost } from "@/app/data/community";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** POST — add a comment to a post */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByUserId(session.userId);
    const body = await req.json();
    const { content, parentCommentId } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const post = await getPost(params.id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const authorName = profile?.name || session.email || "Anonymous";

    const comment = await addComment({
      postId: params.id,
      authorId: session.userId,
      authorName,
      authorRole: session.role as "artist" | "gallery",
      content: content.trim(),
    });

    if (!comment) {
      return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
    }

    try {
      const byUserId = session.userId;
      const targets = new Set<string>();
      if (post.authorId !== byUserId) targets.add(post.authorId);
      if (parentCommentId) {
        const parent = await prisma.communityComment.findUnique({ where: { id: parentCommentId }, select: { authorId: true } });
        if (parent && parent.authorId !== byUserId) targets.add(parent.authorId);
      }
        if (targets.size > 0) {
          await prisma.notification.createMany({ data: [...targets].map(uid => ({ userId: uid, type: "community.comment.new", payload: { postId: params.id, commentId: comment.id, parentCommentId: parentCommentId ?? null, byUserId } })) });
        }
    } catch (e) { console.error("comment notification error:", e); }

    const updatedPost = await getPost(params.id);
    return NextResponse.json({
      comment,
      post: updatedPost ? serializePost(updatedPost, session.userId) : null,
    });
  } catch (e) {
    console.error("POST /api/community/posts/[id]/comment error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
