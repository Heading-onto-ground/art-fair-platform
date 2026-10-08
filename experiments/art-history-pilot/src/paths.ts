import path from "path";
import { fileURLToPath } from "url";

export function pilotRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

export function pilotPath(...parts: string[]): string {
  return path.join(pilotRoot(), ...parts);
}
