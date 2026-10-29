import { defineConfig } from '@playwright/test';
import common from './playwright.config';
export default defineConfig({
  ...common, testMatch: /italo-operational\.browser\.ts/,
  outputDir: 'test-results-italo-operational', reporter: [['list'], ['json', { outputFile: 'test-results-italo-operational/e2e-report.json' }]],
  webServer: {
    command: 'node scripts/build-italo-operational-demo.mjs && vite preview --base /tenant-italo/ --outDir dist-italo-operational-e2e --host 127.0.0.1 --port 4177 --strictPort',
    url: 'http://127.0.0.1:4177/tenant-italo/', reuseExistingServer: false, timeout: 60000,
  },
});
