import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    cssCodeSplit: true,
    sourcemap: true,
    // The lazy realtime chunk intentionally contains Three.js; its gzip size stays below 240 kB.
    chunkSizeWarningLimit: 1000,
  },
});
