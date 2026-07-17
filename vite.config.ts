import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    cssCodeSplit: true,
    sourcemap: false,
    // The isolated Three.js layer is governed by scripts/check-bundle.mjs at 250 kB gzip.
    chunkSizeWarningLimit: 900,
  },
});
