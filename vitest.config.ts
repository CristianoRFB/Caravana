import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup-emulators.ts"],
    // Rule and operation suites deliberately share one isolated emulator project.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
