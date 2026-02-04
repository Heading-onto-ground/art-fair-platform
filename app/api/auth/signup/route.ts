import { NextResponse } from "next/server";
import { createUser, upsertArtistProfile, upsertGalleryProfile } from "@/lib/auth";

type Role = "artist" | "gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("POST /api/auth/signup: DATABASE_URL is not set");
      return NextResponse.json(
        { ok: false, error: "server error", details: "DATABASE_URL is not set" },
        { status: 500 }
      );
    }
    const body = await req.json().catch(() => null);
    const role = String(body?.role ?? "") as Role;
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "").trim();
    const artistId = String(body?.artistId ?? "").trim();
    const galleryId = String(body?.galleryId ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const startedYear = Number(body?.startedYear ?? 0);
    const genre = String(body?.genre ?? "").trim();
    const instagram = String(body?.instagram ?? "").trim();
    const portfolioUrl = String(body?.portfolioUrl ?? "").trim();
    const address = String(body?.address ?? "").trim();
    const foundedYear = Number(body?.foundedYear ?? 0);

    if (role !== "artist" && role !== "gallery") {
      return NextResponse.json({ ok: false, error: "invalid role" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "password min 6 chars" },
        { status: 400 }
      );
    }
    if (role === "artist") {
      if (!artistId || !name || !startedYear || !genre) {
        return NextResponse.json(
          { ok: false, error: "missing artist fields" },
          { status: 400 }
        );
      }
    }
    if (role === "gallery") {
      if (!galleryId || !name || !address || !foundedYear || !instagram) {
        return NextResponse.json(
          { ok: false, error: "missing gallery fields" },
          { status: 400 }
        );
      }
    }

    const user = await createUser({ email, role, password });

    // create empty profile
    if (role === "artist") {
      await upsertArtistProfile(user.id, {
        email,
        artistId,
        name,
        startedYear,
        genre,
        instagram,
        portfolioUrl,
      });
    } else {
      await upsertGalleryProfile(user.id, {
        email,
        galleryId,
        name,
        address,
        foundedYear,
        instagram,
      });
    }

    const res = NextResponse.json(
      { ok: true, session: { userId: user.id, role, email } },
      { status: 200 }
    );
    const isProduction = process.env.NODE_ENV === "production";
    res.cookies.set("afp_session", JSON.stringify({ userId: user.id, role, email }), {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e: any) {
    if (String(e?.message).includes("user exists")) {
      return NextResponse.json({ ok: false, error: "user exists" }, { status: 409 });
    }
    console.error("POST /api/auth/signup failed:", e);
    const details = e instanceof Error ? e.message : String(e) || "unknown error";
    return NextResponse.json(
      { ok: false, error: "server error", details },
      { status: 500 }
    );
  }
}
