export type FindingStatus = "CONFIRMED" | "LIKELY" | "UNCONFIRMED";

export type ConnectionProvider = "supabase" | "neon" | "localhost" | "other" | "absent";
export type PoolingMode = "transaction-pooler" | "session-pooler" | "direct" | "unknown" | "none";
export type UsernameShape = "bare-postgres" | "postgres-with-project-suffix" | "other" | "absent";

export type DatabaseGateDecision =
  | "PUBLIC_BETA_FIRST_PARTY_SEED_READY"
  | "PUBLIC_BETA_CLEARANCE_SEED_REQUIRED"
  | "PUBLIC_BETA_DATABASE_CREDENTIALS_REQUIRED"
  | "PUBLIC_BETA_DATABASE_IDENTITY_BLOCKED"
  | "PUBLIC_BETA_RECOVERY_GATE_BLOCKED";

export type IdentityStatus =
  | "EXPECTED_ROB_SCHEMA_CONFIRMED"
  | "DATABASE_IDENTITY_MISMATCH"
  | "DATABASE_IDENTITY_UNCONFIRMED";

export type ProductionLinkage = "PRODUCTION" | "PREVIEW_OR_STAGING" | "LOCAL_OR_DEVELOPMENT" | "UNKNOWN";

export type RecoveryStatus =
  | "RECOVERY_CONFIRMED"
  | "RECOVERY_REQUIRES_MANUAL_CONFIRMATION"
  | "RECOVERY_UNCONFIRMED";

export type ConnectionShape = {
  present: boolean;
  parseable: boolean;
  provider: ConnectionProvider;
  hostSuffix: string | null;
  region: string | null;
  port: string | null;
  database: string | null;
  pooling: PoolingMode;
  usernameShape: UsernameShape;
  projectRefPrefix: string | null;
  sslInUrl: boolean;
  sslMode: string | null;
  pgbouncerFlag: boolean;
  trailingWhitespace: boolean;
  literalNewlineSuffix: boolean;
  passwordPresent: boolean;
  passwordHasWhitespace: boolean;
  passwordPercentEncoded: boolean;
};

export type FirstPartyAudit = {
  artistProfiles: number;
  publicExhibitions: number;
  publicWithCreator: number;
  publicWithoutCreator: number;
  artistsAtLeast1: number;
  artistsAtLeast3: number;
  artistsAtLeast8: number;
  artistsAtLeast12: number;
  publicParticipationRows: number;
  bridgeExhibitions: number;
  bridgePaths: number;
  exhibitionsWithSpace: number;
  spacesAtLeast1: number;
  spacesAtLeast3: number;
  spacesAtLeast8: number;
  legacyCandidates: number;
  notSafeToClassify: number;
  namedArtistsWithPublicExhibitions: number;
};

export const ROB_SCHEMA_TABLES = [
  "User",
  "ArtistProfile",
  "Artwork",
  "Exhibition",
  "ExhibitionArtist",
  "Space",
  "ArtEvent",
] as const;

const SECRET_QUERY_KEYS = new Set(["password", "token", "secret", "key"]);

export function describeConnection(raw: string | null | undefined): ConnectionShape {
  const value = raw ?? "";
  const empty: ConnectionShape = {
    present: value.length > 0,
    parseable: false,
    provider: value.length > 0 ? "other" : "absent",
    hostSuffix: null,
    region: null,
    port: null,
    database: null,
    pooling: "none",
    usernameShape: "absent",
    projectRefPrefix: null,
    sslInUrl: false,
    sslMode: null,
    pgbouncerFlag: false,
    trailingWhitespace: value !== value.trim(),
    literalNewlineSuffix: /\\n$/.test(value.trimEnd()) || value.endsWith("\n") || value.endsWith("\r"),
    passwordPresent: false,
    passwordHasWhitespace: false,
    passwordPercentEncoded: false,
  };
  if (!value.trim()) return empty;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return empty;
  }
  const host = url.hostname.toLowerCase();
  const provider: ConnectionProvider = /supabase/.test(host)
    ? "supabase"
    : /neon/.test(host)
      ? "neon"
      : host === "localhost" || host === "127.0.0.1"
        ? "localhost"
        : "other";
  const port = url.port || (url.protocol === "postgresql:" || url.protocol === "postgres:" ? "5432" : null);
  const poolerHost = /pooler|pool/.test(host);
  const pooling: PoolingMode =
    provider === "localhost"
      ? "direct"
      : poolerHost && port === "6543"
        ? "transaction-pooler"
        : poolerHost && port === "5432"
          ? "session-pooler"
          : host.startsWith("db.") && provider === "supabase"
            ? "direct"
            : "unknown";
  const username = decodeURIComponent(url.username || "");
  const usernameShape: UsernameShape = !username
    ? "absent"
    : username === "postgres"
      ? "bare-postgres"
      : /^postgres\.[a-z0-9]+$/i.test(username)
        ? "postgres-with-project-suffix"
        : "other";
  const projectRef = usernameShape === "postgres-with-project-suffix" ? username.split(".")[1] : null;
  const password = decodeURIComponent(url.password || "");
  const sslMode = url.searchParams.get("sslmode");
  const regionMatch = host.match(/aws-\d+-([a-z0-9-]+)\.pooler/);
  return {
    present: true,
    parseable: true,
    provider,
    hostSuffix: host.split(".").slice(-2).join("."),
    region: regionMatch ? regionMatch[1] : null,
    port,
    database: url.pathname.replace(/^\//, "") || null,
    pooling,
    usernameShape,
    projectRefPrefix: projectRef ? projectRef.slice(0, 4) : null,
    sslInUrl: url.searchParams.has("sslmode") || url.searchParams.has("ssl"),
    sslMode,
    pgbouncerFlag: url.searchParams.get("pgbouncer") === "true",
    trailingWhitespace: value !== value.trim(),
    literalNewlineSuffix: /\\n$/.test(value.trim()) || value.endsWith("\n") || value.endsWith("\r"),
    passwordPresent: password.length > 0,
    passwordHasWhitespace: /\s/.test(password),
    passwordPercentEncoded: /%[0-9A-Fa-f]{2}/.test(url.password),
  };
}

export function publicConnectionLine(shape: ConnectionShape): string {
  if (!shape.present) return "DATABASE_URL is absent";
  if (!shape.parseable) return "DATABASE_URL is present but not a parseable URL";
  const ssl = shape.sslInUrl ? `sslmode=${shape.sslMode ?? "set"}` : "no sslmode in URL";
  const region = shape.region ? ` region ${shape.region}` : "";
  return `${shape.provider}${region} ${shape.pooling} port ${shape.port ?? "default"} database ${shape.database ?? "unknown"} user ${shape.usernameShape} ${ssl}`;
}

export function redactDatabaseError(message: string, rawUrl: string | null): string {
  let text = message.replace(/\s+/g, " ").trim();
  if (rawUrl) {
    try {
      const url = new URL(rawUrl.trim());
      const secrets = [url.password, decodeURIComponent(url.password), url.username, decodeURIComponent(url.username), url.hostname];
      for (const secret of secrets) {
        if (secret) text = text.split(secret).join("[redacted]");
      }
    } catch {
      text = "unparsed database error";
    }
  }
  text = text.replace(/postgres\.[A-Za-z0-9_-]+/g, "postgres.[project]");
  text = text.replace(/postgresql:\/\/\S+/gi, "postgresql://[redacted]");
  for (const key of SECRET_QUERY_KEYS) {
    text = text.replace(new RegExp(`${key}=([^\\s&]+)`, "gi"), `${key}=[redacted]`);
  }
  return text.slice(0, 240);
}

export function classifyPostgresError(code: string | null): "AUTH_REJECTED" | "NETWORK" | "UNAVAILABLE" | "UNKNOWN" {
  if (code === "28P01" || code === "28000" || code === "P1000") return "AUTH_REJECTED";
  if (code === "ENOTFOUND" || code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "EAI_AGAIN") return "NETWORK";
  if (code === "57P01" || code === "53300" || code === "3D000") return "UNAVAILABLE";
  return "UNKNOWN";
}

export type ConnectionFinding = { id: string; status: FindingStatus; text: string };

export function diagnoseStoredConnection(input: {
  nextOverridesEnv: boolean;
  prismaReadsDotenvOnly: boolean;
  urlsDiffer: boolean;
  shape: ConnectionShape | null;
  errorClass: "AUTH_REJECTED" | "NETWORK" | "UNAVAILABLE" | "UNKNOWN" | null;
  alternateAccepted?: boolean;
}): ConnectionFinding[] {
  const findings: ConnectionFinding[] = [];
  findings.push({
    id: "next-precedence",
    status: "CONFIRMED",
    text: input.nextOverridesEnv
      ? ".env.local overrides .env for Next.js dev and local build. Next does not load .env.local when NODE_ENV is test."
      : "Next.js env precedence could not be tied to this repository.",
  });
  findings.push({
    id: "prisma-cli-source",
    status: "CONFIRMED",
    text: input.prismaReadsDotenvOnly
      ? "Prisma CLI loads .env through dotenv/config and does not load .env.local. The runtime Pool reads process.env.DATABASE_URL, which Next has already resolved."
      : "Prisma CLI env loading was not confirmed from this repository.",
  });
  if (input.urlsDiffer) {
    findings.push({
      id: "file-mismatch",
      status: "CONFIRMED",
      text: ".env and .env.local do not contain the same DATABASE_URL. Local Next uses .env.local. Prisma CLI uses .env.",
    });
  } else {
    findings.push({
      id: "file-mismatch",
      status: "CONFIRMED",
      text: ".env and .env.local contain the same DATABASE_URL, or one of them has no DATABASE_URL. Precedence does not change the local value.",
    });
  }
  const shape = input.shape;
  if (shape?.pooling === "transaction-pooler" && shape.usernameShape === "bare-postgres") {
    findings.push({
      id: "pooler-username",
      status: "CONFIRMED",
      text: "Port 6543 is the Supabase transaction pooler. The username is bare postgres, not postgres plus the project ref. Supabase's pooler connection string uses the project-ref username.",
    });
  } else if (shape?.pooling === "transaction-pooler" && shape.usernameShape === "postgres-with-project-suffix") {
    findings.push({
      id: "pooler-username",
      status: "CONFIRMED",
      text: "The username has the pooler project-ref form. Username format is not the mismatch.",
    });
  }
  if (shape?.trailingWhitespace || shape?.literalNewlineSuffix || shape?.passwordHasWhitespace) {
    findings.push({
      id: "malformed-secret",
      status: "CONFIRMED",
      text: "The stored URL or password has trailing whitespace or a newline suffix. That changes the secret the server checks.",
    });
  }
  if (input.alternateAccepted && input.errorClass === "AUTH_REJECTED") {
    findings.push({
      id: "alternate-accepts",
      status: "CONFIRMED",
      text: "Another local URL for this project accepted a read-only probe. The URL Next.js actually loads was still rejected.",
    });
  }
  if (input.errorClass === "AUTH_REJECTED") {
    findings.push({
      id: "auth-rejected",
      status: "CONFIRMED",
      text: "The server was reached and rejected the login. This is not a timeout, DNS failure, or TLS handshake failure.",
    });
    findings.push({
      id: "stale-password",
      status: "LIKELY",
      text: "A rejected login with a reachable Supabase pooler is consistent with a stale, rotated, or mismatched password. The repository cannot see the current dashboard secret.",
    });
    findings.push({
      id: "wrong-project",
      status: "UNCONFIRMED",
      text: "The URL may point at a different Supabase project than the Vercel production project. No production env value is stored in the repository, so this cannot be checked here.",
    });
  } else if (input.errorClass === "NETWORK") {
    findings.push({
      id: "network",
      status: "CONFIRMED",
      text: "The host did not accept a connection. The password was not checked.",
    });
  } else if (input.errorClass === null) {
    findings.push({
      id: "auth-rejected",
      status: "UNCONFIRMED",
      text: "No login attempt was recorded for this shape.",
    });
  }
  findings.push({
    id: "production-linkage",
    status: "UNCONFIRMED",
    text: "Env files are gitignored. Vercel production credentials are not in the repository. A local URL cannot be proven to be the production database from repo contents.",
  });
  findings.push({
    id: "recovery",
    status: "UNCONFIRMED",
    text: "Supabase backup and point-in-time recovery are dashboard settings. This repository does not prove that a current backup exists.",
  });
  return findings;
}

export function schemaIdentity(presentTables: string[] | null): IdentityStatus {
  if (!presentTables) return "DATABASE_IDENTITY_UNCONFIRMED";
  const present = new Set(presentTables);
  const missing = ROB_SCHEMA_TABLES.filter((table) => !present.has(table));
  if (missing.length === 0) return "EXPECTED_ROB_SCHEMA_CONFIRMED";
  if (missing.length === ROB_SCHEMA_TABLES.length) return "DATABASE_IDENTITY_MISMATCH";
  return "DATABASE_IDENTITY_MISMATCH";
}

export function betaMinimumMet(audit: FirstPartyAudit | null): boolean | null {
  if (!audit) return null;
  return (
    audit.artistsAtLeast1 >= 3 &&
    audit.artistsAtLeast8 >= 1 &&
    audit.bridgePaths >= 1 &&
    audit.spacesAtLeast1 >= 1 &&
    audit.namedArtistsWithPublicExhibitions >= 3
  );
}

export function databaseGateDecision(input: {
  authenticated: boolean;
  identity: IdentityStatus;
  productionLinkage: ProductionLinkage;
  recovery: RecoveryStatus;
  audit: FirstPartyAudit | null;
}): DatabaseGateDecision {
  if (!input.authenticated) return "PUBLIC_BETA_DATABASE_CREDENTIALS_REQUIRED";
  if (input.identity !== "EXPECTED_ROB_SCHEMA_CONFIRMED" || input.productionLinkage !== "PRODUCTION") {
    return "PUBLIC_BETA_DATABASE_IDENTITY_BLOCKED";
  }
  if (input.recovery !== "RECOVERY_CONFIRMED") return "PUBLIC_BETA_RECOVERY_GATE_BLOCKED";
  const ready = betaMinimumMet(input.audit);
  if (ready == null) return "PUBLIC_BETA_DATABASE_IDENTITY_BLOCKED";
  return ready ? "PUBLIC_BETA_FIRST_PARTY_SEED_READY" : "PUBLIC_BETA_CLEARANCE_SEED_REQUIRED";
}

export function auditCountsAreReal(audit: FirstPartyAudit | null, authenticated: boolean): boolean {
  return authenticated && audit != null;
}

export function reportedCount(audit: FirstPartyAudit | null, key: keyof FirstPartyAudit): number | "not queried" {
  if (!auditCountsAreReal(audit, audit != null)) return "not queried";
  return audit ? audit[key] : "not queried";
}
