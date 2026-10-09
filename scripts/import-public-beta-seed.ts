import { randomUUID } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { Client } from "pg";
import {
  IMPORT_VERSION,
  LAUNCH_ARTISTS,
  artistSlugBase,
  buildLaunchPlan,
  type KnownEntity,
  type KnownSpace,
  type LaunchMap,
} from "../lib/history/launchImport";
import { uniqueSlug } from "../lib/history/policy";

function databaseUrl(): string {
  const line = readFileSync(".env", "utf8").split(/\r?\n/).find((item) => item.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL missing");
  let value = line.slice("DATABASE_URL=".length).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return value;
}

function previewOnly(): boolean {
  return process.argv.includes("--preview");
}

async function main() {
  const confirm = process.env.ROB_CONFIRM_PRODUCTION_SEED_IMPORT === "1";
  if (!confirm && !previewOnly()) {
    console.log("REFUSED");
    process.exit(1);
  }
  const map = JSON.parse(readFileSync("data/production-clearance/kukje-record-map.json", "utf8")) as LaunchMap;
  const client = new Client({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const ping = await client.query("SELECT 1 AS ok");
    const tables = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('ArtistEntity','ArtistProfile','Exhibition','HistorySource','HistoryImportRecord')`,
    );
    if (ping.rowCount !== 1 || tables.rowCount !== 5) {
      console.log("PRODUCTION_DATABASE_RECHECK_FAILED");
      process.exit(1);
    }
    const entityRows = await client.query<{ id: string; canonicalName: string; nativeName: string | null }>(
      `SELECT id, "canonicalName", "nativeName" FROM "ArtistEntity"`,
    );
    const aliasRows = await client.query<{ artistEntityId: string; label: string }>(`SELECT "artistEntityId", label FROM "ArtistAlias"`);
    const aliases = new Map<string, string[]>();
    for (const row of aliasRows.rows) {
      const list = aliases.get(row.artistEntityId) ?? [];
      list.push(row.label);
      aliases.set(row.artistEntityId, list);
    }
    const entities: KnownEntity[] = entityRows.rows.map((row) => ({ ...row, aliases: aliases.get(row.id) ?? [] }));
    const spaceRows = await client.query<KnownSpace>(`SELECT id, name, city, country FROM "Space"`);
    const plan = buildLaunchPlan(map, entities, spaceRows.rows);
    const before = await client.query(
      `SELECT
         (SELECT COUNT(*)::int FROM "User") AS users,
         (SELECT COUNT(*)::int FROM "ArtistProfile") AS profiles,
         (SELECT COUNT(*)::int FROM "Exhibition") AS exhibitions`,
    );
    const preview = {
      imported: false,
      policy: plan.policy,
      artistsToCreate: plan.artists.filter((artist) => artist.resolution.status === "create").map((artist) => artist.canonicalName),
      artistsReused: plan.artists.filter((artist) => artist.resolution.status === "reuse").map((artist) => artist.canonicalName),
      blocked: plan.blocked.map((artist) => artist.canonicalName),
      exhibitions: plan.exhibitions.length,
      spacesToCreate: plan.spaces.filter((space) => space.resolution.status === "create").length,
      participations: plan.exhibitions.reduce((sum, exhibition) => sum + exhibition.artistKeys.length, 0),
      sources: plan.sourceUrls.length,
      bridgePaths: plan.bridges.paths,
      skipped: plan.skipped,
      productionCounts: plan.productionCounts,
      pilotCountsNotUsed: { "Lee Ufan": 130, "Park Seo-Bo": 87, "Ha Chong-Hyun": 52, "Chung Sang-Hwa": 4 },
      before: before.rows[0],
    };
    writeFileSync("data/production-clearance/import-preview.json", `${JSON.stringify(preview, null, 2)}\n`);
    if (!confirm || plan.blocked.length > 0) {
      console.log(JSON.stringify({ preview: true, blocked: preview.blocked, exhibitions: preview.exhibitions }));
      if (plan.blocked.length > 0) process.exit(2);
      return;
    }
    await client.query("BEGIN");
    const artistIds = new Map<string, string>();
    const takenSlugs = new Set((await client.query<{ slug: string }>(`SELECT slug FROM "ArtistEntity"`)).rows.map((row) => row.slug));
    for (const artist of plan.artists) {
      if (artist.resolution.status === "reuse") {
        artistIds.set(artist.key, artist.resolution.id);
        continue;
      }
      const id = randomUUID();
      const slug = uniqueSlug(artistSlugBase(artist.canonicalName), takenSlugs);
      takenSlugs.add(slug);
      await client.query(
        `INSERT INTO "ArtistEntity" (id, slug, "canonicalName", "nativeName", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [id, slug, artist.canonicalName, artist.nativeName],
      );
      for (const label of artist.aliases) {
        await client.query(`INSERT INTO "ArtistAlias" (id, "artistEntityId", label, "createdAt") VALUES ($1, $2, $3, NOW())`, [randomUUID(), id, label]);
      }
      artistIds.set(artist.key, id);
    }
    const spaceIds = new Map<string, string>();
    const spaceSlugs = new Set((await client.query<{ slug: string }>(`SELECT slug FROM "SpaceSlug"`)).rows.map((row) => row.slug));
    for (const space of plan.spaces) {
      const key = `${space.name}|${space.city}|${space.country}`;
      if (spaceIds.has(key)) continue;
      if (space.resolution.status === "reuse") {
        spaceIds.set(key, space.resolution.id);
        continue;
      }
      const id = randomUUID();
      await client.query(`INSERT INTO "Space" (id, name, city, country, "createdAt") VALUES ($1, $2, $3, $4, NOW())`, [id, space.name, space.city, space.country]);
      const slug = uniqueSlug(space.name, spaceSlugs);
      spaceSlugs.add(slug);
      await client.query(`INSERT INTO "SpaceSlug" ("spaceId", slug) VALUES ($1, $2)`, [id, slug]);
      spaceIds.set(key, id);
    }
    const sourceIds = new Map<string, string>();
    for (const url of plan.sourceUrls) {
      const existing = await client.query<{ id: string }>(`SELECT id FROM "HistorySource" WHERE url = $1 LIMIT 1`, [url]);
      if (existing.rows[0]) {
        sourceIds.set(url, existing.rows[0].id);
        continue;
      }
      const id = randomUUID();
      await client.query(
        `INSERT INTO "HistorySource"
           (id, url, "sourceName", "sourceType", "retrievedAt", "clearanceStatus", "internalUseDecision", "externalPermission", "contentScope", "createdAt")
         VALUES ($1, $2, $3, $4, NOW(), 'REVIEW_REQUIRED', $5, $6, $7, NOW())`,
        [id, url, plan.policy.sourceName, plan.policy.sourceType, plan.policy.internalUseDecision, plan.policy.externalPermission, plan.policy.contentScope],
      );
      sourceIds.set(url, id);
    }
    const exhibitionSlugs = new Set((await client.query<{ slug: string }>(`SELECT slug FROM "ExhibitionHistoryMeta" WHERE slug IS NOT NULL`)).rows.map((row) => row.slug));
    for (const exhibition of plan.exhibitions) {
      const prior = await client.query<{ productionEntityId: string | null }>(
        `SELECT "productionEntityId" FROM "HistoryImportRecord" WHERE "pilotRecordId" = $1`,
        [exhibition.pilotRecordId],
      );
      if (prior.rows[0]?.productionEntityId) continue;
      const exhibitionId = randomUUID();
      const spaceId = spaceIds.get(`${exhibition.venue}|${exhibition.city}|${exhibition.country}`);
      await client.query(
        `INSERT INTO "Exhibition" (id, title, city, country, "spaceId", "isPublic", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
        [exhibitionId, exhibition.title, exhibition.city, exhibition.country, spaceId ?? null],
      );
      const slug = uniqueSlug(exhibition.slug, exhibitionSlugs);
      exhibitionSlugs.add(slug);
      await client.query(
        `INSERT INTO "ExhibitionHistoryMeta"
           ("exhibitionId", slug, "datePrecision", "startYear", "publicationStatus", origin, "sourceClearance", "clearanceStatus")
         VALUES ($1, $2, 'YEAR', $3, 'PUBLIC', 'ROB_RESEARCHED', 'NOT_APPLICABLE', 'REVIEW_REQUIRED')`,
        [exhibitionId, slug, exhibition.year],
      );
      for (const url of exhibition.sourceUrls) {
        await client.query(
          `INSERT INTO "ExhibitionSource" ("exhibitionId", "sourceId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [exhibitionId, sourceIds.get(url)],
        );
      }
      for (const key of exhibition.artistKeys) {
        const artistId = artistIds.get(key);
        if (!artistId) throw new Error(`missing artist ${key}`);
        await client.query(
          `INSERT INTO "HistoryParticipation" (id, "exhibitionId", "artistEntityId", "createdAt")
           VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
          [randomUUID(), exhibitionId, artistId],
        );
      }
      for (const label of exhibition.unresolved) {
        await client.query(
          `INSERT INTO "HistoryUnresolvedName" (id, "exhibitionId", label, status, "createdAt")
           VALUES ($1, $2, $3, 'UNRESOLVED_PARTICIPANT', NOW())`,
          [randomUUID(), exhibitionId, label],
        );
      }
      await client.query(
        `INSERT INTO "HistoryImportRecord"
           (id, "pilotRecordId", "usageStatus", "productionClearance", "reviewStatus", "productionEntityId", "sourceDecision", "importedAt", "importedBy", "sourceUrl", "sourceFamily", "internalUseDecision", "externalPermission", "importVersion", "createdAt")
         VALUES ($1, $2, 'PRODUCTION', 'ALLOW_LIMITED', 'ALLOW_LIMITED', $3, 'ALLOW_LIMITED', NOW(), 'public-beta-seed', $4, $5, $6, $7, $8, NOW())`,
        [
          randomUUID(),
          exhibition.pilotRecordId,
          exhibitionId,
          exhibition.sourceUrls[0],
          plan.policy.sourceFamily,
          plan.policy.internalUseDecision,
          plan.policy.externalPermission,
          IMPORT_VERSION,
        ],
      );
    }
    const after = await client.query(
      `SELECT
         (SELECT COUNT(*)::int FROM "User") AS users,
         (SELECT COUNT(*)::int FROM "ArtistProfile") AS profiles`,
    );
    if (after.rows[0].users !== before.rows[0].users || after.rows[0].profiles !== before.rows[0].profiles) {
      await client.query("ROLLBACK");
      console.log("PUBLIC_BETA_IMPORT_BLOCKED");
      process.exit(1);
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ imported: true, exhibitions: plan.exhibitions.length, counts: plan.productionCounts, bridges: plan.bridges.paths }));
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "failed";
  console.log(message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]"));
  process.exit(1);
});
