import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    env: { VITE_DATA_MODE: "demo-local" },
    exclude: [
      "node_modules/**",
      "dist/**",
      "tests/firestore.rules.test.ts",
      "tests/access.backend.test.ts",
    ],
  },
});
