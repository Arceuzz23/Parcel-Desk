import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright is dev-time E2E only — see docs/DECISIONS.md: "Playwright MCP
 * is a dev-time tool, not a runtime or CI dependency." `webServer` here
 * boots the actual Vite dev build (not a mock), runs the 6 acceptance
 * scenarios against it, and tears the server down afterward — no server is
 * shipped or required at runtime for the app itself.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
