import { defineConfig } from 'vitest/config';
export default defineConfig({test:{include:['tests/tenant-activation.auth.ts','tests/finance.test.ts'],setupFiles:['tests/setup-emulators.ts'],fileParallelism:false,testTimeout:30000,hookTimeout:30000}});
