import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Automated accessibility sweep (axe-core) across the app's key states.
 * This catches the mechanical stuff — contrast ratios, missing labels,
 * ARIA misuse — that's easy to regress silently while iterating on
 * styling. It does NOT replace manual keyboard-nav / screen-reader
 * verification, but it's cheap to run on every change and covers a lot of
 * ground.
 *
 * `wcag2a`/`wcag2aa` tags scope this to WCAG 2.0 A/AA, the level PLAN.md's
 * "adequate contrast" requirement targets.
 */
test.describe("accessibility", () => {
  test("initial (pre-run) state has no detectable violations", async ({ page }) => {
    await page.goto("/");
    // The whole dashboard staggers in on mount (entranceContainer/
    // entranceItem — see src/lib/motion.ts): 5 sections at ~80ms apart,
    // the last (Event Log) starting around ~340ms in and then settling —
    // same reasoning as the wait below, sized for this longer sequence
    // rather than the single-panel fade it used to cover.
    await page.waitForTimeout(900);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });

  test("after Run Handover (populated outcomes/board/summary) has no detectable violations", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("run-handover").click();
    await page.waitForSelector('[data-testid="outcomes-list"]');
    // The outcome list staggers in (see src/lib/motion.ts staggerChildren);
    // scanning mid-animation catches list items still at opacity < 1,
    // which axe's color-contrast check (correctly) flags as a transient
    // false positive — a badge at opacity 0.05 IS low-contrast, it just
    // won't stay that way. Settle first so the scan reflects the actual
    // at-rest UI.
    await page.waitForTimeout(600);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });

  test("validation error state has no detectable violations", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Row 6 Event ID", { exact: true }).fill("E05");
    await page.getByTestId("run-handover").click();
    await page.waitForSelector('[data-testid="validation-banner"]');
    // Covers both the banner's own fade-in and, defensively, the tail end
    // of the initial-mount entrance stagger (src/lib/motion.ts) in case
    // the fill+click actions above complete before it's fully settled.
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("reduced motion", () => {
  // MotionConfig reducedMotion="user" (src/app/App.tsx) is supposed to make
  // every motion.* element skip its animated transition — but still reach
  // its final visual state — when the OS-level "reduce motion" preference
  // is on. The one way that silently breaks is a component whose "final
  // state" is only ever reached VIA the animation callback; with the
  // animation skipped, such an element would be stuck invisible forever.
  // This test emulates the preference and checks the app is still fully
  // usable, not just "doesn't crash."
  test.use({ colorScheme: "light", reducedMotion: "reduce" });

  test("Run Handover still fully populates the UI with reduced motion on", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("run-handover").click();

    // No waitForTimeout here on purpose: with reduced motion honored,
    // these should already be at their final, fully-opaque state
    // essentially immediately, not after a settle delay like the tests
    // above need.
    const outcomes = page.getByTestId("outcomes-list").locator("li");
    await expect(outcomes).toHaveCount(6);
    for (const item of await outcomes.all()) {
      await expect(item).toBeVisible();
      await expect(item).toHaveCSS("opacity", "1");
    }

    await expect(page.getByTestId("summary-pending")).toContainText("3");
    await expect(page.getByTestId("pending-column")).toBeVisible();
    await expect(page.getByTestId("pending-column")).toHaveCSS("opacity", "1");
  });
});
