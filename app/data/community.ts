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

// ── Seed data ──
const SEED_POSTS = [
  { authorId: "user_artist_yuna", authorName: "Yuna Kim", authorRole: "artist", category: "tips", title: "Tips for applying to European open calls", content: "After applying to over 30 open calls across Europe, here are my key takeaways:\n\n1. Always tailor your artist statement to the specific theme\n2. High-quality documentation of your work is essential\n3. Don't underestimate the cover letter — curators read them\n4. Apply early, some galleries review on a rolling basis\n5. Follow up politely after 2-3 weeks if you haven't heard back", pinned: true },
  { authorId: "user_artist_leon", authorName: "Léon Dubois", authorRole: "artist", category: "exhibition", title: "Just got accepted to Whitechapel Gallery open call!", content: "I'm thrilled to share that my installation piece 'Traces of Light' has been selected for the Whitechapel Gallery's emerging artists program.", pinned: false },
  { authorId: "user_artist_sofia", authorName: "Sofia Rossi", authorRole: "artist", category: "critique", title: "Feedback on my new series — 'Urban Silence'", content: "I've been working on a new photography series exploring empty urban spaces at dawn. The series documents the quiet moments before cities wake up.", pinned: false },
  { authorId: "user_artist_kenji", authorName: "Kenji Sato", authorRole: "artist", category: "collaboration", title: "Looking for a painter to collaborate on mixed-media project", content: "I'm a sculptor based in Tokyo working primarily with ceramics and found objects. I'm looking for a painter interested in exploring the intersection of 2D and 3D art.", pinned: false },
  { authorId: "user_artist_mika", authorName: "Mika Tanaka", authorRole: "artist", category: "general", title: "How do you handle art shipping insurance?", content: "I just shipped my first international piece (from Osaka to Berlin) and I'm quite nervous about it. What's your experience with art shipping insurance?", pinned: false },
  { authorId: "user_artist_anna", authorName: "Anna Weber", authorRole: "artist", category: "inspiration", title: "Berlin gallery district — must-visit spaces", content: "Just spent a week gallery hopping in Berlin and wanted to share my favorites: KW Institute, Galerie Eigen + Art, Hamburger Bahnhof, König Galerie, Schinkel Pavillon.", pinned: false },
  { authorId: "user_artist_jimin", authorName: "지민 (Jimin Park)", authorRole: "artist", category: "find_collab", title: "영상 작업 가능한 작가님 찾습니다 — 퍼포먼스 x 영상 프로젝트", content: "안녕하세요, 서울에서 퍼포먼스 작업을 하고 있는 지민입니다. 다음 프로젝트로 퍼포먼스와 영상을 결합한 작업을 계획하고 있어요.", pinned: false },
  { authorId: "user_artist_hana", authorName: "Hana Lee", authorRole: "artist", category: "art_chat", title: "요즘 AI 아트 논쟁 어떻게 생각하세요?", content: "최근에 AI로 생성한 이미지가 공모전에서 수상해서 큰 논란이 됐잖아요. 작가로서 이 주제에 대해 다들 어떻게 생각하시나요?", pinned: false },
  { authorId: "user_artist_sofia", authorName: "Sofia Rossi", authorRole: "artist", category: "daily", title: "작업실 구하기 대작전... 다들 어디서 작업하세요?", content: "밀라노에서 작업실 임대료가 너무 올라서 고민이에요. 다른 도시에서 작업하시는 분들은 어떤가요?", pinned: false },
  { authorId: "user_artist_kenji", authorName: "Kenji Sato", authorRole: "artist", category: "meetup", title: "도쿄 아티스트 정기 모임 — 매월 첫째 주 토요일", content: "도쿄에 계신 작가님들! 매월 첫째 주 토요일에 아티스트 모임을 하고 있어요. 참여하고 싶으신 분은 댓글 남겨주세요!", pinned: false },
];

async function ensureSeeded() {
  try {
    const count = await prisma.communityPost.count();
    if (count === 0) {
      for (const p of SEED_POSTS) {
        await prisma.communityPost.create({
          data: {
            authorId: p.authorId,
            authorName: p.authorName,
            authorRole: p.authorRole,
            category: p.category,
            title: p.title,
            content: p.content,
            pinned: p.pinned,
          },
        });
      }
      console.log(`✅ Seeded ${SEED_POSTS.length} community posts`);
    }
  } catch (e) {
    console.error("Community seed error (non-fatal):", e);
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
