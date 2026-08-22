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
    // The summary tiles fade in on mount (fadeInUp — see
    // src/lib/motion.ts); same reasoning as the wait below.
    await page.waitForTimeout(300);
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
    await page.waitForTimeout(300); // let the banner's fade-in settle
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
});
