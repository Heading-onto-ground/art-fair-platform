import { createHash, randomUUID } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { Client } from "pg";
import { VERIFIED_ALIASES, labelAppearsInTitle, mayRelinkUnresolvedName, normalizeArtistLookup, resolveArtistSlug, shouldRelinkUnresolved } from "../lib/history/identity";
import { previewCandidates, resolveVerifiedSpace, sameVerifiedSpace, type FactualCandidate, type GrowthSnapshot } from "../lib/history/growth";
import { uniqueSlug } from "../lib/history/policy";

type ArtistPlan = {
  slug: string;
  canonicalName: string;
  nativeName: string | null;
  birthYear: number | null;
  country: string | null;
  officialWebsite: string | null;
};

type Enrichment = {
  pilotRecordId: string;
  title: string;
  year: number;
  space: string;
  participants: string[];
  sourceName: string;
  sourceUrl: string;
  evidenceShort: string;
};

type RecordPlan = {
  pilotRecordId: string;
  title: string;
  year: number;
  venue: string;
  city: string;
  country: string;
  participants: string[];
  evidenceShort: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceType?: string;
  datePrecision?: "DAY" | "MONTH" | "YEAR";
  startMonth?: number | null;
  startDay?: number | null;
  endYear?: number | null;
  endMonth?: number | null;
  endDay?: number | null;
};

type DetachPlan = {
  title: string;
  year: number;
  slug: string;
  restoreLabel: string;
};

type BatchFile = {
  importVersion: string;
  job: { sourceUrl: string; notes: string };
  artists: ArtistPlan[];
  enrichments: Enrichment[];
  records: RecordPlan[];
  detachments?: DetachPlan[];
  titleMentions?: { title: string; year: number; labels: string[] }[];
};

const SLAG_URL = "https://www.slaggallery.com/chelsea_art_gallery/artists/kim-guiline/documents/resume";

function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const line = readFileSync(".env", "utf8").split(/\r?\n/).find((item) => item.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL missing");
  let value = line.slice("DATABASE_URL=".length).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return value;
}

function candidateFrom(record: Enrichment | RecordPlan, space: string, city: string | null, country: string | null, sourceUrl: string): FactualCandidate {
  const dated = "datePrecision" in record ? record : null;
  return {
    artistNames: record.participants,
    title: record.title,
    startYear: record.year,
    startMonth: dated?.startMonth ?? null,
    startDay: dated?.startDay ?? null,
    endYear: dated?.endYear ?? null,
    endMonth: dated?.endMonth ?? null,
    endDay: dated?.endDay ?? null,
    datePrecision: dated?.datePrecision ?? "YEAR",
    space,
    city,
    country,
    curatorNames: [],
    sourceName: "sourceName" in record && record.sourceName ? record.sourceName : "SLAG&RX",
    sourceUrl,
    retrievedAt: "2026-10-15",
    evidenceShort: record.evidenceShort,
    externalIds: [],
    pilotRecordId: record.pilotRecordId,
  };
}

async function backup(client: Client) {
  const tables = [
    "ArtistEntity",
    "ArtistAlias",
    "Space",
    "SpaceSlug",
    "Exhibition",
    "ExhibitionHistoryMeta",
    "HistorySource",
    "ExhibitionSource",
    "HistoryParticipation",
    "HistoryUnresolvedName",
    "HistoryImportRecord",
  ];
  const payload: Record<string, unknown> = { exportedAt: new Date().toISOString() };
  for (const table of tables) {
    const rows = await client.query(`SELECT * FROM "${table}"`);
    payload[table] = rows.rows;
  }
  const body = JSON.stringify(payload);
  const hash = createHash("sha256").update(body).digest("hex");
  const stamp = String(payload.exportedAt).replace(/[:.]/g, "-");
  const filename = `C:/Users/USER/Documents/rob-backups/history-before-growth-${stamp}.json`;
  mkdirSync("C:/Users/USER/Documents/rob-backups", { recursive: true });
  writeFileSync(filename, body);
  return { filename, bytes: Buffer.byteLength(body), sha256: hash, exportedAt: payload.exportedAt };
}

async function main() {
  const preview = process.argv.includes("--preview");
  if (!preview && process.env.ROB_CONFIRM_GROWTH_IMPORT !== "1") {
    console.log("REFUSED");
    process.exit(1);
  }
  const fileArg = process.argv.find((item) => item.startsWith("--file="));
  const filePath = fileArg?.slice("--file=".length) || "data/production-clearance/growth-batch-2026-10-12.json";
  const file = JSON.parse(readFileSync(filePath, "utf8")) as BatchFile;
  const client = new Client({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const before = await client.query<{ users: number; profiles: number }>(
      `SELECT (SELECT COUNT(*)::int FROM "User") AS users, (SELECT COUNT(*)::int FROM "ArtistProfile") AS profiles`,
    );
    const entities = await client.query<{ id: string; slug: string; canonicalName: string; nativeName: string | null }>(
      `SELECT id, slug, "canonicalName", "nativeName" FROM "ArtistEntity"`,
    );
    const aliasRows = await client.query<{ artistEntityId: string; label: string }>(`SELECT "artistEntityId", label FROM "ArtistAlias"`);
    const shows = await client.query<{ id: string; title: string; year: number | null; space: string | null; city: string | null }>(
      `SELECT e.id, e.title, m."startYear" AS year, s.name AS space, e.city
       FROM "Exhibition" e
       LEFT JOIN "ExhibitionHistoryMeta" m ON m."exhibitionId" = e.id
       LEFT JOIN "Space" s ON s.id = e."spaceId"`,
    );
    const parts = await client.query<{ exhibitionId: string; slug: string }>(
      `SELECT p."exhibitionId", a.slug
       FROM "HistoryParticipation" p
       JOIN "ArtistEntity" a ON a.id = p."artistEntityId"`,
    );
    const unresolved = await client.query<{ id: string; label: string; exhibitionId: string; title: string; status: string; year: number | null }>(
      `SELECT u.id, u.label, u."exhibitionId", u.status, e.title, m."startYear" AS year
       FROM "HistoryUnresolvedName" u
       JOIN "Exhibition" e ON e.id = u."exhibitionId"
       LEFT JOIN "ExhibitionHistoryMeta" m ON m."exhibitionId" = e.id`,
    );
    const labels = new Map<string, string[]>();
    for (const row of entities.rows) labels.set(row.slug, [row.canonicalName, row.nativeName].filter((value): value is string => Boolean(value)));
    for (const row of aliasRows.rows) {
      const artist = entities.rows.find((item) => item.id === row.artistEntityId);
      if (artist) labels.get(artist.slug)?.push(row.label);
    }
    for (const artist of file.artists) {
      if (!labels.has(artist.slug)) labels.set(artist.slug, []);
      for (const label of [artist.canonicalName, artist.nativeName]) if (label) labels.get(artist.slug)?.push(label);
    }
    for (const alias of VERIFIED_ALIASES) labels.get(alias.slug)?.push(alias.label);
    const byExhibition = new Map<string, string[]>();
    for (const row of parts.rows) {
      const list = byExhibition.get(row.exhibitionId) ?? [];
      list.push(row.slug);
      byExhibition.set(row.exhibitionId, list);
    }
    const artistShows = new Map<string, string[]>();
    for (const row of parts.rows) {
      const list = artistShows.get(row.slug) ?? [];
      list.push(row.exhibitionId);
      artistShows.set(row.slug, list);
    }
    const snapshot: GrowthSnapshot = {
      artists: [...labels.entries()].map(([slug, names]) => ({ slug, labels: names, exhibitionIds: artistShows.get(slug) ?? [] })),
      exhibitions: shows.rows.map((row) => ({
        id: row.id,
        title: row.title,
        year: row.year,
        space: row.space,
        city: row.city,
        artistSlugs: byExhibition.get(row.id) ?? [],
      })),
      unresolved: unresolved.rows.map((row) => ({ label: row.label, exhibitionTitle: row.title })),
    };
    const names = snapshot.artists.map((artist) => ({ slug: artist.slug, labels: artist.labels }));
    const candidates = [
      ...file.enrichments.map((row) => candidateFrom(row, row.space, null, null, row.sourceUrl)),
      ...file.records.map((row) => candidateFrom(row, row.venue, row.city, row.country, row.sourceUrl || SLAG_URL)),
    ];
    const previews = previewCandidates(candidates, snapshot);
    const relinks = unresolved.rows.flatMap((row) => {
      if (row.status !== "UNRESOLVED_PARTICIPANT") return [{ label: row.label, title: row.title, decision: "HELD" }];
      if (!mayRelinkUnresolvedName(row.title)) return [{ label: row.label, title: row.title, decision: "EXCLUDED_LETTER_AUTHORS" }];
      if (labelAppearsInTitle(row.label, row.title)) return [{ label: row.label, title: row.title, decision: "TITLE_MENTION" }];
      const slug = resolveArtistSlug(row.label, names);
      return [{ label: row.label, title: row.title, decision: slug ?? "UNRESOLVED" }];
    });
    const detachPreview = (file.detachments ?? []).map((item) => {
      const show = snapshot.exhibitions.find((exhibition) => exhibition.year === item.year && normalizeArtistLookup(exhibition.title) === normalizeArtistLookup(item.title));
      return { ...item, found: Boolean(show), currentlyLinked: Boolean(show?.artistSlugs.includes(item.slug)) };
    });
    const report = {
      imported: false,
      notes: file.job.notes,
      users: before.rows[0].users,
      profiles: before.rows[0].profiles,
      previews,
      relinks,
      detachPreview,
      newArtists: file.artists.filter((artist) => !entities.rows.some((row) => row.slug === artist.slug)).map((artist) => artist.slug),
    };
    if (preview) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    if (previews.some((row) => row.decision === "REVIEW")) {
      console.log(JSON.stringify({ ...report, blocked: "REVIEW_DUPLICATE" }, null, 2));
      process.exit(1);
    }
    const saved = await backup(client);
    await client.query("BEGIN");
    try {
    const slugToId = new Map(entities.rows.map((row) => [row.slug, row.id]));
    for (const artist of file.artists) {
      const existingId = slugToId.get(artist.slug);
      if (existingId) {
        if (artist.nativeName) {
          await client.query(
            `UPDATE "ArtistEntity" SET "nativeName" = $2, "updatedAt" = NOW() WHERE id = $1 AND "nativeName" IS NULL`,
            [existingId, artist.nativeName],
          );
        }
        continue;
      }
      const id = randomUUID();
      await client.query(
        `INSERT INTO "ArtistEntity" (id, slug, "canonicalName", "nativeName", "birthYear", country, "officialWebsite", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [id, artist.slug, artist.canonicalName, artist.nativeName, artist.birthYear, artist.country, artist.officialWebsite],
      );
      slugToId.set(artist.slug, id);
    }
    let aliasesWritten = 0;
    for (const alias of VERIFIED_ALIASES) {
      const artistId = slugToId.get(alias.slug);
      if (!artistId) continue;
      const entity = entities.rows.find((row) => row.id === artistId) ?? file.artists.find((row) => row.slug === alias.slug);
      const canonical = entity && "canonicalName" in entity ? entity.canonicalName : "";
      const native = entity && "nativeName" in entity ? entity.nativeName : null;
      const norm = normalizeArtistLookup(alias.label);
      if ((canonical && normalizeArtistLookup(canonical) === norm) || (native && normalizeArtistLookup(native) === norm)) continue;
      const exists = aliasRows.rows.some((row) => row.artistEntityId === artistId && row.label === alias.label);
      if (exists) continue;
      await client.query(`INSERT INTO "ArtistAlias" (id, "artistEntityId", label, "createdAt") VALUES ($1, $2, $3, NOW())`, [randomUUID(), artistId, alias.label]);
      aliasesWritten += 1;
    }
    const sourceIds = new Map((await client.query<{ id: string; url: string }>(`SELECT id, url FROM "HistorySource"`)).rows.map((row) => [row.url, row.id]));
    const spaceRows = await client.query<{ id: string; name: string; city: string | null }>(`SELECT id, name, city FROM "Space"`);
    const spaceSlugs = new Set((await client.query<{ slug: string }>(`SELECT slug FROM "SpaceSlug"`)).rows.map((row) => row.slug));
    const exhibitionSlugs = new Set((await client.query<{ slug: string }>(`SELECT slug FROM "ExhibitionHistoryMeta" WHERE slug IS NOT NULL`)).rows.map((row) => row.slug));
    async function sourceIdFor(url: string, name: string, sourceType = "OFFICIAL_GALLERY_PAGE") {
      const existing = sourceIds.get(url);
      if (existing) return existing;
      const id = randomUUID();
      await client.query(
        `INSERT INTO "HistorySource"
           (id, url, "sourceName", "sourceType", "retrievedAt", "clearanceStatus", "internalUseDecision", "externalPermission", "contentScope", "createdAt")
         VALUES ($1, $2, $3, $4, NOW(), 'REVIEW_REQUIRED', 'ALLOW_LIMITED', 'NOT_OBTAINED', 'FACTUAL_METADATA_ONLY', NOW())`,
        [id, url, name, sourceType],
      );
      sourceIds.set(url, id);
      return id;
    }
    function spaceIdFor(name: string, city: string) {
      const verified = resolveVerifiedSpace(name);
      const hit = spaceRows.rows.find((row) => {
        const same = sameVerifiedSpace(row.name, verified?.canonicalName ?? name) || normalizeArtistLookup(row.name) === normalizeArtistLookup(verified?.canonicalName ?? name);
        return same && normalizeArtistLookup(row.city ?? "") === normalizeArtistLookup(city);
      }) ?? spaceRows.rows.find((row) => sameVerifiedSpace(row.name, name));
      return hit?.id ?? null;
    }
    let participationsWritten = 0;
    let exhibitionsWritten = 0;
    for (const item of previews) {
      const enrichment = file.enrichments.find((row) => row.pilotRecordId === item.pilotRecordId);
      const record = file.records.find((row) => row.pilotRecordId === item.pilotRecordId);
      if (!enrichment && !record) continue;
      if (item.decision === "EXACT" && enrichment) {
        const match = snapshot.exhibitions.find((exhibition) => exhibition.title && exhibition.year === enrichment.year && sameVerifiedSpace(exhibition.space, enrichment.space) && exhibition.title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim() === enrichment.title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim());
        if (!match) throw new Error(`MISSING_EXACT ${enrichment.pilotRecordId}`);
        const sourceId = await sourceIdFor(enrichment.sourceUrl, enrichment.sourceName);
        await client.query(`INSERT INTO "ExhibitionSource" ("exhibitionId", "sourceId") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [match.id, sourceId]);
        for (const slug of item.resolved) {
          const artistId = slugToId.get(slug);
          if (!artistId) throw new Error(`MISSING_ARTIST ${slug}`);
          const inserted = await client.query(
            `INSERT INTO "HistoryParticipation" (id, "exhibitionId", "artistEntityId", "createdAt")
             VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
            [randomUUID(), match.id, artistId],
          );
          participationsWritten += inserted.rowCount ?? 0;
        }
      }
      if (item.decision === "NEW" && record) {
        const recordSourceUrl = record.sourceUrl || SLAG_URL;
        const recordSourceName = record.sourceName || "SLAG&RX";
        let spaceId = spaceIdFor(record.venue, record.city);
        if (!spaceId) {
          spaceId = randomUUID();
          const canonical = resolveVerifiedSpace(record.venue)?.canonicalName ?? record.venue;
          await client.query(`INSERT INTO "Space" (id, name, city, country, "createdAt") VALUES ($1, $2, $3, $4, NOW())`, [spaceId, canonical, record.city, record.country]);
          const slug = uniqueSlug(canonical, spaceSlugs);
          spaceSlugs.add(slug);
          await client.query(`INSERT INTO "SpaceSlug" ("spaceId", slug) VALUES ($1, $2)`, [spaceId, slug]);
          spaceRows.rows.push({ id: spaceId, name: canonical, city: record.city });
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
             ("exhibitionId", slug, "datePrecision", "startYear", "startMonth", "startDay", "endYear", "endMonth", "endDay", "publicationStatus", origin, "sourceClearance", "clearanceStatus")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PUBLIC', 'ROB_RESEARCHED', 'NOT_APPLICABLE', 'REVIEW_REQUIRED')`,
          [exhibitionId, slug, record.datePrecision ?? "YEAR", record.year, record.startMonth ?? null, record.startDay ?? null, record.endYear ?? null, record.endMonth ?? null, record.endDay ?? null],
        );
        const sourceId = await sourceIdFor(recordSourceUrl, recordSourceName, record.sourceType || "OFFICIAL_GALLERY_PAGE");
        await client.query(`INSERT INTO "ExhibitionSource" ("exhibitionId", "sourceId") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [exhibitionId, sourceId]);
        for (const slug of item.resolved) {
          const artistId = slugToId.get(slug);
          if (!artistId) throw new Error(`MISSING_ARTIST ${slug}`);
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
           VALUES ($1, $2, 'PRODUCTION', 'ALLOW_LIMITED', 'ALLOW_LIMITED', $3, 'ALLOW_LIMITED', NOW(), 'growth-batch', $4, 'growth-v1', 'ALLOW_LIMITED', 'NOT_OBTAINED', $5, NOW())`,
          [randomUUID(), record.pilotRecordId, exhibitionId, recordSourceUrl, file.importVersion],
        );
        for (const label of item.unresolved) {
          await client.query(
            `INSERT INTO "HistoryUnresolvedName" (id, "exhibitionId", label, status, "createdAt") VALUES ($1, $2, $3, 'UNRESOLVED_PARTICIPANT', NOW())`,
            [randomUUID(), exhibitionId, label],
          );
        }
        exhibitionsWritten += 1;
      }
    }
    let detached = 0;
    for (const item of file.detachments ?? []) {
      const show = snapshot.exhibitions.find((exhibition) => exhibition.year === item.year && normalizeArtistLookup(exhibition.title) === normalizeArtistLookup(item.title));
      const artistId = show ? slugToId.get(item.slug) : undefined;
      if (!show || !artistId || !show.artistSlugs.includes(item.slug)) continue;
      if (!labelAppearsInTitle(item.restoreLabel, show.title)) throw new Error(`DETACH_NOT_IN_TITLE ${item.slug}`);
      const removed = await client.query(`DELETE FROM "HistoryParticipation" WHERE "exhibitionId" = $1 AND "artistEntityId" = $2`, [show.id, artistId]);
      detached += removed.rowCount ?? 0;
      const already = unresolved.rows.some((row) => row.exhibitionId === show.id && row.label === item.restoreLabel);
      if (!already) {
        await client.query(
          `INSERT INTO "HistoryUnresolvedName" (id, "exhibitionId", label, status, "createdAt") VALUES ($1, $2, $3, 'TITLE_MENTION', NOW())`,
          [randomUUID(), show.id, item.restoreLabel],
        );
      }
    }
    for (const mention of file.titleMentions ?? []) {
      const show = snapshot.exhibitions.find((exhibition) => exhibition.year === mention.year && normalizeArtistLookup(exhibition.title) === normalizeArtistLookup(mention.title));
      if (!show) continue;
      for (const label of mention.labels) {
        if (!labelAppearsInTitle(label, show.title)) throw new Error(`MENTION_NOT_IN_TITLE ${label}`);
        await client.query(
          `UPDATE "HistoryUnresolvedName" SET status = 'TITLE_MENTION' WHERE "exhibitionId" = $1 AND label = $2 AND status = 'UNRESOLVED_PARTICIPANT'`,
          [show.id, label],
        );
      }
    }
    let relinked = 0;
    for (const row of unresolved.rows) {
      if (!shouldRelinkUnresolved(row.label, row.title, row.status)) continue;
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
      console.log("GROWTH_IMPORT_BLOCKED");
      process.exit(1);
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ imported: true, exhibitionsWritten, participationsWritten, aliasesWritten, relinked, detached, backup: saved, users: after.rows[0].users }));
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "failed";
  console.log(message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]"));
  process.exit(1);
});
