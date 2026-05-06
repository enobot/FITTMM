/**
 * FITTMM Frontend – Plate Calculator Test Cases
 * 
 * TC-06  Add a 45 lb plate → per-side and total update correctly
 * TC-07  Switch units lb → kg after adding plates → plates are cleared
 * TC-08  Remove All button: disabled with no plates, clears on click
 *
 */

import { render, screen, fireEvent } from "@testing-library/react";
import PlateCalculator from "./PlateCalculator";

// ---------------------------------------------------------------------------
// TC-06: Weight math — adding one 45 lb plate
// ---------------------------------------------------------------------------
test("TC-06: adding a 45 lb plate updates per-side and total weight correctly", () => {
  /**
   * TC-06 | PlateCalculator: weight calculation
   * ─────────────────────────────────────────────
   * Input:   Click the '+ Add 45 lb' button once.
   * Expected:
   *   • Per-side display shows "45 lb"
   *   • Total display shows "135 lb"  (bar 45 lb + 45×2 lb = 135 lb)
   */
  render(<PlateCalculator />);

  fireEvent.click(screen.getByRole("button", { name: "Add 45 lb" }));

  expect(
    screen.getByText("45 lb", { selector: "strong" })
  ).toBeInTheDocument();

  expect(screen.getByText(/Total: 135 lb/)).toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// TC-07: Unit toggle clears all plates
// ---------------------------------------------------------------------------
test("TC-07: switching from lb to kg after adding plates clears all plates", () => {
  /**
   * TC-07 | PlateCalculator: unit toggle resets plates
   * ───────────────────────────────────────────────────
   * Input:   Add a 45 lb plate, then click the 'kg' toggle button.
   * Expected:
   *   • Total weight span disappears (per-side is 0, so total is hidden)
   *   • The per-side <strong> shows "0 kg"
   */
  render(<PlateCalculator />);

  // Add a plate so there's something to clear
  fireEvent.click(screen.getByRole("button", { name: "Add 45 lb" }));
  expect(screen.getByText(/Total: 135 lb/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "kg" }));

  expect(screen.queryByText(/Total:/)).not.toBeInTheDocument();

  expect(
    screen.getByText("0 kg", { selector: "strong" })
  ).toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// TC-08: Remove All button state and behavior
// ---------------------------------------------------------------------------
test("TC-08: Remove All is disabled with no plates and clears plates when clicked", () => {
  /**
   * TC-08 | PlateCalculator: Remove All button
   * ────────────────────────────────────────────
   * Input A: No plates loaded (initial state).
   * Expected A: 'Remove all' button is disabled.
   *
   * Input B: Add a plate, then click 'Remove all'.
   * Expected B:
   *   • Button becomes enabled after a plate is added.
   *   • After clicking 'Remove all', the total weight span disappears
   *     and the button returns to disabled.
   */
  render(<PlateCalculator />);

  const removeAllBtn = screen.getByRole("button", { name: "Remove all plates" });

  // A: Initially disabled — no plates loaded
  expect(removeAllBtn).toBeDisabled();

  // B: Add a plate — button should become enabled
  fireEvent.click(screen.getByRole("button", { name: "Add 45 lb" }));
  expect(removeAllBtn).not.toBeDisabled();

  fireEvent.click(removeAllBtn);
  expect(screen.queryByText(/Total:/)).not.toBeInTheDocument();
  expect(removeAllBtn).toBeDisabled();
});
