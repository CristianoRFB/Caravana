import { defineConfig } from 'vitest/config';
export default defineConfig({test:{include:['tests/in-place-bootstrap.auth.ts','tests/commercial-baseline.test.ts'],
  setupFiles:['tests/setup-emulators.ts'],fileParallelism:false,testTimeout:30000,hookTimeout:30000}});
