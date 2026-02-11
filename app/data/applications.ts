import { prisma } from "@/lib/prisma";

export type Application = {
  id: string;
  openCallId: string;
  galleryId: string;
  artistId: string;
  artistName: string;
  artistEmail: string;
  artistCountry: string;
  artistCity: string;
  artistPortfolioUrl?: string;
  message?: string;
  status: "submitted" | "reviewing" | "accepted" | "rejected";
  shippingStatus: "pending" | "shipped" | "received" | "inspected" | "exhibited";
  shippingNote?: string;
  shippingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  isExternal?: boolean;
  outreachSent?: boolean;
  outreachSentAt?: number;
  outreachNote?: string;
  createdAt: number;
  updatedAt: number;
};

function toApp(row: any): Application {
  return {
    id: row.id,
    openCallId: row.openCallId,
    galleryId: row.galleryId,
    artistId: row.artistId,
    artistName: row.artistName ?? "",
    artistEmail: row.artistEmail ?? "",
    artistCountry: row.artistCountry ?? "",
    artistCity: row.artistCity ?? "",
    artistPortfolioUrl: row.artistPortfolioUrl ?? undefined,
    message: row.message ?? undefined,
    status: row.status as Application["status"],
    shippingStatus: row.shippingStatus as Application["shippingStatus"],
    shippingNote: row.shippingNote ?? undefined,
    shippingCarrier: row.shippingCarrier ?? undefined,
    trackingNumber: row.trackingNumber ?? undefined,
    trackingUrl: row.trackingUrl ?? undefined,
    isExternal: row.isExternal ?? false,
    outreachSent: row.outreachSent ?? false,
    outreachSentAt: row.outreachSentAt ? new Date(row.outreachSentAt).getTime() : undefined,
    outreachNote: row.outreachNote ?? undefined,
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : Number(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.getTime() : Number(row.updatedAt),
  };
}

export async function listApplications(): Promise<Application[]> {
  const rows = await prisma.application.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toApp);
}

export async function listApplicationsByOpenCall(openCallId: string): Promise<Application[]> {
  const rows = await prisma.application.findMany({ where: { openCallId }, orderBy: { createdAt: "desc" } });
  return rows.map(toApp);
}

export async function listApplicationsByArtist(artistId: string): Promise<Application[]> {
  const rows = await prisma.application.findMany({ where: { artistId }, orderBy: { createdAt: "desc" } });
  return rows.map(toApp);
}

export async function findApplication(openCallId: string, artistId: string): Promise<Application | null> {
  const row = await prisma.application.findUnique({ where: { openCallId_artistId: { openCallId, artistId } } });
  return row ? toApp(row) : null;
}

export async function getApplicationById(id: string): Promise<Application | null> {
  const row = await prisma.application.findUnique({ where: { id } });
  return row ? toApp(row) : null;
}

export async function createApplication(input: {
  openCallId: string;
  galleryId: string;
  artistId: string;
  artistName: string;
  artistEmail: string;
  artistCountry: string;
  artistCity: string;
  artistPortfolioUrl?: string;
  message?: string;
}): Promise<Application> {
  const row = await prisma.application.create({
    data: {
      openCallId: input.openCallId,
      galleryId: input.galleryId,
      artistId: input.artistId,
      artistName: input.artistName,
      artistEmail: input.artistEmail,
      artistCountry: input.artistCountry,
      artistCity: input.artistCity,
      artistPortfolioUrl: input.artistPortfolioUrl,
      message: input.message,
    },
  });
  return toApp(row);
}

export async function updateApplicationShipping(
  id: string,
  input: {
    shippingStatus?: "pending" | "shipped" | "received" | "inspected" | "exhibited";
    shippingNote?: string;
    shippingCarrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  }
): Promise<Application | null> {
  try {
    const row = await prisma.application.update({
      where: { id },
      data: {
        shippingStatus: input.shippingStatus as any,
        shippingNote: input.shippingNote,
        shippingCarrier: input.shippingCarrier,
        trackingNumber: input.trackingNumber,
        trackingUrl: input.trackingUrl,
      },
    });
    return toApp(row);
  } catch {
    return null;
  }
}

export async function updateApplicationStatus(
  id: string,
  status: "submitted" | "reviewing" | "accepted" | "rejected"
): Promise<Application | null> {
  try {
    const row = await prisma.application.update({ where: { id }, data: { status } });
    return toApp(row);
  } catch {
    return null;
  }
}

export async function listExternalApplications(): Promise<Application[]> {
  const rows = await prisma.application.findMany({ where: { isExternal: true }, orderBy: { createdAt: "desc" } });
  return rows.map(toApp);
}

export async function listPendingOutreach(): Promise<Application[]> {
  const rows = await prisma.application.findMany({ where: { isExternal: true, outreachSent: false }, orderBy: { createdAt: "desc" } });
  return rows.map(toApp);
}

export async function markOutreachSent(id: string, note?: string): Promise<Application | null> {
  try {
    const row = await prisma.application.update({
      where: { id },
      data: { outreachSent: true, outreachSentAt: new Date(), outreachNote: note },
    });
    return toApp(row);
  } catch {
    return null;
  }
}

export async function setApplicationExternal(id: string): Promise<void> {
  try {
    await prisma.application.update({ where: { id }, data: { isExternal: true } });
  } catch { /* ignore */ }
}
