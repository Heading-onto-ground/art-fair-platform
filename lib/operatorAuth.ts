// lib/operatorAuth.ts
// Operator = a limited privileged tier below the super-admin.
// Granted by the super-admin (User.isOperator). Operators log in with their
// normal user account and may ONLY: manage gatherings, moderate feed posts,
// and read the member list. Everything else stays super-admin only.

import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { getAdminSession } from "@/lib/adminAuth";

export type OperatorContext = {
  /** True when the caller is the env-based super-admin (full powers). */
  isSuperAdmin: boolean;
  /** User.id of the operator, or null for the super-admin. */
  userId: string | null;
  /** Display identity used for audit fields (createdBy etc.). */
  actor: string;
};

/**
 * Resolve an operator context for the current request.
 * Returns a context if the caller is the super-admin OR a flagged operator user.
 * Returns null otherwise. Use this to gate operator-scoped endpoints.
 */
export async function getOperatorContext(): Promise<OperatorContext | null> {
  // Super-admin (separate cookie) always qualifies.
  const admin = getAdminSession();
  if (admin) {
    return { isSuperAdmin: true, userId: null, actor: admin.email };
  }

  const session = getServerSession();
  if (!session?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, isOperator: true },
  }) as { id: string; email: string; isOperator: boolean } | null;

  if (user?.isOperator) {
    return { isSuperAdmin: false, userId: user.id, actor: user.email };
  }
  return null;
}
