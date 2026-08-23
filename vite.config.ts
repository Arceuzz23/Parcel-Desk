/// <reference types="vitest/config" />
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // "@/..." import alias, required by shadcn/ui-generated components.
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // React + its runtime helpers (react-dom, scheduler,
        // use-sync-external-store) are ~180 kB on their own — pulled into
        // their own chunk so they change (and get re-downloaded) far less
        // often than app code across deploys, and so the main chunk stops
        // carrying that weight alongside everything else. This is a pure
        // caching/organization split: still fetched eagerly, same as
        // today, zero behavior change. It's the other half of fixing the
        // >500 kB warning — see EventsOverTimeChart's dynamic import in
        // SummaryPanel.tsx (src/components/SummaryPanel.tsx) for the half
        // that's a genuine payload deferral, not just a chunk boundary.
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler|use-sync-external-store)\//.test(id)) {
            return "react-vendor";
          }
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    // Scope Vitest to src/tests only — without this, its default
    // "**/*.spec.ts" glob would also pick up e2e/*.spec.ts, which uses
    // @playwright/test's own test()/expect() and a real browser, not
    // Vitest's. Playwright has its own runner (`npm run test:e2e`); the
    // two suites are deliberately never run by the same command.
    include: ["src/tests/**/*.test.{ts,tsx}"],
  },
});
