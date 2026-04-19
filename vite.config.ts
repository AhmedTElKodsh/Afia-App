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
      // @supabase/supabase-js lives in worker/node_modules, which is NOT installed
      // during the root `npm ci` step in CI. Vite's import-analysis resolves imports
      // at transform time (before vi.mock can intercept), so we redirect to a committed
      // stub. Worker tests mock supabaseClient.ts entirely via vi.mock() — the stub
      // is never called. The Cloudflare plugin uses its own environment for the worker
      // build and resolves the real package from worker/node_modules.
      "@supabase/supabase-js": path.resolve(
        __dirname,
        "src/test/__mocks__/supabase-stub.ts",
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
      globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
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
    include: ["src/**/*.test.{ts,tsx}", "worker/**/*.test.ts"],
    testTimeout: 10000, // Increase timeout for CI environment (default is 5000ms)
    hookTimeout: 10000, // Increase hook timeout for CI
  },
});