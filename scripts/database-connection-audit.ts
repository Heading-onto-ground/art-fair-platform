import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { parse } from "dotenv";
import pg from "pg";
import {
  classifyPostgresError,
  databaseGateDecision,
  describeConnection,
  diagnoseStoredConnection,
  publicConnectionLine,
  redactDatabaseError,
  schemaIdentity,
  type FirstPartyAudit,
} from "../lib/history/databaseGate";

const ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
];

const INTERESTING = /database|postgres|supabase|direct_url|prisma/i;

function fileUrls(): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const file of ENV_FILES) {
    if (!existsSync(file)) {
      out[file] = null;
      continue;
    }
    const parsed = parse(readFileSync(file));
    out[file] = typeof parsed.DATABASE_URL === "string" ? parsed.DATABASE_URL : null;
  }
  return out;
}

function keyNames(file: string): string[] {
  if (!existsSync(file)) return [];
  return Object.keys(parse(readFileSync(file))).filter((key) => INTERESTING.test(key)).sort();
}

function digest(value: string | null): string | null {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function nextEffective(urls: Record<string, string | null>): { file: string | null; url: string | null } {
  const order = [".env", ".env.development", ".env.local", ".env.development.local"];
  let file: string | null = null;
  let url: string | null = null;
  for (const name of order) {
    if (urls[name]) {
      file = name;
      url = urls[name];
    }
  }
  return { file, url };
}

function prismaEffective(urls: Record<string, string | null>): { file: string | null; url: string | null } {
  if (urls[".env"]) return { file: ".env", url: urls[".env"] };
  return { file: null, url: null };
}

async function probe(url: string): Promise<{ ok: boolean; code: string | null; message: string }> {
  const client = new pg.Client({
    connectionString: url.trim(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    await client.query("select 1 as ok");
    return { ok: true, code: null, message: "select 1 ok" };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : null;
    const message = error instanceof Error ? error.message : "connection failed";
    return { ok: false, code, message: redactDatabaseError(message, url) };
  } finally {
    try {
      await client.end();
    } catch {
      // ignore close failure
    }
  }
}

async function readAudit(url: string): Promise<{ tables: string[]; audit: FirstPartyAudit | null; error: string | null }> {
  const client = new pg.Client({
    connectionString: url.trim(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  await client.connect();
  try {
    const tables = await client.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1::text[])`,
      [["User", "ArtistProfile", "Artwork", "Exhibition", "ExhibitionArtist", "Space", "ArtEvent"]],
    );
    const present = tables.rows.map((row) => row.table_name);
    if (schemaIdentity(present) !== "EXPECTED_ROB_SCHEMA_CONFIRMED") {
      return { tables: present, audit: null, error: null };
    }
    const counts = await client.query<FirstPartyAudit>(`
      with public_exhibitions as (
        select * from "Exhibition" where "isPublic" = true
      ),
      confirmed as (
        select e.id as exhibition_id, ea."artistId" as artist_id
        from public_exhibitions e
        join "ExhibitionArtist" ea on ea."exhibitionId" = e.id and ea.status = 'confirmed'
        join "ArtistProfile" p on p.id = ea."artistId"
      ),
      density as (
        select artist_id, count(distinct exhibition_id)::int as n
        from confirmed
        group by artist_id
      ),
      bridges as (
        select exhibition_id, count(distinct artist_id)::int as n
        from confirmed
        group by exhibition_id
        having count(distinct artist_id) >= 2
      ),
      space_counts as (
        select e."spaceId" as space_id, count(distinct e.id)::int as n
        from public_exhibitions e
        join "Space" s on s.id = e."spaceId"
        where e."spaceId" is not null
        group by e."spaceId"
      )
      select
        (select count(*)::int from "ArtistProfile") as "artistProfiles",
        (select count(*)::int from public_exhibitions) as "publicExhibitions",
        (select count(*)::int from public_exhibitions e where e."createdBy" is not null and exists (select 1 from "ArtistProfile" p where p.id = e."createdBy")) as "publicWithCreator",
        (select count(*)::int from public_exhibitions e where e."createdBy" is null or not exists (select 1 from "ArtistProfile" p where p.id = e."createdBy")) as "publicWithoutCreator",
        (select count(*)::int from density where n >= 1) as "artistsAtLeast1",
        (select count(*)::int from density where n >= 3) as "artistsAtLeast3",
        (select count(*)::int from density where n >= 8) as "artistsAtLeast8",
        (select count(*)::int from density where n >= 12) as "artistsAtLeast12",
        (select count(*)::int from "ExhibitionArtist" ea join public_exhibitions e on e.id = ea."exhibitionId") as "publicParticipationRows",
        (select count(*)::int from bridges) as "bridgeExhibitions",
        (select coalesce(sum(n * (n - 1)), 0)::int from bridges) as "bridgePaths",
        (select count(*)::int from public_exhibitions e where e."spaceId" is not null and exists (select 1 from "Space" s where s.id = e."spaceId")) as "exhibitionsWithSpace",
        (select count(*)::int from space_counts where n >= 1) as "spacesAtLeast1",
        (select count(*)::int from space_counts where n >= 3) as "spacesAtLeast3",
        (select count(*)::int from space_counts where n >= 8) as "spacesAtLeast8",
        (select count(*)::int from public_exhibitions e where e."createdBy" is not null and exists (select 1 from "ArtistProfile" p where p.id = e."createdBy")) as "legacyCandidates",
        (select count(*)::int from public_exhibitions e where e."createdBy" is null or not exists (select 1 from "ArtistProfile" p where p.id = e."createdBy")) as "notSafeToClassify",
        (select count(*)::int from density d join "ArtistProfile" p on p.id = d.artist_id where length(btrim(p.name)) > 0) as "namedArtistsWithPublicExhibitions"
    `);
    return { tables: present, audit: counts.rows[0] ?? null, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "audit failed";
    return { tables: [], audit: null, error: redactDatabaseError(message, url) };
  } finally {
    await client.end();
  }
}

async function main() {
  const urls = fileUrls();
  const next = nextEffective(urls);
  const prismaCli = prismaEffective(urls);
  const urlsDiffer = Boolean(urls[".env"] && urls[".env.local"] && urls[".env"] !== urls[".env.local"]);
  const shape = describeConnection(next.url);
  const attempted: { file: string; ok: boolean; code: string | null; message: string }[] = [];
  let authenticated = false;
  let audit: FirstPartyAudit | null = null;
  let tables: string[] | null = null;
  let identity: ReturnType<typeof schemaIdentity> = "DATABASE_IDENTITY_UNCONFIRMED";

  if (next.url) {
    const result = await probe(next.url);
    attempted.push({ file: next.file ?? "next", ...result });
    authenticated = result.ok;
  }
  if (!authenticated && urlsDiffer && prismaCli.url) {
    const result = await probe(prismaCli.url);
    attempted.push({ file: prismaCli.file ?? "prisma", ...result });
    if (result.ok) authenticated = true;
  }

  const connectedUrl = attempted.find((item) => item.ok)
    ? attempted.find((item) => item.ok)?.file === prismaCli.file && !attempted[0]?.ok
      ? prismaCli.url
      : next.url
    : null;

  if (authenticated && connectedUrl) {
    const read = await readAudit(connectedUrl);
    tables = read.tables;
    audit = read.audit;
    identity = read.error ? "DATABASE_IDENTITY_UNCONFIRMED" : schemaIdentity(read.tables);
    if (read.error) {
      attempted.push({ file: "audit", ok: false, code: null, message: read.error });
    }
  }

  const effectiveProbe = attempted.find((item) => item.file === (next.file ?? "next"));
  const errorClass = effectiveProbe && !effectiveProbe.ok ? classifyPostgresError(effectiveProbe.code) : null;
  const findings = diagnoseStoredConnection({
    nextOverridesEnv: true,
    prismaReadsDotenvOnly: true,
    urlsDiffer,
    shape,
    errorClass,
    alternateAccepted: attempted.some((item) => item.ok && item.file !== next.file),
  });
  const decision = databaseGateDecision({
    authenticated,
    identity: authenticated ? identity : "DATABASE_IDENTITY_UNCONFIRMED",
    productionLinkage: "UNKNOWN",
    recovery: "RECOVERY_UNCONFIRMED",
    audit: authenticated ? audit : null,
  });

  const vercelPath = ".vercel/project.json";
  let vercel: { linked: boolean } = { linked: false };
  if (existsSync(vercelPath)) {
    vercel = { linked: true };
  }

  const report = {
    decision,
    filesPresent: ENV_FILES.filter((file) => existsSync(file)),
    filesWithDatabaseUrl: ENV_FILES.filter((file) => urls[file]),
    keyNames: Object.fromEntries(ENV_FILES.filter((file) => existsSync(file)).map((file) => [file, keyNames(file)])),
    nextFile: next.file,
    prismaFile: prismaCli.file,
    urlsDiffer,
    sameDigest: digest(urls[".env"]) !== null && digest(urls[".env"]) === digest(urls[".env.local"]),
    nextShape: publicConnectionLine(shape),
    prismaShape: publicConnectionLine(describeConnection(prismaCli.url)),
    sslForcedByRuntime: true,
    vercelLinked: vercel.linked,
    probes: attempted.map((item) => ({ file: item.file, ok: item.ok, code: item.code, class: classifyPostgresError(item.code), message: item.message })),
    tables,
    identity: authenticated ? identity : "DATABASE_IDENTITY_UNCONFIRMED",
    productionLinkage: "UNKNOWN",
    recovery: "RECOVERY_UNCONFIRMED",
    audit: authenticated ? audit : null,
    countsQueried: Boolean(authenticated && audit),
    findings,
  };
  console.log(JSON.stringify(report));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "audit failed";
  console.log(JSON.stringify({ decision: "PUBLIC_BETA_DATABASE_CREDENTIALS_REQUIRED", error: redactDatabaseError(message, null) }));
  process.exitCode = 1;
});
