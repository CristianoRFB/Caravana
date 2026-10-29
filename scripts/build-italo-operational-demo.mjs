import { build, loadEnv } from 'vite';
const env = { ...loadEnv('e2e', process.cwd(), 'VITE_'), ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('VITE_'))) };
if (env.VITE_FIREBASE_PROJECT_ID !== 'demo-caravana77-test' || env.VITE_USE_EMULATORS !== 'true') throw Error('Operational browser tests require the fixed demo emulators.');
await build({ mode: 'e2e', base: '/tenant-italo/', define: {
  'import.meta.env.VITE_PRIVATE_HISTORY_TENANT': JSON.stringify(''),
  'import.meta.env.VITE_ITALO_OPERATIONAL_TENANT': JSON.stringify('italo'),
}, build: { outDir: 'dist-italo-operational-e2e' } });
