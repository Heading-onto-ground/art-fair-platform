// lib/auth.ts
// Prisma-backed auth + profiles

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signSession, verifySession } from "@/lib/session";

/** ===== Types ===== */
export type Role = "artist" | "gallery";

export type Session = {
  userId: string;
  role: Role;
  email?: string;
};

export type ArtistProfile = {
  id: string;
  userId: string;
  role: "artist";
  email: string;
  artistId: string;
  name: string;
  startedYear: number;
  genre: string;
  instagram?: string;
  country: string;
  city: string;
  website?: string;
  bio?: string;
  portfolioUrl?: string;
  profileImage?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type GalleryProfile = {
  id: string;
  userId: string;
  role: "gallery";
  email: string;
  galleryId: string;
  name: string;
  address: string;
  foundedYear: number;
  instagram?: string;
  country: string;
  city: string;
  website?: string;
  bio?: string;
  profileImage?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type Profile = ArtistProfile | GalleryProfile;

/** ===== Cookie helpers ===== */
const COOKIE_NAME = "afp_session";

export function getServerSession(): Session | null {
  try {
    const raw = cookies().get(COOKIE_NAME)?.value;
    if (!raw) return null;

    // Only accept signed session payloads.
    const verified = verifySession<Session>(raw);
    if (verified && verified.userId && verified.role) {
      return verified;
    }
    return null;
  } catch {
    return null;
  }
}

/** Create a signed session cookie value */
export function createSignedSessionValue(session: Session): string {
  return signSession(session as unknown as Record<string, unknown>);
}

/** ===== Profile helpers ===== */
export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const artists = await prisma.$queryRawUnsafe(
    `SELECT *, COALESCE("notify_new_community_post", FALSE) AS "notify_new_community_post"
     FROM "ArtistProfile" WHERE "userId" = $1 LIMIT 1`,
    userId
  ).catch(() => null) as any[] | null;
  if (artists && artists[0]) return { ...artists[0], role: "artist" } as ArtistProfile;
  const gallery = await prisma.galleryProfile.findUnique({ where: { userId } });
  if (gallery) return { ...gallery, role: "gallery" } as GalleryProfile;
  return null;
}

export async function listArtistProfiles(): Promise<ArtistProfile[]> {
  return prisma.artistProfile.findMany();
}

export async function listGalleryProfiles(): Promise<GalleryProfile[]> {
  return prisma.galleryProfile.findMany();
}

export function upsertArtistProfile(
  userId: string,
  data: Partial<Omit<ArtistProfile, "id" | "userId" | "role" | "createdAt" | "updatedAt">>
): Promise<ArtistProfile> {
  return prisma.artistProfile.upsert({
    where: { userId },
    create: {
      userId,
      artistId: data.artistId ?? `ART-${Date.now()}`,
      name: data.name ?? "Unnamed Artist",
      startedYear: data.startedYear ?? new Date().getFullYear(),
      genre: data.genre ?? "",
      instagram: data.instagram,
      country: data.country ?? "",
      city: data.city ?? "",
      website: data.website,
      bio: data.bio,
      portfolioUrl: data.portfolioUrl,
      profileImage: data.profileImage,
    },
    update: {
      artistId: data.artistId,
      name: data.name,
      startedYear: data.startedYear,
      genre: data.genre,
      instagram: data.instagram,
      country: data.country,
      city: data.city,
      website: data.website,
      bio: data.bio,
      portfolioUrl: data.portfolioUrl,
      ...(data.profileImage !== undefined ? { profileImage: data.profileImage } : {}),
    },
  });
}

export function upsertGalleryProfile(
  userId: string,
  data: Partial<Omit<GalleryProfile, "id" | "userId" | "role" | "createdAt" | "updatedAt">>
): Promise<GalleryProfile> {
  return prisma.galleryProfile.upsert({
    where: { userId },
    create: {
      userId,
      galleryId: data.galleryId ?? `GAL-${Date.now()}`,
      name: data.name ?? "Unnamed Gallery",
      address: data.address ?? "",
      foundedYear: data.foundedYear ?? new Date().getFullYear(),
      instagram: data.instagram,
      country: data.country ?? "",
      city: data.city ?? "",
      website: data.website,
      bio: data.bio,
      profileImage: data.profileImage,
    },
    update: {
      galleryId: data.galleryId,
      name: data.name,
      address: data.address,
      foundedYear: data.foundedYear,
      instagram: data.instagram,
      country: data.country,
      city: data.city,
      website: data.website,
      bio: data.bio,
      ...(data.profileImage !== undefined ? { profileImage: data.profileImage } : {}),
    },
  });
}

/** ===== User helpers ===== */
export async function findUserByEmailRole(email: string, role: Role) {
  return prisma.user.findFirst({ where: { email, role } });
}

export async function createUser(input: { email: string; role: Role; password: string }) {
  const existing = await prisma.user.findFirst({
    where: { email: input.email.toLowerCase(), role: input.role },
  });
  if (existing) throw new Error("user exists");

  return prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      role: input.role,
      passwordHash: bcrypt.hashSync(input.password, 10),
    },
  });
}

export function verifyPassword(user: { passwordHash: string }, password: string) {
  return bcrypt.compareSync(password, user.passwordHash);
}

/** ===== Backward-compatible alias =====
 * (기존에 upsertProfile을 작가 업서트로 쓰던 코드가 있으면 유지)
 */
export const upsertProfile = upsertArtistProfile;
