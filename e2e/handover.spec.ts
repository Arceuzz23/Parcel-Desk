import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end acceptance suite — the 6 scenarios required by docs/PLAN.md,
 * driven through the real UI exactly as a desk operator would use it: type
 * into the table, click Run Handover, read the board. Domain correctness
 * is already exhaustively covered at the unit level in
 * src/tests/domain/*.test.ts; these tests instead verify the UI *wires
 * that logic up correctly* — the right button triggers the right
 * validate→process→render pipeline, and the right state renders the right
 * pixels.
 */

/** Types into one editable cell, addressed the same way the table labels it
 *  for screen readers: `aria-label="Row {n} {Field}"`. */
async function fillCell(page: Page, row: number, field: string, value: string) {
  const input = page.getByLabel(`Row ${row} ${field}`, { exact: true });
  await input.fill(value);
}

async function runHandover(page: Page) {
  await page.getByTestId("run-handover").click();
}

/**
 * Asserts the parcel IDs shown in a board column (pending/collected), in
 * on-screen order — pending preserves accepted-arrival order and collected
 * preserves successful-collection order (never alphabetical/parcel-ID
 * sorted; see src/lib/processor.ts), so order is part of what's under test
 * here, not just membership.
 */
async function expectColumnParcelIds(page: Page, testId: string, expectedIds: string[]) {
  // ParcelLabel (src/components/ParcelLabel.tsx) tags its root button
  // `data-testid="parcel-{id}"` — reading that attribute rather than a CSS
  // class selector keeps this test decoupled from ParcelLabel's visual
  // styling, which is expected to keep changing.
  const parcelButtons = page.getByTestId(testId).locator('[data-testid^="parcel-"]');
  await expect(parcelButtons).toHaveCount(expectedIds.length);
  const testIds = await parcelButtons.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-testid")),
  );
  expect(testIds).toEqual(expectedIds.map((id) => `parcel-${id}`));
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Operations Console" })).toBeVisible();
});

test("1. built-in fixture matches the canonical oracle", async ({ page }) => {
  await runHandover(page);

  const outcomes = page.getByTestId("outcomes-list").locator("li");
  await expect(outcomes).toHaveCount(6);

  // Source order, exact contract terms — never a generic "Error".
  await expect(outcomes.nth(0)).toContainText("E01");
  await expect(outcomes.nth(0)).toContainText("ARRIVED");
  await expect(outcomes.nth(1)).toContainText("E02");
  await expect(outcomes.nth(1)).toContainText("ARRIVED");
  await expect(outcomes.nth(2)).toContainText("E03");
  await expect(outcomes.nth(2)).toContainText("PICKUP_CODE_MISMATCH");
  await expect(outcomes.nth(3)).toContainText("E04");
  await expect(outcomes.nth(3)).toContainText("ARRIVED");
  await expect(outcomes.nth(4)).toContainText("E05");
  await expect(outcomes.nth(4)).toContainText("COLLECTED");
  await expect(outcomes.nth(5)).toContainText("E06");
  await expect(outcomes.nth(5)).toContainText("ARRIVED");

  await expectColumnParcelIds(page, "pending-column", ["P01", "P03", "P04"]);
  await expectColumnParcelIds(page, "collected-column", ["P02"]);

  await expect(page.getByTestId("summary-pending")).toContainText("3");
  await expect(page.getByTestId("summary-collected")).toContainText("1");
  await expect(page.getByTestId("summary-rejected")).toContainText("1");
});

test("2. corrected E03 pickup code collects P01", async ({ page }) => {
  await fillCell(page, 3, "Pickup Code", "K7M2");
  await runHandover(page);

  const outcomes = page.getByTestId("outcomes-list").locator("li");
  await expect(outcomes.nth(2)).toContainText("E03");
  await expect(outcomes.nth(2)).toContainText("COLLECTED");

  await expectColumnParcelIds(page, "pending-column", ["P03", "P04"]);
  await expectColumnParcelIds(page, "collected-column", ["P01", "P02"]);

  await expect(page.getByTestId("summary-pending")).toContainText("2");
  await expect(page.getByTestId("summary-collected")).toContainText("2");
  await expect(page.getByTestId("summary-rejected")).toContainText("0");
});

test("3. E06 active-code collision excludes P04", async ({ page }) => {
  await fillCell(page, 6, "Pickup Code", "T9C4"); // same code as E04's active P03
  await runHandover(page);

  const outcomes = page.getByTestId("outcomes-list").locator("li");
  await expect(outcomes.nth(5)).toContainText("E06");
  await expect(outcomes.nth(5)).toContainText("ACTIVE_CODE_COLLISION");

  await expectColumnParcelIds(page, "pending-column", ["P01", "P03"]);
  await expect(page.getByTestId("pending-column")).not.toContainText("P04");

  await expect(page.getByTestId("summary-pending")).toContainText("2");
  await expect(page.getByTestId("summary-collected")).toContainText("1");
  await expect(page.getByTestId("summary-rejected")).toContainText("2");
});

test("4. running an empty table yields an explicit 0/0/0 — not a placeholder", async ({ page }) => {
  // Delete all 6 built-in rows (row 1's delete button repeatedly, since the
  // table re-indexes after each removal).
  for (let i = 0; i < 6; i++) {
    await page.getByRole("button", { name: "Delete row 1" }).click();
  }
  await expect(page.getByTestId("event-table-empty")).toBeVisible();

  await runHandover(page);

  // This is a COMPLETED run that processed zero events — distinct from
  // "no run yet." See scenario 6 below for the contrast.
  await expect(page.getByTestId("outcomes-empty-run")).toBeVisible();
  await expect(page.getByTestId("summary-pending")).toContainText("0");
  await expect(page.getByTestId("summary-collected")).toContainText("0");
  await expect(page.getByTestId("summary-rejected")).toContainText("0");
  await expect(page.getByTestId("pending-empty")).toBeVisible();
  await expect(page.getByTestId("collected-empty")).toBeVisible();
});

test("5. a duplicate event ID blocks the run with zero partial output", async ({ page }) => {
  await fillCell(page, 6, "Event ID", "E05"); // collides with row 5's E05
  await runHandover(page);

  const banner = page.getByTestId("validation-banner");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("E05");
  await expect(banner).toContainText("Duplicate event ID");

  // No partial processing: outcomes/board/summary must all stay in their
  // pre-run placeholder state, not show a partial result.
  await expect(page.getByTestId("outcomes-pre-run")).toBeVisible();
  await expect(page.getByTestId("board-pre-run")).toBeVisible();
  await expect(page.getByTestId("summary-pending")).toContainText("—");
});

test("6. Reset (no result) is visually distinct from an empty completed run", async ({ page }) => {
  // Reset state: the 6 built-in events are present, but nothing has been
  // run yet — pre-run placeholders everywhere, not 0s.
  await expect(page.getByTestId("outcomes-pre-run")).toBeVisible();
  await expect(page.getByTestId("board-pre-run")).toBeVisible();
  await expect(page.getByTestId("summary-pending")).toContainText("—");

  // Now actually produce an empty-run result...
  for (let i = 0; i < 6; i++) {
    await page.getByRole("button", { name: "Delete row 1" }).click();
  }
  await runHandover(page);
  await expect(page.getByTestId("outcomes-empty-run")).toBeVisible();
  await expect(page.getByTestId("summary-pending")).toContainText("0");

  // ...then click Reset and confirm it goes back to the pre-run state, not
  // to another 0/0/0 empty-run state.
  await page.getByRole("button", { name: /Reset/ }).click();
  await expect(page.getByTestId("event-row-6")).toBeVisible(); // 6 built-in rows restored
  await expect(page.getByTestId("outcomes-pre-run")).toBeVisible();
  await expect(page.getByTestId("board-pre-run")).toBeVisible();
  await expect(page.getByTestId("summary-pending")).toContainText("—");
});
