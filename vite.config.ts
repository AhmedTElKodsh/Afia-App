import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { cloudflare } from "@cloudflare/vite-plugin";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // @supabase/supabase-js lives in worker/node_modules, not root node_modules.
      // Vite's import-analysis resolves imports at transform time (before vi.mock can
      // intercept), so we point it at the real package path for test resolution.
      // The Cloudflare plugin uses its own environment for the worker build.
      "@supabase/supabase-js": path.resolve(
        __dirname,
        "worker/node_modules/@supabase/supabase-js",
      ),
    },
  },
  plugins: [react(), VitePWA({
    registerType: "autoUpdate",
    manifest: {
      name: "Afia Oil Tracker",
      short_name: "Afia",
      description:
        "Track your cooking oil consumption with AI-powered bottle scanning",
      display: "browser",
      start_url: "/",
      scope: "/",
      theme_color: "#2D6A4F",
      background_color: "#F8F9FA",
      icons: [
        {
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    },
    workbox: {
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\/(analyze|feedback)$/,
          handler: "NetworkOnly",
        },
        {
          urlPattern: /\/bottles\/.*\.png$/,
          handler: "CacheFirst",
          options: {
            cacheName: "bottle-images",
            expiration: {
              maxAgeSeconds: 30 * 24 * 60 * 60,
            },
          },
        },
      ],
    },
  }), cloudflare()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});