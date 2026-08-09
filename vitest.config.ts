import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // json-summary feeds scripts/coverage-badge.mjs.
      reporter: ["text", "lcov", "html", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"],
    },
  },
});
