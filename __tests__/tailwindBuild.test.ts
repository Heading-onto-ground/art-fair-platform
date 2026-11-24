import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const nodeRequire = createRequire(import.meta.url);

describe("Next 13 Tailwind compilation", () => {
  it("loads the CommonJS PostCSS config and emits utility classes", async () => {
    const config = nodeRequire(resolve(root, "postcss.config.cjs"));
    const tailwind = nodeRequire("@tailwindcss/postcss");
    const pluginOptions = config.plugins["@tailwindcss/postcss"];
    expect(pluginOptions?.base).toBeTruthy();

    const css = readFileSync(resolve(root, "app/globals.css"), "utf8");
    const out = (
      await postcss([tailwind(pluginOptions)]).process(css, {
        from: resolve(root, "app/globals.css"),
      })
    ).css;

    expect(out).toContain(".w-4");
    expect(out).toContain(".h-4");
    expect(out).not.toContain("@tailwind utilities");
  }, 20000);
});
