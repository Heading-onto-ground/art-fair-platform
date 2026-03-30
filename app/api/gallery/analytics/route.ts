import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getServerSession();
  if (!session || session.role !== "gallery") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const gallery = await prisma.galleryProfile.findUnique({
    where: { userId: session.userId },
    select: { galleryId: true, name: true },
  });
  if (!gallery) {
    return NextResponse.json({ error: "gallery_not_found" }, { status: 404 });
  }

  const galleryId = gallery.galleryId;

  // 오픈콜 목록
  const openCalls = await prisma.openCall.findMany({
    where: { galleryId },
    select: { id: true, theme: true, city: true, country: true, deadline: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const openCallIds = openCalls.map((oc: { id: string; theme: string; city: string; country: string; deadline: string; createdAt: Date }) => oc.id);

  if (openCallIds.length === 0) {
    return NextResponse.json({
      summary: { totalOpenCalls: 0, totalApplications: 0, acceptedCount: 0, reviewingCount: 0, rejectedCount: 0, pendingCount: 0 },
      byStatus: [],
      byCountry: [],
      byOpenCall: [],
      timeline: [],
    });
  }

  // 지원 전체
  const applications = await prisma.application.findMany({
    where: { galleryId },
    select: {
      id: true,
      openCallId: true,
      artistCountry: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // 상태별 집계
  const statusCounts: Record<string, number> = { submitted: 0, reviewing: 0, accepted: 0, rejected: 0 };
  for (const app of applications) {
    statusCounts[app.status] = (statusCounts[app.status] ?? 0) + 1;
  }

  // 국가별 집계
  const countryCounts: Record<string, number> = {};
  for (const app of applications) {
    const c = app.artistCountry || "Unknown";
    countryCounts[c] = (countryCounts[c] ?? 0) + 1;
  }
  const byCountry = Object.entries(countryCounts)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 오픈콜별 집계
  const openCallCountMap: Record<string, { submitted: number; reviewing: number; accepted: number; rejected: number; total: number }> = {};
  for (const oc of openCalls) {
    openCallCountMap[oc.id] = { submitted: 0, reviewing: 0, accepted: 0, rejected: 0, total: 0 };
  }
  for (const app of applications) {
    if (openCallCountMap[app.openCallId]) {
      openCallCountMap[app.openCallId][app.status as keyof typeof openCallCountMap[string]]++;
      openCallCountMap[app.openCallId].total++;
    }
  }
  type OC = { id: string; theme: string; city: string; country: string; deadline: string; createdAt: Date };
  const byOpenCall = (openCalls as OC[]).map((oc) => ({
    id: oc.id,
    theme: oc.theme,
    city: oc.city,
    country: oc.country,
    deadline: oc.deadline,
    ...openCallCountMap[oc.id],
  }));

  // 월별 지원 타임라인 (최근 12개월)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const timelineMap: Record<string, number> = {};
  for (const app of applications) {
    if (app.createdAt >= twelveMonthsAgo) {
      const key = `${app.createdAt.getFullYear()}-${String(app.createdAt.getMonth() + 1).padStart(2, "0")}`;
      timelineMap[key] = (timelineMap[key] ?? 0) + 1;
    }
  }
  // 빈 달 채우기
  const timeline: { month: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    timeline.push({ month: key, count: timelineMap[key] ?? 0 });
  }

  return NextResponse.json({
    summary: {
      totalOpenCalls: openCalls.length,
      totalApplications: applications.length,
      acceptedCount: statusCounts.accepted,
      reviewingCount: statusCounts.reviewing,
      rejectedCount: statusCounts.rejected,
      pendingCount: statusCounts.submitted,
    },
    byStatus: [
      { status: "submitted", label: "Submitted", count: statusCounts.submitted },
      { status: "reviewing", label: "Reviewing", count: statusCounts.reviewing },
      { status: "accepted", label: "Accepted", count: statusCounts.accepted },
      { status: "rejected", label: "Rejected", count: statusCounts.rejected },
    ],
    byCountry,
    byOpenCall,
    timeline,
  });
}
