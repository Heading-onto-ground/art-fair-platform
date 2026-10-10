import { config } from "dotenv";
import { performance } from "node:perf_hooks";

config({ path: ".env.local" });
config({ path: ".env" });

type QuerySample = { ms: number; sql: string };
const queries: QuerySample[] = [];
let connectMs = 0;
let connects = 0;

const pg = require("pg") as {
  Pool: { prototype: { query: (...args: unknown[]) => unknown; connect: (...args: unknown[]) => unknown } };
};

const originalQuery = pg.Pool.prototype.query;
pg.Pool.prototype.query = function query(this: unknown, ...args: unknown[]) {
  const start = performance.now();
  const statement = args[0];
  const sql = (typeof statement === "string" ? statement : String((statement as { text?: string } | undefined)?.text || ""))
    .replace(/\s+/g, " ")
    .slice(0, 180);
  const result = originalQuery.apply(this, args);
  const record = () => {
    queries.push({ ms: Math.round(performance.now() - start), sql });
  };
  if (result && typeof (result as Promise<unknown>).then === "function") {
    return (result as Promise<unknown>).then(
      (value) => {
        record();
        return value;
      },
      (error: unknown) => {
        record();
        throw error;
      },
    );
  }
  record();
  return result;
};

const originalConnect = pg.Pool.prototype.connect;
pg.Pool.prototype.connect = function connect(this: unknown, ...args: unknown[]) {
  const start = performance.now();
  const result = originalConnect.apply(this, args);
  const record = () => {
    connectMs += performance.now() - start;
    connects += 1;
  };
  if (result && typeof (result as Promise<unknown>).then === "function") {
    return (result as Promise<unknown>).then(
      (value) => {
        record();
        return value;
      },
      (error: unknown) => {
        record();
        throw error;
      },
    );
  }
  record();
  return result;
};

function redact(value: unknown): string {
  return String(value instanceof Error ? value.message : value).replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://redacted");
}

async function main() {
  const poolMax = process.env.DATABASE_POOL_MAX || "(default)";
  const { loadPublicArtistFromDatabase } = await import("../lib/history/queries");
  console.log(`ROB_PERF poolMax=${poolMax} nodeEnv=${process.env.NODE_ENV || ""} path=database`);
  for (const slug of ["lee-ufan", "park-seo-bo", "ha-chong-hyun"]) {
    for (const pass of ["cold", "warm"]) {
      const before = queries.length;
      const connectBefore = connects;
      const connectMsBefore = connectMs;
      const started = performance.now();
      const loaded = await loadPublicArtistFromDatabase(slug);
      const total = Math.round(performance.now() - started);
      const slice = queries.slice(before);
      const exhibitions = loaded.kind === "missing" ? 0 : loaded.artist.exhibitionCount;
      const works = loaded.kind === "missing" ? 0 : loaded.artist.works.length;
      const queryMs = slice.reduce((sum, query) => sum + query.ms, 0);
      console.log(
        `ROB_PERF artist=${slug} pass=${pass} kind=${loaded.kind} exhibitions=${exhibitions} works=${works} queries=${slice.length} queryMsSum=${queryMs} connectCalls=${connects - connectBefore} connectMs=${Math.round(connectMs - connectMsBefore)} total=${total}`,
      );
    }
  }
}

main().catch((error: unknown) => {
  console.error(`ROB_PERF_FAIL ${redact(error)}`);
  process.exit(1);
});
