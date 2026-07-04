import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
// In production the app is served from a GitHub Pages subpath
// (https://astrocyte74.github.io/all-things-denote/), so assets must be
// prefixed with that base. Local dev keeps the root base for convenience.
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/all-things-denote/" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
