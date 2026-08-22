import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/app/App";

/**
 * Component-level UI tests (RTL) — the second of the three testing layers
 * required by docs/PLAN.md, alongside Vitest domain tests
 * (src/tests/domain/) and the Playwright E2E suite (e2e/). These render
 * the real App with jsdom rather than a browser, so they're faster than
 * Playwright but can't cover things like actual pointer-based dropdown
 * interaction — that's what e2e/handover.spec.ts is for. The scope here is
 * deliberately narrower: does the UI render the right thing for a given
 * state, and does clicking the right button dispatch the right action.
 */

describe("App — initial render (reset state)", () => {
  it("shows the 6 built-in events and pre-run placeholders, not 0/0/0", () => {
    render(<App />);

    // All 6 built-in rows are present.
    for (let row = 1; row <= 6; row++) {
      expect(screen.getByTestId(`event-row-${row}`)).toBeInTheDocument();
    }

    // Pre-run state, per the reset-vs-empty-run distinction: placeholders,
    // not numeric zeros, and no outcomes/board content yet.
    expect(screen.getByTestId("outcomes-pre-run")).toBeInTheDocument();
    expect(screen.getByTestId("board-pre-run")).toBeInTheDocument();
    expect(screen.getByTestId("summary-pending")).toHaveTextContent("—");
    expect(screen.getByTestId("summary-collected")).toHaveTextContent("—");
    expect(screen.getByTestId("summary-rejected")).toHaveTextContent("—");
  });
});

describe("App — Run Handover", () => {
  it("processes the built-in fixture and renders the canonical oracle", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId("run-handover"));

    const outcomesList = screen.getByTestId("outcomes-list");
    const items = within(outcomesList).getAllByRole("listitem");
    expect(items).toHaveLength(6);
    expect(items[2]).toHaveTextContent("E03");
    expect(items[2]).toHaveTextContent("PICKUP_CODE_MISMATCH");
    expect(items[4]).toHaveTextContent("E05");
    expect(items[4]).toHaveTextContent("COLLECTED");

    expect(screen.getByTestId("summary-pending")).toHaveTextContent("3");
    expect(screen.getByTestId("summary-collected")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-rejected")).toHaveTextContent("1");

    expect(within(screen.getByTestId("pending-column")).getByText("P01")).toBeInTheDocument();
    expect(within(screen.getByTestId("collected-column")).getByText("P02")).toBeInTheDocument();
  });

  it("running with an empty table shows explicit 0/0/0 and the empty-run copy", async () => {
    const user = userEvent.setup();
    render(<App />);

    for (let i = 0; i < 6; i++) {
      // Each delete shifts remaining rows up, so "Delete row 1" always
      // targets the current first row.
      await user.click(screen.getByRole("button", { name: "Delete row 1" }));
    }
    expect(screen.getByTestId("event-table-empty")).toBeInTheDocument();

    await user.click(screen.getByTestId("run-handover"));

    expect(screen.getByTestId("outcomes-empty-run")).toBeInTheDocument();
    expect(screen.getByTestId("summary-pending")).toHaveTextContent("0");
    expect(screen.getByTestId("summary-collected")).toHaveTextContent("0");
    expect(screen.getByTestId("summary-rejected")).toHaveTextContent("0");
    expect(screen.getByTestId("pending-empty")).toBeInTheDocument();
    expect(screen.getByTestId("collected-empty")).toBeInTheDocument();
  });
});

describe("App — validation", () => {
  it("shows a specific, per-field error and blocks processing on a duplicate event ID", async () => {
    const user = userEvent.setup();
    render(<App />);

    const row6EventId = screen.getByLabelText("Row 6 Event ID", { exact: true });
    await user.clear(row6EventId);
    await user.type(row6EventId, "E05");

    await user.click(screen.getByTestId("run-handover"));

    const banner = screen.getByTestId("validation-banner");
    expect(banner).toHaveTextContent("E05");
    expect(banner).toHaveTextContent("Duplicate event ID");

    // No partial output — still pre-run, not a partially-processed result.
    expect(screen.getByTestId("outcomes-pre-run")).toBeInTheDocument();
    expect(screen.getByTestId("board-pre-run")).toBeInTheDocument();
  });

  it("rejects an invalid pickup code with a specific field-level message", async () => {
    const user = userEvent.setup();
    render(<App />);

    const pickupCode = screen.getByLabelText("Row 1 Pickup Code", { exact: true });
    await user.clear(pickupCode);
    await user.type(pickupCode, "bad");

    await user.click(screen.getByTestId("run-handover"));

    const banner = screen.getByTestId("validation-banner");
    expect(banner).toHaveTextContent("Pickup Code");
    expect(banner).toHaveTextContent("Invalid pickup code");
  });
});

describe("App — editing does not mutate the displayed prior result", () => {
  it("keeps the last board/summary on screen while the table is being edited", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId("run-handover"));
    expect(screen.getByTestId("summary-pending")).toHaveTextContent("3");

    // Edit a field after running — per docs/PLAN.md, this must NOT silently
    // clear or change the already-displayed result.
    const student = screen.getByLabelText("Row 1 Student", { exact: true });
    await user.clear(student);
    await user.type(student, "Someone Else");

    expect(screen.getByTestId("summary-pending")).toHaveTextContent("3");
    expect(screen.getByTestId("outcomes-list")).toBeInTheDocument();
  });
});

describe("App — Reset", () => {
  it("restores the 6 built-in events and returns to the pre-run placeholder state", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId("run-handover"));
    expect(screen.getByTestId("summary-pending")).toHaveTextContent("3");

    await user.click(screen.getByRole("button", { name: /Reset/ }));

    for (let row = 1; row <= 6; row++) {
      expect(screen.getByTestId(`event-row-${row}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId("outcomes-pre-run")).toBeInTheDocument();
    expect(screen.getByTestId("board-pre-run")).toBeInTheDocument();
    expect(screen.getByTestId("summary-pending")).toHaveTextContent("—");
  });
});

describe("App — Add Event", () => {
  it("appends a new blank row to the table", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Add Event" }));

    expect(screen.getByTestId("event-row-7")).toBeInTheDocument();
    expect(screen.getByLabelText("Row 7 Event ID", { exact: true })).toHaveValue("");
  });
});
