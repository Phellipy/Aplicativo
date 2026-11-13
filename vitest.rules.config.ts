import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    env: { VITE_DATA_MODE: "demo-local" },
    include: ["tests/firestore.rules.test.ts", "tests/access.backend.test.ts"],
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
