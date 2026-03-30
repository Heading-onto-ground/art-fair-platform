import { prisma } from "@/lib/prisma";

const REQUESTS_KEY = "artist_verification_requests_v1";
const APPROVALS_KEY = "artist_verification_approvals_v1";

export type VerificationRequest = {
  id: string;
  userId: string;
  artistId: string;
  artistName: string;
  email: string;
  note?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  updatedAt: number;
  reviewedAt?: number;
  reviewerEmail?: string;
  reviewNote?: string;
};

export type VerificationApproval = {
  userId: string;
  artistId: string;
  label: string;
  approvedAt: number;
  reviewerEmail?: string;
};

async function getSetting(key: string): Promise<string> {
  const row = await prisma.adminSetting.findUnique({ where: { key } }).catch(() => null);
  return String(row?.value || "");
}

async function setSetting(key: string, value: string): Promise<void> {
  await prisma.adminSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

function parseJsonArray<T>(raw: string): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export async function listVerificationRequests(): Promise<VerificationRequest[]> {
  const rows = parseJsonArray<VerificationRequest>(await getSetting(REQUESTS_KEY));
  return rows.slice().sort((a, b) => b.createdAt - a.createdAt);
}

export async function listVerificationApprovals(): Promise<VerificationApproval[]> {
  return parseJsonArray<VerificationApproval>(await getSetting(APPROVALS_KEY));
}

export async function getVerificationByArtistId(artistId: string): Promise<VerificationApproval | null> {
  const approvals = await listVerificationApprovals();
  return approvals.find((a) => a.artistId === artistId) || null;
}

export async function getVerificationByUserId(userId: string): Promise<VerificationApproval | null> {
  const approvals = await listVerificationApprovals();
  return approvals.find((a) => a.userId === userId) || null;
}

export async function upsertVerificationRequest(input: {
  userId: string;
  artistId: string;
  artistName: string;
  email: string;
  note?: string;
}): Promise<VerificationRequest> {
  const list = await listVerificationRequests();
  const now = Date.now();
  const existingIdx = list.findIndex((r) => r.userId === input.userId && r.status === "pending");
  if (existingIdx >= 0) {
    const updated: VerificationRequest = {
      ...list[existingIdx],
      artistId: input.artistId,
      artistName: input.artistName,
      email: input.email,
      note: input.note,
      updatedAt: now,
    };
    list[existingIdx] = updated;
    await setSetting(REQUESTS_KEY, JSON.stringify(list));
    return updated;
  }

  const created: VerificationRequest = {
    id: `verify_req_${now}_${Math.random().toString(16).slice(2)}`,
    userId: input.userId,
    artistId: input.artistId,
    artistName: input.artistName,
    email: input.email,
    note: input.note,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  list.unshift(created);
  await setSetting(REQUESTS_KEY, JSON.stringify(list));
  return created;
}

export async function reviewVerificationRequest(input: {
  requestId: string;
  action: "approved" | "rejected";
  reviewerEmail?: string;
  reviewNote?: string;
  label?: string;
}): Promise<VerificationRequest | null> {
  const list = await listVerificationRequests();
  const idx = list.findIndex((r) => r.id === input.requestId);
  if (idx < 0) return null;

  const now = Date.now();
  const current = list[idx];
  const updated: VerificationRequest = {
    ...current,
    status: input.action,
    updatedAt: now,
    reviewedAt: now,
    reviewerEmail: input.reviewerEmail,
    reviewNote: input.reviewNote,
  };
  list[idx] = updated;
  await setSetting(REQUESTS_KEY, JSON.stringify(list));

  if (input.action === "approved") {
    const approvals = await listVerificationApprovals();
    const nextLabel = String(input.label || "Verified Artist");
    const approval: VerificationApproval = {
      userId: current.userId,
      artistId: current.artistId,
      label: nextLabel,
      approvedAt: now,
      reviewerEmail: input.reviewerEmail,
    };
    const existingApprovalIdx = approvals.findIndex((a) => a.userId === current.userId);
    if (existingApprovalIdx >= 0) approvals[existingApprovalIdx] = approval;
    else approvals.push(approval);
    await setSetting(APPROVALS_KEY, JSON.stringify(approvals));
  }

  return updated;
}
