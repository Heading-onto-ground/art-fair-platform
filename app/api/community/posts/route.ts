import { NextRequest, NextResponse } from "next/server";
import { getServerSession, getProfileByUserId } from "@/lib/auth";
import {
  listPosts,
  createPost,
  serializePost,
  type PostCategory,
} from "@/app/data/community";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES: PostCategory[] = [
  "general",
  "critique",
  "collaboration",
  "tips",
  "exhibition",
  "inspiration",
  "find_collab",
  "art_chat",
  "daily",
  "meetup",
  "find_exhibit",
];

/** GET — list posts (optional ?category=xxx) */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cat = searchParams.get("category") as PostCategory | null;
    const validCat = cat && VALID_CATEGORIES.includes(cat) ? cat : undefined;

    const session = getServerSession();
    const posts = await listPosts(validCat);
    const serialized = posts.map((p) => serializePost(p, session?.userId));

    return NextResponse.json({ posts: serialized });
  } catch (e) {
    console.error("GET /api/community/posts error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

/** POST — create new post */
export async function POST(req: NextRequest) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByUserId(session.userId);
    const body = await req.json();
    const { category, title, content, imageUrl } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    const authorName =
      profile?.name || session.email || "Anonymous";

    const post = await createPost({
      authorId: session.userId,
      authorName,
      authorRole: session.role as "artist" | "gallery",
      category,
      title: title.trim(),
      content: content.trim(),
      imageUrl: imageUrl?.trim() || undefined,
    });

    return NextResponse.json({
      post: serializePost(post, session.userId),
    });
  } catch (e) {
    console.error("POST /api/community/posts error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
