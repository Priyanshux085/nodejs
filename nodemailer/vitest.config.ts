import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    isolate: true,
    testTimeout: 5000,
    typecheck: {
      include: ["**/*.{spec|test}.{ts,tsx}"],
    },
    include: ["**/*.spec.ts"],
    exclude: ["node_modules", "dist", "build"],
  },
});
