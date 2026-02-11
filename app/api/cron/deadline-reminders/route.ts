import { NextResponse } from "next/server";
import { listOpenCalls } from "@/app/data/openCalls";
import { listApplicationsByArtist } from "@/app/data/applications";
import { createNotification } from "@/app/data/notifications";
import { getDeadlineApproaching } from "@/lib/matcher";

export const dynamic = "force-dynamic";

// Track which reminders have been sent (to avoid duplicates)
const SENT_KEY = "__DEADLINE_REMINDERS_SENT__";
function getSentStore(): Set<string> {
  const g = globalThis as any;
  if (!g[SENT_KEY]) g[SENT_KEY] = new Set<string>();
  return g[SENT_KEY] as Set<string>;
}

// This endpoint can be called by a cron job (e.g., Vercel Cron)
// or manually to generate deadline reminder notifications
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const withinDays = body.withinDays ?? 7;

    const openCalls = await listOpenCalls();
    const approaching = getDeadlineApproaching(openCalls, withinDays);

    if (approaching.length === 0) {
      return NextResponse.json({ message: "No deadlines approaching", reminders: 0 });
    }

    // For each approaching deadline, create notifications for all artists
    // In a real system, we'd query all registered artists from the DB
    // For now, we create a general notification for a demo user
    const sentStore = getSentStore();
    let remindersCreated = 0;

    // We'll also broadcast to any artist who has applied to something
    // (they are active users)
    const allApplications = new Map<string, Set<string>>();

    for (const oc of approaching) {
      const reminderKey = `${oc.id}_${new Date().toDateString()}`;
      if (sentStore.has(reminderKey)) continue;

      const daysLeft = Math.ceil(
        (new Date(oc.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // Create a notification (in a real system, for each subscribed artist)
      createNotification({
        userId: "__broadcast__",
        type: "deadline_reminder",
        title: "DEADLINE APPROACHING",
        message: `"${oc.theme}" by ${oc.gallery} — ${daysLeft} day${daysLeft === 1 ? "" : "s"} left (${oc.deadline})`,
        link: `/open-calls/${oc.id}`,
        data: { openCallId: oc.id, daysLeft, deadline: oc.deadline },
      });

      sentStore.add(reminderKey);
      remindersCreated++;
    }

    return NextResponse.json({
      message: `Created ${remindersCreated} deadline reminders`,
      reminders: remindersCreated,
      approaching: approaching.map((oc) => ({
        id: oc.id,
        theme: oc.theme,
        gallery: oc.gallery,
        deadline: oc.deadline,
      })),
    });
  } catch (e) {
    console.error("POST /api/cron/deadline-reminders failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

// GET: Check what deadlines are approaching (read-only)
export async function GET() {
  const openCalls = await listOpenCalls();
  const approaching7 = getDeadlineApproaching(openCalls, 7);
  const approaching30 = getDeadlineApproaching(openCalls, 30);

  return NextResponse.json({
    approaching7days: approaching7.map((oc) => ({
      id: oc.id,
      theme: oc.theme,
      gallery: oc.gallery,
      country: oc.country,
      deadline: oc.deadline,
      daysLeft: Math.ceil((new Date(oc.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    })),
    approaching30days: approaching30.map((oc) => ({
      id: oc.id,
      theme: oc.theme,
      gallery: oc.gallery,
      country: oc.country,
      deadline: oc.deadline,
      daysLeft: Math.ceil((new Date(oc.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    })),
  });
}
