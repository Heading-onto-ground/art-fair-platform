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
];

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
