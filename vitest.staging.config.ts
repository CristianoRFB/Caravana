import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["staging-tests/**/*.test.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 45000, hookTimeout: 60000, reporters: ["verbose", ["json", { outputFile: ".firebase/staging-vitest-report.json" }]] } });
