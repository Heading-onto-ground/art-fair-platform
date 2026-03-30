import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ActionItem = {
  label: string;
  href: string;
  level: "high" | "medium" | "low";
};

type SupportThreadRow = {
  id: string;
  messages: Array<{ fromAdmin: boolean }>;
};

function ratio(part: number, total: number) {
  if (!total) return 0;
  return Number((part / total).toFixed(3));
}

export async function GET() {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const window7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const window30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    signups7Artist,
    signups7Gallery,
    signups7Curator,
    signups30Artist,
    signups30Gallery,
    signups30Curator,
    artistProfilesTotal,
    artistProfilesCompleted,
    artistProfilesActivated,
    galleryProfilesTotal,
    galleryProfilesCompleted,
    pendingExternalOutreach,
    openCallsCreated7d,
    threads,
    artistSignups30,
    artistStarted30,
    artistCompleted30,
    artistActivated30,
    gallerySignups30,
    galleryStarted30,
    galleryCompleted30,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "artist", createdAt: { gte: window7 } } }),
    prisma.user.count({ where: { role: "gallery", createdAt: { gte: window7 } } }),
    prisma.user.count({ where: { role: "curator", createdAt: { gte: window7 } } }),
    prisma.user.count({ where: { role: "artist", createdAt: { gte: window30 } } }),
    prisma.user.count({ where: { role: "gallery", createdAt: { gte: window30 } } }),
    prisma.user.count({ where: { role: "curator", createdAt: { gte: window30 } } }),
    prisma.artistProfile.count(),
    prisma.artistProfile.count({
      where: {
        bio: { not: null },
        country: { not: null },
        city: { not: null },
      },
    }),
    prisma.artistProfile.count({
      where: {
        OR: [{ series: { some: {} } }, { artEvents: { some: {} } }],
      },
    }),
    prisma.galleryProfile.count(),
    prisma.galleryProfile.count({
      where: {
        bio: { not: null },
        country: { not: null },
        website: { not: null },
      },
    }),
    prisma.application.count({
      where: { isExternal: true, outreachSent: false },
    }),
    prisma.openCall.count({ where: { createdAt: { gte: window7 } } }),
    prisma.adminSupportThread.findMany({
      take: 200,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { fromAdmin: true },
        },
      },
    }),
    prisma.user.count({ where: { role: "artist", createdAt: { gte: window30 } } }),
    prisma.user.count({
      where: {
        role: "artist",
        createdAt: { gte: window30 },
        artistProfile: { isNot: null },
      },
    }),
    prisma.user.count({
      where: {
        role: "artist",
        createdAt: { gte: window30 },
        artistProfile: {
          is: {
            bio: { not: null },
            country: { not: null },
            city: { not: null },
          },
        },
      },
    }),
    prisma.user.count({
      where: {
        role: "artist",
        createdAt: { gte: window30 },
        artistProfile: {
          is: {
            OR: [{ series: { some: {} } }, { artEvents: { some: {} } }],
          },
        },
      },
    }),
    prisma.user.count({ where: { role: "gallery", createdAt: { gte: window30 } } }),
    prisma.user.count({
      where: {
        role: "gallery",
        createdAt: { gte: window30 },
        galleryProfile: { isNot: null },
      },
    }),
    prisma.user.count({
      where: {
        role: "gallery",
        createdAt: { gte: window30 },
        galleryProfile: {
          is: {
            bio: { not: null },
            country: { not: null },
            website: { not: null },
          },
        },
      },
    }),
  ]);

  const supportNeedsReply = (threads as SupportThreadRow[]).filter((t) => {
    const latest = t.messages[0];
    return !!latest && !latest.fromAdmin;
  }).length;

  let failedEmails24h = 0;
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS count
       FROM "EmailLog"
       WHERE status = 'failed'
         AND "createdAt" > NOW() - INTERVAL '24 hours'`
    )) as Array<{ count: number }>;
    failedEmails24h = Number(rows[0]?.count ?? 0);
  } catch {
    failedEmails24h = 0;
  }

  const actions: ActionItem[] = [];
  if (supportNeedsReply > 0) {
    actions.push({ label: `${supportNeedsReply} support threads need reply`, href: "/admin/support", level: "high" });
  }
  if (pendingExternalOutreach > 0) {
    actions.push({ label: `${pendingExternalOutreach} external applications pending outreach`, href: "/admin/outreach", level: "high" });
  }
  if (failedEmails24h > 0) {
    actions.push({ label: `${failedEmails24h} failed emails in last 24h`, href: "/admin/mail", level: "medium" });
  }
  if (ratio(artistProfilesCompleted, artistProfilesTotal) < 0.6) {
    actions.push({ label: "Artist profile completion is below 60%", href: "/admin/users", level: "medium" });
  }
  if (actions.length === 0) {
    actions.push({ label: "No urgent operational blockers detected", href: "/admin", level: "low" });
  }

  return NextResponse.json({
    ok: true,
    generatedAt: now.toISOString(),
    signups: {
      last7Days: {
        artist: signups7Artist,
        gallery: signups7Gallery,
        curator: signups7Curator,
        total: signups7Artist + signups7Gallery + signups7Curator,
      },
      last30Days: {
        artist: signups30Artist,
        gallery: signups30Gallery,
        curator: signups30Curator,
        total: signups30Artist + signups30Gallery + signups30Curator,
      },
    },
    profileHealth: {
      artists: {
        total: artistProfilesTotal,
        completed: artistProfilesCompleted,
        completionRate: ratio(artistProfilesCompleted, artistProfilesTotal),
        activated: artistProfilesActivated,
      },
      galleries: {
        total: galleryProfilesTotal,
        completed: galleryProfilesCompleted,
        completionRate: ratio(galleryProfilesCompleted, galleryProfilesTotal),
      },
    },
    funnel30d: {
      artists: {
        signups: artistSignups30,
        profileStarted: artistStarted30,
        profileCompleted: artistCompleted30,
        activatedPortfolio: artistActivated30,
      },
      galleries: {
        signups: gallerySignups30,
        profileStarted: galleryStarted30,
        profileCompleted: galleryCompleted30,
      },
    },
    operations: {
      supportNeedsReply,
      pendingExternalOutreach,
      failedEmails24h,
      openCallsCreated7d,
    },
    actions,
  });
}
