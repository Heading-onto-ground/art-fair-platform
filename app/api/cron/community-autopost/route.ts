export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPost } from "@/app/data/community";

export const dynamic = "force-dynamic";

const POOL: { category: string; title: string; content: string }[] = [
  { category: "find_collab", title: "Looking for a collab partner for a group show", content: "Hi everyone! I'm working on a small group exhibition planned for later this year and looking for 1–2 artists to join. My work is mostly photography-based. Would love to connect with painters or mixed media artists. DM me or leave a comment!" },
  { category: "art_chat", title: "How do you price your work?", content: "Pricing has always been tricky for me. I've been going by size + materials, but I feel like it doesn't always reflect the time invested. How do you all approach this? Would love to hear different methods." },
  { category: "find_exhibit", title: "Anyone interested in a joint booth at an art fair?", content: "I'm considering applying to a mid-sized art fair this autumn and thought sharing a booth could reduce costs. My work is sculpture-based. Open to artists from any discipline. Let me know if you're interested!" },
  { category: "art_chat", title: "What's your studio routine like?", content: "I've been trying to build a more consistent studio practice. Currently working mornings only but struggling with focus. Curious how others structure their day — especially if you balance a day job too." },
  { category: "find_collab", title: "Open call: artists for a zine project", content: "I'm putting together a small art zine around the theme of 'in-between spaces'. Looking for 4–5 contributors. Any medium welcome — illustrations, photos, short texts. No budget unfortunately, but each contributor gets copies. Comment if interested!" },
  { category: "art_chat", title: "Thoughts on artist statements?", content: "I find writing my artist statement genuinely difficult. Mine feels either too vague or too literal. Does anyone have a process that works for them? Or examples that inspired you?" },
  { category: "meetup", title: "Anyone in Seoul want to do a studio visit exchange?", content: "I'm based in Seoul and would love to visit other artists' studios — and welcome visits to mine. I think there's a lot of value in seeing how others work outside of gallery settings. Anyone interested?" },
  { category: "find_exhibit", title: "Seeking artists for a residency group application", content: "There's a residency program accepting group applications of 2–3 artists. Deadline is next month. My practice is painting. Looking for someone to apply with — ideally with complementary work. Message me for details." },
  { category: "art_chat", title: "How do you handle rejection from open calls?", content: "I've been applying to open calls seriously for about two years now and the rejection rate is high, as expected. But I'm curious — how do others stay motivated? Do you keep a log, adjust your application strategy, or just keep going?" },
  { category: "find_collab", title: "Collab idea: art + sound installation", content: "I work with visual and spatial installation and I've been wanting to collaborate with a musician or sound artist. The idea is a small site-specific piece — nothing too ambitious for a start. Anyone working in sound and open to exploring this?" },
];

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

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickTwo<T>(arr: T[]): [T, T] {
  const i = Math.floor(Math.random() * arr.length);
  let j = Math.floor(Math.random() * (arr.length - 1));
  if (j >= i) j++;
  return [arr[i], arr[j]];
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const provided = url.searchParams.get("secret") || req.headers.get("x-cron-secret") || "";
  if (secret && provided !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [email1, email2] = pickTwo(BOT_EMAILS);
  const results = [];

  for (const botEmail of [email1, email2]) {
    const user = await prisma.user.findUnique({ where: { email: botEmail }, include: { artistProfile: true } });
    if (!user || !user.artistProfile) continue;
    const item = pick(POOL);
    await createPost({
      authorId: user.id,
      authorName: user.artistProfile.name,
      authorRole: "artist",
      category: item.category as any,
      title: item.title,
      content: item.content,
    });
    results.push({ bot: user.artistProfile.name, title: item.title });
  }

  return NextResponse.json({ ok: true, results });
}
