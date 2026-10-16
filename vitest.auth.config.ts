import { defineConfig } from "vitest/config";

export default defineConfig({ test: {
  include: ["auth-tests/**/*.test.ts"], setupFiles: ["tests/setup-emulators.ts"], fileParallelism: false, testTimeout: 20000, hookTimeout: 20000,
} });
