import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: path.resolve(__dirname),
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
