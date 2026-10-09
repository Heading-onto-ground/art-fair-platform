import { spawnSync } from "node:child_process";

// ESLint 9 walks up to the web eslint.config.mjs, which ignores mobile/**.
// Keep the Expo eslintrc contract instead of inheriting that ignore.
const result = spawnSync("npx", ["expo", "lint"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ESLINT_USE_FLAT_CONFIG: "false" },
});

process.exit(result.status === null ? 1 : result.status);
