import { prisma } from "@/lib/prisma";

export type PostCategory =
  | "general"
  | "critique"
  | "collaboration"
  | "tips"
  | "exhibition"
  | "inspiration"
  | "find_collab"
  | "art_chat"
  | "daily"
  | "meetup";

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: "artist" | "gallery";
  content: string;
  createdAt: number;
};

export type PostResponse = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  category: PostCategory;
  title: string;
  content: string;
  imageUrl?: string;
  pinned: boolean;
  likeCount: number;
  liked: boolean;
  commentCount: number;
  comments: Comment[];
  createdAt: number;
  updatedAt: number;
};

const SEED_AUTHOR_IDS = [
  "user_artist_yuna", "user_artist_leon", "user_artist_sofia",
  "user_artist_kenji", "user_artist_mika", "user_artist_anna",
  "user_artist_jimin", "user_artist_hana",
];

async function ensureSeeded() {
  try {
    await prisma.communityPost.deleteMany({ where: { authorId: { in: SEED_AUTHOR_IDS } } });
  } catch (e) {
    console.error("Community seed cleanup error (non-fatal):", e);
  }
}

let _seedPromise: Promise<void> | null = null;
function seed() {
  if (!_seedPromise) _seedPromise = ensureSeeded();
  return _seedPromise;
}

export async function listPosts(category?: PostCategory): Promise<any[]> {
  await seed();
  const where = category ? { category } : {};
  return prisma.communityPost.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: { comments: { orderBy: { createdAt: "asc" } }, likes: true, _count: { select: { comments: true, likes: true } } },
  });
}

export async function getPost(id: string) {
  return prisma.communityPost.findUnique({
    where: { id },
    include: { comments: { orderBy: { createdAt: "asc" } }, likes: true, _count: { select: { comments: true, likes: true } } },
  });
}

export async function createPost(input: {
  authorId: string;
  authorName: string;
  authorRole: "artist" | "gallery";
  category: PostCategory;
  title: string;
  content: string;
  imageUrl?: string;
}) {
  return prisma.communityPost.create({
    data: {
      authorId: input.authorId,
      authorName: input.authorName,
      authorRole: input.authorRole,
      category: input.category,
      title: input.title,
      content: input.content,
      imageUrl: input.imageUrl,
    },
    include: { comments: true, likes: true, _count: { select: { comments: true, likes: true } } },
  });
}

export async function addComment(input: {
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: "artist" | "gallery";
  content: string;
}) {
  const comment = await prisma.communityComment.create({
    data: {
      postId: input.postId,
      authorId: input.authorId,
      authorName: input.authorName,
      authorRole: input.authorRole,
      content: input.content,
    },
  });
  // Update post updatedAt
  await prisma.communityPost.update({ where: { id: input.postId }, data: { updatedAt: new Date() } });
  return comment;
}

export async function toggleLike(postId: string, userId: string): Promise<boolean> {
  const existing = await prisma.communityLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (existing) {
    await prisma.communityLike.delete({ where: { id: existing.id } });
    return false; // unliked
  } else {
    await prisma.communityLike.create({ data: { postId, userId } });
    return true; // liked
  }
}

export function serializePost(post: any, currentUserId?: string): PostResponse {
  const likeCount = post._count?.likes ?? post.likes?.length ?? 0;
  const liked = currentUserId ? (post.likes ?? []).some((l: any) => l.userId === currentUserId) : false;
  const comments = (post.comments ?? []).map((c: any) => ({
    id: c.id,
    postId: c.postId,
    authorId: c.authorId,
    authorName: c.authorName,
    authorRole: c.authorRole,
    content: c.content,
    createdAt: c.createdAt instanceof Date ? c.createdAt.getTime() : Number(c.createdAt),
  }));

  return {
    id: post.id,
    authorId: post.authorId,
    authorName: post.authorName,
    authorRole: post.authorRole,
    category: post.category as PostCategory,
    title: post.title,
    content: post.content,
    imageUrl: post.imageUrl ?? undefined,
    pinned: post.pinned,
    likeCount,
    liked,
    commentCount: post._count?.comments ?? comments.length,
    comments,
    createdAt: post.createdAt instanceof Date ? post.createdAt.getTime() : Number(post.createdAt),
    updatedAt: post.updatedAt instanceof Date ? post.updatedAt.getTime() : Number(post.updatedAt),
  };
}
