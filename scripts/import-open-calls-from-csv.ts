/**
 * Bulk import open calls from CSV.
 *
 * What this script does:
 * 1) Creates/updates gallery accounts safely (no hardcoded credentials in source)
 * 2) Creates open call rows linked to each gallery
 * 3) Saves generated credentials to local CSV under scripts/output
 *
 * Usage:
 *   npx tsx scripts/import-open-calls-from-csv.ts --file scripts/templates/open-calls-import-template.csv
 *
 * Optional flags:
 *   --source "<url>"   default source URL to apply when row source_url is empty
 */
import pg from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const dbUrl = (process.env.DATABASE_URL || "").replace(/\\n$/, "").trim();

type CsvRow = {
  gallery_name: string;
  gallery_country: string;
  gallery_city: string;
  gallery_website?: string;
  gallery_address?: string;
  gallery_founded_year?: string;
  gallery_bio?: string;
  open_call_theme: string;
  deadline: string;
  source_url?: string;
  source_label?: string;
};

const ALLOWED_COUNTRIES = new Set([
  "한국",
  "일본",
  "영국",
  "프랑스",
  "미국",
  "독일",
  "이탈리아",
  "중국",
  "스위스",
  "호주",
]);

function cuid() {
  return "c" + crypto.randomBytes(12).toString("hex");
}

function slug(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
}

function galleryIdFor(name: string) {
  return `DIR-${name.replace(/[^a-zA-Z0-9]+/g, "-").toUpperCase().slice(0, 20)}`;
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

function parseArg(name: string): string | null {
  const idx = process.argv.indexOf(name);
  if (idx < 0) return null;
  return process.argv[idx + 1] ?? null;
}

function csvEscape(v: string) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
      continue;
    }
    if (ch === "," && !inQuote) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = vals[idx] ?? "";
    });
    rows.push(obj as CsvRow);
  }
  return rows;
}

function normalizeDeadline(v: string): string {
  const s = String(v || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(s)) return s.replace(/\./g, "-");
  return s;
}

async function main() {
  if (!dbUrl) throw new Error("DATABASE_URL is empty");

  const fileArg = parseArg("--file");
  if (!fileArg) {
    throw new Error("Missing --file argument");
  }
  const sourceArg = parseArg("--source") || "";
  const csvPath = path.resolve(process.cwd(), fileArg);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`);
  }

  const raw = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    throw new Error("CSV has no data rows");
  }

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const client = await pool.connect();

  type CredRow = {
    gallery_name: string;
    gallery_email: string;
    gallery_password: string;
    account_status: string;
  };
  const credRows: CredRow[] = [];
  let createdUsers = 0;
  let reusedUsers = 0;
  let createdOpenCalls = 0;
  let skippedOpenCalls = 0;
  let errors = 0;

  try {
    for (const row of rows) {
      const galleryName = String(row.gallery_name || "").trim();
      const country = String(row.gallery_country || "").trim();
      const city = String(row.gallery_city || "").trim();
      const website = String(row.gallery_website || "").trim();
      const address = String(row.gallery_address || "").trim() || `${city}, ${country}`;
      const foundedYear = Number(String(row.gallery_founded_year || "").trim()) || 2000;
      const bio =
        String(row.gallery_bio || "").trim() ||
        "Directory-seeded profile from curated open-call import.";
      const theme = String(row.open_call_theme || "").trim();
      const deadline = normalizeDeadline(row.deadline);
      const sourceUrl = String(row.source_url || "").trim() || sourceArg;
      const sourceLabel = String(row.source_label || "").trim();

      if (!galleryName || !country || !city || !theme || !deadline) {
        errors++;
        continue;
      }
      if (!ALLOWED_COUNTRIES.has(country)) {
        errors++;
        continue;
      }

      const email = emailFor(galleryName, city);
      const generatedPassword = randomPassword();
      const passwordHash = bcrypt.hashSync(generatedPassword, 10);

      try {
        const userRes = await client.query(
          `SELECT id FROM "User" WHERE email = $1 AND role = 'gallery'`,
          [email]
        );

        let userId: string;
        if (userRes.rows.length > 0) {
          userId = userRes.rows[0].id as string;
          reusedUsers++;
          credRows.push({
            gallery_name: galleryName,
            gallery_email: email,
            gallery_password: "",
            account_status: "existing",
          });
        } else {
          userId = cuid();
          await client.query(
            `INSERT INTO "User" (id, email, role, "passwordHash") VALUES ($1,$2,'gallery',$3)`,
            [userId, email, passwordHash]
          );
          await client.query(
            `INSERT INTO "GalleryProfile" (id, "userId", "galleryId", name, address, "foundedYear", country, city, website, bio, "createdAt", "updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
            [
              cuid(),
              userId,
              galleryIdFor(galleryName),
              galleryName,
              address,
              foundedYear,
              country,
              city,
              website || null,
              bio,
            ]
          );
          createdUsers++;
          credRows.push({
            gallery_name: galleryName,
            gallery_email: email,
            gallery_password: generatedPassword,
            account_status: "created",
          });
        }

        const duplicateRes = await client.query(
          `SELECT id FROM "OpenCall"
           WHERE "galleryId" = $1 AND theme = $2 AND deadline = $3`,
          [userId, theme, deadline]
        );
        if (duplicateRes.rows.length > 0) {
          skippedOpenCalls++;
          continue;
        }

        const finalTheme = sourceLabel
          ? `${theme} (${sourceLabel})`
          : theme;

        await client.query(
          `INSERT INTO "OpenCall"
           (id, "galleryId", gallery, city, country, theme, deadline, "isExternal", "externalUrl", "galleryWebsite", "galleryDescription", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8,$9,$10,NOW(),NOW())`,
          [
            cuid(),
            userId,
            galleryName,
            city,
            country,
            finalTheme,
            deadline,
            sourceUrl || null,
            website || null,
            bio,
          ]
        );
        createdOpenCalls++;
      } catch (e) {
        errors++;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  const outDir = path.join(process.cwd(), "scripts", "output");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const credFile = path.join(outDir, `imported-gallery-credentials-${stamp}.csv`);
  const credCsv = [
    "gallery_name,gallery_email,gallery_password,account_status",
    ...credRows.map((r) =>
      [
        csvEscape(r.gallery_name),
        csvEscape(r.gallery_email),
        csvEscape(r.gallery_password),
        csvEscape(r.account_status),
      ].join(",")
    ),
  ].join("\n");
  fs.writeFileSync(credFile, credCsv, "utf8");

  console.log(
    [
      `done users_created=${createdUsers}`,
      `users_existing=${reusedUsers}`,
      `open_calls_created=${createdOpenCalls}`,
      `open_calls_skipped=${skippedOpenCalls}`,
      `errors=${errors}`,
      `credentials=${credFile}`,
    ].join(" ")
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

