import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toggleLike, getPost, serializePost } from "@/app/data/community";

export const dynamic = "force-dynamic";

/** POST — toggle like on a post */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const post = await getPost(params.id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const liked = await toggleLike(params.id, session.userId);
    if (liked) {
      try {
        const byUserId = session.userId;
        const authorUserId = post.authorId;
        if (byUserId !== authorUserId) {
          await prisma.notification.create({ data: { userId: authorUserId, type: "community.post.like", payload: { postId: params.id, byUserId } } });
        }
      } catch (e) { console.error("like notification error:", e); }
    }

    const updatedPost = await getPost(params.id);
    return NextResponse.json({
      liked,
      post: updatedPost ? serializePost(updatedPost, session.userId) : null,
    });
  } catch (e) {
    console.error("POST /api/community/posts/[id]/like error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
