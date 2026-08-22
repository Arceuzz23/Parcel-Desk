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
