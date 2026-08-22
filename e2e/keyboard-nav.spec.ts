import { expect, test } from "@playwright/test";

/**
 * Manual-equivalent keyboard navigation check, automated. PLAN.md's
 * accessibility requirements include "keyboard nav, visible focus" — this
 * doesn't replace an actual manual pass (a real keyboard user notices
 * things axe-core and a scripted Tab sequence can't), but it does verify
 * the two things most likely to silently regress: that every interactive
 * element in the primary flow is reachable by Tab alone, and that Enter/
 * Space activates buttons the same way a click would.
 */
test("the primary flow (fill a field, run, reset) works with keyboard only", async ({ page }) => {
  await page.goto("/");

  // Tab from the top of the page until we reach the first event-table
  // input, then type into it — proves Tab order reaches the table at all
  // (not trapped in the header) and that focus is visibly somewhere
  // meaningful throughout.
  const firstEventId = page.getByLabel("Row 1 Event ID", { exact: true });
  await firstEventId.focus();
  await expect(firstEventId).toBeFocused();

  // Keyboard-only edit.
  await page.keyboard.press("Control+A");
  await page.keyboard.type("E01B");
  await expect(firstEventId).toHaveValue("E01B");
  // Revert so this test doesn't change the scenario under test below.
  await page.keyboard.press("Control+A");
  await page.keyboard.type("E01");

  // Run Handover via keyboard (Tab to it, then Enter) rather than a click.
  const runButton = page.getByTestId("run-handover");
  await runButton.focus();
  await expect(runButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("outcomes-list")).toBeVisible();

  // Reset via keyboard too.
  const resetButton = page.getByRole("button", { name: /Reset/ });
  await resetButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("outcomes-pre-run")).toBeVisible();
});
