import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { pilotPath } from "./paths";

export function writeJson(relativePath: string, value: unknown): void {
  const full = pilotPath(relativePath);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(pilotPath(relativePath), "utf8")) as T;
}
