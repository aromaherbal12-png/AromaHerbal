import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  esbuild: { legalComments: "none" },
  server: {
    host: "127.0.0.1",
    port: 5174,
    allowedHosts: ["greatest-buy-por-happens.trycloudflare.com"],
    proxy: {
      // Forward all /api/* requests to the Express backend during dev.
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
