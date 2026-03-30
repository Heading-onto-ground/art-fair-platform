import { NextResponse } from "next/server";
import { getOpenCallById } from "@/app/data/openCalls";

function escapeIcs(value: string) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatDateOnlyAsUtc(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function parseDeadline(deadline: string): Date | null {
  const trimmed = String(deadline || "").trim();
  if (!trimmed) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    const dt = new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(trimmed);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const openCall = await getOpenCallById(params.id);
  if (!openCall) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const deadlineDate = parseDeadline(openCall.deadline);
  if (!deadlineDate) {
    return NextResponse.json({ error: "invalid deadline" }, { status: 400 });
  }

  const dtStamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const dtStart = formatDateOnlyAsUtc(deadlineDate);
  const dtEnd = formatDateOnlyAsUtc(new Date(deadlineDate.getTime() + 24 * 60 * 60 * 1000));
  const uid = `open-call-${openCall.id}@rob-roleofbridge.com`;
  const summary = `${openCall.gallery} — ${openCall.theme} (Application Deadline)`;
  const description = `Open call deadline for ${openCall.gallery} in ${openCall.city}, ${openCall.country}.`;
  const url = `https://www.rob-roleofbridge.com/open-calls/${encodeURIComponent(openCall.id)}`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ROB//OpenCalls//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(`${openCall.city}, ${openCall.country}`)}`,
    `URL:${escapeIcs(url)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="open-call-${openCall.id}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
