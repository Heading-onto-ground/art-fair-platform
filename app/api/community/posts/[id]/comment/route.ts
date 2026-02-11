import { NextRequest, NextResponse } from "next/server";
import { getServerSession, getProfileByUserId } from "@/lib/auth";
import { addComment, getPost, serializePost } from "@/app/data/community";
import { createNotification } from "@/app/data/notifications";

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
    const { content } = body;

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

    // Notify post author if different from commenter
    if (post.authorId !== session.userId) {
      createNotification({
        userId: post.authorId,
        type: "new_message",
        title: "New comment on your post",
        message: `${authorName} commented on "${post.title}"`,
        link: `/community`,
      });
    }

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
