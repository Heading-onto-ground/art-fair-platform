/**
 * Safe seeding template (no hardcoded credentials).
 *
 * Usage:
 *   1) Set DATABASE_URL
 *   2) Run: npx tsx scripts/seed-seoul-galleries.ts
 *   3) Share generated CSV to each gallery, then ask for password reset.
 */
import pg from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const dbUrl = (process.env.DATABASE_URL || "").replace(/\\n$/, "").trim();

type SeoulGallery = {
  name: string;
  city: "Seoul";
  country: "한국";
  website: string;
  foundedYear: number;
  address: string;
  bio: string;
};

// Public directory data only (no id/password in source).
const SEOUL_GALLERIES: SeoulGallery[] = [
  { name: "PKM Gallery", city: "Seoul", country: "한국", website: "https://www.pkmgallery.com", foundedYear: 2001, address: "Jongno-gu, Seoul", bio: "Contemporary art gallery in Seoul." },
  { name: "Kukje Gallery", city: "Seoul", country: "한국", website: "https://www.kukjegallery.com", foundedYear: 1982, address: "Jongno-gu, Seoul", bio: "Major Korean contemporary art gallery." },
  { name: "Gallery Hyundai", city: "Seoul", country: "한국", website: "https://www.galleryhyundai.com", foundedYear: 1970, address: "Jongno-gu, Seoul", bio: "Historic Korean commercial gallery." },
  { name: "Arario Gallery", city: "Seoul", country: "한국", website: "https://www.arariogallery.com", foundedYear: 2002, address: "Jongno-gu, Seoul", bio: "International contemporary art gallery." },
  { name: "Pace Gallery Seoul", city: "Seoul", country: "한국", website: "https://www.pacegallery.com", foundedYear: 2017, address: "Yongsan-gu, Seoul", bio: "Seoul space of Pace Gallery." },
  { name: "Leeahn Gallery", city: "Seoul", country: "한국", website: "https://www.leeahngallery.com", foundedYear: 2007, address: "Gangnam-gu, Seoul", bio: "Contemporary gallery in Seoul." },
  { name: "Hakgojae Gallery", city: "Seoul", country: "한국", website: "https://www.hakgojae.com", foundedYear: 1988, address: "Jongno-gu, Seoul", bio: "Samcheong-dong contemporary gallery." },
  { name: "Gallery Baton", city: "Seoul", country: "한국", website: "https://www.gallerybaton.com", foundedYear: 2011, address: "Yongsan-gu, Seoul", bio: "Contemporary gallery with international program." },
  { name: "Art Sonje Center", city: "Seoul", country: "한국", website: "https://www.artsonje.org", foundedYear: 1998, address: "Jongno-gu, Seoul", bio: "Contemporary art center in Seoul." },
  { name: "Gana Art Center", city: "Seoul", country: "한국", website: "https://www.ganaart.com", foundedYear: 1983, address: "Jongno-gu, Seoul", bio: "Leading gallery and art center." },
];

function cuid() {
  return "c" + crypto.randomBytes(12).toString("hex");
}

function slug(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
}

function emailFor(name: string) {
  return `${slug(name)}@gallery.art`;
}

function randomPassword() {
  // 14 chars with mixed classes
  return (
    crypto.randomBytes(5).toString("base64url") +
    crypto.randomBytes(3).toString("hex") +
    "!"
  ).slice(0, 14);
}

function galleryIdFor(name: string) {
  return `DIR-${name.replace(/[^a-zA-Z0-9]+/g, "-").toUpperCase().slice(0, 20)}`;
}

async function main() {
  if (!dbUrl) throw new Error("DATABASE_URL is empty");

  const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  const rows: Array<{ name: string; email: string; password: string; status: string }> = [];
  let created = 0;
  let updated = 0;
  let errors = 0;

  try {
    for (const g of SEOUL_GALLERIES) {
      const email = emailFor(g.name);
      const password = randomPassword();
      const passwordHash = bcrypt.hashSync(password, 10);

      try {
        const userRes = await client.query(
          `SELECT id FROM "User" WHERE email = $1 AND role = 'gallery'`,
          [email]
        );

        let userId: string;
        if (userRes.rows.length > 0) {
          userId = userRes.rows[0].id as string;
          await client.query(`UPDATE "User" SET "passwordHash"=$1 WHERE id=$2`, [passwordHash, userId]);
          await client.query(
            `UPDATE "GalleryProfile"
             SET name=$1, address=$2, "foundedYear"=$3, country=$4, city=$5, website=$6, bio=$7, "updatedAt"=NOW()
             WHERE "userId"=$8`,
            [g.name, g.address, g.foundedYear, g.country, g.city, g.website, g.bio, userId]
          );
          updated++;
          rows.push({ name: g.name, email, password, status: "updated" });
        } else {
          userId = cuid();
          await client.query(
            `INSERT INTO "User" (id, email, role, "passwordHash") VALUES ($1,$2,'gallery',$3)`,
            [userId, email, passwordHash]
          );
          await client.query(
            `INSERT INTO "GalleryProfile" (id, "userId", "galleryId", name, address, "foundedYear", country, city, website, bio, "createdAt", "updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
            [cuid(), userId, galleryIdFor(g.name), g.name, g.address, g.foundedYear, g.country, g.city, g.website, g.bio]
          );
          created++;
          rows.push({ name: g.name, email, password, status: "created" });
        }
      } catch (e: any) {
        errors++;
        rows.push({ name: g.name, email, password, status: `error: ${String(e?.message || "").slice(0, 40)}` });
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  const outDir = path.join(process.cwd(), "scripts", "output");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "seoul-gallery-credentials.csv");
  const csv = [
    "name,email,password,status",
    ...rows.map((r) => [r.name, r.email, r.password, r.status].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  fs.writeFileSync(outFile, csv, "utf8");

  console.log(`done created=${created} updated=${updated} errors=${errors}`);
  console.log(`credentials: ${outFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

