import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The backend (backend/app.py) must be running on http://127.0.0.1:5000
// for /api requests to succeed — this only sets up the proxy, it does not
// start the backend for you. See the project README.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
