import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { Client } from "pg";
import { VERIFIED_ALIASES, normalizeArtistLookup } from "../lib/history/identity";

function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const line = readFileSync(".env", "utf8").split(/\r?\n/).find((item) => item.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL missing");
  let value = line.slice("DATABASE_URL=".length).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return value;
}

async function main() {
  const preview = process.argv.includes("--preview");
  if (!preview && process.env.ROB_CONFIRM_ALIAS_IMPORT !== "1") {
    console.log("REFUSED");
    process.exit(1);
  }
  const client = new Client({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const artists = await client.query<{ id: string; slug: string; canonicalName: string; nativeName: string | null }>(
      `SELECT id, slug, "canonicalName", "nativeName" FROM "ArtistEntity"`,
    );
    const existing = await client.query<{ artistEntityId: string; label: string }>(`SELECT "artistEntityId", label FROM "ArtistAlias"`);
    const bySlug = new Map(artists.rows.map((row) => [row.slug, row]));
    const have = new Set(existing.rows.map((row) => `${row.artistEntityId}|${row.label}`));
    const planned = VERIFIED_ALIASES.flatMap((alias) => {
      const artist = bySlug.get(alias.slug);
      if (!artist) return [];
      const norm = normalizeArtistLookup(alias.label);
      if (have.has(`${artist.id}|${alias.label}`)) return [];
      if (normalizeArtistLookup(artist.canonicalName) === norm || (artist.nativeName && normalizeArtistLookup(artist.nativeName) === norm)) return [];
      return [{ ...alias, artistId: artist.id }];
    });
    const before = await client.query(
      `SELECT (SELECT COUNT(*)::int FROM "User") AS users, (SELECT COUNT(*)::int FROM "ArtistProfile") AS profiles`,
    );
    if (preview) {
      console.log(JSON.stringify({ imported: false, planned: planned.map((row) => ({ slug: row.slug, label: row.label })) }, null, 2));
      return;
    }
    await client.query("BEGIN");
    for (const row of planned) {
      await client.query(
        `INSERT INTO "ArtistAlias" (id, "artistEntityId", label, "createdAt") VALUES ($1, $2, $3, NOW())`,
        [randomUUID(), row.artistId, row.label],
      );
    }
    const after = await client.query(
      `SELECT (SELECT COUNT(*)::int FROM "User") AS users, (SELECT COUNT(*)::int FROM "ArtistProfile") AS profiles`,
    );
    if (after.rows[0].users !== before.rows[0].users || after.rows[0].profiles !== before.rows[0].profiles) {
      await client.query("ROLLBACK");
      console.log("ALIAS_IMPORT_BLOCKED");
      process.exit(1);
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ imported: true, written: planned.length, users: after.rows[0].users }));
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "failed";
  console.log(message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]"));
  process.exit(1);
});
