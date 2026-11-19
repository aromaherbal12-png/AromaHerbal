import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  esbuild: { legalComments: "none" },
  
  // Environment variables are automatically loaded from .env, .env.local, .env.{mode}, .env.{mode}.local
  // Vite intelligently selects:
  // - During `npm run dev`: loads .env and .env.development
  // - During `npm run build`: loads .env and .env.production
  
  server: {
    host: "127.0.0.1",
    port: 5174,
    allowedHosts: ["greatest-buy-por-happens.trycloudflare.com"],
    proxy: {
      // Forward all /api/* requests to the Express backend during dev.
      // Note: This is a fallback for when VITE_API_BASE_URL is not set.
      // With .env.development, API requests go directly to http://localhost:5000/api
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
