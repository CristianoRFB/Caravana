import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["restore-tests/**/*.test.ts"], setupFiles: ["tests/setup-emulators.ts"], fileParallelism: false, testTimeout: 45000, hookTimeout: 20000 } });
