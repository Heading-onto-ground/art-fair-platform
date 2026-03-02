import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPost, addComment } from "@/app/data/community";
import { getAdminSession } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_EMAILS = [
  "yuna.kim.bot@rob-roleofbridge.com",
  "marco.rossi.bot@rob-roleofbridge.com",
  "aiko.tanaka.bot@rob-roleofbridge.com",
  "lea.dubois.bot@rob-roleofbridge.com",
  "sofia.m.bot@rob-roleofbridge.com",
  "james.park.bot@rob-roleofbridge.com",
  "nina.vogel.bot@rob-roleofbridge.com",
  "carlos.v.bot@rob-roleofbridge.com",
  "mia.chen.bot@rob-roleofbridge.com",
  "oliver.b.bot@rob-roleofbridge.com",
];

const POOL: { category: string; title: string; content: string }[] = [
  { category: "art_chat", title: "How do you price your work?", content: "Pricing has always been tricky for me. I've been going by size + materials, but I feel like it doesn't always reflect the time invested. How do you all approach this? Would love to hear different methods." },
  { category: "art_chat", title: "What's your studio routine like?", content: "I've been trying to build a more consistent studio practice. Currently working mornings only but struggling with focus. Curious how others structure their day — especially if you balance a day job too." },
  { category: "art_chat", title: "Thoughts on artist statements?", content: "I find writing my artist statement genuinely difficult. Mine feels either too vague or too literal. Does anyone have a process that works for them? Or examples that inspired you?" },
  { category: "art_chat", title: "How do you handle rejection from open calls?", content: "I've been applying to open calls seriously for about two years now and the rejection rate is high, as expected. But I'm curious — how do others stay motivated? Do you keep a log, adjust your application strategy, or just keep going?" },
  { category: "art_chat", title: "What inspires your practice lately?", content: "I've been going through a bit of a creative block and curious what's been fueling others. Is it travel, other artists, everyday life? Would love to hear what's been moving your work forward recently." },
  { category: "art_chat", title: "Do you share work-in-progress online?", content: "I've been debating whether to share more of my process on Instagram — sketches, studio mess, half-finished pieces. Some artists seem very open about it, others only share finished work. What's your approach?" },
  { category: "art_chat", title: "How do you title your works?", content: "Titling has always been one of the harder parts for me. Sometimes the title comes first, sometimes it's an afterthought. I've been experimenting with letting the material or process suggest the name. How does everyone else approach it?" },
  { category: "art_chat", title: "Gallery vs. self-representation — what's your experience?", content: "I've been showing mostly independently for the past few years and recently started working with a small gallery. The dynamics are quite different. Curious to hear from others who've done both — what have you learned?" },
  { category: "art_chat", title: "How long do you spend on a single piece?", content: "I've noticed my time per work varies a lot — some pieces take a day, others take months. I'm wondering if others have a natural rhythm or if it varies by project. Do you set deadlines for yourself?" },
  { category: "art_chat", title: "What does your archive practice look like?", content: "I've been trying to get more systematic about documenting and archiving older work — photos, notes, storage. It's a lot more than I expected. Anyone have a system they'd recommend or lessons learned the hard way?" },
];

const COMMENTS: string[] = [
  "This really resonates with me. Thanks for sharing!",
  "Would love to connect — I'm working on something similar.",
  "Great idea. I've been thinking about this too.",
  "Interesting perspective. Have you shown this work anywhere yet?",
  "I'd be open to collaborating on something like this.",
  "This is exactly what I needed to read today.",
  "Totally agree. The pricing question never gets easier.",
  "Love the concept. Where are you based?",
  "I went through the same thing — happy to chat about it.",
  "Following this thread. Very useful discussion.",
  "Count me in if you're still looking for collaborators!",
  "Really appreciate you bringing this up.",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickTwo<T>(arr: T[]): [T, T] {
  const i = Math.floor(Math.random() * arr.length);
  let j = Math.floor(Math.random() * (arr.length - 1));
  if (j >= i) j++;
  return [arr[i], arr[j]];
}

type BotUser = { id: string; email: string; artistProfile: { name: string } | null };
type RecentPost = { id: string; authorId: string; authorName: string; category: string; title: string; createdAt: Date };
type SlimPost = { id: string; authorId: string };

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const botUsers = (await prisma.user.findMany({
    where: { email: { in: BOT_EMAILS } },
    select: { id: true, email: true, artistProfile: { select: { name: true } } },
  })) as BotUser[];

  const botIds = botUsers.map((u: BotUser) => u.id);

  const recentPosts = (botIds.length
    ? await prisma.communityPost.findMany({
        where: { authorId: { in: botIds } },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, authorId: true, authorName: true, category: true, title: true, createdAt: true },
      })
    : []) as RecentPost[];

  return NextResponse.json({
    botsExist: botUsers.length,
    bots: botUsers.map((u: BotUser) => ({ email: u.email, name: u.artistProfile?.name ?? null, id: u.id })),
    recentPosts: recentPosts.map((p: RecentPost) => ({
      id: p.id,
      authorName: p.authorName,
      category: p.category,
      title: p.title,
      createdAt: p.createdAt instanceof Date ? p.createdAt.getTime() : Number(p.createdAt),
    })),
  });
}

export async function DELETE() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await prisma.communityPost.deleteMany({
    where: { category: { in: ["find_exhibit", "find_collab", "meetup"] } },
  });
  return NextResponse.json({ ok: true, deleted: result.count });
}

export async function POST() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [email1, email2] = pickTwo(BOT_EMAILS);
  const results: { bot: string; title: string }[] = [];

  for (const botEmail of [email1, email2]) {
    const user = await prisma.user.findUnique({
      where: { email: botEmail },
      include: { artistProfile: true },
    });
    if (!user || !user.artistProfile) continue;
    const item = pick(POOL);
    await createPost({
      authorId: user.id,
      authorName: user.artistProfile.name,
      authorRole: "artist",
      category: item.category as "find_collab" | "art_chat" | "find_exhibit" | "meetup",
      title: item.title,
      content: item.content,
    });
    results.push({ bot: user.artistProfile.name, title: item.title });
  }

  const botIds = (await prisma.user.findMany({
    where: { email: { in: BOT_EMAILS } },
    select: { id: true },
  }) as { id: string }[]).map((u: { id: string }) => u.id);

  const recentPosts = (await prisma.communityPost.findMany({
    where: { authorId: { in: botIds } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, authorId: true },
  })) as SlimPost[];

  for (const botEmail of [email1, email2]) {
    const commenter = await prisma.user.findUnique({
      where: { email: botEmail },
      include: { artistProfile: true },
    });
    if (!commenter || !commenter.artistProfile) continue;
    const eligible = recentPosts.filter((p: SlimPost) => p.authorId !== commenter.id);
    if (!eligible.length) continue;
    const target = pick(eligible);
    await addComment({
      postId: target.id,
      authorId: commenter.id,
      authorName: commenter.artistProfile.name,
      authorRole: "artist",
      content: pick(COMMENTS),
    });
  }

  return NextResponse.json({ ok: true, results });
}
