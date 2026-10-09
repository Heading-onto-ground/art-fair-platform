import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");

describe("ROB installable web app", () => {
  it("installs as Artist Ritual and opens the ritual route", () => {
    const manifest = readFileSync(resolve(root, "app/manifest.ts"), "utf8");
    expect(manifest).toContain('name: "ROB — Artist Ritual"');
    expect(manifest).toContain('short_name: "ROB Ritual"');
    expect(manifest).toMatch(/start_url:\s*"\/artist\/ritual"/);
    expect(existsSync(resolve(root, "app/artist/ritual/page.tsx"))).toBe(true);
  });
});
