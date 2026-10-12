import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { Client } from "pg";
import { classifyParticipants, isProductionDuplicate, type FoundationCandidate } from "../lib/history/foundationImport";
import { uniqueSlug } from "../lib/history/policy";

type CandidateFile = {
  sourceName: string;
  sourceUrl: string;
  internalUseDecision: "ALLOW_LIMITED";
  externalPermission: string;
  contentScope: string;
  records: FoundationCandidate[];
};

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
  if (!preview && process.env.ROB_CONFIRM_FOUNDATION_IMPORT !== "1") {
    console.log("REFUSED");
    process.exit(1);
  }
  const file = JSON.parse(readFileSync("data/production-clearance/park-seobo-foundation-candidates.json", "utf8")) as CandidateFile;
  const client = new Client({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const before = await client.query(
      `SELECT
         (SELECT COUNT(*)::int FROM "User") AS users,
         (SELECT COUNT(*)::int FROM "ArtistProfile") AS profiles,
         (SELECT COUNT(*)::int FROM "Exhibition") AS exhibitions`,
    );
    const entities = await client.query<{ id: string; canonicalName: string }>(`SELECT id, "canonicalName" FROM "ArtistEntity"`);
    const aliases = await client.query<{ artistEntityId: string; label: string }>(`SELECT "artistEntityId", label FROM "ArtistAlias"`);
    const byName = new Map<string, string>();
    for (const row of entities.rows) byName.set(row.canonicalName.trim().toLowerCase(), row.id);
    for (const row of aliases.rows) byName.set(row.label.trim().toLowerCase(), row.artistEntityId);
    const keyToId: Record<string, string | undefined> = {
      "park-seo-bo": byName.get("park seo-bo"),
      "lee-ufan": byName.get("lee ufan"),
      "ha-chong-hyun": byName.get("ha chong-hyun"),
      "chung-sang-hwa": byName.get("chung sang-hwa"),
    };
    if (!keyToId["park-seo-bo"] || !keyToId["lee-ufan"]) {
      console.log("MISSING_REQUIRED_ARTIST");
      process.exit(1);
    }
    const existing = await client.query<{ title: string; year: number | null; venue: string | null }>(
      `SELECT e.title, m."startYear" AS year, s.name AS venue
       FROM "Exhibition" e
       LEFT JOIN "ExhibitionHistoryMeta" m ON m."exhibitionId" = e.id
       LEFT JOIN "Space" s ON s.id = e."spaceId"`,
    );
    const planned = file.records.filter((record) => {
      if (isProductionDuplicate(record)) return false;
      return !existing.rows.some((row) => row.year === record.year && (row.venue ?? "").trim().toLowerCase() === record.venue.trim().toLowerCase() && row.title.trim().toLowerCase() === record.title.trim().toLowerCase());
    });
    const report = planned.map((record) => {
      const classified = classifyParticipants(record.participants);
      return { id: record.pilotRecordId, year: record.year, title: record.title, venue: record.venue, matched: classified.matched, unresolved: classified.unresolved };
    });
    if (preview) {
      console.log(JSON.stringify({ imported: false, candidates: report.length, before: before.rows[0], records: report }, null, 2));
      return;
    }
    await client.query("BEGIN");
    const sourceExisting = await client.query<{ id: string }>(`SELECT id FROM "HistorySource" WHERE url = $1 LIMIT 1`, [file.sourceUrl]);
    let sourceId = sourceExisting.rows[0]?.id;
    if (!sourceId) {
      sourceId = randomUUID();
      await client.query(
        `INSERT INTO "HistorySource"
           (id, url, "sourceName", "sourceType", "retrievedAt", "clearanceStatus", "internalUseDecision", "externalPermission", "contentScope", "createdAt")
         VALUES ($1, $2, $3, 'ARTIST_FOUNDATION', NOW(), 'REVIEW_REQUIRED', $4, $5, $6, NOW())`,
        [sourceId, file.sourceUrl, file.sourceName, file.internalUseDecision, file.externalPermission, file.contentScope],
      );
    }
    const spaceIds = new Map<string, string>();
    const spaceSlugs = new Set((await client.query<{ slug: string }>(`SELECT slug FROM "SpaceSlug"`)).rows.map((row) => row.slug));
    const exhibitionSlugs = new Set((await client.query<{ slug: string }>(`SELECT slug FROM "ExhibitionHistoryMeta" WHERE slug IS NOT NULL`)).rows.map((row) => row.slug));
    let written = 0;
    for (const record of planned) {
      const prior = await client.query<{ productionEntityId: string | null }>(
        `SELECT "productionEntityId" FROM "HistoryImportRecord" WHERE "pilotRecordId" = $1`,
        [record.pilotRecordId],
      );
      if (prior.rows[0]?.productionEntityId) continue;
      const classified = classifyParticipants(record.participants);
      const spaceKey = `${record.venue}|${record.city}|${record.country}`;
      let spaceId = spaceIds.get(spaceKey);
      if (!spaceId) {
        const found = await client.query<{ id: string }>(
          `SELECT id FROM "Space" WHERE lower(name) = lower($1) AND lower(COALESCE(city, '')) = lower($2) LIMIT 1`,
          [record.venue, record.city],
        );
        if (found.rows[0]) spaceId = found.rows[0].id;
        else {
          spaceId = randomUUID();
          await client.query(`INSERT INTO "Space" (id, name, city, country, "createdAt") VALUES ($1, $2, $3, $4, NOW())`, [spaceId, record.venue, record.city, record.country]);
          const slug = uniqueSlug(record.venue, spaceSlugs);
          spaceSlugs.add(slug);
          await client.query(`INSERT INTO "SpaceSlug" ("spaceId", slug) VALUES ($1, $2)`, [spaceId, slug]);
        }
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
      await client.query(`INSERT INTO "ExhibitionSource" ("exhibitionId", "sourceId") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [exhibitionId, sourceId]);
      for (const key of classified.matched) {
        const artistId = keyToId[key];
        if (!artistId) continue;
        await client.query(
          `INSERT INTO "HistoryParticipation" (id, "exhibitionId", "artistEntityId", "createdAt")
           VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
          [randomUUID(), exhibitionId, artistId],
        );
      }
      for (const label of classified.unresolved) {
        await client.query(
          `INSERT INTO "HistoryUnresolvedName" (id, "exhibitionId", label, status, "createdAt")
           VALUES ($1, $2, $3, 'UNRESOLVED_PARTICIPANT', NOW())`,
          [randomUUID(), exhibitionId, label],
        );
      }
      await client.query(
        `INSERT INTO "HistoryImportRecord"
           (id, "pilotRecordId", "usageStatus", "productionClearance", "reviewStatus", "productionEntityId", "sourceDecision", "importedAt", "importedBy", "sourceUrl", "sourceFamily", "internalUseDecision", "externalPermission", "importVersion", "createdAt")
         VALUES ($1, $2, 'PRODUCTION', 'ALLOW_LIMITED', 'ALLOW_LIMITED', $3, 'ALLOW_LIMITED', NOW(), 'park-seobo-foundation', $4, 'parkseobofoundation.org', $5, $6, 'foundation-v1', NOW())`,
        [randomUUID(), record.pilotRecordId, exhibitionId, file.sourceUrl, file.internalUseDecision, file.externalPermission],
      );
      written += 1;
    }
    const after = await client.query(
      `SELECT
         (SELECT COUNT(*)::int FROM "User") AS users,
         (SELECT COUNT(*)::int FROM "ArtistProfile") AS profiles`,
    );
    if (after.rows[0].users !== before.rows[0].users || after.rows[0].profiles !== before.rows[0].profiles) {
      await client.query("ROLLBACK");
      console.log("FOUNDATION_IMPORT_BLOCKED");
      process.exit(1);
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ imported: true, written, before: before.rows[0] }));
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "failed";
  console.log(message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]"));
  process.exit(1);
});
