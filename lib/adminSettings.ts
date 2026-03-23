import { prisma } from "@/lib/prisma";

const ADMIN_SETTING_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "AdminSetting" (
    "key" TEXT PRIMARY KEY,
    "value" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

let _adminSettingTableEnsured = false;

async function ensureAdminSettingTable() {
  if (_adminSettingTableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(ADMIN_SETTING_TABLE_SQL);
    _adminSettingTableEnsured = true;
  } catch (e) {
    // Best-effort: don't crash unrelated routes on restricted DB perms.
    console.error("AdminSetting table ensure failed (non-fatal):", e);
  }
}

const PINNED_OPEN_CALL_GALLERY_ID_KEY = "pinned_open_call_gallery_id";
const PINNED_OPEN_CALL_ID_KEY = "pinned_open_call_id";
export const ADMIN_PASSWORD_HASH_KEY = "admin_password_hash";

export async function getAdminPasswordHash(): Promise<string | null> {
  await ensureAdminSettingTable();
  try {
    const row = await prisma.adminSetting.findUnique({
      where: { key: ADMIN_PASSWORD_HASH_KEY },
    });
    const v = String(row?.value || "").trim();
    return v ? v : null;
  } catch (e) {
    console.error("getAdminPasswordHash failed (non-fatal):", e);
    return null;
  }
}

export async function setAdminPasswordHash(hash: string): Promise<void> {
  await ensureAdminSettingTable();
  await prisma.adminSetting.upsert({
    where: { key: ADMIN_PASSWORD_HASH_KEY },
    create: { key: ADMIN_PASSWORD_HASH_KEY, value: hash },
    update: { value: hash },
  });
}

export async function clearAdminPasswordHash(): Promise<void> {
  await ensureAdminSettingTable();
  try {
    await prisma.adminSetting.delete({ where: { key: ADMIN_PASSWORD_HASH_KEY } });
  } catch {
    // ignore if missing
  }
}

export async function getPinnedOpenCallGalleryId(): Promise<string | null> {
  await ensureAdminSettingTable();
  try {
    const row = await prisma.adminSetting.findUnique({
      where: { key: PINNED_OPEN_CALL_GALLERY_ID_KEY },
    });
    const v = String(row?.value || "").trim();
    return v ? v : null;
  } catch (e) {
    console.error("getPinnedOpenCallGalleryId failed (non-fatal):", e);
    return null;
  }
}

export async function setPinnedOpenCallGalleryId(galleryId: string | null): Promise<void> {
  await ensureAdminSettingTable();
  const v = String(galleryId || "").trim();
  if (!v) {
    try {
      await prisma.adminSetting.delete({ where: { key: PINNED_OPEN_CALL_GALLERY_ID_KEY } });
    } catch {
      // ignore if missing
    }
    return;
  }

  await prisma.adminSetting.upsert({
    where: { key: PINNED_OPEN_CALL_GALLERY_ID_KEY },
    create: { key: PINNED_OPEN_CALL_GALLERY_ID_KEY, value: v },
    update: { value: v },
  });
}

export async function getPinnedOpenCallId(): Promise<string | null> {
  await ensureAdminSettingTable();
  try {
    const row = await prisma.adminSetting.findUnique({
      where: { key: PINNED_OPEN_CALL_ID_KEY },
    });
    const v = String(row?.value || "").trim();
    return v ? v : null;
  } catch (e) {
    console.error("getPinnedOpenCallId failed (non-fatal):", e);
    return null;
  }
}

export async function setPinnedOpenCallId(openCallId: string | null): Promise<void> {
  await ensureAdminSettingTable();
  const v = String(openCallId || "").trim();
  if (!v) {
    try {
      await prisma.adminSetting.delete({ where: { key: PINNED_OPEN_CALL_ID_KEY } });
    } catch {
      // ignore if missing
    }
    return;
  }

  await prisma.adminSetting.upsert({
    where: { key: PINNED_OPEN_CALL_ID_KEY },
    create: { key: PINNED_OPEN_CALL_ID_KEY, value: v },
    update: { value: v },
  });
}

