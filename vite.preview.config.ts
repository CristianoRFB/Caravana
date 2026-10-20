import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({ plugins: [react()], publicDir: false, build: {
  outDir: "dist-public-preview", rollupOptions: { input: resolve("public-preview/index.html") },
}, });
