/**
 * Safe template for country/city gallery account seeding.
 * No hardcoded passwords. Credentials are generated at runtime and saved locally.
 *
 * Run:
 *   npx tsx scripts/seed-country-city-galleries.ts
 */
import pg from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const dbUrl = (process.env.DATABASE_URL || "").replace(/\\n$/, "").trim();

type Entry = {
  name: string;
  country: string;
  city: string;
  website: string;
  foundedYear: number;
  address: string;
  bio: string;
};

const ENTRIES: Entry[] = [
  { name: "NANZUKA", country: "일본", city: "Tokyo", website: "https://www.nanzuka.com", foundedYear: 2005, address: "Shibuya-ku, Tokyo", bio: "Contemporary gallery program in Tokyo." },
  { name: "The Modern Institute", country: "영국", city: "Glasgow", website: "https://www.themoderninstitute.com", foundedYear: 1997, address: "Glasgow", bio: "International contemporary art gallery." },
  { name: "Regen Projects", country: "미국", city: "Los Angeles", website: "https://www.regenprojects.com", foundedYear: 1989, address: "Los Angeles", bio: "Major LA contemporary gallery." },
  { name: "Galerie Max Hetzler", country: "독일", city: "Berlin", website: "https://www.maxhetzler.com", foundedYear: 1974, address: "Berlin", bio: "Leading German gallery." },
  { name: "Gió Marconi", country: "이탈리아", city: "Milan", website: "https://www.giomarconi.com", foundedYear: 1990, address: "Milan", bio: "Contemporary gallery in Milan." },
  { name: "White Space Beijing", country: "중국", city: "Beijing", website: "https://www.whitespace-beijing.com", foundedYear: 2004, address: "798 Art District", bio: "Contemporary gallery in Beijing." },
  { name: "von Bartha", country: "스위스", city: "Basel", website: "https://www.vonbartha.com", foundedYear: 1970, address: "Basel", bio: "Swiss gallery with international program." },
  { name: "Sutton Gallery", country: "호주", city: "Melbourne", website: "https://www.suttongallery.com.au", foundedYear: 1988, address: "Melbourne", bio: "Contemporary Australian art gallery." },
];

function cuid() {
  return "c" + crypto.randomBytes(12).toString("hex");
}

function slug(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
}

function emailFor(name: string, city: string) {
  return `${slug(name)}.${slug(city)}@gallery.art`;
}

function randomPassword() {
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

  const rows: Array<{ country: string; city: string; name: string; email: string; password: string; status: string }> = [];
  let created = 0;
  let updated = 0;
  let errors = 0;

  try {
    for (const e of ENTRIES) {
      const email = emailFor(e.name, e.city);
      const password = randomPassword();
      const passwordHash = bcrypt.hashSync(password, 10);

      try {
        const userRes = await client.query(`SELECT id FROM "User" WHERE email=$1 AND role='gallery'`, [email]);
        let userId: string;

        if (userRes.rows.length > 0) {
          userId = userRes.rows[0].id as string;
          await client.query(`UPDATE "User" SET "passwordHash"=$1 WHERE id=$2`, [passwordHash, userId]);
          await client.query(
            `UPDATE "GalleryProfile"
             SET name=$1, address=$2, "foundedYear"=$3, country=$4, city=$5, website=$6, bio=$7, "updatedAt"=NOW()
             WHERE "userId"=$8`,
            [e.name, e.address, e.foundedYear, e.country, e.city, e.website, e.bio, userId]
          );
          updated++;
          rows.push({ country: e.country, city: e.city, name: e.name, email, password, status: "updated" });
        } else {
          userId = cuid();
          await client.query(
            `INSERT INTO "User" (id, email, role, "passwordHash") VALUES ($1,$2,'gallery',$3)`,
            [userId, email, passwordHash]
          );
          await client.query(
            `INSERT INTO "GalleryProfile" (id, "userId", "galleryId", name, address, "foundedYear", country, city, website, bio, "createdAt", "updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
            [cuid(), userId, galleryIdFor(e.name), e.name, e.address, e.foundedYear, e.country, e.city, e.website, e.bio]
          );
          created++;
          rows.push({ country: e.country, city: e.city, name: e.name, email, password, status: "created" });
        }
      } catch (err: any) {
        errors++;
        rows.push({ country: e.country, city: e.city, name: e.name, email, password, status: `error: ${String(err?.message || "").slice(0, 40)}` });
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  const outDir = path.join(process.cwd(), "scripts", "output");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "city-gallery-credentials.csv");
  const csv = [
    "country,city,name,email,password,status",
    ...rows.map((r) => [r.country, r.city, r.name, r.email, r.password, r.status].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  fs.writeFileSync(outFile, csv, "utf8");

  console.log(`done created=${created} updated=${updated} errors=${errors}`);
  console.log(`credentials: ${outFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

