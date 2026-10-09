import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  betaMinimumMet,
  databaseGateDecision,
  describeConnection,
  diagnoseStoredConnection,
  publicConnectionLine,
  redactDatabaseError,
  reportedCount,
  schemaIdentity,
  type FirstPartyAudit,
} from "@/lib/history/databaseGate";

const SECRET = "super-secret-db-password";

function audit(overrides: Partial<FirstPartyAudit> = {}): FirstPartyAudit {
  return {
    artistProfiles: 116,
    publicExhibitions: 10,
    publicWithCreator: 10,
    publicWithoutCreator: 0,
    artistsAtLeast1: 4,
    artistsAtLeast3: 2,
    artistsAtLeast8: 0,
    artistsAtLeast12: 0,
    publicParticipationRows: 10,
    bridgeExhibitions: 0,
    bridgePaths: 0,
    exhibitionsWithSpace: 10,
    spacesAtLeast1: 10,
    spacesAtLeast3: 0,
    spacesAtLeast8: 0,
    legacyCandidates: 10,
    notSafeToClassify: 0,
    namedArtistsWithPublicExhibitions: 4,
    ...overrides,
  };
}

describe("database gate", () => {
  it("describes a connection without printing the password", () => {
    const raw = `postgresql://postgres.vvdxsample:${SECRET}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres\n`;
    const shape = describeConnection(raw);
    const line = publicConnectionLine(shape);
    expect(line.includes(SECRET)).toBe(false);
    expect(line).toContain("transaction-pooler");
    expect(line).toContain("6543");
    expect(shape.trailingWhitespace).toBe(true);
    expect(shape.usernameShape).toBe("postgres-with-project-suffix");
    expect(redactDatabaseError(`password authentication failed for user "postgres.vvdxsample" secret ${SECRET}`, raw).includes(SECRET)).toBe(false);
  });

  it("does not turn a failed login into zero counts or a passing gate", () => {
    expect(reportedCount(null, "publicExhibitions")).toBe("not queried");
    expect(betaMinimumMet(null)).toBeNull();
    expect(
      databaseGateDecision({
        authenticated: false,
        identity: "DATABASE_IDENTITY_UNCONFIRMED",
        productionLinkage: "UNKNOWN",
        recovery: "RECOVERY_UNCONFIRMED",
        audit: null,
      }),
    ).toBe("PUBLIC_BETA_DATABASE_CREDENTIALS_REQUIRED");
    expect(
      databaseGateDecision({
        authenticated: true,
        identity: "EXPECTED_ROB_SCHEMA_CONFIRMED",
        productionLinkage: "PRODUCTION",
        recovery: "RECOVERY_CONFIRMED",
        audit: null,
      }),
    ).not.toBe("PUBLIC_BETA_FIRST_PARTY_SEED_READY");
  });

  it("blocks on identity before recovery, and does not pass a database with no bridge", () => {
    const sparse = audit();
    expect(betaMinimumMet(sparse)).toBe(false);
    expect(
      databaseGateDecision({
        authenticated: true,
        identity: "EXPECTED_ROB_SCHEMA_CONFIRMED",
        productionLinkage: "UNKNOWN",
        recovery: "RECOVERY_UNCONFIRMED",
        audit: sparse,
      }),
    ).toBe("PUBLIC_BETA_DATABASE_IDENTITY_BLOCKED");
    expect(
      databaseGateDecision({
        authenticated: true,
        identity: "EXPECTED_ROB_SCHEMA_CONFIRMED",
        productionLinkage: "PRODUCTION",
        recovery: "RECOVERY_UNCONFIRMED",
        audit: sparse,
      }),
    ).toBe("PUBLIC_BETA_RECOVERY_GATE_BLOCKED");
    expect(
      databaseGateDecision({
        authenticated: true,
        identity: "EXPECTED_ROB_SCHEMA_CONFIRMED",
        productionLinkage: "PRODUCTION",
        recovery: "RECOVERY_CONFIRMED",
        audit: sparse,
      }),
    ).toBe("PUBLIC_BETA_CLEARANCE_SEED_REQUIRED");
    expect(
      databaseGateDecision({
        authenticated: true,
        identity: "EXPECTED_ROB_SCHEMA_CONFIRMED",
        productionLinkage: "PRODUCTION",
        recovery: "RECOVERY_CONFIRMED",
        audit: audit({ artistsAtLeast8: 1, bridgePaths: 2, spacesAtLeast1: 1, artistsAtLeast1: 3, namedArtistsWithPublicExhibitions: 3 }),
      }),
    ).toBe("PUBLIC_BETA_FIRST_PARTY_SEED_READY");
  });

  it("records a rejected app URL even when another local URL connects", () => {
    const findings = diagnoseStoredConnection({
      nextOverridesEnv: true,
      prismaReadsDotenvOnly: true,
      urlsDiffer: true,
      shape: describeConnection(`postgresql://postgres.vvdxsample:${SECRET}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`),
      errorClass: "AUTH_REJECTED",
      alternateAccepted: true,
    });
    expect(findings.find((item) => item.id === "auth-rejected")?.status).toBe("CONFIRMED");
    expect(findings.find((item) => item.id === "alternate-accepts")?.status).toBe("CONFIRMED");
    expect(findings.find((item) => item.id === "pooler-username")?.text).toContain("project-ref");
    expect(schemaIdentity(["User", "ArtistProfile", "Artwork", "Exhibition", "ExhibitionArtist", "Space", "ArtEvent"])).toBe(
      "EXPECTED_ROB_SCHEMA_CONFIRMED",
    );
    expect(schemaIdentity(["User"])).toBe("DATABASE_IDENTITY_MISMATCH");
  });

  it("keeps the connection audit read-only", () => {
    const source = readFileSync(path.resolve("scripts/database-connection-audit.ts"), "utf8");
    expect(source).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)\b/);
    expect(source.includes("backfill-artist-entities")).toBe(false);
    expect(source.includes("add-rob-public-beta-history.sql")).toBe(false);
    expect(source.includes(SECRET)).toBe(false);
  });
});
