import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  define: {
    __API_URL__: JSON.stringify(
      process.env.VITE_API_URL || "http://localhost:8000"
    ),
  },
});
