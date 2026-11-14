import { prisma } from "@/lib/prisma";
import {
  cleanPreparationNote,
  parsePreparationStatus,
  type PreparationStatus,
} from "@/lib/openCall/preparationStatus";

export type PreparationRecord = {
  openCallId: string;
  status: PreparationStatus;
  note: string | null;
  updatedAt: string;
};

function toRecord(row: {
  openCallId: string;
  status: string;
  note: string | null;
  updatedAt: Date;
}): PreparationRecord | null {
  const status = parsePreparationStatus(row.status);
  if (!status) return null;
  return {
    openCallId: row.openCallId,
    status,
    note: row.note,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function readPreparation(userId: string, openCallId: string) {
  const row = await prisma.openCallPreparation.findUnique({
    where: { userId_openCallId: { userId, openCallId } },
  });
  return row ? toRecord(row) : null;
}

export async function savePreparation(input: {
  userId: string;
  openCallId: string;
  status: PreparationStatus;
  note?: string | null;
}) {
  const note = cleanPreparationNote(input.note);
  const row = await prisma.openCallPreparation.upsert({
    where: { userId_openCallId: { userId: input.userId, openCallId: input.openCallId } },
    create: {
      userId: input.userId,
      openCallId: input.openCallId,
      status: input.status,
      note,
    },
    update: {
      status: input.status,
      note,
    },
  });
  return toRecord(row);
}

export async function clearPreparation(userId: string, openCallId: string) {
  await prisma.openCallPreparation.deleteMany({
    where: { userId, openCallId },
  });
}
