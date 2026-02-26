import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/adminAuth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const BOTS = [
  { email: "yuna.kim.bot@rob-roleofbridge.com", artistId: "bot-yuna-kim", name: "Yuna Kim", genre: "Photography", country: "Korea", city: "Seoul", startedYear: 2016 },
  { email: "marco.rossi.bot@rob-roleofbridge.com", artistId: "bot-marco-rossi", name: "Marco Rossi", genre: "Painting", country: "Italy", city: "Milan", startedYear: 2012 },
  { email: "aiko.tanaka.bot@rob-roleofbridge.com", artistId: "bot-aiko-tanaka", name: "Aiko Tanaka", genre: "Sculpture", country: "Japan", city: "Tokyo", startedYear: 2014 },
  { email: "lea.dubois.bot@rob-roleofbridge.com", artistId: "bot-lea-dubois", name: "Léa Dubois", genre: "Mixed Media", country: "France", city: "Paris", startedYear: 2018 },
  { email: "sofia.m.bot@rob-roleofbridge.com", artistId: "bot-sofia-m", name: "Sofia Moreau", genre: "Drawing", country: "France", city: "Lyon", startedYear: 2017 },
  { email: "james.park.bot@rob-roleofbridge.com", artistId: "bot-james-park", name: "James Park", genre: "Video Art", country: "Korea", city: "Busan", startedYear: 2015 },
  { email: "nina.vogel.bot@rob-roleofbridge.com", artistId: "bot-nina-vogel", name: "Nina Vogel", genre: "Textile", country: "Germany", city: "Berlin", startedYear: 2013 },
  { email: "carlos.v.bot@rob-roleofbridge.com", artistId: "bot-carlos-v", name: "Carlos Vega", genre: "Printmaking", country: "Spain", city: "Barcelona", startedYear: 2011 },
  { email: "mia.chen.bot@rob-roleofbridge.com", artistId: "bot-mia-chen", name: "Mia Chen", genre: "Ceramics", country: "China", city: "Shanghai", startedYear: 2019 },
  { email: "oliver.b.bot@rob-roleofbridge.com", artistId: "bot-oliver-b", name: "Oliver Berg", genre: "Installation", country: "Sweden", city: "Stockholm", startedYear: 2010 },
];

export async function GET() {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const botEmails = BOTS.map((b) => b.email);
  const users = await prisma.user.findMany({ where: { email: { in: botEmails } }, select: { email: true, artistProfile: { select: { name: true, genre: true, city: true, country: true } } } });
  return NextResponse.json({ bots: users.map((u) => ({ name: u.artistProfile?.name ?? "-", genre: u.artistProfile?.genre ?? "-", location: `${u.artistProfile?.city}, ${u.artistProfile?.country}` })) });
}

export async function POST() {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const pw = bcrypt.hashSync("bot-account-not-for-login-rob2025", 10);
  const created: string[] = [];

  for (const bot of BOTS) {
    const existing = await prisma.user.findUnique({ where: { email: bot.email } });
    if (existing) continue;

    const user = await prisma.user.create({
      data: { email: bot.email, passwordHash: pw, role: "artist", isVerified: true },
    });
    await prisma.artistProfile.create({
      data: {
        userId: user.id,
        artistId: bot.artistId,
        name: bot.name,
        genre: bot.genre,
        country: bot.country,
        city: bot.city,
        startedYear: bot.startedYear,
      },
    });
    created.push(bot.name);
  }

  return NextResponse.json({ ok: true, created });
}
