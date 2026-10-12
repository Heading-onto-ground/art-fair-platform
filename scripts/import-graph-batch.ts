import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { Client } from "pg";
import { VERIFIED_ALIASES, mayRelinkUnresolvedName, normalizeArtistLookup, resolveArtistSlug } from "../lib/history/identity";
import { uniqueSlug } from "../lib/history/policy";

type ArtistPlan = {
  slug: string;
  canonicalName: string;
  nativeName: string | null;
  birthYear: number | null;
  country: string | null;
  officialWebsite: string | null;
};

type FactPlan = { slug: string; birthYear?: number; country?: string };

type SourcePlan = { sourceName: string; sourceUrl: string; sourceType: string };

type RecordPlan = {
  pilotRecordId: string;
  title: string;
  year: number;
  venue: string;
  city: string;
  country: string;
  participants: string[];
  sources: SourcePlan[];
};

type BatchFile = { importVersion: string; artists: ArtistPlan[]; facts: FactPlan[]; records: RecordPlan[] };

function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const line = readFileSync(".env", "utf8").split(/\r?\n/).find((item) => item.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL missing");
  let value = line.slice("DATABASE_URL=".length).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return value;
}

function sameShow(left: { year: number | null; title: string; venue: string | null }, right: { year: number; title: string; venue: string }): boolean {
  return left.year === right.year && left.title.trim().toLowerCase() === right.title.trim().toLowerCase() && (left.venue ?? "").trim().toLowerCase() === right.venue.trim().toLowerCase();
}

async function main() {
  const preview = process.argv.includes("--preview");
  if (!preview && process.env.ROB_CONFIRM_GRAPH_IMPORT !== "1") {
    console.log("REFUSED");
    process.exit(1);
  }
  const file = JSON.parse(readFileSync("data/production-clearance/graph-batch-2026-10-12.json", "utf8")) as BatchFile;
  const client = new Client({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const before = await client.query<{ users: number; profiles: number; exhibitions: number }>(
      `SELECT
         (SELECT COUNT(*)::int FROM "User") AS users,
         (SELECT COUNT(*)::int FROM "ArtistProfile") AS profiles,
         (SELECT COUNT(*)::int FROM "Exhibition") AS exhibitions`,
    );
    const entities = await client.query<{ id: string; slug: string; canonicalName: string; nativeName: string | null; birthYear: number | null; country: string | null }>(
      `SELECT id, slug, "canonicalName", "nativeName", "birthYear", country FROM "ArtistEntity"`,
    );
    const aliasRows = await client.query<{ artistEntityId: string; label: string }>(`SELECT "artistEntityId", label FROM "ArtistAlias"`);
    const existingShows = await client.query<{ title: string; year: number | null; venue: string | null }>(
      `SELECT e.title, m."startYear" AS year, s.name AS venue
       FROM "Exhibition" e
       LEFT JOIN "ExhibitionHistoryMeta" m ON m."exhibitionId" = e.id
       LEFT JOIN "Space" s ON s.id = e."spaceId"`,
    );
    const unresolved = await client.query<{ id: string; label: string; exhibitionId: string; title: string }>(
      `SELECT u.id, u.label, u."exhibitionId", e.title
       FROM "HistoryUnresolvedName" u
       JOIN "Exhibition" e ON e.id = u."exhibitionId"`,
    );
    const bySlug = new Map(entities.rows.map((row) => [row.slug, row]));
    const labelsBySlug = new Map<string, string[]>();
    for (const row of entities.rows) labelsBySlug.set(row.slug, [row.canonicalName, row.nativeName].filter((value): value is string => Boolean(value)));
    for (const row of aliasRows.rows) {
      const artist = entities.rows.find((item) => item.id === row.artistEntityId);
      if (!artist) continue;
      labelsBySlug.get(artist.slug)?.push(row.label);
    }
    for (const artist of file.artists) {
      if (!labelsBySlug.has(artist.slug)) labelsBySlug.set(artist.slug, []);
      const labels = labelsBySlug.get(artist.slug)!;
      for (const label of [artist.canonicalName, artist.nativeName]) if (label) labels.push(label);
    }
    for (const alias of VERIFIED_ALIASES) labelsBySlug.get(alias.slug)?.push(alias.label);
    const names = [...labelsBySlug.entries()].map(([slug, labels]) => ({ slug, labels }));
    const newArtists = file.artists.filter((artist) => !bySlug.has(artist.slug));
    const aliasPlan = VERIFIED_ALIASES.flatMap((alias) => {
      const artist = bySlug.get(alias.slug) ?? newArtists.find((item) => item.slug === alias.slug) ?? file.artists.find((item) => item.slug === alias.slug);
      if (!artist) return [];
      const canonical = "canonicalName" in artist ? artist.canonicalName : "";
      const native = "nativeName" in artist ? artist.nativeName : null;
      const norm = normalizeArtistLookup(alias.label);
      if (canonical && normalizeArtistLookup(canonical) === norm) return [];
      if (native && normalizeArtistLookup(native) === norm) return [];
      const artistId = "id" in artist ? artist.id : null;
      if (artistId && aliasRows.rows.some((row) => row.artistEntityId === artistId && row.label === alias.label)) return [];
      return [{ slug: alias.slug, label: alias.label }];
    });
    const exhibitions = file.records.filter((record) => !existingShows.rows.some((row) => sameShow(row, record)));
    const duplicates = file.records.filter((record) => existingShows.rows.some((row) => sameShow(row, record))).map((record) => record.pilotRecordId);
    const classified = exhibitions.map((record) => {
      const matched: string[] = [];
      const unresolvedLabels: string[] = [];
      for (const label of record.participants) {
        const slug = resolveArtistSlug(label, names);
        if (slug && !matched.includes(slug)) matched.push(slug);
        else if (!slug) unresolvedLabels.push(label);
      }
      return { id: record.pilotRecordId, year: record.year, title: record.title, venue: record.venue, matched, unresolved: unresolvedLabels };
    });
    const blocked = classified.filter((row) => row.unresolved.length > 0);
    const relinks = unresolved.rows.flatMap((row) => {
      if (!mayRelinkUnresolvedName(row.title)) return [{ label: row.label, title: row.title, decision: "EXCLUDED_LETTER_AUTHORS" }];
      const slug = resolveArtistSlug(row.label, names);
      if (!slug) return [{ label: row.label, title: row.title, decision: "UNRESOLVED" }];
      return [{ label: row.label, title: row.title, decision: slug }];
    });
    const report = {
      imported: false,
      before: before.rows[0],
      newArtists: newArtists.map((artist) => artist.slug),
      newAliases: aliasPlan,
      duplicates,
      exhibitions: classified,
      relinks,
      sharedExhibitions: classified.filter((row) => row.matched.length >= 2).map((row) => row.id),
    };
    if (blocked.length > 0) {
      console.log(JSON.stringify({ ...report, blocked: "UNRESOLVED_PARTICIPANT" }, null, 2));
      process.exit(1);
    }
    if (preview) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    await client.query("BEGIN");
    const slugToId = new Map(entities.rows.map((row) => [row.slug, row.id]));
    for (const artist of newArtists) {
      const id = randomUUID();
      await client.query(
        `INSERT INTO "ArtistEntity" (id, slug, "canonicalName", "nativeName", "birthYear", country, "officialWebsite", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [id, artist.slug, artist.canonicalName, artist.nativeName, artist.birthYear, artist.country, artist.officialWebsite],
      );
      slugToId.set(artist.slug, id);
    }
    for (const fact of file.facts) {
      await client.query(
        `UPDATE "ArtistEntity"
         SET "birthYear" = COALESCE("birthYear", $2), country = COALESCE(country, $3), "updatedAt" = NOW()
         WHERE slug = $1 AND ("birthYear" IS NULL OR country IS NULL)`,
        [fact.slug, fact.birthYear ?? null, fact.country ?? null],
      );
    }
    const aliasHave = new Set(aliasRows.rows.map((row) => `${row.artistEntityId}|${row.label}`));
    let aliasesWritten = 0;
    for (const alias of VERIFIED_ALIASES) {
      const artistId = slugToId.get(alias.slug);
      if (!artistId) continue;
      const entity = entities.rows.find((row) => row.id === artistId) ?? newArtists.find((row) => row.slug === alias.slug);
      const canonical = entity && "canonicalName" in entity ? entity.canonicalName : "";
      const native = entity && "nativeName" in entity ? entity.nativeName : null;
      const norm = normalizeArtistLookup(alias.label);
      if ((canonical && normalizeArtistLookup(canonical) === norm) || (native && normalizeArtistLookup(native) === norm)) continue;
      const key = `${artistId}|${alias.label}`;
      if (aliasHave.has(key)) continue;
      await client.query(`INSERT INTO "ArtistAlias" (id, "artistEntityId", label, "createdAt") VALUES ($1, $2, $3, NOW())`, [randomUUID(), artistId, alias.label]);
      aliasHave.add(key);
      aliasesWritten += 1;
    }
    const sourceIds = new Map((await client.query<{ id: string; url: string }>(`SELECT id, url FROM "HistorySource"`)).rows.map((row) => [row.url, row.id]));
    const spaceRows = await client.query<{ id: string; name: string; city: string | null }>(`SELECT id, name, city FROM "Space"`);
    const spaceIds = new Map(spaceRows.rows.map((row) => [`${row.name.trim().toLowerCase()}|${(row.city ?? "").trim().toLowerCase()}`, row.id]));
    const spaceSlugs = new Set((await client.query<{ slug: string }>(`SELECT slug FROM "SpaceSlug"`)).rows.map((row) => row.slug));
    const exhibitionSlugs = new Set((await client.query<{ slug: string }>(`SELECT slug FROM "ExhibitionHistoryMeta" WHERE slug IS NOT NULL`)).rows.map((row) => row.slug));
    let exhibitionsWritten = 0;
    let participationsWritten = 0;
    for (const record of exhibitions) {
      const prior = await client.query<{ productionEntityId: string | null }>(
        `SELECT "productionEntityId" FROM "HistoryImportRecord" WHERE "pilotRecordId" = $1`,
        [record.pilotRecordId],
      );
      if (prior.rows[0]?.productionEntityId) continue;
      const matched = record.participants.map((label) => resolveArtistSlug(label, names)).filter((slug): slug is string => Boolean(slug));
      const spaceKey = `${record.venue.trim().toLowerCase()}|${record.city.trim().toLowerCase()}`;
      let spaceId = spaceIds.get(spaceKey);
      if (!spaceId) {
        spaceId = randomUUID();
        await client.query(`INSERT INTO "Space" (id, name, city, country, "createdAt") VALUES ($1, $2, $3, $4, NOW())`, [spaceId, record.venue, record.city, record.country]);
        const slug = uniqueSlug(record.venue, spaceSlugs);
        spaceSlugs.add(slug);
        await client.query(`INSERT INTO "SpaceSlug" ("spaceId", slug) VALUES ($1, $2)`, [spaceId, slug]);
        spaceIds.set(spaceKey, spaceId);
      }
      const exhibitionId = randomUUID();
      await client.query(
        `INSERT INTO "Exhibition" (id, title, city, country, "spaceId", "isPublic", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
        [exhibitionId, record.title, record.city, record.country, spaceId],
      );
      const slug = uniqueSlug(`${record.title} ${record.year}`, exhibitionSlugs);
      exhibitionSlugs.add(slug);
      await client.query(
        `INSERT INTO "ExhibitionHistoryMeta"
           ("exhibitionId", slug, "datePrecision", "startYear", "publicationStatus", origin, "sourceClearance", "clearanceStatus")
         VALUES ($1, $2, 'YEAR', $3, 'PUBLIC', 'ROB_RESEARCHED', 'NOT_APPLICABLE', 'REVIEW_REQUIRED')`,
        [exhibitionId, slug, record.year],
      );
      for (const source of record.sources) {
        let sourceId = sourceIds.get(source.sourceUrl);
        if (!sourceId) {
          sourceId = randomUUID();
          await client.query(
            `INSERT INTO "HistorySource"
               (id, url, "sourceName", "sourceType", "retrievedAt", "clearanceStatus", "internalUseDecision", "externalPermission", "contentScope", "createdAt")
             VALUES ($1, $2, $3, $4, NOW(), 'REVIEW_REQUIRED', 'ALLOW_LIMITED', 'NOT_OBTAINED', 'FACTUAL_METADATA_ONLY', NOW())`,
            [sourceId, source.sourceUrl, source.sourceName, source.sourceType],
          );
          sourceIds.set(source.sourceUrl, sourceId);
        }
        await client.query(`INSERT INTO "ExhibitionSource" ("exhibitionId", "sourceId") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [exhibitionId, sourceId]);
      }
      for (const artistSlug of matched) {
        const artistId = slugToId.get(artistSlug);
        if (!artistId) throw new Error(`MISSING_ARTIST ${artistSlug}`);
        await client.query(
          `INSERT INTO "HistoryParticipation" (id, "exhibitionId", "artistEntityId", "createdAt")
           VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
          [randomUUID(), exhibitionId, artistId],
        );
        participationsWritten += 1;
      }
      await client.query(
        `INSERT INTO "HistoryImportRecord"
           (id, "pilotRecordId", "usageStatus", "productionClearance", "reviewStatus", "productionEntityId", "sourceDecision", "importedAt", "importedBy", "sourceUrl", "sourceFamily", "internalUseDecision", "externalPermission", "importVersion", "createdAt")
         VALUES ($1, $2, 'PRODUCTION', 'ALLOW_LIMITED', 'ALLOW_LIMITED', $3, 'ALLOW_LIMITED', NOW(), 'graph-batch', $4, 'graph-v1', 'ALLOW_LIMITED', 'NOT_OBTAINED', $5, NOW())`,
        [randomUUID(), record.pilotRecordId, exhibitionId, record.sources[0]?.sourceUrl ?? null, file.importVersion],
      );
      exhibitionsWritten += 1;
    }
    let relinked = 0;
    for (const row of unresolved.rows) {
      if (!mayRelinkUnresolvedName(row.title)) continue;
      const slug = resolveArtistSlug(row.label, names);
      const artistId = slug ? slugToId.get(slug) : undefined;
      if (!artistId) continue;
      await client.query(
        `INSERT INTO "HistoryParticipation" (id, "exhibitionId", "artistEntityId", "createdAt")
         VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
        [randomUUID(), row.exhibitionId, artistId],
      );
      await client.query(`DELETE FROM "HistoryUnresolvedName" WHERE id = $1`, [row.id]);
      relinked += 1;
    }
    const after = await client.query<{ users: number; profiles: number }>(
      `SELECT (SELECT COUNT(*)::int FROM "User") AS users, (SELECT COUNT(*)::int FROM "ArtistProfile") AS profiles`,
    );
    if (after.rows[0].users !== before.rows[0].users || after.rows[0].profiles !== before.rows[0].profiles) {
      await client.query("ROLLBACK");
      console.log("GRAPH_IMPORT_BLOCKED");
      process.exit(1);
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ imported: true, exhibitionsWritten, participationsWritten, aliasesWritten, relinked, newArtists: newArtists.map((artist) => artist.slug), before: before.rows[0] }));
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "failed";
  console.log(message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]"));
  process.exit(1);
});
