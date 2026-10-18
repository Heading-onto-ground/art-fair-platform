import { readFileSync, writeFileSync } from "fs";
import { envValue } from "../lib/history/runtimeEnv";

function readEnv(name: string): string {
  const files = [".env.local", ".env"].map((file) => {
    try {
      return readFileSync(file, "utf8");
    } catch {
      return "";
    }
  });
  return envValue(name, files);
}

function option(argv: string[], name: string): number | null {
  const index = argv.indexOf(name);
  if (index < 0) return null;
  const value = Number(argv[index + 1]);
  return Number.isFinite(value) ? value : null;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--write") || argv.includes("--import")) {
    console.error("PRODUCTION_WRITE_DISABLED");
    process.exit(2);
  }
  const databaseUrl = readEnv("DATABASE_URL");
  if (!databaseUrl) {
    console.error("DATABASE_URL_MISSING");
    process.exit(1);
  }
  process.env.DATABASE_URL = databaseUrl;
  const reportFlag = argv.indexOf("--report");
  const reportPath = reportFlag >= 0 ? argv[reportFlag + 1] : null;
  const { runFrontierAutopilot } = await import("./frontierAutopilotRun");
  await runFrontierAutopilot({ limit: option(argv, "--limit") ?? 12, reportPath });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "FRONTIER_AUTOPILOT_FAILED";
  console.error(message);
  process.exit(1);
});
